# Route-test study guide

A study plan for the test files in `src/tests/`. Read it with
`src/tests/login.route.test.ts` open side by side — every rule below points at real
lines in that file.

Run tests with:

```
npm test                 # all tests once
npm run test:watch       # re-run on save (use this while studying)
npm test -- login        # only files whose path matches "login"
npm run test:coverage    # which route lines are never executed by a test
```

---

## 1. The mental model (understand this first)

A Next.js route handler is **just an exported async function** that takes a request
and returns a response:

```ts
export async function POST(request: NextRequest) { ... }   // src/app/api/auth/login/route.ts
```

So a route test does **not** start a server, does **not** use HTTP, and does **not**
touch the database. It:

1. imports `POST` directly,
2. replaces every module the route imports (services, bcrypt, logger) with fakes,
3. calls `POST(fakeRequest)`,
4. asserts on the returned `Response` — its `status` and its parsed `json()` — and on
   **which fakes were called with what**.

Two kinds of assertion, and you need both:

| Question | Assertion style |
| --- | --- |
| What did the client get back? | `expect(response.status).toBe(400)`, `expect(json.message)...` |
| What did the route *do* internally? | `expect(mocked_x.method).toHaveBeenCalledWith(...)` / `.not.toHaveBeenCalled()` |

The second kind is what catches real bugs: "the password hash never reaches the client"
(`login.route.test.ts:96-101`), "a failed token check never writes a password"
(`verify-reset.route.test.ts:146-153`).

---

## 2. The six zones of a test file, always in this order

Open `login.route.test.ts` and find each zone. Every test file you write should keep
this same order — it is not decoration, the order is partly required by Jest.

| # | Zone | Lines in `login.route.test.ts` | Purpose |
| --- | --- | --- | --- |
| 1 | Imports | 1-9 | the thing under test + the modules you will fake + error classes |
| 2 | `jest.mock(...)` calls | 11-32 | replace real modules with fakes |
| 3 | Typed mock handles | 34-35 | give TypeScript the `jest.Mocked<>` view of those fakes |
| 4 | Fixtures & helpers | 37-64 | constant data, `makeRequest()`, valid payloads |
| 5 | Global `beforeEach` | 66-68 | reset state between tests |
| 6 | `describe` / `it` tree | 70-229 | the actual scenarios |

**Why the order matters:** `jest.mock()` is *hoisted* by the compiler to the very top of
the file, above the imports. So zone 2 runs before zone 1's imports resolve — which is
exactly why the imports in zone 1 already give you the fake objects, and why zone 3 is
only a type cast, never a re-assignment.

---

## 3. Syntax reference — every construct used, and its trap

### 3.1 `jest.mock(path, factory)`

```ts
jest.mock("@/services/user_service", () => ({
  user_serivice: { ValidateUser: jest.fn(), Update_VerfiedUser: jest.fn() },
}));
```

- The factory returns **a fake version of the whole module**. The shape of the returned
  object must match the module's *named exports* — the route does
  `import { user_serivice }`, so the factory returns a `user_serivice` key.
- List only the methods the route actually calls. Anything you omit is `undefined`, and
  if the route calls it you get `TypeError: not a function` — which is a useful signal
  that you missed a dependency.
- `jest.fn()` = an empty spy: records calls, returns `undefined` until you program it.

**Default-export modules need `__esModule: true`:**

```ts
jest.mock("@/utils/logger", () => ({
  __esModule: true,                       // "treat this object as an ES module"
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
```

Without `__esModule: true`, `import logger from "@/utils/logger"` resolves to the whole
object instead of `.default`, and `logger.info(...)` blows up. `bcrypt` is mocked with
both `default` and a named `hash` (`verify-reset.route.test.ts:22-26`) so it works no
matter which import style the route uses.

**Always mock the logger.** It is not part of the behaviour you're testing, and the real
one writes files / noise during the run.

### 3.2 Typed handles

```ts
const mocked_user_service = user_serivice as jest.Mocked<typeof user_serivice>;
```

Pure TypeScript. At runtime `mocked_user_service === user_serivice` — the same fake
object. The cast is what makes `.mockResolvedValue(...)` and `.mock.calls` type-check.
Name them consistently (`mocked_<thing>`) so tests read the same across files.

### 3.3 The request stand-in

```ts
function makeRequest(body: unknown, { invalidJson = false } = {}): NextRequest {
  return {
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}
```

Read the comment above it in the file: *"the route only ever calls `request.json()`"*.
That is the whole justification for the `as unknown as NextRequest` double-cast — you
build the smallest object the route touches and lie to the type system about the rest.
The `invalidJson` flag exists purely to reach the route's `catch` around
`await request.json()` (`login/route.ts:18-22`).

If you test a route that reads headers or cookies, extend the stand-in with just those:

```ts
{ json: jest.fn().mockResolvedValue(body), cookies: { get: jest.fn() } } as unknown as NextRequest
```

### 3.4 Programming a fake

| Call | Meaning |
| --- | --- |
| `fn.mockResolvedValue(v)` | async success → `Promise.resolve(v)` |
| `fn.mockRejectedValue(e)` | async failure → `Promise.reject(e)`, drives the route's `catch` |
| `fn.mockReturnValue(v)` | sync return (use for `authGuard`) |
| `fn.mockResolvedValueOnce(v)` | applies to the next call only |

`as never` in `mockResolvedValue(fake_user as never)` is a shortcut to silence a
"fixture doesn't exactly match the Prisma type" complaint. Fine in tests; if it hides a
real shape mismatch, type the fixture properly instead.

### 3.5 Setup and reset

```ts
beforeEach(() => { jest.clearAllMocks(); });          // file-level, line 66
```

`clearAllMocks()` wipes recorded calls **and** programmed return values, so no test can
leak into the next. Without it, `toHaveBeenCalledTimes(1)` becomes a lie.

Then each `describe` may add its own `beforeEach` for that group's happy-path wiring
(`login.route.test.ts:73-77`). Jest runs the outer `beforeEach` first, then the inner —
so "clear everything, then set up this group" is the exact order you want.

Two valid strategies, both in this folder:

- **login**: reset only; each group wires what it needs. Explicit, more lines.
- **verify-reset** (`59-64`): one global `beforeEach` wires the *full happy path*, and
  each failure test overrides one mock. Less repetition — this is usually the nicer one.

### 3.6 The `describe` / `it` tree

```ts
describe("POST /api/auth/login", () => {        // subject: the route
  describe("successful login", () => {          // scenario group
    it("returns 200 with the login payload", async () => { ... });   // one behaviour
```

- Outer `describe` = the route, named exactly as `METHOD /api/path`.
- Inner `describe` = one branch of the route's logic.
- `it` name = a sentence that finishes "it ...". `returns 400 when the body is not valid
  JSON` — a failure message you can read without opening the test.
- **One behaviour per `it`.** Note that "returns 200" and "never leaks the password
  hash" are two separate tests over the same call (79-101), not one test with six
  `expect`s.

### 3.7 The body of a test: Arrange → Act → Assert

Always these three blocks, separated by blank lines:

```ts
mocked_user_service.ValidateUser.mockRejectedValue(new ItemNotFoundException("User not found"));  // Arrange

const response = await POST(makeRequest(validCredentials));                                        // Act
const json = await response.json();

expect(response.status).toBe(404);                                                                 // Assert
expect(json.message).toContain("User not found");
expect(mocked_auth_service.persist_auth).not.toHaveBeenCalled();
```

`await response.json()` is needed because `NextResponse.json()` returns a real
`Response` whose body must be parsed. Note the consequence: `Date` objects come back as
ISO **strings**, which is why the expectation says
`created_at: CREATED_AT.toISOString()` (line 92).

### 3.8 `it.each` — one test body, many inputs

```ts
it.each([
  ["missing email", { password: "secret123" }],
  ["malformed email", { email: "not-an-email", password: "secret123" }],
])("returns 400 for %s", async (_label, body) => { ... });
```

Each array is one test run: element 0 fills `%s` in the title, the rest become the
callback arguments. Use it whenever the assertions are identical and only the input
varies — validation tables are the perfect case. Don't use it when the assertions differ
per case; that hides which case failed.

### 3.9 Matchers you actually need

| Matcher | Use for |
| --- | --- |
| `toBe(x)` | primitives, and identity (`expect(passedResponse).toBe(response)`, line 118) |
| `toEqual(obj)` | deep value equality — the whole `data` payload |
| `toContain("...")` | substring of a message, so wording tweaks don't break the test |
| `not.toHaveProperty("pass_hash")` | absence of a field |
| `toHaveBeenCalledWith(a, b)` | the route passed the right arguments |
| `toHaveBeenCalledTimes(n)` | no double-calls |
| `not.toHaveBeenCalled()` | the route **stopped** before this step — the most valuable one |
| `expect.arrayContaining([expect.objectContaining({...})])` | "somewhere in this array there is an item with these keys" (lines 158-160) |

Inspect arguments directly when a matcher isn't enough:

```ts
const [passedResponse, payload] = mocked_auth_service.persist_auth.mock.calls[0];
```

`mock.calls` is an array of argument-arrays: `mock.calls[0][1]` = second argument of the
first call.

---

## 4. The order of logic — derive tests from the route's control flow

This is the part to internalise. **The `describe` blocks are the route's `try`/`catch`
branches, in the order the route hits them.** Compare `login/route.ts` with its test:

| Route code | Test group |
| --- | --- |
| whole `try` body succeeds (lines 17-70) | `describe("successful login")` |
| `catch` around `request.json()` (18-22) + `safeParse` fail (26-33) | `describe("request body validation")` |
| `ValidateUser` throws `ItemNotFoundException` / `BadRequestException` (72-85) | `describe("failed authentication")` |
| `DBException` → 500, unknown error → 500 (87-100) | `describe("server errors")` |

So the recipe for a new test file is mechanical:

1. Open the route. List every `return` and every `throw`/`instanceof` branch — that's
   your **exhaustive list of outcomes**. Each one needs at least one `it`.
2. List every imported module the handler calls — that's your **mock list** (zone 2).
3. Write the happy path first (it forces the fixtures and `makeRequest` into existence).
4. Then walk the branches **in route order**: input validation → authorization →
   business-rule failures → infrastructure failures → unknown error.
5. For each failure branch add the *negative* assertion: which later step must **not**
   have run. Status codes alone don't prove the route stopped safely.
6. Run `npm run test:coverage` and look at the route file — uncovered lines are branches
   you missed.

Within a group, order the `it`s the same way each time: **response shape → security
property → interaction/order of calls.** That's exactly lines 79 → 96 → 103 → 113.

---

## 5. Blank template to write from

```ts
// src/tests/<name>.route.test.ts
import type { NextRequest } from "next/server";

import { POST } from "@/app/api/<path>/route";
import { some_service } from "@/services/some_service";

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("@/services/some_service", () => ({
  some_service: { DoThing: jest.fn() },
}));
jest.mock("@/utils/logger", () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mocked_service = some_service as jest.Mocked<typeof some_service>;

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown, { invalidJson = false } = {}): NextRequest {
  return {
    json: invalidJson
      ? jest.fn().mockRejectedValue(new SyntaxError("Unexpected token"))
      : jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

const validBody = { /* ... */ };

beforeEach(() => {
  jest.clearAllMocks();
  mocked_service.DoThing.mockResolvedValue(/* happy path */ undefined as never);
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe("POST /api/<path>", () => {
  describe("success", () => { /* 200 shape, no leaks, right calls */ });
  describe("request body validation", () => { /* bad JSON, it.each of bad bodies */ });
  describe("business failures", () => { /* domain exceptions → 4xx */ });
  describe("server errors", () => { /* DBException → 500, unknown → 500 */ });
});
```

---

## 6. Study plan — 5 sessions, each ends with running code

**Session 1 — read, don't write (45 min).**
Read `login.route.test.ts` top to bottom next to `src/app/api/auth/login/route.ts`.
For every `it`, point at the line of the route it exercises. Then run
`npm test -- login` and watch the names print in tree order.

**Session 2 — break things on purpose (30 min).**
In the route, change `{ status: 400 }` to `401` on the validation branch; run the tests
and read the failure output. Restore it. Then delete `jest.clearAllMocks()` from the
test file and see which tests start failing and why. Restore. Then remove
`__esModule: true` from the logger mock and read that error too. **Recognising these
three failure messages is most of the debugging skill.**

**Session 3 — write one from scratch: logout (60 min).**
Cover `src/app/api/auth/logout/route.ts` yourself, in a scratch file, without opening
`logout.route.test.ts`. Then diff yours against the existing one. It's the smallest
route — good first target.

**Session 4 — new territory: `GET /api/suppliers` (90 min).**
`src/app/api/suppliers/route.ts` adds a pattern the auth tests don't have: `authGuard`
**returns** a response instead of throwing (`if (auth_error) return auth_error;`). So:

```ts
jest.mock("@/lib/auth/guard", () => ({ authGuard: jest.fn() }));
const mocked_guard = authGuard as jest.MockedFunction<typeof authGuard>;

// happy path: guard lets the request through
mocked_guard.mockReturnValue(null as never);

// denied path: guard returns a response, and the service must never be called
mocked_guard.mockReturnValue(
  NextResponse.json({ success: false }, { status: 403 }) as never
);
expect(mocked_supplier_service.Get_All_Suppliers).not.toHaveBeenCalled();
```

Cover: guard passes → 200 with `data` + `meta.total`; guard blocks → the guard's
response returned as-is; then one `it` per `instanceof` branch in the `catch`
(`InvalidRoleException` 403, `InsufficientPermissionsException` 403,
`AuthorizationException` 403, `AuthenticationException` 401, `ItemNotFoundException`
404, `DBException` 500, unknown 500) by making `Get_All_Suppliers` reject with each.

**Session 5 — the full pattern: `POST /api/suppliers/addition` (90 min).**
`src/app/api/suppliers/addition/route.ts` combines *everything*: guard, JSON parse,
Zod `safeParse` with an `it.each` table, an `ItemExists` → 400 business rule, plus the
error ladder. Write it end to end, then finish with `npm run test:coverage` and close
any uncovered line in that route.

Remaining practice targets afterwards: `src/app/api/suppliers/[id]/route.ts` (route
params — the handler's second argument) and
`src/app/api/suppliers/active_suppliers/route.ts`.

---

## 7. Self-check before you call a test file done

- [ ] Outer `describe` is `METHOD /api/path`.
- [ ] Every `return` in the route has at least one `it`.
- [ ] Logger is mocked; no real DB / bcrypt / network in the mock list.
- [ ] `jest.clearAllMocks()` in a `beforeEach`.
- [ ] Every failure test asserts something did **not** happen.
- [ ] At least one test asserts no secret (`pass_hash`, tokens) reaches the response.
- [ ] `it` names read as sentences and would be understandable in a CI log.
- [ ] Assertions use `toContain` for prose messages, `toEqual` for payload shapes.
- [ ] `npm run test:coverage` shows no uncovered branch in the route.

## 8. Error messages you will hit, and what they mean

| Message | Cause |
| --- | --- |
| `TypeError: X is not a function` | the method is missing from your `jest.mock` factory |
| `Cannot read properties of undefined (reading 'info')` | default-export mock without `__esModule: true` |
| `Received: undefined` on `json.data` | the fake resolved `undefined` — you forgot `mockResolvedValue` |
| `Expected 1, Received 2` on `toHaveBeenCalledTimes` | missing `jest.clearAllMocks()` |
| `Expected: 2026-01-01T00:00:00.000Z (Date)` vs string | JSON round-trip — compare `.toISOString()` |
| `Cannot find module '@/...'` | alias missing from `moduleNameMapper` in `jest.config.ts` |
