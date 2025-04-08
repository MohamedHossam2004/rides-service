import { RideService } from "../../services/ride.service";

export const rideResolvers = {
  Mutation: {
    createRide: async (_, args, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.createRide(args);
    },

    addPassenger: async (
      _,
      { rideId, passengerId, passengerName },
      { prisma },
    ) => {
      const rideService = new RideService(prisma);
      return rideService.addPassenger({
        rideId: Number(rideId),
        passengerId: Number(passengerId),
        passengerName,
      });
    },

    removePassenger: async (_, { rideId, passengerId }, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.removePassenger({
        rideId: Number(rideId),
        passengerId: Number(passengerId),
      });
    },
  },
  Query: {
    ride: async (_, { id }, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.getRide(id);
    },

    getRides: async (_, { areaId, driverId, status, limit, offset }, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.getRides({
        areaId: areaId ? Number(areaId) : undefined,
        driverId: driverId ? Number(driverId) : undefined,
        status,
        limit: limit ? Number(limit) : 10,
        offset: offset ? Number(offset) : 0
      });
    },
    
    searchRides: async (_, args, { prisma }) => {
      try {
        const rideService = new RideService(prisma);
        const result = await rideService.searchRides(args);
        return result ?? []; // fallback
      } catch (error) {
        console.error("searchRides resolver error:", error);
        return [];
      }
    },

    viewActiveRide: async (_, { userId }, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.getActiveRideForUser(Number(userId));
    },
  },
};
