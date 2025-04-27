import { PrismaClient } from "@prisma/client";
import { Producer } from "kafkajs";
import { scheduleRideReminder } from "../config/queue";

export class RideService {
  private producer: Producer | null;
  
  constructor(private prisma: PrismaClient, producer?: Producer) {
    this.producer = producer || null;
  }

  // Set producer method to be used after initialization
  setProducer(producer: Producer) {
    this.producer = producer;
  }

  private formatRide(ride: any) {
    return {
      id: ride.id,
      area: ride.area,
      toGIU: ride.to_giu,
      status: ride.status,
      driverId: ride.driver_id,
      girlsOnly: ride.girls_only,
      seatsAvailable: ride.seats_available,
      departureTime: ride.departure_time.toISOString(),
      createdAt: ride.created_at.toISOString(),
      updatedAt: ride.updated_at.toISOString(),
      meetingPoints:
        ride.ride_meeting_points?.map((rp: any) => ({
          id: rp.id,
          price: rp.price,
          orderIndex: rp.order_index,
          meetingPoint: rp.meeting_point
            ? {
                id: rp.meeting_point.id,
                name: rp.meeting_point.name,
                longitude: rp.meeting_point.longitude,
                latitude: rp.meeting_point.latitude,
                isActive: rp.meeting_point.is_active,
              }
            : null,
        })) || [],
      passengers:
        ride.passengers?.map((p: any) => ({
          id: p.id,
          passengerId: p.passenger_id,
          passengerName: p.passenger_name,
          createdAt: p.created_at.toISOString(),
        })) || [],
      reviews:
        ride.reviews?.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          review: r.review,
          createdAt: r.created_at.toISOString(),
        })) || [],
    };
  }

  async createRide(args: any) {
    try {
      const { areaId, departureTime, driverId, girlsOnly, toGIU, pricing } =
        args;

      // Validate Area
      const area = await this.prisma.area.findUnique({
        where: { id: areaId },
        include: { meeting_points: true },
      });

      if (!area) {
        throw new Error("Invalid area ID");
      }

      // Validate Meeting Points
      const meetingPointIds = area.meeting_points.map((mp) => mp.id);
      const invalidMeetingPoints = pricing.filter(
        (p: any) => !meetingPointIds.includes(p.meetingPointId),
      );

      if (invalidMeetingPoints.length > 0) {
        throw new Error("One or more meeting points are invalid for this area");
      }

      const currentTime = new Date();
      const cairoTimeOffset = 2 * 60 * 60 * 1000;
      const cairoCurrentTime = new Date(
        currentTime.getTime() + cairoTimeOffset,
      );

      const departureTimeDate = new Date(departureTime);
      const departureCairoTime = new Date(
        departureTimeDate.getTime() + cairoTimeOffset,
      );

      if (departureCairoTime < cairoCurrentTime) {
        throw new Error("Departure time cannot be in the past");
      }

      // Check if the departure time is more than 48 hours ahead
      const maxDepartureTime = new Date(
        cairoCurrentTime.getTime() + 48 * 60 * 60 * 1000,
      );
      if (departureCairoTime > maxDepartureTime) {
        throw new Error("Departure time cannot be more than 48 hours from now");
      }
      // Create Ride
      const newRide = await this.prisma.ride.create({
        data: {
          area_id: areaId,
          to_giu: toGIU,
          departure_time: new Date(departureTime),
          driver_id: driverId,
          girls_only: girlsOnly,
          seats_available: 4,
          status: "PENDING",
        },
      });

      // Create RideMeetingPoints
      const meetingPointsData = pricing.map((p: any, index: number) => ({
        ride_id: newRide.id,
        meeting_point_id: p.meetingPointId,
        price: p.price,
        order_index: index,
      }));

      await this.prisma.rideMeetingPoint.createMany({
        data: meetingPointsData,
      });

      // Fetch the newly created ride with all necessary relations
      const rideWithRelations = await this.prisma.ride.findUnique({
        where: { id: newRide.id },
        include: {
          area: true,
          ride_meeting_points: {
            include: {
              meeting_point: true,
            },
            orderBy: { order_index: "asc" },
          },
          passengers: true,
        },
      });

      if (!rideWithRelations) {
        throw new Error("Ride with relations not found");
      }

      // Send Kafka event if producer is available
      if (this.producer) {
        await this.producer.send({
          topic: "ride-created",
          messages: [
            {
              key: String(rideWithRelations.id),
              value: JSON.stringify(rideWithRelations),
            },
          ],
        });
      }
      
      // Schedule a reminder notification 15 minutes before departure
      try {
        await scheduleRideReminder(rideWithRelations.id, rideWithRelations.departure_time);
      } catch (error) {
        console.error(`Failed to schedule reminder for ride ${rideWithRelations.id}:`, error);
        // Don't throw error here, as the ride creation was successful
      }

      const rideData = {
        driverId: rideWithRelations.driver_id,
        girlsOnly: rideWithRelations.girls_only,
        seatsAvailable: rideWithRelations.seats_available,
        toGIU: rideWithRelations.to_giu,
        ...rideWithRelations,
        departureTime: rideWithRelations.departure_time.toISOString(),
        createdAt: rideWithRelations.created_at.toISOString(),
        updatedAt: rideWithRelations.updated_at.toISOString(),
        meetingPoints: rideWithRelations.ride_meeting_points.map((rp) => ({
          id: rp.id,
          price: rp.price,
          orderIndex: rp.order_index,
          meetingPoint: {
            id: rp.meeting_point.id,
            name: rp.meeting_point.name,
            longitude: rp.meeting_point.longitude,
            latitude: rp.meeting_point.latitude,
            isActive: rp.meeting_point.is_active,
          },
        })),
      };

      return rideData;
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error("An unknown error occurred");
      }
      throw new Error(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  }

  async addPassenger(args: {
    rideId: number;
    passengerId: number;
    email: string;
  }) {
    const { rideId, passengerId,email } = args;
  
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { passengers: true },
    });
  
    if (!ride) {
      throw new Error("Ride not found");
    }
  
    if (ride.departure_time < new Date()) {
      throw new Error("Ride has already departed");
    }
  
    if (ride.status !== "PENDING") {
      throw new Error("Ride is not available");
    }
  
    // Check if there are seats available
    if (ride.seats_available <= 0) {
      throw new Error("No seats available");
    }
  
    // Check if passenger is already in the ride
    const existingPassenger = ride.passengers.find(
      (p) => p.passenger_id === passengerId,
    );
    if (existingPassenger) {
      throw new Error("Passenger already added to this ride");
    }
  
    // Add passenger and decrement available seats in a transaction
    const updatedRide = await this.prisma.$transaction(async (prisma) => {
      console.log(email);
      await prisma.ridePassenger.create({
        data: {
          ride_id: rideId,
          passenger_email: email,
          passenger_id: passengerId,
          passenger_name: `User ${passengerId}`, // Default passenger name
        },
      });
  
      return prisma.ride.update({
        where: { id: rideId },
        data: { seats_available: { decrement: 1 } },
        include: {
          area: true,
          ride_meeting_points: {
            include: { meeting_point: true },
            orderBy: { order_index: "asc" },
          },
          passengers: true,
        },
      });
    });
  
    // Send Kafka event if producer is available
    if (this.producer) {
      await this.producer.send({
        topic: "passenger-added-to-ride",
        messages: [
          {
            key: String(updatedRide.id),
            value: JSON.stringify({
              rideId: updatedRide.id,
              passengerId: passengerId,
            }),
          },
        ],
      });
    }
  
    return this.formatRide(updatedRide);
  }
  
  // Remove a passenger from a ride
  async removePassenger(args: {
    rideId: number;
    passengerId: number;
  }) {
    const { rideId, passengerId } = args;
  
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { passengers: true },
    });
  
    if (!ride) {
      throw new Error("Ride not found");
    }
  
    // Check if passenger is in the ride
    const existingPassenger = ride.passengers.find(
      (p) => p.passenger_id === passengerId
    );
    
    if (!existingPassenger) {
      throw new Error("Passenger not found in this ride");
    }
  
    // Remove passenger and increment available seats in a transaction
    const updatedRide = await this.prisma.$transaction(async (prisma) => {
      await prisma.ridePassenger.deleteMany({
        where: {
          ride_id: rideId,
          passenger_id: passengerId,
        },
      });
  
      return prisma.ride.update({
        where: { id: rideId },
        data: { seats_available: { increment: 1 } },
        include: {
          area: true,
          ride_meeting_points: {
            include: { meeting_point: true },
            orderBy: { order_index: "asc" },
          },
          passengers: true,
        },
      });
    });
  
    // Emit passenger-removed-from-ride event if producer is available
    if (this.producer) {
      await this.producer.send({
        topic: "passenger-removed-from-ride",
        messages: [
          {
            key: String(updatedRide.id),
            value: JSON.stringify({
              rideId: updatedRide.id,
              passengerId: passengerId,
            }),
          },
        ],
      });
    }
  
    return this.formatRide(updatedRide);
  }

  async searchRides(filters: {
    toGIU?: boolean;
    girlsOnly?: boolean;
    areaId?: number;
    departureAfter?: string;
  }) {
    try {
      const { toGIU, girlsOnly, areaId, departureAfter } = filters;
  
      const rides = await this.prisma.ride.findMany({
        where: {
          ...(toGIU !== undefined && { to_giu: toGIU }),
          ...(girlsOnly !== undefined && { girls_only: girlsOnly }),
          ...(areaId !== undefined && { area_id: areaId }),
          ...(departureAfter && {
            departure_time: {
              gte: new Date(departureAfter),
            },
          }),
          status: 'PENDING',
        },
        include: {
          area: true,
          ride_meeting_points: {
            include: { meeting_point: true },
            orderBy: { order_index: 'asc' },
          },
          reviews: true, // Include reviews in the query
        },
      });
  
      if (!rides || rides.length === 0) return [];
  
      return rides
        .filter((ride) => ride.area && ride.ride_meeting_points.every((rp) => rp.meeting_point))
        .map((ride) => ({
          id: ride.id,
          driverId: ride.driver_id,
          girlsOnly: ride.girls_only,
          toGIU: ride.to_giu,
          status: ride.status ?? "PENDING",
          departureTime: ride.departure_time.toISOString(),
          createdAt: ride.created_at.toISOString(),
          updatedAt: ride.updated_at.toISOString(),
          seatsAvailable: ride.seats_available,
          meetingPoints: ride.ride_meeting_points.map((rp) => ({
            price: rp.price,
            orderIndex: rp.order_index,
            meetingPoint: {
              name: rp.meeting_point.name,
              latitude: rp.meeting_point.latitude,
              longitude: rp.meeting_point.longitude,
            },
          })),
          area: {
            name: ride.area.name,
          },
          reviews: ride.reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            review: review.review,
            createdAt: review.created_at.toISOString(),
          })),
        }));
    } catch (error) {
      console.error("searchRides service error:", error);
      return [];
    }
  }

  async getActiveRideForUser(userId: number) {
    try {
      const ride = await this.prisma.ride.findFirst({
        where: {
          driver_id: userId,
          status: {
            in: ['PENDING', 'IN_PROGRESS'],
          },
          departure_time: {
            gte: new Date(),
          },
        },
        orderBy: {
          departure_time: 'asc',
        },
        include: {
          area: true,
          ride_meeting_points: {
            include: { meeting_point: true },
            orderBy: { order_index: 'asc' },
          },
          reviews: true, // Include reviews in the query
        },
      });
  
      if (!ride || !ride.departure_time) return null;
  
      return {
        id: ride.id,
        status: ride.status ?? "PENDING",
        driverId: ride.driver_id,
        girlsOnly: ride.girls_only,
        toGIU: ride.to_giu,
        departureTime: ride.departure_time.toISOString(),
        createdAt: ride.created_at.toISOString(),
        updatedAt: ride.updated_at.toISOString(),
        seatsAvailable: ride.seats_available,
        area: {
          name: ride.area?.name ?? "Unknown Area",
        },
        meetingPoints: ride.ride_meeting_points.map((rp) => ({
          price: rp.price,
          orderIndex: rp.order_index,
          meetingPoint: {
            name: rp.meeting_point.name,
            latitude: rp.meeting_point.latitude,
            longitude: rp.meeting_point.longitude,
          },
        })),
        reviews: ride.reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          review: review.review,
          createdAt: review.created_at.toISOString(),
        })),
      };
    } catch (err) {
      console.error("🚨 getActiveRideForUser error:", err);
      return null;
    }
  }
  
  async getRide(id: string | number) {
    try {
      const rideId = Number(id);
      
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
        include: {
          area: true,
          ride_meeting_points: {
            include: { meeting_point: true },
            orderBy: { order_index: 'asc' },
          },
          passengers: true,
          reviews: true,
        },
      });
  
      if (!ride) {
        throw new Error(`Ride with ID ${id} not found`);
      }
  
      return this.formatRide(ride);
    } catch (error) {
      console.error(`Error fetching ride with ID ${id}:`, error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error(`An unknown error occurred while fetching ride with ID ${id}`);
    }
  }

  async getRides(filters: {
    areaId?: number;
    driverId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const { areaId, driverId, status, limit = 10, offset = 0 } = filters;
      
      // Build the where clause based on provided filters
      const where: any = {};
      if (areaId !== undefined) where.area_id = areaId;
      if (driverId !== undefined) where.driver_id = driverId;
      if (status !== undefined) where.status = status;
  
      // Count total rides matching the criteria
      const totalCount = await this.prisma.ride.count({ where });
      
      // Fetch rides with pagination
      const rides = await this.prisma.ride.findMany({
        where,
        include: {
          area: true,
          ride_meeting_points: {
            include: { meeting_point: true },
            orderBy: { order_index: 'asc' },
          },
          passengers: true,
          reviews: true,
        },
        orderBy: { departure_time: 'desc' },
        skip: offset,
        take: limit,
      });
  
      // Format rides
      const formattedRides = rides.map(ride => this.formatRide(ride));
      
      // Return paginated result
      return {
        rides: formattedRides,
        total: totalCount,
        hasMore: offset + rides.length < totalCount,
      };
    } catch (error) {
      console.error("Error fetching rides:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred while fetching rides");
    }
  }
  async updateRideStatus(args: {
    rideId: number;
    status: string;
  }) {
    const { rideId, status } = args;
  
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId }
    });
  
    if (!ride) {
      throw new Error("Ride not found");
    }
  
    // Validate status transition
    if (ride.status === "COMPLETED" && status !== "COMPLETED") {
      throw new Error("Cannot change status of a completed ride");
    }
  
    
    // Update ride status - Fix type error by casting status to RideStatus
    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: status as any }, // Using type assertion to fix the type error
      include: {
        area: true,
        ride_meeting_points: {
          include: { meeting_point: true },
          orderBy: { order_index: "asc" },
        },
        passengers: true,
      },
    });
    
    // Get passenger emails for any status update
    const passengerEmails = updatedRide.passengers.map(
      passenger => passenger.passenger_email || `user${passenger.passenger_id}@example.com`
    );

    if (passengerEmails.length > 0) {
      try {
        // Call notification service API
        // Use the service name from docker-compose as the hostname
        const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3001';
        console.log(`Attempting to connect to notification service at: ${notificationServiceUrl}`);
        
        if (status === "CANCELLED") {
          // For cancelled rides, use the existing cancellation notification
          const notificationResponse = await fetch(
            `${notificationServiceUrl}/notifications/notifyCancelRide`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'rideCanceled',
                to: passengerEmails,
                subject: 'Your Ride Has Been Cancelled',
                payload: {
                  fromPlace: updatedRide.area.name,
                  toPlace: updatedRide.to_giu ? "GIU" : "Home",
                  date: updatedRide.departure_time.toLocaleString(),
                },
              }),
            }
          );
          
          if (!notificationResponse.ok) {
            console.error('Failed to send cancellation notifications:', await notificationResponse.text());
          } else {
            console.log(`Cancellation notifications sent to ${passengerEmails.length} passengers`);
          }
        } else {
          // For other status updates, use the dedicated ride update notification endpoint
          const notificationResponse = await fetch(
            `${notificationServiceUrl}/notifications/notifyRideUpdate`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'rideUpdate',
                to: passengerEmails,
                subject: `Your Ride Status Has Been Updated to ${status}`,
                payload: {
                  username: 'Passenger', // Generic username
                  status: status,
                  fromPlace: updatedRide.area.name,
                  toPlace: updatedRide.to_giu ? "GIU" : "Home",
                  date: updatedRide.departure_time.toLocaleString(),
                  details: `Your ride status has been updated to ${status}. Please check your ride details.`
                },
              }),
            }
          );
          
          if (!notificationResponse.ok) {
            console.error(`Failed to send ${status} status update notifications:`, await notificationResponse.text());
          } else {
            console.log(`Status update notifications sent to ${passengerEmails.length} passengers`);
          }
        }
      } catch (error) {
        console.error('Error calling notification service:', error);
      }
    }
  
    // If ride is cancelled, emit an event for each passenger
    if (status === "CANCELLED" && this.producer) {
      // Fix type error by ensuring passengers exists on updatedRide
      for (const passenger of updatedRide.passengers || []) {
        await this.producer.send({
          topic: "passenger-removed-from-ride",
          messages: [
            {
              key: String(updatedRide.id),
              value: JSON.stringify({
                rideId: updatedRide.id,
                passengerId: passenger.passenger_id,
              }),
            },
          ],
        });
      }
      
      // Also send a ride-status-changed event
      await this.producer.send({
        topic: "ride-status-changed",
        messages: [
          {
            key: String(updatedRide.id),
            value: JSON.stringify({
              rideId: updatedRide.id,
              status: status,
            }),
          },
        ],
      });
    } else if (this.producer) {
      // For other status changes, just send the status change event
      await this.producer.send({
        topic: "ride-status-changed",
        messages: [
          {
            key: String(updatedRide.id),
            value: JSON.stringify({
              rideId: updatedRide.id,
              status: status,
            }),
          },
        ],
      });
    }
  
    return this.formatRide(updatedRide);
  }
}