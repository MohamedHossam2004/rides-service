import { PrismaClient } from "@prisma/client";

export class ReviewService {
  constructor(private prisma: PrismaClient) {}

  // Helper method to properly format a ride object
  private formatRide(ride: any) {
    if (!ride) return null;

    return {
      id: ride.id,
      area_id: ride.area_id,
      area: ride.area,
      to_giu: ride.to_giu,
      toGIU: ride.to_giu,
      status: ride.status,
      driver_id: ride.driver_id,
      driverId: ride.driver_id,
      girls_only: ride.girls_only,
      girlsOnly: ride.girls_only,
      departure_time: ride.departure_time,
      departureTime: ride.departure_time
        ? ride.departure_time.toISOString()
        : new Date().toISOString(), // Ensure never null
      seats_available: ride.seats_available,
      seatsAvailable: ride.seats_available,
      created_at: ride.created_at,
      createdAt: ride.created_at
        ? ride.created_at.toISOString()
        : new Date().toISOString(),
      updated_at: ride.updated_at,
      updatedAt: ride.updated_at
        ? ride.updated_at.toISOString()
        : new Date().toISOString(),
      ride_meeting_points: ride.ride_meeting_points,
      meetingPoints: ride.ride_meeting_points,
    };
  }

  async createRideReview(args: {
    rideId: string | number;
    riderId: string | number;
    rating: number;
    review?: string;
  }) {
    try {
      const { rideId, riderId, rating, review } = args;
      const rideIdNum = Number(rideId);
      const riderIdNum = Number(riderId);

      // Validate ride exists
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideIdNum },
        include: {
          passengers: true,
        },
      });

      if (!ride) {
        throw new Error(`Ride with ID ${rideId} not found`);
      }

      // Verify that the rider was actually a passenger in this ride
      const wasPassenger = ride.passengers.some(
        (p) => p.passenger_id === riderIdNum,
      );

      if (!wasPassenger) {
        throw new Error(
          "You can only review rides you participated in as a passenger",
        );
      }

      if (ride.status !== "COMPLETED") {
        throw new Error("Can only review completed rides");
      }

      const existingReview = await this.prisma.rideReview.findUnique({
        where: {
          ride_id_rider_id: {
            ride_id: rideIdNum,
            rider_id: riderIdNum,
          },
        },
      });

      if (existingReview) {
        throw new Error("You have already reviewed this ride");
      }

      // Validate rating is between 1 and 5
      if (rating < 1 || rating > 5) {
        throw new Error("Rating must be between 1 and 5");
      }

      const newReview = await this.prisma.rideReview.create({
        data: {
          ride_id: rideIdNum,
          rider_id: riderIdNum,
          driver_id: ride.driver_id,
          rating,
          review: review || null,
        },
      });

      return {
        id: newReview.id,
        driverId: newReview.driver_id,
        riderId: newReview.rider_id,
        rating: newReview.rating,
        review: newReview.review,
        createdAt: newReview.created_at.toISOString(),
        ride: this.formatRide(ride),
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error creating review: ${error.message}`);
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred while creating the review");
    }
  }
  async updateRideReview(
    id: string | number,
    riderId: string | number,
    data: { rating?: number; review?: string },
  ) {
    try {
      const reviewId = Number(id);

      // Check if review exists
      const existingReview = await this.prisma.rideReview.findUnique({
        where: { id: reviewId },
        include: { ride: true },
      });

      if (!existingReview) {
        throw new Error(`Review with ID ${id} not found`);
      }

      // Ensure that only the rider who created the review can update it
      if (existingReview.rider_id !== Number(riderId)) {
        throw new Error("You can only update your own reviews");
      }

      // Validate rating if provided
      if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
        throw new Error("Rating must be between 1 and 5");
      }

      // Update review
      const updatedReview = await this.prisma.rideReview.update({
        where: { id: reviewId },
        data: {
          rating: data.rating !== undefined ? data.rating : undefined,
          review: data.review !== undefined ? data.review : undefined,
        },
        include: { ride: true },
      });

      return {
        id: updatedReview.id,
        driverId: updatedReview.driver_id,
        riderId: updatedReview.rider_id,
        rating: updatedReview.rating,
        review: updatedReview.review,
        createdAt: updatedReview.created_at.toISOString(),
        ride: this.formatRide(updatedReview.ride),
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error updating review: ${error.message}`);
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred while updating the review");
    }
  }

  async deleteRideReview(id: string | number, riderId: string | number) {
    try {
      const reviewId = Number(id);

      // Check if review exists
      const existingReview = await this.prisma.rideReview.findUnique({
        where: { id: reviewId },
      });

      if (!existingReview) {
        throw new Error(`Review with ID ${id} not found`);
      }

      // Ensure that only the rider who created the review can delete it
      if (existingReview.rider_id !== Number(riderId)) {
        throw new Error("You can only delete your own reviews");
      }

      // Delete review
      await this.prisma.rideReview.delete({
        where: { id: reviewId },
      });

      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error deleting review: ${error.message}`);
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred while deleting the review");
    }
  }

  async getRideReviews(rideId: string | number) {
    try {
      const ride = await this.prisma.ride.findUnique({
        where: { id: Number(rideId) },
        include: { area: true }, // Include area here too
      });

      if (!ride) {
        throw new Error(`Ride with ID ${rideId} not found`);
      }

      const reviews = await this.prisma.rideReview.findMany({
        where: { ride_id: Number(rideId) },
        orderBy: { created_at: "desc" },
        include: {
          ride: {
            include: {
              area: true,
            },
          },
        },
      });

      return reviews.map((review) => ({
        id: review.id,
        driverId: review.driver_id,
        riderId: review.rider_id,
        rating: review.rating,
        review: review.review,
        createdAt: review.created_at.toISOString(),
        ride: this.formatRide(review.ride),
      }));
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error fetching ride reviews: ${error.message}`);
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred while fetching ride reviews");
    }
  }

  async getDriverReviews(driverId: string | number) {
    try {
      const reviews = await this.prisma.rideReview.findMany({
        where: { driver_id: Number(driverId) },
        orderBy: { created_at: "desc" },
        include: {
          ride: {
            include: {
              area: true,
            },
          },
        },
      });

      return reviews.map((review) => ({
        id: review.id,
        driverId: review.driver_id,
        riderId: review.rider_id,
        rating: review.rating,
        review: review.review,
        createdAt: review.created_at.toISOString(),
        ride: this.formatRide(review.ride),
      }));
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error fetching driver reviews: ${error.message}`);
        throw new Error(error.message);
      }
      throw new Error(
        "An unknown error occurred while fetching driver reviews",
      );
    }
  }

  async getRiderReviews(riderId: string | number) {
    try {
      const reviews = await this.prisma.rideReview.findMany({
        where: { rider_id: Number(riderId) },
        orderBy: { created_at: "desc" },
        include: {
          ride: {
            include: {
              area: true,
            },
          },
        },
      });

      return reviews.map((review) => ({
        id: review.id,
        driverId: review.driver_id,
        riderId: review.rider_id,
        rating: review.rating,
        review: review.review,
        createdAt: review.created_at.toISOString(),
        ride: this.formatRide(review.ride),
      }));
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error fetching rider reviews: ${error.message}`);
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred while fetching rider reviews");
    }
  }

  async getDriverAverageRating(driverId: string | number) {
    try {
      const result = await this.prisma.rideReview.aggregate({
        where: { driver_id: Number(driverId) },
        _avg: { rating: true },
        _count: { rating: true },
      });

      return {
        averageRating: result._avg.rating || 0,
        reviewCount: result._count.rating || 0,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error calculating driver rating: ${error.message}`);
        throw new Error(error.message);
      }
      throw new Error(
        "An unknown error occurred while calculating driver rating",
      );
    }
  }
}
