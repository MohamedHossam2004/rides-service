import { areaResolvers } from "./area.resolvers";
import { rideResolvers } from "./ride.resolvers";

export const resolvers = {
  Mutation: {
    ...areaResolvers.Mutation,
    ...rideResolvers.Mutation,
  },
};
