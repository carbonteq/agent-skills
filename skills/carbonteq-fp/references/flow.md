# Flow Reference

`Flow` provides a unified generator interface for working with both `Option` and `Result` types simultaneously. It allows yielding both types in the same generator, automatically short-circuiting on `Option.None` or `Result.Err`.

**Note:** Flow is built on `ExperimentalOption` and `ExperimentalResult`. Use those (or alias them) when yielding values to Flow.

## Overview

The return type of a `Flow` generator is always a `Result<T, E | UnwrappedNone>`, where:

- `T` is the return value of the generator function
- `E` is the union of all error types yielded from `Result`s
- `UnwrappedNone` is included if any `Option`s were yielded

## Basic Usage

### `Flow.gen(function* () { ... })`

Unified generator for mixing `Option` and `Result` in synchronous workflows.

```typescript
import {
  Flow,
  ExperimentalOption as Option,
  ExperimentalResult as Result,
  UnwrappedNone,
} from "@carbonteq/fp";

const result = Flow.gen(function* () {
  const a = yield* Option.Some(5); // Unwraps Option<number> -> number
  const b = yield* Result.Ok(10); // Unwraps Result<number, never> -> number

  // If this was None, the flow would stop and return Result.Err(new UnwrappedNone())
  const c = yield* Option.fromNullable(20);

  return a + b + c;
});

console.log(result.unwrap()); // 35
```

### `Flow.genAdapter(function* ($) { ... })`

Adapter variant for better type inference in complex chains. The `$` function wraps both `Option` and `Result` values.

The adapter also provides `$.fail(error)` to yield an error directly without creating a `FlowError` subclass.

```typescript
const result = Flow.genAdapter(function* ($) {
  const val1 = yield* $(Option.Some(10));
  const val2 = yield* $(Result.Ok(20));
  return val1 + val2;
});
// Ok(30)
```

### `Flow.asyncGen(async function* () { ... })`

Async variant for mixed `Option`/`Result` async workflows. Use `yield* await` for async operations.

```typescript
const result = await Flow.asyncGen(async function* () {
  const user = yield* Option.Some({ id: 1 });

  // You can await async functions returning Result/Option before yielding
  const profile = yield* await fetchProfile(user.id);

  return profile;
});
```

### `Flow.asyncGenAdapter(async function* ($) { ... })`

Async variant with adapter that handles both sync and async operations automatically.

The adapter also provides `$.fail(error)`.

```typescript
const result = await Flow.asyncGenAdapter(async function* ($) {
  const user = yield* $(Option.Some(1)); // sync Option
  const profile = yield* $(await fetchProfile(user.id)); // async Result
  return profile;
});
```

## Short-circuiting Behavior

`Flow` generators short-circuit on the first failure:

- `Option.None` → Returns `Result.Err(new UnwrappedNone())`
- `Result.Err(error)` → Returns that `Err` result
- `FlowError` (via `yield* new MyError()`) → Returns `Result.Err(myError)`

```typescript
const result = Flow.gen(function* () {
  const a = yield* Option.Some(1); // Unwraps to 1
  const b = yield* Option.None; // Short-circuits here!
  const c = yield* Option.Some(3); // Never executes
  return a + b + c;
});
// Err(UnwrappedNone)
```

## FlowError

Extend `FlowError` to create custom errors that can be directly yielded in Flow generators.

```typescript
import { FlowError } from "@carbonteq/fp";

class ValidationError extends FlowError {
  readonly _tag = "ValidationError";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const result = Flow.gen(function* () {
  const value = yield* Option.Some(-5);

  if (value < 0) {
    yield* new ValidationError("Value must be positive");
  }

  return value * 2;
});
// Err(ValidationError: Value must be positive)
```

## Return Types

The return type of a Flow generator is always `Result<T, E | UnwrappedNone>`:

| Yielded Types                       | Return Type                            |
| ----------------------------------- | -------------------------------------- |
| Only `Option`s                      | `Result<T, UnwrappedNone>`             |
| Only `Result<T, E>`s                | `Result<T, E>`                         |
| Mixed `Option`s and `Result<T, E>`s | `Result<T, E \| UnwrappedNone>`        |
| Includes `FlowError`                | Error type includes the FlowError type |

```typescript
// Only Options
const onlyOptions = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Option.fromNullable("hello");
  return { a, b };
});
// Result<{ a: number; b: string }, UnwrappedNone>

// Only Results
const onlyResults = Flow.gen(function* () {
  const a = yield* Result.Ok<number, string>(1);
  const b = yield* Result.Ok("hello");
  return { a, b };
});
// Result<{ a: number; b: string }, string>

// Mixed
const mixed = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Result.Ok<number, string>(2);
  return a + b;
});
// Result<number, string | UnwrappedNone>
```

## Adapter Benefits

The adapter variant (`genAdapter`/`asyncGenAdapter`) provides:

1. **Better type inference** - TypeScript can better track types through complex chains
2. **Cleaner syntax** - No need to explicitly `await` before `yield*`
3. **Mixed sync/async** - Adapter handles both sync and async values

```typescript
// Without adapter (asyncGen) - explicit await needed
const withoutAdapter = await Flow.asyncGen(async function* () {
  const user = yield* await fetchUser(1); // Must await
  const profile = yield* await fetchProfile(user.id);
  const settings = yield* Option.fromNullable(profile.settings);
  return settings;
});

// With adapter (asyncGenAdapter) - cleaner
const withAdapter = await Flow.asyncGenAdapter(async function* ($) {
  const user = yield* $(fetchUser(1)); // Auto-awaited
  const profile = yield* $(fetchProfile(user.id));
  const settings = yield* $(Option.fromNullable(profile.settings));
  return settings;
});
```

## Stack Trace Preservation

`Flow` preserves user-friendly stack traces when short-circuiting occurs. The error stack will point to the location where `yield*` was called, not internal Flow machinery.

```typescript
const result = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Result.Err<number, string>("something failed");
  // Stack trace in Err points to the line above
  return a + b;
});
```

## Common Patterns

### API Request Chain with Validation

```typescript
const result = await Flow.asyncGenAdapter(async function* ($) {
  // Parse and validate input
  const input = yield* $(parseInput(rawInput));
  const validated = yield* $(validateSchema(input));

  // Fetch related data
  const user = yield* $(fetchUser(validated.userId));
  const profile = yield* $(fetchProfile(user.id));

  // Check permissions
  if (user.role !== "admin") {
    yield* new ForbiddenError("Admin access required");
  }

  return { user, profile };
});
```

### Cache-Aside Pattern

```typescript
async function getProduct(id: string): Promise<Result<Product, Error>> {
  return Flow.asyncGenAdapter(async function* ($) {
    // Try cache first
    const cached = Option.fromNullable(await cache.get(id));
    if (cached.isSome()) {
      return cached.unwrap();
    }

    // Cache miss - fetch from DB
    const product = yield* $(await db.products.findById(id));

    // Update cache asynchronously (don't await)
    cache.set(id, product);

    return product;
  });
}
```

### Multi-Step Validation with Errors

```typescript
const result = Flow.genAdapter(function* ($) {
  const input = yield* $(parseInput(rawString));

  // Validation with custom FlowError
  if (input.age < 18) {
    yield* new ValidationError("Must be 18 or older");
  }

  if (input.email.includes("+")) {
    yield* new ValidationError("Email aliases not allowed");
  }

  return input;
});
```

### Combining Independent Operations

```typescript
const result = await Flow.asyncGenAdapter(async function* ($) {
  const [user, posts, likes] = yield* $(
    Result.all(fetchUser(userId), fetchPosts(userId), fetchLikes(userId)),
  );

  return { user, posts, likes };
});
```
