import { Kafka, Producer, Consumer } from "kafkajs";
import { PrismaClient } from "@prisma/client";
import { RideService } from "../services/ride.service";

let producer: Producer;
let consumer: Consumer;
let rideService: RideService;

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
    await consumer.subscribe({ topic: "booking-failed", fromBeginning: false });

    // Set up message handler
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) return;
          
          const messageValue = JSON.parse(message.value.toString());
          
          if (topic === "booking-created") {
            try {
              // Extract all necessary data from the message
              const { bookingId, rideId, userId, meetingPointId } = messageValue;
              
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
              
              // Try to add passenger to ride
              await rideService.addPassenger({
                rideId: Number(rideId),
                passengerId: Number(userId),
              });
              
              // If successful, send passenger-added event
              await producer.send({
                topic: "passenger-added",
                messages: [
                  {
                    key: String(bookingId),
                    value: JSON.stringify({
                      bookingId: bookingId,
                      rideId: rideId,
                      userId: userId,
                    }),
                  },
                ],
              });
              
              console.log(`Passenger ${userId} added to ride ${rideId}`);
            } catch (error) {
              console.error("Error adding passenger to ride:", error);
              
              // If failed, send passenger-add-failed event
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
          } else if (topic === "booking-failed") {
            // Handle booking-failed event
            // ... existing code ...
          }
        } catch (error) {
          console.error("Error processing Kafka message:", error);
        }
      },
    });

    console.log("Kafka consumer started successfully");
  } catch (error) {
    console.error("Error setting up Kafka:", error);
    throw error;
  }
}

export async function disconnectKafka() {
  if (producer) {
    await producer.disconnect();
    console.log("Kafka producer disconnected");
  }
  
  if (consumer) {
    await consumer.disconnect();
    console.log("Kafka consumer disconnected");
  }
}