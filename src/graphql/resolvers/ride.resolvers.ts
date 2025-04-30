import { RideService } from "../../services/ride.service";

export const rideResolvers = {
  Mutation: {
    createRide: async (_, args, { prisma, producer }) => {
      const rideService = new RideService(prisma, producer);
      return rideService.createRide(args);
    },

    addPassenger: async (
      _,
      { rideId, passengerId, email },
      { prisma, producer },
    ) => {
      const rideService = new RideService(prisma, producer);
      return rideService.addPassenger({
        rideId: Number(rideId),
        passengerId: Number(passengerId),
        email: email,
      });
    },

    removePassenger: async (_, { rideId, passengerId }, { prisma, producer }) => {
      const rideService = new RideService(prisma, producer);
      return rideService.removePassenger({
        rideId: Number(rideId),
        passengerId: Number(passengerId),
      });
    },
    
    updateRideStatus: async (_, { rideId, status }, { prisma, producer }) => {
      const rideService = new RideService(prisma, producer);
      return rideService.updateRideStatus({
        rideId: Number(rideId),
        status: status,
      });
    }
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

    viewUpcomingRide: async (_, { userId }, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.getUpcomingRideForUser(Number(userId));
    },
  },
};