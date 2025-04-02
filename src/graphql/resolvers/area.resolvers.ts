import { AreaService } from "../../services/area.service";

export const areaResolvers = {
  Mutation: {
    createAreaWithMeetingPoints: async (_, { input }, { prisma }) => {
      const areaService = new AreaService(prisma);
      return areaService.createAreaWithMeetingPoints(input);
    },
  },
};
