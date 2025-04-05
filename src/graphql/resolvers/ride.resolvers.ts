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
