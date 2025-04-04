import { PrismaClient } from "@prisma/client";

export class AreaService {
  constructor(private prisma: PrismaClient) {}
  // Helper method to format an Area object
  private formatArea(area: any) {
    if (!area) return null;

    return {
      id: area.id,
      name: area.name,
      isActive: area.is_active,
      meetingPoints: area.meeting_points.map((mp: any) => ({
        id: mp.id,
        name: mp.name,
        longitude: mp.longitude,
        latitude: mp.latitude,
        isActive: mp.is_active,
      })),
      createdAt: area.created_at ? area.created_at.toISOString() : new Date().toISOString(),
    };
  }

  async getAreas() {
    const areas = await this.prisma.area.findMany({
      include: { meeting_points: true },
    });
    console.log(areas);
    return areas.map((area) => this.formatArea(area));
  }

  async getArea(id: string) {
  if (!id || typeof id !== "string") {
    throw new Error("Invalid area ID");
  }

  const area = await this.prisma.area.findUnique({
    where: { id: Number(id) },
    include: { meeting_points: true },
  });

  if (!area) {
    throw new Error("Area not found");
  }
  return this.formatArea(area);
}

  async createAreaWithMeetingPoints(input: any) {
    try {
      // Check if area with the same name already exists
      const existingArea = await this.prisma.area.findFirst({
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

      return this.formatArea(createdArea);
    } catch (error) {
      console.error("Error creating area:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("An unknown error occurred");
      }
    }
  }
  
  async updateArea(updateAreaId: string, { name, isActive }) {
    try {
      console.log("menna is so tired " + updateAreaId);
  
      console.log("menna is so tired "+ updateAreaId);
      // Ensure data exists
      if ((name === undefined && isActive === undefined)) {
        throw new Error("No valid fields to update");
      }
  
      // Convert ID to number
      const areaId = Number(updateAreaId);
      if (isNaN(areaId)) {
        throw new Error("Invalid area ID");
      }
  
      // Validate `name`
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") {
          throw new Error("Invalid area name");
        }
      }
  
      // Validate `isActive`
      if (isActive !== undefined && typeof isActive !== "boolean") {
        throw new Error("Invalid isActive value");
      }
  
      // Check if area exists
      const existingArea = await this.prisma.area.findUnique({ where: { id: areaId } });
      if (!existingArea) {
        throw new Error("Area not found");
      }
  
      // Update the area
      const updatedArea = await this.prisma.area.update({
        where: { id: areaId },
        data: {
          name: name ? name.trim() : undefined,
          is_active: isActive !== undefined ? isActive : undefined,
        },
        include: { meeting_points: true },
      });
  
      console.log("Update successful:", updatedArea);
      return this.formatArea(updatedArea);
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error updating area:", error.message);
        throw new Error(error.message || "Failed to update area");
      } else {
        console.error("Error updating area:", error);
        throw new Error("Failed to update area");
      }
    }
  }
  
  // 🆕 Delete Area with Validation
  async deleteArea(id: string) {
    try {
      // Validate ID format
      if (!id || typeof id !== "string") {
        throw new Error("Invalid area ID");
      }

      // Check if area exists
      const area = await this.prisma.area.findUnique({
        where: { id: Number(id) },
        include: { meeting_points: true },
      });

      if (!area) {
        throw new Error("Area not found");
      }

      // Delete all related meeting points first
      await this.prisma.meetingPoint.deleteMany({
        where: { area_id: Number(id) },
      });

      // Delete the area
      await this.prisma.area.delete({ where: { id: Number(id) } });

      return true; // Successfully deleted
    } catch (error) {
      console.error("Error deleting area:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to delete area");
    }
  }

}
