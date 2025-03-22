import { gql } from "graphql-tag";

export const typeDefs = gql`
  enum RideStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  type Area {
    id: ID!
    name: String!
    isActive: Boolean!
    meetingPoints: [MeetingPoint!]!
  }

  type MeetingPoint {
    id: ID!
    name: String!
    longitude: Float!
    latitude: Float!
    area: Area!
    isActive: Boolean!
  }

  type RideMeetingPoint {
    id: ID!
    ride: Ride!
    meetingPoint: MeetingPoint!
    price: Int!
    orderIndex: Int!
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

  type RideReview {
    id: ID!
    ride: Ride!
    driverId: ID!
    rating: Int!
    review: String
    createdAt: String!
  }

  type PaginatedRides {
    rides: [Ride!]!
    total: Int!
    hasMore: Boolean!
  }
`;
