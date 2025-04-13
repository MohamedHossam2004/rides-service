import { ReviewService } from "../../services/review.service";
import { RideService } from "../../services/ride.service";
import { ensureAuthenticated } from "../../middleware/auth.middleware";

export const reviewResolvers = {
  Query: {
    getRideReviews: async (_, { rideId }, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.getRideReviews(rideId);
    },

    getDriverReviews: async (_, { driverId }, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.getDriverReviews(driverId);
    },

    getRiderReviews: async (_, { riderId }, { prisma, user }) => {
      ensureAuthenticated(user); // Ensure user is authenticated
      const reviewService = new ReviewService(prisma);
      return reviewService.getRiderReviews(riderId || user.userId); // Use authenticated user's ID if riderId is not provided
    },

    getDriverAverageRating: async (_, { driverId }, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.getDriverAverageRating(driverId);
    },
    searchRides: async (_, args, { prisma }) => {
      try {
        const rideService = new RideService(prisma);
        const result = await rideService.searchRides(args);
        return result ?? [];
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

  Mutation: {
    createRideReview: async (_, args, { prisma, user }) => {
      ensureAuthenticated(user);
      const reviewService = new ReviewService(prisma);
      return reviewService.createRideReview({ ...args, riderId: user.userId }); 
    },

    updateRideReview: async (_, { id, ...data }, { prisma, user }) => {
      ensureAuthenticated(user); 
      const reviewService = new ReviewService(prisma);
      return reviewService.updateRideReview(id, user.userId, data);
    },

    deleteRideReview: async (_, { id }, { prisma, user }) => {
      ensureAuthenticated(user);
      const reviewService = new ReviewService(prisma);
      return reviewService.deleteRideReview(id, user.userId);
    },
  },
};
