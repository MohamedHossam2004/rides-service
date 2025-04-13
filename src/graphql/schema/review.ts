import { gql } from "graphql-tag";

export const reviewTypeDefs = gql`
  type RideReview {
    id: ID!
    ride: Ride!
    driverId: ID!
    riderId: ID!
    rating: Int!
    review: String
    createdAt: String!
  }

  type DriverRating {
    averageRating: Float!
    reviewCount: Int!
  }

  extend type Query {
    getRideReviews(rideId: ID!): [RideReview!]!
    getDriverReviews(driverId: ID!): [RideReview!]!
    getRiderReviews(riderId: ID!): [RideReview!]!
    getDriverAverageRating(driverId: ID!): DriverRating!
  }

  extend type Mutation {
    createRideReview(
      rideId: ID!
      rating: Int!
      review: String
    ): RideReview!
    updateRideReview(
      id: ID!
      riderId: ID!
      rating: Int
      review: String
    ): RideReview!

    deleteRideReview(id: ID!, riderId: ID!): Boolean!
  }
`;
