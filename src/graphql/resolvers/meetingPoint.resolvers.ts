import { MeetingPointService } from "../../services/meetingPoint.service";

export const meetingPointResolvers = {
  Query: {
    getMeetingPoints: async (_, { areaId }, { prisma }) => {
      const meetingPointService = new MeetingPointService(prisma);
      return meetingPointService.getMeetingPoints(areaId);
    },
    getMeetingPoint: async (_, { id }, { prisma }) => {
      const meetingPointService = new MeetingPointService(prisma);
      return meetingPointService.getMeetingPoint(id);
    },
  },
  Mutation: {
    createMeetingPoint: async (_, { areaId, input }, { prisma }) => {
      const meetingPointService = new MeetingPointService(prisma);
      return meetingPointService.createMeetingPoint(areaId, input);
    },
    updateMeetingPoint: async (_, { id, ...data }, { prisma }) => {
      const meetingPointService = new MeetingPointService(prisma);
      return meetingPointService.updateMeetingPoint(id, data);
    },
    deleteMeetingPoint: async (_, { id }, { prisma }) => {
      const meetingPointService = new MeetingPointService(prisma);
      return meetingPointService.deleteMeetingPoint(id);
    },
  },
}; 