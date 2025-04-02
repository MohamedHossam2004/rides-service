import { PrismaClient } from "@prisma/client";

export class AreaService {
  constructor(private prisma: PrismaClient) {}

  async createAreaWithMeetingPoints(input: any) {
    try {
      // Check if area with the same name already exists
      const existingArea = await this.prisma.area.findUnique({
        where: { name: input.name },
      });

      if (existingArea) {
        throw new Error(`Area with name "${input.name}" already exists.`);
      }

      // Insert the Area
      const area = await this.prisma.area.create({
        data: {
          name: input.name,
          is_active: input.isActive,
        },
      });

      // Insert MeetingPoints
      await this.prisma.meetingPoint.createMany({
        data: input.meetingPoints.map((mp: any) => ({
          name: mp.name,
          longitude: mp.longitude,
          latitude: mp.latitude,
          is_active: mp.isActive,
          area_id: area.id,
        })),
      });

      const createdArea = await this.prisma.area.findUnique({
        where: { id: area.id },
        include: { meeting_points: true },
      });

      if (!createdArea) {
        throw new Error("Area not found");
      }

      return {
        id: createdArea.id,
        name: createdArea.name,
        isActive: createdArea.is_active,
        meetingPoints: createdArea.meeting_points.map((mp) => ({
          id: mp.id,
          name: mp.name,
          longitude: mp.longitude,
          latitude: mp.latitude,
          isActive: mp.is_active,
        })),
      };
    } catch (error) {
      console.error("Error creating area:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("An unknown error occurred");
      }
    }
  }
}
