import mongoose from 'mongoose';
import { env } from './env';

/**
 * Connect Mongoose to MongoDB. Accepts an explicit URI (used by tests, which
 * pass the in-memory server's URI) and otherwise falls back to env.MONGODB_URI.
 */
export async function connectDb(uri?: string): Promise<typeof mongoose> {
  const target = uri ?? env.MONGODB_URI;
  if (!target) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }

  // Fail fast if the server can't be reached, rather than buffering commands
  // forever with no feedback.
  mongoose.set('bufferTimeoutMS', 5000);

  await mongoose.connect(target);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.connection.close();
}
