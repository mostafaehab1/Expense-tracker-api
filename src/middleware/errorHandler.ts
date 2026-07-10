import { NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/AppError';
import { isProd } from '../config/env';

interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

/**
 * The ONE place errors become HTTP responses. Every thrown error — whether an
 * AppError we created, a Zod error, a Mongoose error, or an unexpected bug —
 * funnels here and leaves as the same JSON envelope. Controllers never format
 * errors themselves.
 *
 * Must have 4 args (incl. `next`) for Express to recognize it as an error handler.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const { code, message, details, statusCode } = normalize(err);

  if (statusCode >= 500) {
    // Log the real error server-side; never leak internals to the client.
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const body: ErrorBody = { error: { code, message } };
  if (details !== undefined) body.error.details = details;

  res.status(statusCode).json(body);
}

function normalize(err: unknown): {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: unknown;
} {
  // Our own operational errors already carry everything we need.
  if (err instanceof AppError) {
    return { code: err.code, message: err.message, statusCode: err.statusCode, details: err.details };
  }

  // A Zod error that escaped the validate middleware (defensive).
  if (err instanceof ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 400,
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  }

  // Mongoose duplicate-key (e.g. unique email / category name) -> 409.
  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? 'field';
    return { code: 'CONFLICT', message: `A record with that ${field} already exists`, statusCode: 409 };
  }

  // Malformed ObjectId in a path param -> 404 (we treat "not a real id" as not found).
  if (err instanceof MongooseError.CastError) {
    return { code: 'NOT_FOUND', message: 'Resource not found', statusCode: 404 };
  }

  // Mongoose schema validation -> 400.
  if (err instanceof MongooseError.ValidationError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 400,
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    };
  }

  // Anything else is an unexpected bug: generic 500, hide the message in prod.
  return {
    code: 'INTERNAL',
    message: isProd ? 'Something went wrong' : String((err as Error)?.message ?? err),
    statusCode: 500,
  };
}

interface DuplicateKeyError {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isDuplicateKeyError(err: unknown): err is DuplicateKeyError {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
