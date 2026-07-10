import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';

/** Entry point: connect to Mongo, then start listening. */
async function start(): Promise<void> {
  await connectDb();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.warn(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);

    console.warn(`Docs at http://localhost:${env.PORT}/docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
