import request from 'supertest';
import { app, auth, createCategory, registerUser } from './helpers';

describe('Categories', () => {
  it('creates a category', async () => {
    const user = await registerUser();
    const res = await request(app)
      .post('/api/v1/categories')
      .set(...auth(user.token))
      .send({ name: 'Food', color: '#FF8800' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Food', color: '#FF8800' });
    expect(res.body.id).toEqual(expect.any(String));
  });

  it('rejects a duplicate category name for the same user with 409', async () => {
    const user = await registerUser();
    await createCategory(user.token, 'Food');
    const res = await request(app)
      .post('/api/v1/categories')
      .set(...auth(user.token))
      .send({ name: 'Food' });

    expect(res.status).toBe(409);
  });

  it('allows two different users to both have "Food"', async () => {
    const a = await registerUser();
    const b = await registerUser();
    await createCategory(a.token, 'Food');
    const res = await request(app)
      .post('/api/v1/categories')
      .set(...auth(b.token))
      .send({ name: 'Food' });

    expect(res.status).toBe(201);
  });

  it('isolates categories per user (cannot read another user\'s category)', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const catId = await createCategory(a.token, 'Food');

    const res = await request(app)
      .get(`/api/v1/categories/${catId}`)
      .set(...auth(b.token));

    expect(res.status).toBe(404);
  });

  it('blocks deleting a category that still has expenses (409)', async () => {
    const user = await registerUser();
    const catId = await createCategory(user.token, 'Food');
    await request(app)
      .post('/api/v1/expenses')
      .set(...auth(user.token))
      .send({ amount: 10, categoryId: catId });

    const res = await request(app)
      .delete(`/api/v1/categories/${catId}`)
      .set(...auth(user.token));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('deletes an unused category (204)', async () => {
    const user = await registerUser();
    const catId = await createCategory(user.token, 'Unused');
    const res = await request(app)
      .delete(`/api/v1/categories/${catId}`)
      .set(...auth(user.token));

    expect(res.status).toBe(204);
  });
});
