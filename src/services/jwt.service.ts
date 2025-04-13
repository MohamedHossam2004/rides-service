import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedToken {
  userId: number;
  email: string;
  isAdmin: boolean;
  isDriver: boolean;
}

export class JWTService {
  verifyAccessToken(token: string): DecodedToken {
    try {
      console.log('Verifying access token...');
      const decoded = jwt.verify(token, JWT_SECRET || 'default_secret') as DecodedToken;
      console.log('Token decoded:', decoded);
      
      return decoded;
    } catch (error) {
      console.log('Token verification error:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof jwt.JsonWebTokenError) {
        console.log('JWT Error:', error.message);
      } else if (error instanceof jwt.TokenExpiredError) {
        console.log('Token expired');
      }
      throw new Error('Invalid access token');
    }
  }
}

export const jwtService = new JWTService();