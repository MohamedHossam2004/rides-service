import { areaResolvers } from "./area.resolvers";
import { rideResolvers } from "./ride.resolvers";
import { reviewResolvers } from "./review.resolvers";
import { meetingPointResolvers } from "./meetingPoint.resolvers";

export const resolvers = {
  Mutation: {
    ...areaResolvers.Mutation,
    ...rideResolvers.Mutation,
    ...reviewResolvers.Mutation,
    ...meetingPointResolvers.Mutation,
  },
  Query: {
    ...reviewResolvers.Query,
    ...areaResolvers.Query,
    ...rideResolvers.Query,
    ...meetingPointResolvers.Query,
  },
};
