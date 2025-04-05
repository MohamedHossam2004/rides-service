import { PrismaClient } from "@prisma/client";

export class RideService {
  constructor(private prisma: PrismaClient) {}

  async createRide(args: any) {
    try {
      const { areaId, departureTime, driverId, girlsOnly, toGIU, pricing } =
        args;

      // Validate Area
      const area = await this.prisma.area.findUnique({
        where: { id: areaId },
        include: { meeting_points: true },
      });

      if (!area) {
        throw new Error("Invalid area ID");
      }

      // Validate Meeting Points
      const meetingPointIds = area.meeting_points.map((mp) => mp.id);
      const invalidMeetingPoints = pricing.filter(
        (p: any) => !meetingPointIds.includes(p.meetingPointId),
      );

      if (invalidMeetingPoints.length > 0) {
        throw new Error("One or more meeting points are invalid for this area");
      }

      const currentTime = new Date(); 
      const cairoTimeOffset = 2 * 60 * 60 * 1000; 
      const cairoCurrentTime = new Date(currentTime.getTime() + cairoTimeOffset);

      const departureTimeDate = new Date(departureTime); 
      const departureCairoTime = new Date(departureTimeDate.getTime() + cairoTimeOffset);

   
      if (departureCairoTime < cairoCurrentTime) {
        throw new Error("Departure time cannot be in the past");
      }

      // Check if the departure time is more than 48 hours ahead
      const maxDepartureTime = new Date(cairoCurrentTime.getTime() + 48 * 60 * 60 * 1000);
      if (departureCairoTime > maxDepartureTime) {
        throw new Error("Departure time cannot be more than 48 hours from now");
      }
      // Create Ride
      const newRide = await this.prisma.ride.create({
        data: {
          area_id: areaId,
          to_giu: toGIU,
          departure_time: new Date(departureTime),
          driver_id: driverId,
          girls_only: girlsOnly,
          seats_available: 4,
          status: "PENDING",
        },
      });

      // Create RideMeetingPoints
      const meetingPointsData = pricing.map((p: any, index: number) => ({
        ride_id: newRide.id,
        meeting_point_id: p.meetingPointId,
        price: p.price,
        order_index: index,
      }));

      await this.prisma.rideMeetingPoint.createMany({
        data: meetingPointsData,
      });

      // Fetch the newly created ride with all necessary relations
      const rideWithRelations = await this.prisma.ride.findUnique({
        where: { id: newRide.id },
        include: {
          area: true,
          ride_meeting_points: {
            include: {
              meeting_point: true,
            },
            orderBy: { order_index: "asc" },
          },
        },
      });

      if (!rideWithRelations) {
        throw new Error("Ride with relations not found");
      }

      const rideData = {
        driverId: rideWithRelations.driver_id,
        girlsOnly: rideWithRelations.girls_only,
        seatsAvailable: rideWithRelations.seats_available,
        toGIU: rideWithRelations.to_giu,
        ...rideWithRelations,
        departureTime: rideWithRelations.departure_time.toISOString(),
        createdAt: rideWithRelations.created_at.toISOString(),
        updatedAt: rideWithRelations.updated_at.toISOString(),
        meetingPoints: rideWithRelations.ride_meeting_points.map((rp) => ({
          id: rp.id,
          price: rp.price,
          orderIndex: rp.order_index,
          meetingPoint: {
            id: rp.meeting_point.id,
            name: rp.meeting_point.name,
            longitude: rp.meeting_point.longitude,
            latitude: rp.meeting_point.latitude,
            isActive: rp.meeting_point.is_active,
          },
        })),
      };

      return rideData;
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error("An unknown error occurred");
      }
      throw new Error(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    }
  }

  async addSeat(rideId: number) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { seats_available: true },
    });

    if (!ride) throw new Error("Ride not found");
    if (ride.seats_available >= 4) throw new Error("Cannot exceed 4 seats");

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: { seats_available: { increment: 1 } },
      select: { id: true, seats_available: true },
    });

    return {
      id: updatedRide.id.toString(),
      seatsAvailable: updatedRide.seats_available,
    };
  }

  async removeSeat(rideId: number) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { seats_available: true },
    });

    if (!ride) throw new Error("Ride not found");
    if (ride.seats_available <= 0)
      throw new Error("Cannot have negative seats");

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: { seats_available: { decrement: 1 } },
      select: { id: true, seats_available: true },
    });

    return {
      id: updatedRide.id.toString(),
      seatsAvailable: updatedRide.seats_available,
    };
  }
}
