import { PrismaClient } from "@prisma/client";

export class MeetingPointService {
  constructor(private prisma: PrismaClient) {}

  private formatMeetingPoint(meetingPoint: any) {
    if (!meetingPoint) return null;

    // Ensure area is always included and properly formatted
    const formattedArea = meetingPoint.area ? {
      id: meetingPoint.area.id,
      name: meetingPoint.area.name,
      isActive: meetingPoint.area.is_active,
    } : null;

    return {
      id: meetingPoint.id,
      name: meetingPoint.name,
      longitude: meetingPoint.longitude,
      latitude: meetingPoint.latitude,
      isActive: meetingPoint.is_active,
      area: formattedArea,
    };
  }

  async getMeetingPoints(areaId?: string) {
    const where = areaId ? { area_id: Number(areaId) } : {};
    const meetingPoints = await this.prisma.meetingPoint.findMany({
      where,
      include: { area: true },
    });
    return meetingPoints.map(mp => this.formatMeetingPoint(mp));
  }

  async getMeetingPoint(id: string) {
    const meetingPoint = await this.prisma.meetingPoint.findUnique({
      where: { id: Number(id) },
      include: { area: true },
    });

    if (!meetingPoint) {
      throw new Error("Meeting point not found");
    }

    return this.formatMeetingPoint(meetingPoint);
  }

  async createMeetingPoint(areaId: string, input: any) {
    try {
      // Validate area exists
      const area = await this.prisma.area.findUnique({
        where: { id: Number(areaId) },
      });

      if (!area) {
        throw new Error("Area not found");
      }

      // Validate input
      if (!input.name || !input.longitude || !input.latitude) {
        throw new Error("Missing required fields: name, longitude, and latitude are required");
      }

      // Create meeting point
      const meetingPoint = await this.prisma.meetingPoint.create({
        data: {
          name: input.name,
          longitude: input.longitude,
          latitude: input.latitude,
          is_active: input.isActive ?? true,
          area_id: Number(areaId),
        },
        include: { area: true },
      });

      return this.formatMeetingPoint(meetingPoint);
    } catch (error) {
      console.error("Error creating meeting point:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred");
    }
  }

  async updateMeetingPoint(id: string, data: any) {
    try {
      // Validate meeting point exists
      const existingPoint = await this.prisma.meetingPoint.findUnique({
        where: { id: Number(id) },
      });

      if (!existingPoint) {
        throw new Error("Meeting point not found");
      }

      const meetingPoint = await this.prisma.meetingPoint.update({
        where: { id: Number(id) },
        data: {
          name: data.name,
          longitude: data.longitude,
          latitude: data.latitude,
          is_active: data.isActive,
        },
        include: { area: true },
      });

      return this.formatMeetingPoint(meetingPoint);
    } catch (error) {
      console.error("Error updating meeting point:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred");
    }
  }

  async deleteMeetingPoint(id: string) {
    try {
      // Validate meeting point exists
      const existingPoint = await this.prisma.meetingPoint.findUnique({
        where: { id: Number(id) },
      });

      if (!existingPoint) {
        throw new Error("Meeting point not found");
      }

      await this.prisma.meetingPoint.delete({
        where: { id: Number(id) },
      });
      return true;
    } catch (error) {
      console.error("Error deleting meeting point:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("An unknown error occurred");
    }
  }
} 