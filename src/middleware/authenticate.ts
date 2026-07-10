import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface JwtPayload {
  sub: string; // user id
}

/**
 * Verifies the `Authorization: Bearer <token>` header. On success it attaches
 * `req.userId` and calls next(); on any failure it throws UNAUTHENTICATED, which
 * the central error handler turns into a 401. Every protected route mounts this.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw AppError.unauthenticated('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.userId = decoded.sub;
    next();
  } catch {
    // Covers expired, malformed, or wrong-signature tokens alike.
    throw AppError.unauthenticated('Invalid or expired token');
  }
}
