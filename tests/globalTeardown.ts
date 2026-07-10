import { MongoMemoryServer } from 'mongodb-memory-server';

const globalTeardown = async (): Promise<void> => {
  const instance = (globalThis as unknown as { __MONGOINSTANCE?: MongoMemoryServer })
    .__MONGOINSTANCE;
  if (instance) await instance.stop();
};

export = globalTeardown;
