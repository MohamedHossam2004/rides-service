import { startStandaloneServer } from "@apollo/server/standalone";
import { setupApolloServer } from "./config/apollo";
import { getPrismaClient } from "./config/prisma";

async function startServer() {
  // Initialize Prisma client
  const prisma = getPrismaClient();

  // Create Apollo Server
  const server = setupApolloServer();

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
