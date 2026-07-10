import request from 'supertest';
import { app, auth, createCategory, registerUser } from './helpers';

async function addExpense(token: string, categoryId: string, amount: number, date: string) {
  const res = await request(app)
    .post('/api/v1/expenses')
    .set(...auth(token))
    .send({ amount, categoryId, date });
  expect(res.status).toBe(201);
}

describe('Reports', () => {
  it('GET /reports/monthly returns a 12-month series with correct totals', async () => {
    const user = await registerUser();
    const cat = await createCategory(user.token);
    await addExpense(user.token, cat, 100, '2026-01-10');
    await addExpense(user.token, cat, 50, '2026-01-20');
    await addExpense(user.token, cat, 30, '2026-03-05');

    const res = await request(app)
      .get('/api/v1/reports/monthly?year=2026')
      .set(...auth(user.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(12);
    const byMonth = Object.fromEntries(
      res.body.data.map((r: { month: string; total: number }) => [r.month, r.total]),
    );
    expect(byMonth['2026-01']).toBe(150);
    expect(byMonth['2026-02']).toBe(0);
    expect(byMonth['2026-03']).toBe(30);
  });

  it('GET /reports/by-category groups and sorts by total desc', async () => {
    const user = await registerUser();
    const food = await createCategory(user.token, 'Food');
    const rent = await createCategory(user.token, 'Rent');
    await addExpense(user.token, food, 20, '2026-01-01');
    await addExpense(user.token, food, 30, '2026-01-02');
    await addExpense(user.token, rent, 100, '2026-01-03');

    const res = await request(app)
      .get('/api/v1/reports/by-category')
      .set(...auth(user.token));

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ name: 'Rent', total: 100, count: 1 });
    expect(res.body.data[1]).toMatchObject({ name: 'Food', total: 50, count: 2 });
  });

  it('GET /reports/budget-vs-actual computes remaining and percentUsed', async () => {
    const user = await registerUser();
    const food = await createCategory(user.token, 'Food');

    // Budget 500 for July; spend 120 in July, plus 999 in August (must be ignored).
    await request(app)
      .post('/api/v1/budgets')
      .set(...auth(user.token))
      .send({ categoryId: food, month: '2026-07', amount: 500 });
    await addExpense(user.token, food, 100, '2026-07-10');
    await addExpense(user.token, food, 20, '2026-07-15');
    await addExpense(user.token, food, 999, '2026-08-01');

    const res = await request(app)
      .get('/api/v1/reports/budget-vs-actual?month=2026-07')
      .set(...auth(user.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      name: 'Food',
      budget: 500,
      actual: 120,
      remaining: 380,
      percentUsed: 24,
    });
  });

  it('reports never include another user\'s data', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const aCat = await createCategory(a.token);
    await addExpense(a.token, aCat, 100, '2026-01-01');

    const res = await request(app)
      .get('/api/v1/reports/by-category')
      .set(...auth(b.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});
