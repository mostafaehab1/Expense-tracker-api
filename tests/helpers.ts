import request from 'supertest';
import { createApp } from '../src/app';

// One app instance for the whole suite — it holds no per-request state.
export const app = createApp();

export interface TestUser {
  token: string;
  userId: string;
  email: string;
}

let counter = 0;

/** Register a fresh user and return their token + id. */
export async function registerUser(overrides: Partial<{ email: string; password: string; name: string }> = {}): Promise<TestUser> {
  counter += 1;
  const email = overrides.email ?? `user${counter}@example.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? `User ${counter}`;

  const res = await request(app).post('/api/v1/auth/register').send({ email, password, name });
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, userId: res.body.user.id, email };
}

/** Authorization header for a token. */
export function auth(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}

/** Create a category for a user and return its id. */
export async function createCategory(token: string, name = 'Food', color?: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/categories')
    .set(...auth(token))
    .send({ name, color });
  if (res.status !== 201) {
    throw new Error(`createCategory failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.id;
}
