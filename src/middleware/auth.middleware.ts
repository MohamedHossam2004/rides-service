import { Request } from 'express';
import { jwtService } from '../services/jwt.service';

export interface AuthUser {
  userId: number;
  email: string;
  isDriver: boolean;
  isAdmin: boolean;
}

export interface AuthContext {
  user?: AuthUser;
}

export const getUser = (req: Request): AuthUser | undefined => {
  const token = req.headers.authorization;
  
  if (!token || !token.startsWith('Bearer ')) {
    return undefined;
  }
  
  try {
    const tokenString = token.split(' ')[1];
    const decoded = jwtService.verifyAccessToken(tokenString);
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      isDriver: decoded.isDriver,
      isAdmin: decoded.isAdmin
    };
  } catch (error) {
    console.error('Error verifying token:', error instanceof Error ? error.message : 'Unknown error');
    return undefined;
  }
};

// Helper functions for resolvers
export const ensureAuthenticated = (user?: AuthUser) => {
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
};

export const ensureDriver = (user?: AuthUser) => {
  const authenticatedUser = ensureAuthenticated(user);
  if (!authenticatedUser.isDriver) {
    throw new Error("Driver access required");
  }
  return authenticatedUser;
};

export const ensureAdmin = (user?: AuthUser) => {
  const authenticatedUser = ensureAuthenticated(user);
  if (!authenticatedUser.isAdmin) {
    throw new Error("Admin access required");
  }
  return authenticatedUser;
};