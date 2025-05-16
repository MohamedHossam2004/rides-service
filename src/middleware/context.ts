import { PrismaClient } from '@prisma/client';
import { Producer } from 'kafkajs';
import { verifyToken, isAdmin, isDriver, isMale, getUserId, AuthenticationError } from './auth';

export interface Context {
  prisma: PrismaClient;
  producer: Producer | null;
  token: string | null;
  userId: number | null;
  isAdmin: boolean;
  isDriver: boolean;
  gender: boolean;
  ensureAuthenticated: () => Promise<void>;
  ensureAdmin: () => Promise<void>;
  ensureDriver: () => Promise<void>;
  ensureFemale: () => Promise<void>;
  ensureUserIsResourceOwner: (resourceUserId: number) => Promise<void>;
}

export async function createContext({ req, prisma, producer }: { req: any, prisma: PrismaClient, producer: Producer | null }): Promise<Context> {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // Default context values
  const context: Context = {
    prisma,
    producer,
    token,
    userId: null,
    isAdmin: false,
    isDriver: false,
    gender: false,
    
    // Authentication helper methods
    ensureAuthenticated: async () => {
      if (!token) {
        throw new AuthenticationError('Authentication required');
      }
      
      try {
        const userId = await getUserId(token);
        console.log('userId:', userId);
        if (!userId) {
          throw new AuthenticationError('Invalid token');
        }
      } catch (error) {
        throw new AuthenticationError('Authentication failed');
      }
    },
    
    ensureAdmin: async () => {
      await context.ensureAuthenticated();
      if (!await isAdmin(token!)) {
        throw new AuthenticationError('Admin privileges required');
      }
    },
    
    ensureDriver: async () => {
      await context.ensureAuthenticated();
      if (!await isDriver(token!)) {
        throw new AuthenticationError('Driver privileges required');
      }
    },
    
    ensureFemale: async () => {
      await context.ensureAuthenticated();
      if (await isMale(token!)) {
        throw new AuthenticationError('This feature is only available for female users');
      }
    },
    
    ensureUserIsResourceOwner: async (resourceUserId: number) => {
      await context.ensureAuthenticated();
      if (context.userId !== resourceUserId && !context.isAdmin) {
        throw new AuthenticationError('You do not have permission to access this resource');
      }
    }
  };
  
  // If token exists, populate user information
  if (token) {
    try {
      context.userId = await getUserId(token);
      context.isAdmin = await isAdmin(token);
      context.isDriver = await isDriver(token);
      context.gender = await isMale(token);
    } catch (error) {
      // Token validation failed, but we'll continue with default values
      console.error('Token validation error:', error);
    }
  }
  
  return context;
}