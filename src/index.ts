import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { PrismaClient } from "@prisma/client";
import { setupApolloServer } from "./config/apollo";
import { getProducer } from "./config/kafka";
import { jwtService } from "./services/jwt.service";
import { AuthUser } from "./middleware/auth.middleware"; // Import AuthUser

// Define the context type to match what you're using in resolvers
interface MyContext {
  prisma: PrismaClient;
  producer: any;
  user?: AuthUser;
}

async function startServer() {
  // Initialize Prisma client
  const prisma = new PrismaClient();
  
  // Initialize Kafka producer
  const producer = await getProducer();
  
  // Create Apollo Server using the setup function
  const server = setupApolloServer();

  // Start the server with standalone configuration
  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => {
      const token = req.headers.authorization?.split(' ')[1];
      let user: AuthUser | undefined;

      if (token) {
        try {
          const decoded = jwtService.verifyAccessToken(token);
          user = {
            userId: decoded.userId,
            email: decoded.email,
            isDriver: decoded.isDriver,
            isAdmin: decoded.isAdmin,
          };
        } catch (error) {
          console.error('Error verifying token:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      return { prisma, producer, user };
    },
    listen: { port: 4000 },
  });

  console.log(`Server is running on ${url}`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});