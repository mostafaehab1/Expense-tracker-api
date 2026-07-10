# Expense Tracker API — Specification

> **Status:** Draft for review. No code is written yet. Read this, push back on
> anything you disagree with, and once it's approved we implement against it.

## 1. What this is

A REST API for personal expense tracking. A user signs up, records expenses, groups
them into categories, sets monthly budgets per category, and asks the API questions
like *"how much did I spend on food last month?"* or *"am I over budget?"*.

The scope is deliberately small. The value is in doing it to a professional standard:
clean layering, real auth, per-user data isolation, validated input, consistent errors,
and non-trivial reporting built on MongoDB aggregation.

## 2. Tech stack

| Concern        | Choice                          | Why |
|----------------|---------------------------------|-----|
| Language       | TypeScript                      | Types catch bugs before runtime; strong signal on a portfolio. |
| Runtime/HTTP   | Node.js + Express               | Familiar, ubiquitous, easy for a reviewer to read. |
| Database       | MongoDB + Mongoose              | Document model fits expenses; Mongoose gives schemas + aggregation helpers. |
| Validation     | Zod                             | One schema gives us both runtime validation *and* the TypeScript type. |
| Auth           | JWT (access token) + bcrypt     | Stateless auth; bcrypt is the standard for password hashing. |
| Tests          | Jest + Supertest                | Supertest drives the Express app in-process — no live server needed. |
| Docs           | OpenAPI 3 served at `/docs`     | Interactive, recruiter-friendly proof the API is real. |
| Tooling        | ESLint + Prettier               | Consistent style; shows discipline. |

## 3. Core concepts and data models

Four collections. Every document except `User` carries a `user` reference so we can
enforce **per-user data isolation** — you can only ever see or touch your own data.

### 3.1 User
The account. We never store the raw password, only a bcrypt hash.

| Field         | Type      | Notes |
|---------------|-----------|-------|
| `_id`         | ObjectId  | Primary key. |
| `email`       | string    | Unique, lowercased. Login identifier. |
| `passwordHash`| string    | bcrypt hash. **Never** returned in any response. |
| `name`        | string    | Display name. |
| `createdAt`   | Date      | Mongoose timestamp. |
| `updatedAt`   | Date      | Mongoose timestamp. |

Index: unique on `email`.

### 3.2 Category
A user-defined bucket like "Food", "Rent", "Transport". Categories belong to a user.

| Field       | Type     | Notes |
|-------------|----------|-------|
| `_id`       | ObjectId | |
| `user`      | ObjectId | Owner (ref User). |
| `name`      | string   | e.g. "Food". |
| `color`     | string   | Optional hex color for UI, e.g. `#FF8800`. |
| `createdAt` | Date     | |
| `updatedAt` | Date     | |

Index: compound unique on `{ user, name }` — a user can't have two categories with the
same name, but two different users can both have "Food".

### 3.3 Expense
A single spend. This is the heart of the API.

| Field         | Type     | Notes |
|---------------|----------|-------|
| `_id`         | ObjectId | |
| `user`        | ObjectId | Owner (ref User). |
| `category`    | ObjectId | ref Category. Must belong to the same user. |
| `amount`      | number   | Stored in **minor units (integer cents)** — see note below. Must be > 0. |
| `currency`    | string   | ISO 4217 code, e.g. `USD`. Per-expense, defaults to `USD`. **No conversion in v1** — see §7.4. |
| `description` | string   | Free text, e.g. "Lunch at cafe". |
| `date`        | Date     | When the spend happened (not when the row was created). |
| `createdAt`   | Date     | |
| `updatedAt`   | Date     | |

Indexes: `{ user, date }` (for date-range queries and sorting), `{ user, category }`
(for category filtering and breakdowns).

> **Money-as-integer note:** Storing money as a floating-point number (e.g. `19.99`)
> invites rounding errors — `0.1 + 0.2 !== 0.3` in JS. We store **integer cents**
> (`1999`) internally and convert at the API boundary. This is a deliberate, defensible
> engineering choice you can talk about in an interview. **Decided: integer cents.**

### 3.4 Budget
A spending limit for one category in one month.

| Field       | Type     | Notes |
|-------------|----------|-------|
| `_id`       | ObjectId | |
| `user`      | ObjectId | Owner (ref User). |
| `category`  | ObjectId | ref Category. |
| `month`     | string   | `YYYY-MM`, e.g. `2026-07`. The budget period. |
| `amount`    | number   | Limit in integer cents. |
| `createdAt` | Date     | |
| `updatedAt` | Date     | |

Index: compound unique on `{ user, category, month }` — one budget per category per
month.

## 4. Auth model

- **Register** (`POST /auth/register`): create a user, hash the password, return a JWT.
- **Login** (`POST /auth/login`): verify email + password, return a JWT.
- The JWT payload carries `{ sub: userId }` and is signed with `JWT_SECRET`, expiring
  after `JWT_EXPIRES_IN` (default `7d`).
- Every protected route requires an `Authorization: Bearer <token>` header. An
  `authenticate` middleware verifies the token and attaches `req.userId`.
- **Isolation is enforced in the service layer**: every query is scoped by `user:
  req.userId`. There is no endpoint that can read another user's data.

> v1 uses a single access token (no refresh token). Refresh-token rotation is a noted
> future enhancement (8.2) — kept out to keep scope tight.

## 5. Architecture & folder structure

Strict layering, each layer with one job. **No business logic in routes.**

```
routes  ->  controllers  ->  services  ->  models
  |             |               |            |
  |             |               |            └─ Mongoose schemas, DB shape
  |             |               └─ business logic, aggregation, ownership checks
  |             └─ HTTP glue: read req, call service, shape the response
  └─ path + method definitions, attach middleware (auth, validation)
```

```
expense-tracker-api/
├── src/
│   ├── app.ts                 # builds the Express app (no listen) — testable
│   ├── server.ts              # starts the app, connects to Mongo
│   ├── config/
│   │   ├── env.ts             # loads + validates env vars with Zod
│   │   └── db.ts              # Mongoose connection helper
│   ├── middleware/
│   │   ├── authenticate.ts    # verifies JWT, sets req.userId
│   │   ├── validate.ts        # runs a Zod schema against req
│   │   └── errorHandler.ts    # centralized error -> JSON response
│   ├── modules/
│   │   ├── auth/              # auth.routes / .controller / .service / .schema
│   │   ├── categories/
│   │   ├── expenses/
│   │   ├── budgets/
│   │   └── reports/
│   ├── models/                # User, Category, Expense, Budget (Mongoose)
│   ├── utils/
│   │   ├── AppError.ts        # typed operational error
│   │   └── asyncHandler.ts    # wraps async controllers, forwards errors
│   └── docs/openapi.ts        # OpenAPI spec, served at /docs
├── tests/                     # Jest + Supertest
├── .env.example
├── Dockerfile
├── docker-compose.yml         # app + mongo
├── .eslintrc / .prettierrc
├── SPEC.md
├── ARCHITECTURE.md
└── README.md
```

Grouping by **feature module** (auth, expenses, …) rather than by technical type keeps
everything about one feature together. It scales better than one giant `controllers/`
folder.

## 6. API surface

Base path: `/api/v1`. All bodies are JSON. All protected routes need the Bearer token.

Amounts in requests/responses are in **major units as a number** (e.g. `19.99`); the
service converts to/from integer cents at the boundary.

### 6.1 Auth
| Method | Path              | Auth | Body                              | Success |
|--------|-------------------|------|-----------------------------------|---------|
| POST   | `/auth/register`  | —    | `{ email, password, name }`       | 201 `{ user, token }` |
| POST   | `/auth/login`     | —    | `{ email, password }`             | 200 `{ user, token }` |
| GET    | `/auth/me`        | ✔    | —                                 | 200 `{ user }` |

`user` in responses = `{ id, email, name, createdAt }`. Never includes `passwordHash`.

### 6.2 Categories
| Method | Path               | Auth | Body / Query                | Success |
|--------|--------------------|------|-----------------------------|---------|
| POST   | `/categories`      | ✔    | `{ name, color? }`          | 201 category |
| GET    | `/categories`      | ✔    | —                           | 200 `{ data: [...] }` |
| GET    | `/categories/:id`  | ✔    | —                           | 200 category |
| PATCH  | `/categories/:id`  | ✔    | `{ name?, color? }`         | 200 category |
| DELETE | `/categories/:id`  | ✔    | —                           | 204 |

Delete rule: if a category still has expenses, we **reject with 409**. We never orphan
or silently destroy expense data. **Decided: block with 409.**

### 6.3 Expenses
| Method | Path              | Auth | Body / Query | Success |
|--------|-------------------|------|--------------|---------|
| POST   | `/expenses`       | ✔    | `{ amount, categoryId, description?, date?, currency? }` | 201 expense |
| GET    | `/expenses`       | ✔    | query params below | 200 paginated list |
| GET    | `/expenses/:id`   | ✔    | — | 200 expense |
| PATCH  | `/expenses/:id`   | ✔    | any subset of the create fields | 200 expense |
| DELETE | `/expenses/:id`   | ✔    | — | 204 |

**`GET /expenses` query features:**
- Pagination: `page` (default 1), `limit` (default 20, max 100).
- Filtering: `from` / `to` (ISO dates, inclusive range on `date`), `categoryId`,
  `minAmount` / `maxAmount`, `q` (text match on description).
- Sorting: `sort` = `date` | `amount` | `createdAt`, with `order` = `asc` | `desc`
  (default `date desc`).

**Paginated response shape** (used by all list endpoints):
```json
{
  "data": [ /* items */ ],
  "pagination": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
}
```

### 6.4 Budgets
| Method | Path            | Auth | Body / Query               | Success |
|--------|-----------------|------|----------------------------|---------|
| POST   | `/budgets`      | ✔    | `{ categoryId, month, amount }` | 201 budget |
| GET    | `/budgets`      | ✔    | `?month=YYYY-MM`           | 200 `{ data: [...] }` |
| PATCH  | `/budgets/:id`  | ✔    | `{ amount }`               | 200 budget |
| DELETE | `/budgets/:id`  | ✔    | —                          | 204 |

### 6.5 Reports — the showcase (MongoDB aggregation)
These are read-only and computed with aggregation pipelines, not by pulling rows into
Node and looping. That's the point of the project.

| Method | Path                          | Query | Returns |
|--------|-------------------------------|-------|---------|
| GET    | `/reports/monthly`            | `?year=2026&currency=USD` | Total spend per month for the year, for one currency: `[{ month, total }]`. |
| GET    | `/reports/by-category`        | `?from&to&currency=USD` | Spend grouped by category in a date range: `[{ categoryId, name, total, count }]`, sorted desc. |
| GET    | `/reports/budget-vs-actual`   | `?month=YYYY-MM&currency=USD` | Per category: `{ categoryId, name, budget, actual, remaining, percentUsed }`. Joins Budget + summed Expenses for the month. |

**Currency in reports:** because v1 does no FX conversion (§7.4), every report takes a
`currency` param (default `USD`) and only sums expenses in that currency. This keeps
totals meaningful — we never add EUR to USD.

`budget-vs-actual` is the hardest and best one: it aggregates expenses for the month by
category, `$lookup`s the matching budgets, and computes remaining/percent — a genuine
multi-stage pipeline.

## 7. Cross-cutting rules

### 7.1 Validation
Every endpoint validates `body`, `params`, and `query` with a Zod schema via the
`validate` middleware **before** the controller runs. Examples:
- `amount` must be a positive number with ≤ 2 decimal places.
- `email` must be a valid email; `password` min length 8.
- `month` must match `^\d{4}-(0[1-9]|1[0-2])$`.
- `categoryId` must be a valid ObjectId **and** owned by the requester (checked in the
  service, since it needs the DB).

### 7.2 Error format
One consistent JSON envelope for every error, produced by the central error handler:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "amount must be greater than 0",
    "details": [ { "path": "amount", "message": "..." } ]
  }
}
```
| HTTP | `code`               | When |
|------|----------------------|------|
| 400  | `VALIDATION_ERROR`   | Body/query/params failed Zod. `details` lists field errors. |
| 401  | `UNAUTHENTICATED`    | Missing/invalid/expired token. |
| 403  | `FORBIDDEN`          | Authenticated but not the owner. |
| 404  | `NOT_FOUND`          | Resource doesn't exist (or isn't yours — we return 404, not 403, so we don't leak existence). |
| 409  | `CONFLICT`           | Duplicate (e.g. category name) or delete blocked by references. |
| 500  | `INTERNAL`           | Unexpected. Message is generic; real error is logged, never leaked. |

Operational errors are thrown as `AppError(code, message, httpStatus)`; the handler
turns them into the envelope. Unknown errors become a generic 500.

### 7.4 Currency handling (v1)
- Each expense stores its own `currency` (ISO 4217, default `USD`).
- **No conversion.** v1 never converts between currencies.
- Reports operate on **one currency at a time** (a `currency` query param). Summing
  across currencies without conversion would be meaningless, so we don't.
- Future work: pluggable FX rate source + a reporting base currency.

### 7.5 Security basics
- `helmet` for secure headers, `cors` configured, `express-rate-limit` on `/auth/*`.
- Passwords hashed with bcrypt (cost 12). JWT secret from env, never committed.
- No secret or hash ever appears in a response or log.

## 8. Resolved decisions (locked 2026-07-10)

1. **Money storage** — ✅ **Integer cents** internally, major units at the API boundary.
2. **Refresh tokens** — ✅ **Single access token** for v1 (7d expiry). Refresh is future work.
3. **Category delete with existing expenses** — ✅ **Block with 409.** No cascade, no orphan.
4. **Multi-currency** — ✅ **Currency stored per expense, no conversion.** Reports are
   per-currency (§7.4).
5. **Deployment** — ⏳ **Decided later.** Fly.io is the target; project TBD after all
   three are built.

## 9. Definition of done for Project 1
- All endpoints above implemented with the layering in §5.
- Zod validation on every endpoint; central error handler; per-user isolation.
- Jest + Supertest tests for services and key endpoints (auth, expense CRUD, one report).
- OpenAPI served at `/docs`; Dockerfile + docker-compose; `.env.example`; ESLint/Prettier.
- GitHub Actions running lint + tests on push.
- `README.md` (yours) + `ARCHITECTURE.md` explaining the layering, money handling, and
  the aggregation reports.
