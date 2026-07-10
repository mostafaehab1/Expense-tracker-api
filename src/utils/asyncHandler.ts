import { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * Express 4 does not catch errors thrown in async handlers — an unhandled
 * rejection would hang the request. This wrapper forwards any thrown/rejected
 * error to `next()`, so it reaches our central error handler. It lets every
 * controller be a clean `async (req, res) => { ... }` with no try/catch noise.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
