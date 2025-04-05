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
};
