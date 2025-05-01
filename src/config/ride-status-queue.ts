import Queue from 'bull';
import { PrismaClient } from '@prisma/client';

let statusUpdateQueue: Queue.Queue;
let prismaClient: PrismaClient;

export function initRideStatusQueue(prisma: PrismaClient) {
  prismaClient = prisma;
  
  // Create a Bull queue for ride status updates
  statusUpdateQueue = new Queue('ride-status-updates', {
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
  statusUpdateQueue.on('waiting', (jobId) => {
    console.log(`Status update job ${jobId} is waiting to be processed`);
  });
  
  // Log when jobs are ready to be processed
  statusUpdateQueue.on('active', (job) => {
    console.log(`Status update job ${job.id} has started processing`);
  });
  
  // Log when jobs are delayed
  statusUpdateQueue.on('delayed', (job) => {
    console.log(`Status update job ${job.id} has been delayed and will process later`);
  });
  
  // Process jobs in the queue
  statusUpdateQueue.process(async () => {
    console.log(`Processing ride status update job at ${new Date().toISOString()}`);
    try {
      // Account for Cairo timezone (GMT+3) when checking ride statuses
      const cairoTimeOffsetMs = 3 * 60 * 60 * 1000; // Cairo is GMT+3 (3 hours ahead)
      
      // Find all PENDING rides where departure time has passed by 3 minutes
      // Adjust for Cairo timezone to ensure accurate time comparison
      const threeMinutesAgo = new Date(cairoTimeOffsetMs + Date.now() - 3 * 60 * 1000);
      
      console.log(`Current server time: ${new Date().toISOString()}`);
      console.log(`Adjusted Cairo time: ${new Date(Date.now() + cairoTimeOffsetMs).toISOString()}`);
      console.log(`Looking for PENDING rides with departure time before ${threeMinutesAgo.toISOString()}`);
      
      // Find rides that need to be updated to IN_PROGRESS
      const pendingRides = await prismaClient.ride.findMany({
        where: {
          status: 'PENDING',
          departure_time: {
            lt: threeMinutesAgo
          }
        }
      });
      
      console.log(`Found ${pendingRides.length} PENDING rides that need to be updated to IN_PROGRESS`);
      
      let totalUpdates = 0;
      
      // Update rides to IN_PROGRESS
      if (pendingRides.length > 0) {
        const updateResult = await prismaClient.ride.updateMany({
          where: {
            id: {
              in: pendingRides.map(ride => ride.id)
            },
            status: 'PENDING'
          },
          data: {
            status: 'IN_PROGRESS',
            updated_at: new Date()
          }
        });
        
        console.log(`Successfully updated ${updateResult.count} rides from PENDING to IN_PROGRESS`);
        totalUpdates += updateResult.count;
      }
      
      // Find PENDING rides that are 12+ hours past departure time and mark as CANCELLED
      // Adjust for Cairo timezone to ensure accurate time comparison
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      console.log(`Looking for PENDING rides with departure time before ${twelveHoursAgo.toISOString()} to mark as CANCELLED`);
      console.log(`Adjusted Cairo time for 12-hour threshold: ${new Date(twelveHoursAgo.getTime() + cairoTimeOffsetMs).toISOString()}`);
      
      const oldPendingRides = await prismaClient.ride.findMany({
        where: {
          status: 'PENDING',
          departure_time: {
            lt: twelveHoursAgo
          }
        }
      });
      
      console.log(`Found ${oldPendingRides.length} old PENDING rides that need to be updated to CANCELLED`);
      
      if (oldPendingRides.length > 0) {
        const cancelResult = await prismaClient.ride.updateMany({
          where: {
            id: {
              in: oldPendingRides.map(ride => ride.id)
            },
            status: 'PENDING'
          },
          data: {
            status: 'CANCELLED',
            updated_at: new Date()
          }
        });
        
        console.log(`Successfully updated ${cancelResult.count} rides from PENDING to CANCELLED`);
        totalUpdates += cancelResult.count;
      }
      
      // Find IN_PROGRESS rides that have been active for 12+ hours and mark as COMPLETED
      // Using the same timezone-adjusted 12-hour threshold
      console.log(`Looking for IN_PROGRESS rides with departure time before ${twelveHoursAgo.toISOString()} to mark as COMPLETED`);
      console.log(`Adjusted Cairo time for 12-hour threshold: ${new Date(twelveHoursAgo.getTime() + cairoTimeOffsetMs).toISOString()}`);
      
      const oldActiveRides = await prismaClient.ride.findMany({
        where: {
          status: 'IN_PROGRESS',
          departure_time: {
            lt: twelveHoursAgo
          }
        }
      });
      
      console.log(`Found ${oldActiveRides.length} old IN_PROGRESS rides that need to be updated to COMPLETED`);
      
      if (oldActiveRides.length > 0) {
        const completeResult = await prismaClient.ride.updateMany({
          where: {
            id: {
              in: oldActiveRides.map(ride => ride.id)
            },
            status: 'IN_PROGRESS'
          },
          data: {
            status: 'COMPLETED',
            updated_at: new Date()
          }
        });
        
        console.log(`Successfully updated ${completeResult.count} rides from IN_PROGRESS to COMPLETED`);
        totalUpdates += completeResult.count;
      }
      
      return { success: true, updatedCount: totalUpdates };
    } catch (error) {
      console.error("Error processing ride status update job:", error);
      throw error; // Retry the job
    }
  });

  // Log completed jobs
  statusUpdateQueue.on('completed', (job, result) => {
    console.log(`Status update job ${job.id} completed with result:`, result);
  });

  // Log failed jobs
  statusUpdateQueue.on('failed', (job, error) => {
    console.error(`Status update job ${job.id} failed with error:`, error);
  });

  // Schedule the job to run every minute
  // Account for Cairo timezone (GMT+3)
  // The system is running in Cairo time but scheduling in GMT
  const cairoTimeOffsetMs = 3 * 60 * 60 * 1000; // Cairo is GMT+3 (3 hours ahead)
  
  // Calculate the current time in Cairo
  const now = new Date();
  console.log(`Current time (server): ${now.toISOString()}`);
  
  // Schedule the job to run every minute, adjusting for timezone
  statusUpdateQueue.add(
    {}, // No specific data needed for this job
    {
      repeat: {
        every: 60000, // Run every minute
      },
    }
  );
  
  console.log(`Status update job scheduled to run every minute with Cairo timezone adjustment (GMT+3)`);

  console.log('Ride status update queue initialized successfully');
  return statusUpdateQueue;
}

export function getRideStatusQueue() {
  return { statusUpdateQueue };
}

// Function to manually check and process delayed jobs
// This can be called periodically to ensure delayed jobs are being processed
export async function checkStatusUpdateDelayedJobs() {
  if (!statusUpdateQueue) {
    console.error('Status update queue not initialized');
    return;
  }
  
  try {
    console.log('Checking for delayed status update jobs...');
    
    // Get all delayed jobs
    const delayedJobs = await statusUpdateQueue.getDelayed();
    console.log(`Found ${delayedJobs.length} delayed status update jobs`);
    
    // Check each delayed job
    for (const job of delayedJobs) {
      const jobState = await job.getState();
      const processIn = job.opts.delay ? new Date(job.timestamp + job.opts.delay) : 'unknown';
      
      console.log(`Status update job ${job.id} is in state ${jobState}, will process at ${processIn}`);
      
      // Check if the job should be processed now
      const now = new Date().getTime();
      const shouldProcessTime = job.timestamp + (job.opts.delay || 0);
      
      if (shouldProcessTime <= now) {
        console.log(`Status update job ${job.id} should be processed now. Current time: ${new Date().toISOString()}, Should process time: ${new Date(shouldProcessTime).toISOString()}`);
        
        // Promote the job to be processed immediately if it's delayed but should be processed
        if (jobState === 'delayed') {
          console.log(`Promoting status update job ${job.id} to be processed immediately`);
          await job.promote();
        }
      }
    }
    
    console.log('Bull automatically checks for stalled jobs based on configured settings');
    
    return delayedJobs;
  } catch (error) {
    console.error('Error checking delayed status update jobs:', error);
    throw error;
  }
}

// Function to schedule a one-time status update job
export async function scheduleOneTimeStatusUpdate(scheduledTime: Date) {
  if (!statusUpdateQueue) {
    throw new Error('Status update queue not initialized');
  }
  
  console.log(`Scheduling one-time status update job for ${scheduledTime.toISOString()}`);
  
  // Calculate when to run the status update
  const now = new Date();
  console.log(`Current time: ${now.toISOString()}`);
  
  // Account for Cairo timezone (GMT+3)
  // The system is running in Cairo time but scheduling in GMT
  const cairoTimeOffsetMs = 3 * 60 * 60 * 1000; // Cairo is GMT+3 (3 hours ahead)
  
  // If the scheduled time is in the past, don't schedule
  if (scheduledTime <= now) {
    console.log(`Not scheduling one-time status update: scheduled time is in the past`);
    return null;
  }
  
  // Calculate delay in milliseconds
  // Since Bull queue uses server time (GMT) for scheduling, we need to adjust the delay
  // by subtracting the Cairo time offset to ensure the job runs at the correct local time
  const unadjustedDelay = scheduledTime.getTime() - now.getTime();
  const adjustedDelay = unadjustedDelay - cairoTimeOffsetMs; // Adjust for Cairo timezone (GMT+3)
  
  console.log(`Calculated delay (without timezone adjustment): ${unadjustedDelay}ms (${Math.round(unadjustedDelay/1000/60)} minutes)`);
  console.log(`Adjusted delay for GMT: ${adjustedDelay}ms (${Math.round(adjustedDelay/1000/60)} minutes)`);
  
  // Verify the delay is reasonable (not too far in the future)
  const maxDelay = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  if (adjustedDelay > maxDelay) {
    console.log(`Warning: Delay for status update is very long (${Math.round(adjustedDelay/1000/60/60/24)} days). This might cause issues with Bull queue.`);
  }
  
  try {
    // Schedule the job with the timezone-adjusted delay
    const job = await statusUpdateQueue.add(
      {}, // No specific data needed for this job
      { delay: adjustedDelay }
    );
    
    // Calculate the actual processing time in GMT
    const processingTimeGMT = new Date(now.getTime() + adjustedDelay);
    console.log(`Successfully scheduled one-time status update with job ID ${job.id}`);
    console.log(`Status update will run at: ${scheduledTime.toISOString()} (Cairo time) / ${processingTimeGMT.toISOString()} (GMT)`);
    
    // Verify the job was added to the queue
    const jobFromQueue = await statusUpdateQueue.getJob(job.id);
    if (jobFromQueue) {
      console.log(`Verified job ${job.id} is in the queue with state: ${await jobFromQueue.getState()}`);
    } else {
      console.error(`Failed to verify job ${job.id} in the queue`);
    }
    
    return job;
  } catch (error) {
    console.error(`Error scheduling one-time status update:`, error);
    throw error;
  }
}