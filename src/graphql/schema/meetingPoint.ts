import { gql } from "graphql-tag";

export const meetingPointTypeDefs = gql`
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

  extend type Query {
    getMeetingPoints(areaId: ID): [MeetingPoint!]!
    getMeetingPoint(id: ID!): MeetingPoint
  }

  extend type Mutation {
    createMeetingPoint(areaId: ID!, input: MeetingPointInput!): MeetingPoint!
    updateMeetingPoint(
      id: ID!
      name: String
      longitude: Float
      latitude: Float
      isActive: Boolean
    ): MeetingPoint!
    deleteMeetingPoint(id: ID!): Boolean!
  }

  input MeetingPointInput {
    name: String!
    longitude: Float!
    latitude: Float!
    isActive: Boolean!
  }
`;
