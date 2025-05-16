import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

// JWT secret should match the one in the user service
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User service URL
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:4001';

interface DecodedToken {
  userId: number;
  email: string;
  isAdmin: boolean;
  isDriver: boolean;
  gender: boolean;
  iat: number;
  exp: number;
}

/**
 * Verifies a JWT token and returns the decoded user information
 */
export async function verifyToken(token: string): Promise<DecodedToken> {
  try {
    // First try to verify locally
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error}`);
  }
}

/**
 * Checks if the user has admin role
 */
export async function isAdmin(token: string): Promise<boolean> {
  try {
    const decoded = await verifyToken(token);
    return decoded.isAdmin;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if the user has driver role
 */
export async function isDriver(token: string): Promise<boolean> {
  try {
    const decoded = await verifyToken(token);
    return decoded.isDriver;
  } catch (error) {
    return false;
  }
}

/**
 * Checks if the user is female
 */
export async function isMale(token: string): Promise<boolean> {
  try {
    const decoded = await verifyToken(token);
    return decoded.gender === true;
  } catch (error) {
    return false;
  }
}

/**
 * Extracts user ID from token
 */
export async function getUserId(token: string): Promise<number | null> {
  try {
    const decoded = await verifyToken(token);
    console.log(decoded);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}