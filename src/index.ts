import { startStandaloneServer } from "@apollo/server/standalone";
import { setupApolloServer } from "./config/apollo";
import { getPrismaClient } from "./config/prisma";
import { initKafka, disconnectKafka } from "./config/kafka";

async function startServer() {
  // Initialize Prisma client
  const prisma = getPrismaClient();
  
  // Initialize Kafka
  await initKafka(prisma);

  // Create Apollo Server
  const server = setupApolloServer();

  // Start the server using the standalone server
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ prisma }),
  });

  console.log(`🚀 Server ready at ${url}`);
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    await disconnectKafka();
    process.exit(0);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});