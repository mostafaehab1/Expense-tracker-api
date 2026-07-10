# Architecture

This document explains the key design decisions behind the Expense Tracker API —
the "why", not just the "what". If you're reviewing this project (or interviewing me
about it), this is the map.

## 1. Layered architecture

Requests flow through four layers, each with a single responsibility:

```
HTTP request
   │
   ▼
routes ───────► attach middleware (authenticate, validate), map path+method
   │
   ▼
controllers ──► HTTP glue only: read req, call a service, shape the response
   │
   ▼
services ─────► ALL business logic: ownership checks, money conversion,
   │            aggregation, error decisions
   ▼
models ───────► Mongoose schemas: the database shape, indexes, constraints
```

**Why:** the rule "no business logic in routes/controllers" keeps logic in one
testable place. Controllers stay trivial (call service → send JSON), so they rarely
need unit tests; the services hold the interesting logic and are where tests focus.
Swapping Express for Fastify later would touch only routes/controllers, not the logic.

Code is grouped **by feature** (`modules/auth`, `modules/expenses`, …) rather than by
technical type (one giant `controllers/` folder). Everything about a feature lives
together, which scales better as the app grows.

## 2. Per-user data isolation

Every domain document (`Category`, `Expense`, `Budget`) stores a `user` reference.
**Every** query in every service is scoped by `user: userId`. There is no code path
that reads or writes another user's data.

A subtle but deliberate choice: when you request a resource that exists but isn't
yours, you get **404, not 403**. Returning 403 would confirm the resource exists,
leaking information. 404 says "nothing here for you" and reveals nothing.

The `authenticate` middleware is the single gate: it verifies the JWT and sets
`req.userId`. Protected routers mount it with `router.use(authenticate)`, so you can't
forget it on an individual route.

## 3. Money as integer cents

Money is stored as an **integer number of minor units** (cents), never as a float.

**Why:** floating-point can't represent most decimal fractions exactly, so
`0.1 + 0.2 === 0.30000000000000004`. Summing thousands of expenses that way drifts.
Integers are exact. We convert at the API boundary (`utils/money.ts`): the outside
world sends and receives `19.99`, the database stores `1999`, and the serializers are
the only place the two representations meet. Aggregation reports sum in cents inside
MongoDB and convert once at the very end.

The trade-off is a little conversion code and the discipline of never letting raw cents
escape — enforced by routing all output through serializers.

## 4. Validation with Zod

Every endpoint validates `body`/`query`/`params` with a Zod schema via the `validate`
middleware **before** the controller runs. Zod was chosen over Joi because one schema
gives us both the runtime check *and* the inferred TypeScript type (`z.infer<...>`), so
there's a single source of truth with no drift between "what we validate" and "what the
types say".

Query params (always strings on the wire) use `z.coerce` to become numbers/dates, and
list endpoints cap `limit` at 100 so a client can't ask for a million rows.

## 5. Error handling

There is exactly **one** place errors become HTTP responses: `middleware/errorHandler.ts`.

- Anticipated failures are thrown as `AppError(code, message)` with a typed `code`
  (`VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, …) that maps to an HTTP status.
- The handler also normalizes framework errors it recognizes: Zod errors → 400 with
  field details, Mongoose duplicate-key (code 11000) → 409, `CastError` (bad ObjectId)
  → 404, Mongoose `ValidationError` → 400.
- Anything unrecognized is treated as a bug: a generic 500 whose real message is logged
  server-side and hidden from the client in production.

Every response — success or error — has a predictable shape. Errors are always
`{ "error": { "code, "message", "details?" } }`.

Async controllers are wrapped in `asyncHandler`, which forwards rejected promises to
`next()` — without it, Express 4 would leave an async throw unhandled and the request
would hang.

## 6. The aggregation reports (the interesting part)

The reports are computed by **MongoDB aggregation pipelines**, not by loading rows into
Node and looping. The database does the grouping, summing, and joining.

- **`/reports/monthly`** — `$match` the year+currency, `$group` by `$month` (pinned to
  UTC for determinism), then fill the 12-month series in JS so empty months show `0`.
- **`/reports/by-category`** — `$group` by category, `$lookup` the category name,
  `$sort` by total descending.
- **`/reports/budget-vs-actual`** — the hardest one. It starts from the user's budgets
  for the month, and for each budget uses a `$lookup` **sub-pipeline** to sum only the
  expenses matching that category, currency, and month window. Then it computes
  `remaining` and `percentUsed`. One round-trip, no N+1 queries.

All reports take a `currency` parameter and operate on a single currency, because v1
does no FX conversion — summing mixed currencies would be meaningless (see below).

## 7. Currency (v1 scope)

Each expense stores its own ISO-4217 `currency` (default `USD`). v1 does **not** convert
between currencies; reports are per-currency. This keeps totals honest without pulling in
a live FX-rate dependency. A future version could add a pluggable rate source and a
reporting base currency.

## 8. Testing strategy

Tests run against a real MongoDB provided by `mongodb-memory-server` — an in-memory
mongod spun up per run. This means tests exercise real queries, real indexes, and real
aggregation (not mocks), yet need no Docker or live database, so they run identically on
a laptop and in CI.

Supertest drives the Express app in-process (`createApp()` returns the app without
calling `listen()`), so there are no ports or network flakiness. Coverage centers on the
services and the endpoints that carry real logic: auth edge cases, per-user isolation,
the expense query features, and the aggregation reports.

## 9. Security notes

- Passwords are hashed with bcrypt; the hash is `select: false` and additionally stripped
  by a global `toJSON` transform, so it can never appear in a response.
- Login returns an identical error for "wrong password" and "unknown email" (with a dummy
  bcrypt compare to keep timing constant), so the endpoint can't be used to enumerate
  which emails are registered.
- `helmet` sets secure headers; auth endpoints are rate-limited; the JWT secret comes
  from the environment and is validated at startup.

## 10. Known trade-offs / future work

- **Single access token, no refresh.** Simpler for v1; a refresh-token rotation flow with
  logout/blacklist is the natural next step.
- **No FX conversion** (see §7).
- **Offset pagination** (`skip`/`limit`) is simple and fine at this scale; very large
  datasets would benefit from cursor/keyset pagination.
- **Category deletion is blocked while in use** (409) rather than reassigning or
  cascading — the safe default, chosen to never silently destroy spend history.
