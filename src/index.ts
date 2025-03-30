import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { PrismaClient } from "@prisma/client";

async function startServer() {
  
  // Initialize Prisma client
  const prisma = new PrismaClient();

  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // Start the server using the standalone server
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ prisma }),
  });
  console.log(`🚀 Server ready at ${url}`);
}
startServer().catch((error) => {
  console.error("Error starting server:", error);
});
