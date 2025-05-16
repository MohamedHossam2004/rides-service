import { RideService } from "../../services/ride.service";
import { AuthenticationError } from "../../middleware/auth";

export const rideResolvers = {
  Mutation: {
    // Remove driverId from args as it is derived from the token
    createRide: async (_, args, context) => {
      await context.ensureAuthenticated();
      await context.ensureDriver();
      if (args.girlsOnly && context.gender) {
        throw new AuthenticationError('Only female drivers can create girls-only rides');
      }
      const driverId = context.userId;
      if (!driverId) {
        throw new AuthenticationError('User ID not found in token');
      }
      args.driverId = driverId;
      const rideService = new RideService(context.prisma, context.producer);
      return rideService.createRide(args);
    },

    // Remove passengerId from args as it is derived from the token
    addPassenger: async (_, { rideId, email }, context) => {
      await context.ensureAuthenticated();
      const userId = context.userId;
      if (!userId) {
        throw new AuthenticationError('User ID not found in token');
      }
      const passengerId = userId;
      const rideService = new RideService(context.prisma, context.producer);
      const ride = await context.prisma.ride.findUnique({
        where: { id: Number(rideId) }
      });
      if (ride?.girls_only && context.gender) {
        throw new AuthenticationError('This ride is for female passengers only');
      }
      return rideService.addPassenger({
        rideId: Number(rideId),
        passengerId: Number(passengerId),
        email: email,
      });
    },

    // Remove passengerId from args as it is derived from the token
    removePassenger: async (_, { rideId }, context) => {
      await context.ensureAuthenticated();
      const userId = context.userId;
      if (!userId) {
        throw new AuthenticationError('User ID not found in token');
      }
      const rideService = new RideService(context.prisma, context.producer);
      return rideService.removePassenger({
        rideId: Number(rideId),
        passengerId: Number(userId),
      });
    },
    
    updateRideStatus: async (_, { rideId, status }, context) => {
      // Ensure user is authenticated
      await context.ensureAuthenticated();
      
      // Get the ride to check ownership
      const ride = await context.prisma.ride.findUnique({
        where: { id: Number(rideId) }
      });
      
      if (!ride) {
        throw new Error('Ride not found');
      }
      
      // Only the driver of the ride or an admin can update the status
      if (!context.isAdmin && ride.driver_id !== context.userId) {
        throw new AuthenticationError('Only the driver or an admin can update the ride status');
      }
      
      const rideService = new RideService(context.prisma, context.producer);
      return rideService.updateRideStatus({
        rideId: Number(rideId),
        status: status,
      });
    }
  },
  Query: {
    ride: async (_, { id }, context) => {
      // Public endpoint - no authentication required
      const rideService = new RideService(context.prisma);
      return rideService.getRide(id);
    },

    getRides: async (_, { areaId, driverId, status, limit, offset }, context) => {
      // Admin-only endpoint when filtering by status or getting all rides
      // Otherwise, users can see their own rides or public pending rides
      if (status && status !== 'PENDING') {
        await context.ensureAdmin();
      } else if (!driverId && !areaId) {
        // Getting all rides without filters requires admin
        await context.ensureAdmin();
      } else if (driverId && context.userId !== Number(driverId) && !context.isAdmin) {
        // Users can only see their own rides unless they're admins
        throw new AuthenticationError('You can only view your own rides');
      }
      
      const rideService = new RideService(context.prisma);
      return rideService.getRides({
        areaId: areaId ? Number(areaId) : undefined,
        driverId: driverId ? Number(driverId) : undefined,
        status,
        limit: limit ? Number(limit) : 10,
        offset: offset ? Number(offset) : 0
      });
    },
    
    searchRides: async (_, args, context) => {
      try {
        // If searching for girls-only rides, ensure the user is female
        if (args.girlsOnly && context.gender) {
          await context.ensureAuthenticated();
          await context.ensureFemale();
        }
        
        const rideService = new RideService(context.prisma);
        const result = await rideService.searchRides(args);
        return result ?? []; // fallback
      } catch (error) {
        console.error("searchRides resolver error:", error);
        return [];
      }
    },

    viewActiveRide: async (_, __, context) => {
      await context.ensureAuthenticated();
      const rideService = new RideService(context.prisma);
      const activeRides = await rideService.getDriverRideByStatus(context.userId, 'IN_PROGRESS');
      return activeRides.length > 0 ? activeRides[0] : null;
    },

    viewUpcomingRide: async (_, __, context) => {
      await context.ensureAuthenticated();
      const rideService = new RideService(context.prisma);
      const upcomingRides = await rideService.getUserRideByStatus(context.userId, 'PENDING');
      
      // Return the first upcoming ride if available, otherwise throw a user-friendly error
      if (upcomingRides && upcomingRides.length > 0) {
        return upcomingRides[0]; // Return the first upcoming ride
      }
      throw new Error('No upcoming rides found');
    },

    getDriverRides: async (_, __, context) => {
      await context.ensureAuthenticated();
      const rideService = new RideService(context.prisma);
      return rideService.getDriverRideByStatus(context.userId, 'PENDING');
    },

    getActiveDriverRides: async (_, __, context) => {
      await context.ensureAuthenticated();
      const rideService = new RideService(context.prisma);
      return rideService.getDriverRideByStatus(context.userId, 'IN_PROGRESS');
    },

    getUserRideByStatus: async (_, { status }, context) => {
      await context.ensureAuthenticated();
      const rideService = new RideService(context.prisma);
      return rideService.getUserRideByStatus(context.userId, status);
    },

    getDriverRideByStatus: async (_, { status }, context) => {
      await context.ensureAuthenticated();
      const rideService = new RideService(context.prisma);
      return rideService.getDriverRideByStatus(context.userId, status);
    },

    adminGetAllRides: async (_, __, context) => {
      await context.ensureAuthenticated();
      await context.ensureAdmin();
      
      const rideService = new RideService(context.prisma);
      return rideService.getAllRidesForAdmin();
    },
  },
};