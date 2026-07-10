import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Category } from '../src/models/Category';
import { Expense } from '../src/models/Expense';
import { Budget } from '../src/models/Budget';

// Env must be set BEFORE any module reads it (src/config/env validates on import).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret_at_least_16_chars_long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4'; // fast hashing keeps the suite quick

beforeAll(async () => {
  // Connect to the shared in-memory server started in globalSetup.
  await mongoose.connect(process.env.MONGO_URI as string);

  // Ensure the unique/compound indexes exist so constraint tests are reliable.
  await Promise.all([User.init(), Category.init(), Expense.init(), Budget.init()]);
});

// Isolate tests: wipe every collection between them.
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
