import { ReviewService } from "../../services/review.service";
import { RideService } from "../../services/ride.service";
import { AuthenticationError } from "../../middleware/auth";

export const reviewResolvers = {
  Query: {
    getRideReviews: async (_, { rideId }, context) => {
      // Public endpoint - no authentication required
      const reviewService = new ReviewService(context.prisma);
      return reviewService.getRideReviews(rideId);
    },

    getDriverReviews: async (_, { driverId }, context) => {
      // Public endpoint - no authentication required
      const reviewService = new ReviewService(context.prisma);
      return reviewService.getDriverReviews(driverId);
    },

    getRiderReviews: async (_, { riderId }, context) => {
      // Users can only see their own reviews unless they're admins
      await context.ensureAuthenticated();
      
      if (context.userId !== Number(riderId) && !context.isAdmin) {
        throw new AuthenticationError('You can only view your own reviews');
      }
      
      const reviewService = new ReviewService(context.prisma);
      return reviewService.getRiderReviews(riderId);
    },

    getDriverAverageRating: async (_, { driverId }, context) => {
      // Public endpoint - no authentication required
      const reviewService = new ReviewService(context.prisma);
      return reviewService.getDriverAverageRating(driverId);
    },

    getAllReviews: async (_, __, context) => {
      // Ensure user is authenticated and is an admin
      await context.ensureAuthenticated();
      
      if (!context.isAdmin) {
        throw new AuthenticationError('Only admins can view all reviews');
      }
      
      const reviewService = new ReviewService(context.prisma);
      return reviewService.getAllReviews();
    },
  },

  Mutation: {
    createRideReview: async (_, args, context) => {
      // Ensure user is authenticated
      await context.ensureAuthenticated();
      
      // Use the authenticated user's ID as the rider ID
      const userId = context.userId;
      if (!userId) {
        throw new AuthenticationError('User ID not found in token');
      }
      
      // Override any provided riderId with the authenticated user's ID
      args.riderId = userId;
      
      const reviewService = new ReviewService(context.prisma);
      return reviewService.createRideReview(args);
    },

    updateRideReview: async (_, { id, riderId, ...data }, context) => {
      // Ensure user is authenticated
      await context.ensureAuthenticated();
      
      // Use the authenticated user's ID as the rider ID
      const userId = context.userId;
      if (!userId) {
        throw new AuthenticationError('User ID not found in token');
      }
      
      // Override any provided riderId with the authenticated user's ID
      // or allow admins to update any review
      if (!context.isAdmin) {
        riderId = userId;
      }
      
      const reviewService = new ReviewService(context.prisma);
      return reviewService.updateRideReview(id, riderId, data);
    },

    deleteRideReview: async (_, { id, riderId }, context) => {
      // Ensure user is authenticated
      await context.ensureAuthenticated();
      
      // Use the authenticated user's ID as the rider ID
      const userId = context.userId;
      if (!userId) {
        throw new AuthenticationError('User ID not found in token');
      }
      
      // Users can only delete their own reviews unless they're admins
      if (!context.isAdmin && userId !== Number(riderId)) {
        throw new AuthenticationError('You can only delete your own reviews');
      }
      
      const reviewService = new ReviewService(context.prisma);
      return reviewService.deleteRideReview(id, context.isAdmin ? riderId : userId);
    },
  },
};
