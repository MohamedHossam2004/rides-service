import { startStandaloneServer } from "@apollo/server/standalone";
import { setupApolloServer } from "./config/apollo";
import { getPrismaClient } from "./config/prisma";
import { initKafka, disconnectKafka, getKafkaProducer } from "./config/kafka";
import { checkDelayedJobs, initQueues } from "./config/queue";

async function startServer() {
  // Initialize Prisma client
  const prisma = getPrismaClient();
  
  // Initialize Kafka
  await initKafka(prisma);
  
  // Initialize Bull queues
  await initQueues(prisma);
  
  // Set up periodic check for delayed jobs (every 5 minutes)
  setInterval(async () => {
    try {
      console.log('Running scheduled check for delayed jobs');
      await checkDelayedJobs();
    } catch (error) {
      console.error('Error during scheduled check for delayed jobs:', error);
    }
  }, 5 * 60 * 1000);
  
  // Get the Kafka producer
  const producer = getKafkaProducer();

  // Create Apollo Server
  const server = setupApolloServer();

  // Start the server using the standalone server
  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async () => ({ prisma, producer }),
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