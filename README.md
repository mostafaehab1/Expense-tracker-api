# Expense Tracker API

A production-quality REST API for personal expense tracking — built to demonstrate clean
API design, not just working endpoints. Node.js · Express · TypeScript · MongoDB.

![CI](https://github.com/mostafaehab1/Expense-tracker-api/actions/workflows/ci.yml/badge.svg)

> **Why I built this** — _(rewrite this in your own voice)_ I wanted a small project I
> could engineer to a professional standard: real auth, per-user data isolation,
> validated input, consistent errors, and non-trivial reporting with MongoDB
> aggregation. The scope is deliberately narrow so the engineering can be deep.

## Features

- **JWT auth** — register/login, bcrypt-hashed passwords, auth middleware.
- **Per-user isolation** — you can only ever access your own data.
- **Full CRUD** — expenses, categories, and per-category monthly budgets.
- **Rich queries** — pagination, date-range/category/amount filtering, text search, sort.
- **Aggregation reports** — monthly totals, category breakdown, and budget-vs-actual,
  all computed in MongoDB (the showcase).
- **Correct money handling** — stored as integer cents to avoid float rounding.
- **Consistent errors** — one JSON envelope for every failure.
- **OpenAPI docs** at `/docs`, **Docker** + **docker-compose**, and **CI** on every push.

## Tech stack

| Layer      | Choice                              |
|------------|-------------------------------------|
| Language   | TypeScript (strict)                 |
| HTTP       | Express                             |
| Database   | MongoDB + Mongoose                  |
| Validation | Zod                                 |
| Auth       | JWT + bcrypt                        |
| Tests      | Jest + Supertest + in-memory Mongo  |
| Docs       | OpenAPI 3 via swagger-ui-express    |

## Quick start

### With Docker (API + MongoDB)

```bash
docker compose up --build
# API → http://localhost:4000    Docs → http://localhost:4000/docs
```

### Local development

```bash
cp .env.example .env          # then edit values
npm install
npm run dev                   # tsx watch, restarts on change
```

You need a MongoDB running locally (or point `MONGODB_URI` at Atlas). The compose file
above is the easiest way to get one.

## Environment variables

| Variable         | Default                                    | Notes                          |
|------------------|--------------------------------------------|--------------------------------|
| `NODE_ENV`       | `development`                              |                                |
| `PORT`           | `4000`                                     |                                |
| `MONGODB_URI`    | `mongodb://localhost:27017/expense_tracker`| Required in dev/prod           |
| `JWT_SECRET`     | —                                          | Required; ≥16 chars            |
| `JWT_EXPIRES_IN` | `7d`                                       |                                |
| `BCRYPT_ROUNDS`  | `12`                                       | Password hashing work factor   |

## API at a glance

Base path: `/api/v1`. All money amounts are in major units (e.g. `19.99`).

```bash
# 1. Register (returns a token)
curl -s -X POST localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"password123","name":"Me"}'

TOKEN="<paste token from above>"

# 2. Create a category
curl -s -X POST localhost:4000/api/v1/categories \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Food","color":"#FF8800"}'

# 3. Add an expense
curl -s -X POST localhost:4000/api/v1/expenses \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"amount":19.99,"categoryId":"<categoryId>","description":"Lunch"}'

# 4. Filtered, sorted, paginated list
curl -s "localhost:4000/api/v1/expenses?from=2026-01-01&sort=amount&order=desc&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 5. Budget vs actual report for a month
curl -s "localhost:4000/api/v1/reports/budget-vs-actual?month=2026-07" \
  -H "Authorization: Bearer $TOKEN"
```

Full, interactive documentation for every endpoint lives at **`/docs`**.

### Endpoint summary

| Group      | Endpoints                                                                 |
|------------|---------------------------------------------------------------------------|
| Auth       | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`                  |
| Categories | `POST/GET /categories`, `GET/PATCH/DELETE /categories/:id`                 |
| Expenses   | `POST/GET /expenses`, `GET/PATCH/DELETE /expenses/:id`                     |
| Budgets    | `POST/GET /budgets`, `PATCH/DELETE /budgets/:id`                           |
| Reports    | `GET /reports/monthly`, `/reports/by-category`, `/reports/budget-vs-actual`|

## Testing

```bash
npm test            # runs the full suite against an in-memory MongoDB
npm run test:coverage
```

No database setup needed — the tests spin up MongoDB in-memory.

## Project structure

```
src/
├── app.ts              # builds the Express app (no listen) — testable
├── server.ts           # connects Mongo, then listens
├── config/             # env validation, DB connection
├── middleware/         # authenticate, validate, errorHandler
├── models/             # User, Category, Expense, Budget
├── modules/            # feature modules: auth, categories, expenses, budgets, reports
│   └── <feature>/      #   .routes / .controller / .service / .schema
├── docs/openapi.ts     # OpenAPI document served at /docs
└── utils/              # AppError, asyncHandler, money, zod helpers
tests/                  # Jest + Supertest suites
```

## Design decisions

See **[ARCHITECTURE.md](ARCHITECTURE.md)** for the reasoning behind the layering, the
integer-cents money handling, the error model, and the aggregation reports.

## License

[MIT](LICENSE)
