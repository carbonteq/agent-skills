# Patterns Guide

Common patterns and anti-patterns when using `@carbonteq/fp`.

**Note:** Flow examples use `ExperimentalOption`/`ExperimentalResult`. You can alias them for brevity:

```typescript
import { ExperimentalOption as Option, ExperimentalResult as Result, Flow } from "@carbonteq/fp";
```

## Data Validation Pipeline

Create a validation pipeline that collects all errors at once.

```typescript
import { Result } from "@carbonteq/fp";

interface CreateUserInput {
  email: string;
  password: string;
  age: number;
}

function validateUser(input: CreateUserInput): Result<CreateUserInput, string[]> {
  return Result.Ok(input).validate([
    ({ email }) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? Result.Ok(true)
        : Result.Err("Invalid email format"),
    ({ password }) =>
      password.length >= 8 ? Result.Ok(true) : Result.Err("Password must be at least 8 characters"),
    ({ password }) =>
      /[A-Z]/.test(password) ? Result.Ok(true) : Result.Err("Password must contain uppercase"),
    ({ age }) => (age >= 18 ? Result.Ok(true) : Result.Err("Must be 18 or older")),
  ]);
}

// Usage
const result = validateUser({
  email: "bad-email",
  password: "short",
  age: 15,
});
// Err(["Invalid email format", "Password must be at least 8 characters", "Must be 18 or older"])
```

## API Request Chains

Chain multiple API calls where each depends on the previous result.

```typescript
import { ExperimentalResult as Result, Flow } from "@carbonteq/fp";

async function getUserOrders(userId: string): Promise<Result<Order[], Error>> {
  return Flow.asyncGenAdapter(async function* ($) {
    // First, get the user
    const user = yield* $(await fetchUser(userId));

    // Then get their orders
    const orders = yield* $(await fetchOrders(user.id));

    // Then enrich with product details
    const enrichedOrders = yield* $(Result.all(...orders.map((order) => enrichOrder(order))));

    return enrichedOrders;
  });
}
```

## Error Recovery with Fallbacks

Use `orElse` to provide fallback strategies when operations fail.

```typescript
import { Result } from "@carbonteq/fp";

async function getConfigWithFallbacks(key: string): Promise<Result<string, never>> {
  return (await fetchFromEnv(key))
    .orElse(() => fetchFromConfigFile(key))
    .orElse(() => fetchFromDefaults(key))
    .orElse(() => Result.Ok("")); // Always succeeds with empty string default
}
```

## Optional Property Access

Safely access nested optional properties.

```typescript
import { ExperimentalOption as Option } from "@carbonteq/fp";

interface User {
  profile?: {
    settings?: {
      notifications?: {
        email: boolean;
      };
    };
  };
}

function getEmailNotificationSetting(user: User): Option<boolean> {
  return Option.gen(function* () {
    const profile = yield* Option.fromNullable(user.profile);
    const settings = yield* Option.fromNullable(profile.settings);
    const notifications = yield* Option.fromNullable(settings.notifications);
    return notifications.email;
  });
}

// Or more concisely with flatMap
function getEmailNotificationSettingAlt(user: User): Option<boolean> {
  return Option.fromNullable(user.profile)
    .flatMap((p) => Option.fromNullable(p.settings))
    .flatMap((s) => Option.fromNullable(s.notifications))
    .flatMap((n) => Option.Some(n.email));
}
```

## Parallel Independent Operations

Use `Result.all` or `Option.all` to combine independent operations.

```typescript
import { Result } from "@carbonteq/fp";

async function fetchAllUserData(userId: string): Promise<Result<CompleteUserData, Error[]>> {
  const [user, posts, likes, comments] = await Promise.all([
    fetchUser(userId),
    fetchPosts(userId),
    fetchLikes(userId),
    fetchComments(userId),
  ]);

  return Result.all(user, posts, likes, comments).map(([user, posts, likes, comments]) => ({
    user,
    posts,
    likes,
    comments,
  }));
}
```

## Try-Catch Replacement

Replace try/catch with `Result.tryCatch` for functional error handling.

```typescript
import { Result } from "@carbonteq/fp";

function parseJsonSafely(json: string): Result<unknown, Error> {
  return Result.tryCatch(
    () => JSON.parse(json),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
}

// Async version
function fetchJsonSafely(url: string): Result<Promise<unknown>, Error> {
  return Result.tryAsyncCatch(
    async () => {
      const response = await fetch(url);
      return response.json();
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
}

const data = await fetchJsonSafely("/api/data").unwrap();
```

## Cache-Aside Pattern

Implement cache-aside with Option/Result.

```typescript
import { ExperimentalOption as Option, ExperimentalResult as Result, Flow } from "@carbonteq/fp";

async function getProduct(id: string): Promise<Result<Product, Error>> {
  return Flow.asyncGenAdapter(async function* ($) {
    // Try cache first (returns Option)
    const cached = Option.fromNullable(await cache.get(id));
    if (cached.isSome()) {
      return cached.unwrap();
    }

    // Cache miss - fetch from database
    const product = yield* $(await db.products.findById(id));

    // Update cache (fire and forget)
    cache.set(id, product);

    return product;
  });
}
```

## Anti-Patterns

### Don't: Unwrap Without Checking

```typescript
// BAD - Throws if None
const email = Option.fromNullable(user.profile).unwrap().email;

// GOOD - Use map, flatMap, or match
const email = Option.fromNullable(user.profile).flatMap((p) => Option.fromNullable(p.email));
```

### Don't: Nested flatMap When gen is Clearer

```typescript
// BAD - Hard to read
const result = fetchUser(userId)
  .flatMapAsync((user) => fetchProfile(user.id))
  .flatMapAsync((profile) => fetchSettings(profile.id))
  .flatMapAsync((settings) => fetchPreferences(settings.id));

// GOOD - Clean imperative style
const result = await Flow.asyncGenAdapter(async function* ($) {
  const user = yield* $(await fetchUser(userId));
  const profile = yield* $(await fetchProfile(user.id));
  const settings = yield* $(await fetchSettings(profile.id));
  const preferences = yield* $(await fetchPreferences(settings.id));
  return preferences;
});
```

### Don't: Use map for Operations Returning Options/Results

```typescript
// BAD - Creates Option<Option<number>>
const bad = Option.Some(5).map((x) => Option.Some(x * 2));

// GOOD - Use flatMap
const good = Option.Some(5).flatMap((x) => Option.Some(x * 2));
```

### Don't: Ignore Async Variants

```typescript
// BAD - Passing Promise-returning function to sync method
Option.Some(5).map(async (x) => x * 2); // Type error!

// GOOD - Use mapAsync
await Option.Some(5).mapAsync(async (x) => x * 2);
```

### Don't: Use Result for Simple Boolean Conditions

```typescript
// BAD - Overkill for simple bool
const check = value > 0 ? Result.Ok(true) : Result.Err("too small");

// GOOD - Use fromPredicate
const check = Result.fromPredicate(value, (v) => v > 0, "too small");
```

### Don't: Forget Error Type Widening

```typescript
// GOOD - Remember that flatMap widens error types
const result: Result<number, "error1">;
const widened: Result<number, "error1" | "error2"> = result.flatMap((x) =>
  x > 0 ? Result.Ok(x) : Result.Err("error2" as const),
);
```

## Best Practices

1. **Use `Flow.gen` for complex chains** - More readable than nested `flatMap`
2. **Use `validate` for collecting all errors** - Better UX than failing on first error
3. **Use `tryCatch` at boundaries** - Wrap external APIs and JSON parsing
4. **Prefer `Option` for truly optional data** - Use `Result` when absence is an error
5. **Use `tap` for side effects** - Logging, metrics, debugging without breaking chains
6. **Use adapter generators** - `genAdapter`/`asyncGenAdapter` for better type inference
7. **Handle errors explicitly** - Use `match`, `fold`, or `match` instead of `unwrap`
