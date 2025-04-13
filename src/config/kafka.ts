import { Kafka, Producer, Consumer } from "kafkajs";
import { PrismaClient } from "@prisma/client";
import { RideService } from "../services/ride.service";

let producer: Producer;
let consumer: Consumer;
let rideService: RideService;

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;
  
  const kafka = new Kafka({
    clientId: 'rides-service',
    brokers: process.env.KAFKA_BROKERS
      ? process.env.KAFKA_BROKERS.split(',')
      : ['kafka:9092'],
  });
  
  producer = kafka.producer();
  await producer.connect();
  
  return producer;
}

// Add this function to get the producer
export function getKafkaProducer(): Producer | null {
  return producer || null;
}

export async function initKafka(prisma: PrismaClient) {
  const kafka = new Kafka({
    clientId: "rides-service",
    brokers: process.env.KAFKA_BROKERS
      ? process.env.KAFKA_BROKERS.split(",")
      : ["localhost:9092"],
  });

  producer = kafka.producer();
  consumer = kafka.consumer({ groupId: "rides-service-group" });

  try {
    await producer.connect();
    console.log("Kafka producer connected successfully");

    // Create ride service with producer
    rideService = new RideService(prisma);
    rideService.setProducer(producer);

    await consumer.connect();
    console.log("Kafka consumer connected successfully");

    // Subscribe to topics
    await consumer.subscribe({ topic: "booking-created", fromBeginning: false });
    await consumer.subscribe({ topic: "booking-canceled", fromBeginning: false });
    await consumer.subscribe({ topic: "ride-status-update", fromBeginning: false });
    await consumer.subscribe({ topic: "payment-succeeded", fromBeginning: false });


    // Set up message handler
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) return;

          const messageValue = JSON.parse(message.value.toString());

          if (topic === "booking-created") {
            try {
              const { bookingId, rideId, userId, meetingPointId, price } = messageValue;

              // Perform additional validation if needed
              const ride = await prisma.ride.findUnique({
                where: { id: Number(rideId) },
                include: { passengers: true }
              });

              if (!ride) {
                throw new Error("Ride not found");
              }

              if (ride.status !== "PENDING") {
                throw new Error("Ride is not available");
              }

              if (ride.seats_available <= 0) {
                throw new Error("No seats available");
              }

              // Check if passenger is already in the ride
              const existingPassenger = ride.passengers.find(
                (p) => p.passenger_id === Number(userId)
              );

              if (existingPassenger) {
                throw new Error("Passenger already added to this ride");
              }

              // Emit start-payment event instead of adding passenger
              await producer.send({
                topic: "start-payment",
                messages: [
                  {
                    key: String(bookingId),
                    value: JSON.stringify({
                      bookingId,
                      price,
                      rideId,
                      userId
                    }),
                  },
                ],
              });
            } catch (error) {
              console.error("Error validating ride for booking:", error);

              await producer.send({
                topic: "booking-validation-failed",
                messages: [
                  {
                    key: String(messageValue.bookingId),
                    value: JSON.stringify({
                      bookingId: messageValue.bookingId,
                      rideId: messageValue.rideId,
                      userId: messageValue.userId,
                      reason: error instanceof Error ? error.message : "Unknown error",
                    }),
                  },
                ],
              });
            }
          } else if (topic === "booking-canceled") {
            try {
              // Extract data from the message
              const { bookingId, rideId, userId } = messageValue;

              // Remove passenger from ride
              await rideService.removePassenger({
                rideId: Number(rideId),
                passengerId: Number(userId),
              });

              console.log(`Passenger ${userId} removed from ride ${rideId} due to booking cancellation`);
            } catch (error) {
              console.error("Error removing passenger from ride:", error);
            }
          } else if (topic === "ride-status-update") {
            try {
              // Extract data from the message
              const { rideId, status } = messageValue;

              // Update ride status
              await rideService.updateRideStatus({
                rideId: Number(rideId),
                status: status,
              });

              // Send ride-status-changed event to notify other services
              await producer.send({
                topic: "ride-status-changed",
                messages: [
                  {
                    key: String(rideId),
                    value: JSON.stringify({
                      rideId: rideId,
                      status: status,
                    }),
                  },
                ],
              });

              console.log(`Ride ${rideId} status updated to ${status}`);
            } catch (error) {
              console.error("Error updating ride status:", error);
            }
          } else if (topic === "payment-succeeded") {
            try {
              const { bookingId, rideId, userId } = messageValue;
              
              await rideService.addPassenger({
                rideId: Number(rideId),
                passengerId: Number(userId),
              });
          
              await producer.send({
                topic: "passenger-added",
                messages: [
                  {
                    key: String(bookingId),
                    value: JSON.stringify({
                      bookingId,
                      rideId,
                      userId,
                    }),
                  },
                ],
              });
          
              console.log(`Passenger ${userId} added to ride ${rideId} after successful payment`);
            } catch (error) {
              console.error("Error adding passenger after payment:", error);
          
              await producer.send({
                topic: "passenger-add-failed",
                messages: [
                  {
                    key: String(messageValue.bookingId),
                    value: JSON.stringify({
                      bookingId: messageValue.bookingId,
                      rideId: messageValue.rideId,
                      userId: messageValue.userId,
                      reason: error instanceof Error ? error.message : "Unknown error",
                    }),
                  },
                ],
              });
            }
          }
          
        } catch (error) {
          console.error("Error processing Kafka message:", error);
        }
      },
    });

    console.log("Kafka consumer is running");
    return { producer, consumer };
  } catch (error) {
    console.error("Error initializing Kafka:", error);
    throw error;
  }
}

export async function disconnectKafka() {
  try {
    if (producer) {
      await producer.disconnect();
      console.log("Kafka producer disconnected");
    }

    if (consumer) {
      await consumer.disconnect();
      console.log("Kafka consumer disconnected");
    }
  } catch (error) {
    console.error("Error disconnecting from Kafka:", error);
  }
}
