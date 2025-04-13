import { RideService } from "../../services/ride.service";
import { ensureAuthenticated, ensureDriver, ensureAdmin } from "../../middleware/auth.middleware";

export const rideResolvers = {
  Mutation: {
    createRide: async (_, args, { prisma, producer, user }) => {
      const authenticatedUser = ensureDriver(user);
      
      const rideService = new RideService(prisma, producer);
      return rideService.createRide({
        ...args,
        driverId: authenticatedUser.userId // Use the authenticated user's ID
      });
    },

    addPassenger: async (_, { rideId }, { prisma, producer, user }) => {
      ensureAuthenticated(user); // Ensure user is authenticated
    
      const rideService = new RideService(prisma, producer);
      return rideService.addPassenger({
        rideId: Number(rideId),
        passengerId: user.userId, // Use the authenticated user's ID as passengerId
        email: user.email, // Pass the email from the token
      });
    },

    removePassenger: async (_, { rideId }, { prisma, producer, user }) => {
      ensureAuthenticated(user); // Ensure user is authenticated

      const rideService = new RideService(prisma, producer);
      return rideService.removePassenger({
        rideId: Number(rideId),
        passengerId: user.userId, // Use the authenticated user's ID as passengerId
      });
    },
    
    updateRideStatus: async (_, { rideId, status }, { prisma, producer, user }) => {
      ensureDriver(user); // Ensure user is a driver

      const rideService = new RideService(prisma, producer);
      return rideService.updateRideStatus({
        rideId: Number(rideId),
        status: status,
      });
    }
  },
  Query: {
    ride: async (_, { id }, { prisma, user }) => {
      ensureAuthenticated(user); 

      const rideService = new RideService(prisma);
      return rideService.getRide(id);
    },

    getRides: async (_, { areaId, driverId, status, limit, offset }, { prisma, user }) => {

      const rideService = new RideService(prisma);
      return rideService.getRides({
        areaId: areaId ? Number(areaId) : undefined,
        driverId: driverId ? Number(driverId) : undefined,
        status,
        limit: limit ? Number(limit) : 10,
        offset: offset ? Number(offset) : 0
      });
    },
    
    searchRides: async (_, args, { prisma, user }) => {

      try {
        const rideService = new RideService(prisma);
        const result = await rideService.searchRides(args);
        return result ?? []; // fallback
      } catch (error) {
        console.error("searchRides resolver error:", error);
        return [];
      }
    },

    viewActiveRide: async (_, __, { prisma, user }) => {
      ensureAuthenticated(user); // Ensure user is authenticated

      const rideService = new RideService(prisma);
      return rideService.getActiveRideForUser(user.userId); // Use the authenticated user's ID
    },
  },
};