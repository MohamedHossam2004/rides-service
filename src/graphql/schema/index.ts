import { gql } from "graphql-tag";
import { areaTypeDefs } from "./area";
import { rideTypeDefs } from "./ride";
import { meetingPointTypeDefs } from "./meetingPoint";
import { reviewTypeDefs } from "./review";

const baseTypeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

export const typeDefs = [
  baseTypeDefs,
  areaTypeDefs,
  rideTypeDefs,
  meetingPointTypeDefs,
  reviewTypeDefs,
];
