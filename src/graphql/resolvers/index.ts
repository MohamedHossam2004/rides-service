import { areaResolvers } from "./area.resolvers";
import { rideResolvers } from "./ride.resolvers";
import { reviewResolvers } from "./review.resolvers";

export const resolvers = {
  Mutation: {
    ...areaResolvers.Mutation,
    ...rideResolvers.Mutation,
    ...reviewResolvers.Mutation,
  },
  Query: {
    ...reviewResolvers.Query,
    ...areaResolvers.Query,
    ...rideResolvers.Query, 
  },
  
};
