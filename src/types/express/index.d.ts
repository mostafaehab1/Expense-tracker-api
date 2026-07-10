// Augment Express's Request type so `req.userId` is known to TypeScript
// everywhere after the `authenticate` middleware has run.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
