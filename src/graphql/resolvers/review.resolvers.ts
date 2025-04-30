import { ReviewService } from "../../services/review.service";
import { RideService } from "../../services/ride.service";

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

    getRiderReviews: async (_, { riderId }, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.getRiderReviews(riderId);
    },

    getDriverAverageRating: async (_, { driverId }, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.getDriverAverageRating(driverId);
    },
  },

  Mutation: {
    createRideReview: async (_, args, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.createRideReview(args);
    },

    updateRideReview: async (_, { id, riderId, ...data }, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.updateRideReview(id, riderId, data);
    },

    deleteRideReview: async (_, { id, riderId }, { prisma }) => {
      const reviewService = new ReviewService(prisma);
      return reviewService.deleteRideReview(id, riderId);
    },
  },
};
