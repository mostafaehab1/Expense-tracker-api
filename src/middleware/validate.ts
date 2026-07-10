import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Runs the given Zod schemas against req.body / req.query / req.params BEFORE the
 * controller executes. On success it writes the *parsed* (and coerced/defaulted)
 * values back onto the request, so controllers receive clean, typed data. On
 * failure it throws a single VALIDATION_ERROR whose `details` list every bad field.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) Object.assign(req.query, schemas.query.parse(req.query));
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        throw AppError.validation('Request validation failed', details);
      }
      throw err;
    }
  };
}
