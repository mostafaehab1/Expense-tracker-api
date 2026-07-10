import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Start ONE in-memory MongoDB for the whole test run (not one per file). This
 * avoids repeatedly paying mongod's startup cost — which under load could exceed
 * its 10s launch timeout and flake the suite. The URI is passed to the test files
 * via an env var; the instance is stashed on globalThis for teardown.
 */
const globalSetup = async (): Promise<void> => {
  const instance = await MongoMemoryServer.create();
  (globalThis as unknown as { __MONGOINSTANCE?: MongoMemoryServer }).__MONGOINSTANCE = instance;
  process.env.MONGO_URI = instance.getUri();
};

export = globalSetup;
