import { RideService } from "../../services/ride.service";

export const rideResolvers = {
  Mutation: {
    createRide: async (_, args, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.createRide(args);
    },

    addSeat: async (_, { rideId }, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.addSeat(Number(rideId));
    },

    removeSeat: async (_, { rideId }, { prisma }) => {
      const rideService = new RideService(prisma);
      return rideService.removeSeat(Number(rideId));
    },
  },
};
