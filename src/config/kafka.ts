import { Kafka, Producer, Consumer } from "kafkajs";
import { PrismaClient } from "@prisma/client";
import { RideService } from "../services/ride.service";

let producer: Producer;
let consumer: Consumer;

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

    await consumer.connect();
    console.log("Kafka consumer connected successfully");

    // Subscribe to booking-created topic
    await consumer.subscribe({ topic: "booking-created", fromBeginning: false });
    // Subscribe to booking-failed topic
    await consumer.subscribe({ topic: "booking-failed", fromBeginning: false });

    // Set up message handler
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = JSON.parse(message.value!.toString());
          
          if (topic === "booking-created") {
            const rideService = new RideService(prisma);
            
            try {
              // Try to add passenger to ride
              await rideService.addPassenger({
                rideId: messageValue.rideId,
                passengerId: messageValue.userId,
                passengerName: messageValue.passengerName || `User ${messageValue.userId}`,
              });
              
              // If successful, send passenger-added event
              await producer.send({
                topic: "passenger-added",
                messages: [
                  {
                    key: String(messageValue.bookingId),
                    value: JSON.stringify({
                      bookingId: messageValue.bookingId,
                      rideId: messageValue.rideId,
                      userId: messageValue.userId,
                    }),
                  },
                ],
              });
              
              console.log(`Passenger ${messageValue.userId} added to ride ${messageValue.rideId}`);
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
            try {
              // Extract ride and user information from the message
              const { bookingId, rideId, userId } = messageValue;
              
              if (rideId && userId) {
                const rideService = new RideService(prisma);
                
                // Try to remove the passenger from the ride
                await rideService.removePassenger({
                  rideId: Number(rideId),
                  passengerId: Number(userId),
                });
                
                // Send confirmation that passenger was removed
                await producer.send({
                  topic: "passenger-removed",
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
                
                console.log(`Passenger ${userId} removed from ride ${rideId} due to booking failure`);
              } else {
                console.log(`Missing ride or user information for booking ${bookingId}`);
              }
            } catch (error) {
              console.error("Error handling booking-failed event:", error);
            }
          }
        } catch (error) {
          console.error("Error processing Kafka message:", error);
        }
      },
    });
  } catch (error) {
    console.error("Error setting up Kafka:", error);
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