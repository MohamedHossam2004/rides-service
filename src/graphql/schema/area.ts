import { gql } from "graphql-tag";

export const areaTypeDefs = gql`
  type Area {
    id: ID!
    name: String!
    isActive: Boolean!
    meetingPoints: [MeetingPoint!]!
  }

  extend type Query {
    getAreas: [Area!]!
    getArea(id: ID!): Area
  }

 extend type Mutation {
  createAreaWithMeetingPoints(input: CreateAreaInput!): Area!
  updateArea(id: ID!, name: String, isActive: Boolean): Area!  # Correct mutation definition
  deleteArea(id: ID!): Boolean!
}

  input CreateAreaInput {
    name: String!
    isActive: Boolean!
    meetingPoints: [MeetingPointInput!]!
  }
`;
