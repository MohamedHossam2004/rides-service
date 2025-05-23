import { gql } from "graphql-tag";

export const rideTypeDefs = gql`
  enum RideStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  type RidePassenger {
    id: ID!
    passengerId: ID!
    passengerName: String!
    createdAt: String!
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
    passengers: [RidePassenger!]!
  }

  type PaginatedRides {
    rides: [Ride!]!
    total: Int!
    hasMore: Boolean!
  }

  extend type Query {
    ride(id: ID!): Ride
    searchRides(
      toGIU: Boolean
      girlsOnly: Boolean
      areaId: Int
      departureAfter: String
    ): [Ride!]!
    getRide(id: ID!): Ride
    getRides(
      areaId: Int
      driverId: Int
      status: RideStatus
      limit: Int
      offset: Int
    ): PaginatedRides!
    viewActiveRide: Ride
    viewUpcomingRide: Ride
    getDriverRides: [Ride!]!
    getActiveDriverRides: [Ride!]!
    getUserRideByStatus(status: RideStatus): [Ride!]!
    getDriverRideByStatus(status: RideStatus): [Ride!]!
    adminGetAllRides: [Ride!]!
  }

  extend type Mutation {
    createRide(
      areaId: Int!
      departureTime: String!
      girlsOnly: Boolean!
      toGIU: Boolean!
      pricing: [PricingInput!]!
    ): Ride!

    addPassenger(rideId: Int!, email: String!): Ride!

    removePassenger(rideId: Int!): Ride!
    
    updateRideStatus(rideId: Int!, status: RideStatus!): Ride!
  }

  input PricingInput {
    meetingPointId: Int!
    price: Int!
  }
`;