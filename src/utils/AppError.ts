/**
 * The set of error codes the API can return. Keeping them as a union means the
 * error handler and any caller share one vocabulary — no stray magic strings.
 */
export type ErrorCode =
  'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

/**
 * An *operational* error — one we anticipated and can describe to the client
 * (e.g. "category not found"). The central error handler recognizes these and
 * turns them into the standard JSON envelope. Anything that is NOT an AppError
 * is treated as an unexpected bug and reported as a generic 500.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // Convenience factories keep call sites terse and readable.
  static validation(message: string, details?: unknown) {
    return new AppError('VALIDATION_ERROR', message, details);
  }
  static unauthenticated(message = 'Authentication required') {
    return new AppError('UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new AppError('FORBIDDEN', message);
  }
  static notFound(message = 'Resource not found') {
    return new AppError('NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new AppError('CONFLICT', message, details);
  }
}
