import { AreaService } from "../../services/area.service";

export const areaResolvers = {
  Query: {
    // Fetch all areas
    getAreas: async (_, __, { prisma }) => {
      const areaService = new AreaService(prisma);
      return areaService.getAreas();  // Correct method call
    },
    // Fetch a single area by ID
    getArea: async (_, { id }, { prisma }) => {
      const areaService = new AreaService(prisma);
      return areaService.getArea(id);
    },
  },
  Mutation: {
    createAreaWithMeetingPoints: async (_, { input }, { prisma }) => {
      const areaService = new AreaService(prisma);
      return areaService.createAreaWithMeetingPoints(input);
    },

    updateArea: async (_, { id, name, isActive }, { prisma }) => {
      console.log("menna is so tired " + id); // Log the id to ensure it is passed correctly.
    
      if (!id || isNaN(Number(id))) {
        throw new Error("Invalid area ID");
      }
    
      const areaService = new AreaService(prisma);
    
      return areaService.updateArea(id, { name, isActive });
    },
    
    deleteArea: async (_, { id }, { prisma }) => {
      const areaService = new AreaService(prisma);
      return areaService.deleteArea(id);
    },

  },
};
