import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { typeDefs } from "../graphql/schema";
import { resolvers } from "../graphql/resolvers";

export function setupApolloServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection: true,
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true,
      }),
    ],
    formatError: (error) => {
      if (process.env.NODE_ENV !== "production") {
        console.error(error);
      }

      return {
        message: error.message,
        path: error.path,
        extensions:
          process.env.NODE_ENV === "production"
            ? { code: error.extensions?.code || "INTERNAL_SERVER_ERROR" }
            : error.extensions,
      };
    },
  });
}