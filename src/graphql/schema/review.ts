import { gql } from "graphql-tag";

export const reviewTypeDefs = gql`
  type RideReview {
    id: ID!
    ride: Ride!
    driverId: ID!
    rating: Int!
    review: String
    createdAt: String!
  }

  extend type Query {
    getRideReviews(rideId: ID!): [RideReview!]!
    getDriverReviews(driverId: ID!): [RideReview!]!
  }

  extend type Mutation {
    createRideReview(
      rideId: ID!
      driverId: ID!
      rating: Int!
      review: String
    ): RideReview!

    updateRideReview(id: ID!, rating: Int, review: String): RideReview!

    deleteRideReview(id: ID!): Boolean!
  }
`;
