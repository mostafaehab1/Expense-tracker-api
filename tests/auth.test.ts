import request from 'supertest';
import { app, auth, registerUser } from './helpers';

describe('Auth', () => {
  describe('POST /auth/register', () => {
    it('creates a user and returns a token, never the password hash', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'a@example.com', password: 'password123', name: 'Alice' });

      expect(res.status).toBe(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: 'a@example.com', name: 'Alice' });
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('rejects a short password with 400', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'b@example.com', password: 'short', name: 'Bob' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a duplicate email with 409', async () => {
      await registerUser({ email: 'dup@example.com' });
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: 'password123', name: 'Dup' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with correct credentials', async () => {
      await registerUser({ email: 'c@example.com', password: 'password123' });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'c@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
    });

    it('returns the same 401 for wrong password and unknown email', async () => {
      await registerUser({ email: 'd@example.com', password: 'password123' });

      const wrongPass = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'd@example.com', password: 'wrongpassword' });
      const unknown = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(wrongPass.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrongPass.body.error.message).toBe(unknown.body.error.message);
    });
  });

  describe('GET /auth/me', () => {
    it('requires a token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns the current user with a valid token', async () => {
      const user = await registerUser({ email: 'e@example.com' });
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(...auth(user.token));

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('e@example.com');
    });
  });
});
