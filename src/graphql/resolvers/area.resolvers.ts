import { AreaService } from "../../services/area.service";
import { ensureAdmin } from "../../middleware/auth.middleware"; // Import ensureAdmin

export const areaResolvers = {
  Query: {
    getAreas: async (_, __, { prisma }) => {
      const areaService = new AreaService(prisma);
      return areaService.getAreas();
    },
    getArea: async (_, { id }, { prisma }) => {
      const areaService = new AreaService(prisma);
      return areaService.getArea(id);
    },
  },
  Mutation: {
    createAreaWithMeetingPoints: async (_, { input }, { prisma, user }) => {
      ensureAdmin(user); 

      const areaService = new AreaService(prisma);
      return areaService.createAreaWithMeetingPoints(input);
    },

    updateArea: async (_, { id, name, isActive }, { prisma, user }) => {
      ensureAdmin(user); 

      if (!id || Number.isNaN(Number(id))) {
        throw new Error("Invalid area ID");
      }

      const areaService = new AreaService(prisma);
      return areaService.updateArea(id, { name, isActive });
    },

    deleteArea: async (_, { id }, { prisma, user }) => {
      ensureAdmin(user); 

      const areaService = new AreaService(prisma);
      return areaService.deleteArea(id);
    },
  },
};