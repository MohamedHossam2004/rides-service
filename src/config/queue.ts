import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

let reminderQueue: Queue.Queue;
let prismaClient: PrismaClient;

export function initQueues(prisma: PrismaClient) {
  prismaClient = prisma;
  
  // Create a Bull queue for ride reminders
  reminderQueue = new Queue('ride-reminders', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs for debugging
    },
  });
  
  // Log when jobs are added to the queue
  reminderQueue.on('waiting', (jobId) => {
    console.log(`Job ${jobId} is waiting to be processed`);
  });
  
  // Log when jobs are ready to be processed
  reminderQueue.on('active', (job) => {
    console.log(`Job ${job.id} has started processing`);
  });
  
  // Log when jobs are delayed
  reminderQueue.on('delayed', (job) => {
    console.log(`Job ${job.id} has been delayed and will process later`);
  });

  // Process jobs in the queue
  reminderQueue.process(async (job) => {
    console.log(`Processing reminder job ${job.id} for ride ${job.data.rideId} at ${new Date().toISOString()}`);
    try {
      const { rideId } = job.data;
      
      // Fetch ride details with passengers
      console.log(`Fetching ride details for ride ${rideId}`);
      const ride = await prismaClient.ride.findUnique({
        where: { id: rideId },
        include: {
          area: true,
          passengers: true,
          ride_meeting_points: {
            include: { meeting_point: true },
            orderBy: { order_index: 'asc' },
          },
        },
      });

      console.log(`Ride details fetched for ride ${rideId}:`, {
        id: ride?.id,
        status: ride?.status,
        departure_time: ride?.departure_time,
        passenger_count: ride?.passengers?.length
      });

      if (!ride || ride.status !== 'PENDING') {
        console.log(`Skipping reminder for ride ${rideId}: Ride not found or not pending (status: ${ride?.status})`);
        return { success: false, reason: 'Ride not found or not pending' };
      }

      // Get passenger emails
      const passengerEmails = ride.passengers
        .filter(passenger => passenger.passenger_email)
        .map(passenger => passenger.passenger_email);

      console.log(`Found ${passengerEmails.length} passenger emails for ride ${rideId}:`, passengerEmails);

      if (passengerEmails.length === 0) {
        console.log(`No valid passenger emails found for ride ${rideId}`);
        return { success: false, reason: 'No valid passenger emails' };
      }

      // Send reminder notification
      const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3001';
      console.log(`Sending ride reminder notifications for ride ${rideId} to notification service at ${notificationServiceUrl}`);
      
      const payload = {
        type: 'reminder',
        to: passengerEmails,
        subject: 'Your Ride is Starting Soon',
        payload: {
          passengerName: 'Passenger', // Generic name
          fromPlace: ride.area.name,
          toPlace: ride.to_giu ? 'GIU' : 'Home',
          departureTime: ride.departure_time.toLocaleString(),
        },
      };
      
      console.log("Notification payload:", JSON.stringify(payload));
      
      const notificationResponse = await fetch(
        `${notificationServiceUrl}/notifications/notifyRideReminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      console.log(`Notification service response status: ${notificationResponse.status}`);
      
      if (!notificationResponse.ok) {
        const responseText = await notificationResponse.text();
        console.error(`Failed to send reminder notifications: ${responseText}`);
        throw new Error(`Failed to send reminder notifications: ${responseText}`);
      }

      const responseData = await notificationResponse.json().catch(() => ({}));
      console.log(`Successfully sent ride reminders to ${passengerEmails.length} passengers for ride ${rideId}. Response:`, responseData);
      return { success: true, emailsSent: passengerEmails.length, response: responseData };
    } catch (error) {
      console.error(`Error processing reminder job ${job.id} for ride ${job.data.rideId}:`, error);
      throw error; // Retry the job
    }
  });

  // Log completed jobs
  reminderQueue.on('completed', (job, result) => {
    console.log(`Reminder job ${job.id} completed with result:`, result);
  });

  // Log failed jobs
  reminderQueue.on('failed', (job, error) => {
    console.error(`Reminder job ${job.id} failed with error:`, error);
  });

  console.log('Bull queues initialized successfully');
  return reminderQueue;
}

export function getQueues() {
  return { reminderQueue };
}

// Function to manually check and process delayed jobs
// This can be called periodically to ensure delayed jobs are being processed
export async function checkDelayedJobs() {
  if (!reminderQueue) {
    console.error('Queue not initialized');
    return;
  }
  
  try {
    console.log('Checking for delayed jobs...');
    
    // Get all delayed jobs
    const delayedJobs = await reminderQueue.getDelayed();
    console.log(`Found ${delayedJobs.length} delayed jobs`);
    
    // Check each delayed job
    for (const job of delayedJobs) {
      const jobState = await job.getState();
      const processIn = job.opts.delay ? new Date(job.timestamp + job.opts.delay) : 'unknown';
      
      console.log(`Job ${job.id} for ride ${job.data.rideId} is in state ${jobState}, will process at ${processIn}`);
      
      // Check if the job should be processed now
      const now = new Date().getTime();
      const shouldProcessTime = job.timestamp + (job.opts.delay || 0);
      
      if (shouldProcessTime <= now) {
        console.log(`Job ${job.id} for ride ${job.data.rideId} should be processed now. Current time: ${new Date().toISOString()}, Should process time: ${new Date(shouldProcessTime).toISOString()}`);
        
        // Promote the job to be processed immediately if it's delayed but should be processed
        if (jobState === 'delayed') {
          console.log(`Promoting job ${job.id} to be processed immediately`);
          await job.promote();
        }
      }
    }
    
    console.log('Bull automatically checks for stalled jobs based on configured settings');
    
    return delayedJobs;
  } catch (error) {
    console.error('Error checking delayed jobs:', error);
    throw error;
  }
}

// Function to schedule a reminder for a ride
export async function scheduleRideReminder(rideId: number, departureTime: Date) {
  if (!reminderQueue) {
    throw new Error('Queue not initialized');
  }
  
  console.log(`Scheduling reminder for ride ${rideId} with departure time ${departureTime.toISOString()}`);
  
  // Calculate when to send the reminder (15 minutes before departure)
  const now = new Date();
  console.log(`Current time: ${now.toISOString()}`);
  
  // Account for Cairo timezone (GMT+2)
  // The system is running in Cairo time but scheduling in GMT
  // We need to adjust the reminder time calculation to account for this
  const cairoTimeOffsetMs = 3 * 60 * 60 * 1000; // Cairo is GMT+3 (3 hours ahead)
  
  // Calculate reminder time (15 minutes before departure)
  // No need to adjust departureTime as it's already in the correct local time
  const reminderTime = new Date(departureTime.getTime() - 15 * 60 * 1000);
  console.log(`Calculated reminder time (Cairo local time): ${reminderTime.toISOString()}`);
  
  // If the reminder time is in the past, don't schedule
  if (reminderTime <= now) {
    console.log(`Not scheduling reminder for ride ${rideId}: reminder time is in the past`);
    return null;
  }
  
  // Calculate delay in milliseconds
  // Since Bull queue uses server time (GMT) for scheduling, we need to adjust the delay
  // by subtracting the Cairo time offset to ensure the job runs at the correct local time
  const unadjustedDelay = reminderTime.getTime() - now.getTime();
  const adjustedDelay = unadjustedDelay - cairoTimeOffsetMs; // Adjust for Cairo timezone (GMT+2)
  
  console.log(`Calculated delay (without timezone adjustment): ${unadjustedDelay}ms (${Math.round(unadjustedDelay/1000/60)} minutes)`);
  console.log(`Adjusted delay for GMT: ${adjustedDelay}ms (${Math.round(adjustedDelay/1000/60)} minutes)`);
  
  // Verify the delay is reasonable (not too far in the future)
  const maxDelay = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  if (adjustedDelay > maxDelay) {
    console.log(`Warning: Delay for ride ${rideId} is very long (${Math.round(adjustedDelay/1000/60/60/24)} days). This might cause issues with Bull queue.`);
  }
  
  try {
    // Schedule the job with the timezone-adjusted delay
    const job = await reminderQueue.add(
      { rideId },
      { delay: adjustedDelay }
    );
    
    // Calculate the actual processing time in GMT
    const processingTimeGMT = new Date(now.getTime() + adjustedDelay);
    console.log(`Successfully scheduled reminder for ride ${rideId} with job ID ${job.id}`);
    console.log(`Reminder will be sent at: ${reminderTime.toISOString()} (Cairo time) / ${processingTimeGMT.toISOString()} (GMT)`);
    
    // Verify the job was added to the queue
    const jobFromQueue = await reminderQueue.getJob(job.id);
    if (jobFromQueue) {
      console.log(`Verified job ${job.id} is in the queue with state: ${await jobFromQueue.getState()}`);
    } else {
      console.error(`Failed to verify job ${job.id} in the queue`);
    }
    
    return job;
  } catch (error) {
    console.error(`Error scheduling reminder for ride ${rideId}:`, error);
    throw error;
  }
}