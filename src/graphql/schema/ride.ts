import { gql } from "graphql-tag";

export const rideTypeDefs = gql`
  enum RideStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  type Ride {
    id: ID!
    area: Area!
    toGIU: Boolean!
    status: RideStatus!
    driverId: ID!
    girlsOnly: Boolean!
    departureTime: String!
    seatsAvailable: Int!
    createdAt: String!
    updatedAt: String!
    meetingPoints: [RideMeetingPoint!]!
    reviews: [RideReview!]!
  }

  type PaginatedRides {
    rides: [Ride!]!
    total: Int!
    hasMore: Boolean!
  }

  extend type Mutation {
    createRide(
      areaId: Int!
      departureTime: String!
      driverId: Int!
      girlsOnly: Boolean!
      toGIU: Boolean!
      pricing: [PricingInput!]!
    ): Ride!

    addSeat(rideId: Int!): Ride
    removeSeat(rideId: Int!): Ride
  }

  input PricingInput {
    meetingPointId: Int!
    price: Int!
  }
`;
