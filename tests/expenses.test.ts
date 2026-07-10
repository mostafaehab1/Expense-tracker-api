import request from 'supertest';
import { app, auth, createCategory, registerUser } from './helpers';

describe('Expenses', () => {
  it('creates an expense and echoes amount in major units', async () => {
    const user = await registerUser();
    const catId = await createCategory(user.token);

    const res = await request(app)
      .post('/api/v1/expenses')
      .set(...auth(user.token))
      .send({ amount: 19.99, categoryId: catId, description: 'Lunch' });

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(19.99);
    expect(res.body.currency).toBe('USD');
    expect(res.body.category).toMatchObject({ name: 'Food' });
  });

  it('rejects an amount with more than 2 decimals (400)', async () => {
    const user = await registerUser();
    const catId = await createCategory(user.token);
    const res = await request(app)
      .post('/api/v1/expenses')
      .set(...auth(user.token))
      .send({ amount: 19.999, categoryId: catId });

    expect(res.status).toBe(400);
  });

  it("rejects using another user's category (400)", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const aCat = await createCategory(a.token);

    const res = await request(app)
      .post('/api/v1/expenses')
      .set(...auth(b.token))
      .send({ amount: 5, categoryId: aCat });

    expect(res.status).toBe(400);
  });

  it('paginates, filters by category, and sorts', async () => {
    const user = await registerUser();
    const food = await createCategory(user.token, 'Food');
    const rent = await createCategory(user.token, 'Rent');

    // 3 food + 1 rent
    await request(app).post('/api/v1/expenses').set(...auth(user.token)).send({ amount: 10, categoryId: food, date: '2026-01-01' });
    await request(app).post('/api/v1/expenses').set(...auth(user.token)).send({ amount: 30, categoryId: food, date: '2026-02-01' });
    await request(app).post('/api/v1/expenses').set(...auth(user.token)).send({ amount: 20, categoryId: food, date: '2026-03-01' });
    await request(app).post('/api/v1/expenses').set(...auth(user.token)).send({ amount: 99, categoryId: rent, date: '2026-01-15' });

    // filter by category = food, sort by amount desc, limit 2
    const res = await request(app)
      .get(`/api/v1/expenses?categoryId=${food}&sort=amount&order=desc&limit=2&page=1`)
      .set(...auth(user.token));

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ total: 3, totalPages: 2, page: 1, limit: 2 });
    expect(res.body.data.map((e: { amount: number }) => e.amount)).toEqual([30, 20]);
  });

  it('filters by date range', async () => {
    const user = await registerUser();
    const cat = await createCategory(user.token);
    await request(app).post('/api/v1/expenses').set(...auth(user.token)).send({ amount: 10, categoryId: cat, date: '2026-01-01' });
    await request(app).post('/api/v1/expenses').set(...auth(user.token)).send({ amount: 20, categoryId: cat, date: '2026-06-01' });

    const res = await request(app)
      .get('/api/v1/expenses?from=2026-05-01&to=2026-07-01')
      .set(...auth(user.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].amount).toBe(20);
  });

  it("isolates expenses per user (cannot fetch another user's expense)", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const cat = await createCategory(a.token);
    const created = await request(app)
      .post('/api/v1/expenses')
      .set(...auth(a.token))
      .send({ amount: 12.5, categoryId: cat });

    const res = await request(app)
      .get(`/api/v1/expenses/${created.body.id}`)
      .set(...auth(b.token));

    expect(res.status).toBe(404);
  });

  it('updates and deletes an expense', async () => {
    const user = await registerUser();
    const cat = await createCategory(user.token);
    const created = await request(app)
      .post('/api/v1/expenses')
      .set(...auth(user.token))
      .send({ amount: 10, categoryId: cat });

    const patched = await request(app)
      .patch(`/api/v1/expenses/${created.body.id}`)
      .set(...auth(user.token))
      .send({ amount: 42.5 });
    expect(patched.status).toBe(200);
    expect(patched.body.amount).toBe(42.5);

    const deleted = await request(app)
      .delete(`/api/v1/expenses/${created.body.id}`)
      .set(...auth(user.token));
    expect(deleted.status).toBe(204);
  });
});
