import { AreaService } from "../../services/area.service";
import { AuthenticationError } from "../../middleware/auth";

export const areaResolvers = {
  Query: {
    getAreas: async (_, __, context) => {
      // Public endpoint - no authentication required
      const areaService = new AreaService(context.prisma);
      return areaService.getAreas();
    },
    getArea: async (_, { id }, context) => {
      // Public endpoint - no authentication required
      const areaService = new AreaService(context.prisma);
      return areaService.getArea(id);
    },
  },
  Mutation: {
    createAreaWithMeetingPoints: async (_, { input }, context) => {
      // Ensure user is authenticated and is an admin
      await context.ensureAuthenticated();
      await context.ensureAdmin();
      
      const areaService = new AreaService(context.prisma);
      return areaService.createAreaWithMeetingPoints(input);
    },

    updateArea: async (_, { id, name, isActive }, context) => {
      // Ensure user is authenticated and is an admin
      await context.ensureAuthenticated();
      await context.ensureAdmin();
      
      if (!id || Number.isNaN(Number(id))) {
        throw new Error("Invalid area ID");
      }

      const areaService = new AreaService(context.prisma);

      return areaService.updateArea(id, { name, isActive });
    },

    deleteArea: async (_, { id }, context) => {
      // Ensure user is authenticated and is an admin
      await context.ensureAuthenticated();
      await context.ensureAdmin();
      
      const areaService = new AreaService(context.prisma);
      return areaService.deleteArea(id);
    },
  },
};
