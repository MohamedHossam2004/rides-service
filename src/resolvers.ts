import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const resolvers = {
  Mutation: {
      createRide: async (
        _: unknown,
        args: {areaId: number;departureTime: string;driverId: number;girlsOnly: boolean;toGIU: boolean;
        pricing: { meetingPointId: number; price: number }[];
        }
      ) => {
        try {
          const { areaId, departureTime, driverId, girlsOnly, toGIU, pricing } = args;

          // Validate Area
          const area = await prisma.area.findUnique({
            where: { id: areaId },
            include: { meeting_points: true },
          });
  
          if (!area) {
            throw new Error("Invalid area ID");
          }

          // Validate Meeting Points

          const meetingPointIds = area.meeting_points.map(mp => mp.id);
          const invalidMeetingPoints = pricing.filter(p => !meetingPointIds.includes(p.meetingPointId));

          if (invalidMeetingPoints.length > 0) {
             throw new Error("One or more meeting points are invalid for this area");
          }

          // Create Ride
          const newRide = await prisma.ride.create({
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
          const meetingPointsData = pricing.map((p, index) => ({
            ride_id: newRide.id,
            meeting_point_id: p.meetingPointId,
            price: p.price,
            order_index: index,
          }));

        await prisma.rideMeetingPoint.createMany({ data: meetingPointsData });


        const rideWithMeetingPoints = await prisma.ride.findUnique({
          where: { id: newRide.id },
          include: {
            ride_meeting_points: {
              include: {
                ride : true,
                meeting_point: true,
              },
              orderBy: { order_index: "asc" },
            },
          },
        });

        if (!rideWithMeetingPoints) {
          throw new Error("Ride with meeting points not found");
        }

        const rideData = {
          driverId: rideWithMeetingPoints.driver_id, 
          girlsOnly: rideWithMeetingPoints.girls_only, 
          seatsAvailable: rideWithMeetingPoints.seats_available,
          toGIU: rideWithMeetingPoints.to_giu, 
          ...rideWithMeetingPoints,
          departureTime: rideWithMeetingPoints.departure_time.toISOString(),
          createdAt: rideWithMeetingPoints.created_at.toISOString(),
          updatedAt: rideWithMeetingPoints.updated_at.toISOString(),
          meetingPoints: rideWithMeetingPoints.ride_meeting_points.map(rp => ({
            ...rp.meeting_point, 
            price: rp.price,
            orderIndex: rp.order_index,
            ride: { 
              ...rideWithMeetingPoints,
              seatsAvailable: rideWithMeetingPoints.seats_available, 
              toGIU: rideWithMeetingPoints.to_giu, 
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
        throw new Error(error instanceof Error ? error.message : "An unknown error occurred");
      }
    },

    createAreaWithMeetingPoints: async (_: unknown, { input }: { 
        input: { name: string;  isActive: boolean; meetingPoints: {name: string;  longitude: number;  latitude: number;  isActive: boolean 
          }[] 
        } 
      }
    ) => {
      try {
         // Check if area with the same name already exists
    const existingArea = await prisma.area.findUnique({
      where: { name: input.name },
    });

    if (existingArea) {
      throw new Error(`Area with name "${input.name}" already exists.`);
    }

        // Insert the Area
        const area = await prisma.area.create({
          data: {
            name: input.name,
            is_active: input.isActive, 
          },
        });
  
        // Insert MeetingPoints
        await prisma.meetingPoint.createMany({
          data: input.meetingPoints.map(mp => ({
            name: mp.name,
            longitude: mp.longitude,
            latitude: mp.latitude,
            is_active: mp.isActive, 
            area_id: area.id, 
          })),
        });
       
        const createdArea = await prisma.area.findUnique({
          where: { id: area.id },
          include: { meeting_points: true }, 
        });
        
        if (!createdArea) {
          throw new Error("Area not found");
        }

        return {
          id: createdArea.id,
          name: createdArea.name,
          isActive: createdArea.is_active, 
          meetingPoints: createdArea.meeting_points.map(mp => ({
            id: mp.id,
            name: mp.name,
            longitude: mp.longitude,
            latitude: mp.latitude,
            isActive: mp.is_active, 
          })),
        };
        
      }  catch (error) {
        console.error("Error meeting point :", error);
        if (error instanceof Error) {
          throw new Error(error.message);
        } else {
          throw new Error("An unknown error occurred");
        }
      }
    },
    
    //update 

    addSeat: async (_: unknown, { rideId }: { rideId: number }) => {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        select: { seats_available: true },
      });
  
      if (!ride) throw new Error("Ride not found");
      if (ride.seats_available >= 4) throw new Error("Cannot exceed 4 seats");
  
      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: { seats_available: { increment: 1 } },
        select: { id: true, seats_available: true },
      });
  
      return {
        id: updatedRide.id.toString(),
        seatsAvailable: updatedRide.seats_available,
      };
    },
  
    removeSeat: async (_: unknown, { rideId }: { rideId: number }) => {
      const ride = await prisma.ride.findUnique({
        where: { id: rideId },
        select: { seats_available: true },
      });
  
      if (!ride) throw new Error("Ride not found");
      if (ride.seats_available <= 0) throw new Error("Cannot have negative seats");
  
      const updatedRide = await prisma.ride.update({
        where: { id: rideId },
        data: { seats_available: { decrement: 1 } },
        select: { id: true, seats_available: true },
      });
  
      return {
        id: updatedRide.id.toString(),
        seatsAvailable: updatedRide.seats_available,
      };
    },
  },
};
