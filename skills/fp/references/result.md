# Result Reference

The `Result<T, E>` type represents a value that can be either a success (`Ok`) or a failure (`Err`). It makes error handling explicit through the type system.

## Variants

- **`Ok<T>`** - Contains a success value of type `T`
- **`Err<E>`** - Contains an error of type `E`

## Creating Results

### `Result.Ok(value)`

Create an `Ok` containing the provided value.

```typescript
const ok = Result.Ok(42); // Result<number, never>
const ok2 = Result.Ok("success"); // Result<string, never>
```

### `Result.Err(error)`

Create an `Err` containing the provided error.

```typescript
const err = Result.Err("Something failed"); // Result<never, string>
const err2 = Result.Err(new Error("oops")); // Result<never, Error>
```

### `Result.fromNullable(value, error)`

Create a `Result` from a nullable value. Returns `Err` with the provided error for `null` or `undefined`.

```typescript
Result.fromNullable("hello", "missing"); // Ok("hello")
Result.fromNullable(null, "missing"); // Err("missing")
Result.fromNullable(undefined, "missing"); // Err("missing")
Result.fromNullable(0, "missing"); // Ok(0) - 0 is not nullish

// Practical
function getConfig(key: string): string | undefined {
  return process.env[key];
}
const config = Result.fromNullable(getConfig("API_KEY"), "API_KEY not set");
```

### `Result.fromPredicate(value, predicate, error)`

Create a `Result` based on a predicate function. Returns `Ok` with the value if the predicate returns `true`, else `Err` with the provided error.

```typescript
const score = 85;
const passed = Result.fromPredicate(score, (s) => s >= 60, "Score too low");
// Ok(85)

const failed = Result.fromPredicate(45, (s) => s >= 60, "Score too low");
// Err("Score too low")
```

### `Result.tryCatch(fn, onError)`

Wrap a synchronous operation in a `Result`, catching any exceptions.

```typescript
function parseJson(json: string): Result<unknown, Error> {
  return Result.tryCatch(
    () => JSON.parse(json),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
}

parseJson('{"name":"Alice"}'); // Ok({ name: "Alice" })
parseJson("invalid json"); // Err(SyntaxError: ...)
```

### `Result.tryAsyncCatch(fn, onError)`

Wrap an asynchronous operation in a `Result`, catching any exceptions.

```typescript
async function fetchUserData(id: string): Promise<Result<{ name: string }, Error>> {
  return Result.tryAsyncCatch(
    async () => {
      const response = await fetch(`/api/users/${id}`);
      return response.json();
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
}
```

## Type Guards

### `.isOk()`

Returns `true` if this is an `Ok`, narrows the type.

```typescript
const result = Result.Ok(42);
if (result.isOk()) {
  // TypeScript knows value is accessible: 42
  console.log(result.unwrap()); // 42
}
```

### `.isErr()`

Returns `true` if this is an `Err`.

```typescript
const result = Result.Err("failed");
if (result.isErr()) {
  // TypeScript knows error is accessible: "failed"
  console.log(result.unwrapErr()); // "failed"
}
```

### `.isUnit()`

Returns `true` when the Ok value is the `UNIT` singleton (used for void-success operations).

```typescript
function saveToDb(): Result<UNIT, DbError> {
  return Result.UNIT_RESULT;
}
```

## Transform Methods

### `.map(fn)`

Transform the success value using the provided function. If `Err`, propagates the error unchanged.

```typescript
Result.Ok(42).map((x) => x * 2); // Ok(84)
Result.Err("fail").map((x) => x * 2); // Err("fail")

// Chaining
Result.Ok("hello")
  .map((s) => s.toUpperCase())
  .map((s) => `${s}!`)
  .map((s) => s.length); // Ok(6)
```

### `.mapAsync(fn)`

Transform using an async function. Returns `Promise<Result<U, E>>`.

```typescript
await Result.Ok(42).mapAsync(async (x) => x * 2);
// Promise<Ok(84)>
```

### `.flatMap(fn)`

Chain operations that return Results, flattening nested Results.

```typescript
Result.Ok(42)
  .flatMap((x) => Result.Ok(x + 1)) // Ok(43)
  .flatMap((x) => Result.Err("too big")); // Err("too big")

Result.Err("initial").flatMap((x) => Result.Ok(x + 1)); // Err("initial")
```

### `.flatMapAsync(fn)`

Chain async operations that return Results.

```typescript
await Result.Ok(42)
  .flatMapAsync(async (x) => await fetchUser(x))
  .flatMapAsync(async (u) => await getProfile(u.id));
```

### `.zip(fn)`

Pair the original value with a derived value in a tuple `[original, derived]`.

```typescript
Result.Ok(42).zip((x) => x * 10); // Ok([42, 420])
Result.Err("fail").zip((x) => x * 10); // Err("fail")

// Keep original while computing derived
Result.Ok(user).zip((u) => u.permissions.length); // Ok([user, 5])
```

### `.zipAsync(fn)`

Pair with an async derived value.

```typescript
await Result.Ok(42).zipAsync(async (x) => x * 10);
// Promise<Ok([42, 420])>
```

### `.flatZip(fn)`

Combine with another independent Result in a tuple. If either is `Err`, propagates the first error.

```typescript
Result.Ok(42)
  .flatZip((x) => Result.Ok(x + 5)) // Ok([42, 47])
  .flatZip(([a, b]) => Result.Err("x")); // Err("x")

Result.Ok(42).flatZip((x) => Result.Err("fail")); // Err("fail")
Result.Err("init").flatZip((x) => Result.Ok(5)); // Err("init")
```

### `.flatZipAsync(fn)`

Combine with an async Result.

```typescript
await Result.Ok(42).flatZipAsync(async (x) => await fetchData(x));
// Promise<Ok([42, Data])>
```

## Error Methods

### `.mapErr(fn)`

Transform the error value while preserving the success value. If `Ok`, returns unchanged.

```typescript
Result.Err("network error").mapErr((e) => `Network: ${e}`);
// Err("Network: network error")

Result.Ok(42).mapErr((e) => `Error: ${e}`);
// Ok(42) - mapErr not called
```

### `.mapErrAsync(fn)`

Transform the error using an async function.

```typescript
await Result.Err("timeout").mapErrAsync(async (e) => await formatError(e));
// Promise<Err("Timeout occurred: timeout")>
```

### `.zipErr(fn)`

Run a validation/binding function on the Ok value that can produce a new error, while preserving the original Ok value. If the function returns an `Err`, that error is returned.

```typescript
const checkPermissions = (userId: string) =>
  Result.Ok(userId).zipErr((id) =>
    id === "guest" ? Result.Err("Guest users have limited access") : Result.Ok(undefined),
  );

checkPermissions("admin-123"); // Ok("admin-123")
checkPermissions("guest"); // Err("Guest users have limited access")
```

### `.mapBoth(fnOk, fnErr)`

Transform both the success value and error value simultaneously.

```typescript
Result.Ok(42).mapBoth(
  (val) => `Success: ${val}`,
  (err) => `Error: ${err}`,
); // Ok("Success: 42")

Result.Err("timeout").mapBoth(
  (val) => `Success: ${val}`,
  (err) => `Error: ${err}`,
); // Err("Error: timeout")
```

### `.mapBothAsync(fnOk, fnErr)`

Async variant of `mapBoth`.

```typescript
await Result.Ok(42).mapBothAsync(
  async (val) => await formatSuccess(val),
  async (err) => await formatError(err),
);
// Promise<Ok("Success: 42")>
```

## Validation Methods

### `.validate([fn, ...])`

Run multiple validators on the Ok value, collecting ALL errors. Unlike most Result methods which short-circuit on the first error, `validate` runs ALL validators and collects all errors together.

```typescript
const validators = [
  (x: number) => (x > 0 ? Result.Ok(true) : Result.Err("must be positive")),
  (x: number) => (x < 100 ? Result.Ok(true) : Result.Err("must be < 100")),
  (x: number) => (x % 2 === 0 ? Result.Ok(true) : Result.Err("must be even")),
];

Result.Ok(42).validate(validators); // Ok(42)
Result.Ok(101).validate(validators); // Err(["must be < 100"])
Result.Ok(-5).validate(validators); // Err(["must be positive", "must be even"])
Result.Err("init").validate(validators); // Err("init") - validators not run
```

### `.validateAsync([fn, ...])`

Async variant of `validate`. Always returns `Promise<Result<T, E | VE[]>>`.

```typescript
const validated = await Result.Ok(formData).validateAsync([
  async (d) => await checkEmailUnique(d.email),
  async (d) => await checkUsernameAvailable(d.username),
]);
```

## Recovery Methods

### `.orElse(fn)`

Recover from an error by providing a fallback Result. If `Ok`, returns unchanged. If `Err`, calls the function with the error.

```typescript
// Recovery chain
fetchFromPrimary()
  .orElse((e) => fetchFromBackup())
  .orElse((e) => Result.Ok(defaultValue));

Result.Ok(42).orElse((e) => Result.Ok(0)); // Ok(42) - passes through
Result.Err("not found").orElse((e) => Result.Ok(0)); // Ok(0)
Result.Err("fail").orElse((e) => Result.Err("critical")); // Err("critical")
```

### `.orElseAsync(fn)`

Async variant of `orElse`.

```typescript
await fetchData().orElseAsync(async (e) => {
  return await fetchBackupData();
});
```

## Match Methods

### `.match({ Ok, Err })`

Exhaustive pattern matching on both states.

```typescript
Result.Ok(42).match({
  Ok: (val) => `Success: ${val}`,
  Err: (err) => `Failed: ${err}`,
});
// "Success: 42"

Result.Err("fail").match({
  Ok: (val) => `Success: ${val}`,
  Err: (err) => `Failed: ${err}`,
});
// "Failed: fail"
```

### `.fold(onOk, onErr)`

Positional argument variant of `match` (FP convention).

```typescript
Result.Ok(42).fold(
  (val) => `Success: ${val}`,
  (err) => `Failed: ${err}`,
);
// "Success: 42"
```

### `.foldAsync(onOk, onErr)`

Async pattern matching with positional arguments.

```typescript
await Result.Ok(userId).foldAsync(
  async (id) => await fetchUserData(id),
  async (error) => await logAndGetFallback(error),
);
```

### `.matchAsync({ Ok, Err })`

Async pattern matching with object syntax.

```typescript
await apiResult.matchAsync({
  Ok: async (data) => await processData(data),
  Err: async (error) => await handleError(error),
});
```

### `.matchPartial({ Ok?, Err? }, getDefault)`

Pattern match with a subset of cases, using a default for unhandled cases.

```typescript
// Only handle Ok, default for Err
Result.Ok(42).matchPartial({ Ok: (v) => v * 2 }, () => 0); // 84
Result.Err("fail").matchPartial({ Ok: (v) => v * 2 }, () => 0); // 0
```

## Unwrap Methods

### `.unwrap()`

Get the contained success value or throw. If `Err` and the error extends Error, the original error is re-thrown.

```typescript
Result.Ok(42).unwrap(); // 42
Result.Err(new Error("fail")).unwrap(); // throws Error("fail")
Result.Err("fail").unwrap(); // throws UnwrappedOkWithErr
```

### `.unwrapOr(defaultValue)`

Get the success value or return the provided default.

```typescript
Result.Ok(42).unwrapOr(0); // 42
Result.Err("fail").unwrapOr(0); // 0
```

### `.unwrapOrElse(fn)`

Get the success value or compute a default from the error.

```typescript
Result.Err("Not found").unwrapOrElse((err) => `Default: ${err}`);
// "Default: Not found"

Result.Ok(42).unwrapOrElse((err) => 0); // 42
```

### `.unwrapErr()`

Get the contained error or throw if `Ok`.

```typescript
Result.Err("fail").unwrapErr(); // "fail"
Result.Ok(42).unwrapErr(); // throws UnwrappedErrWithOk
```

### `.safeUnwrap()`

Get the success value, or return `null` for `Err`.

```typescript
Result.Ok(42).safeUnwrap(); // 42
Result.Err("fail").safeUnwrap(); // null
```

## Tap (Side Effects)

### `.tap(fn)`

Execute a side effect for `Ok` values, then return `this` unchanged.

```typescript
Result.Ok(42)
  .tap((x) => console.log(`Processing: ${x}`))
  .map((x) => x * 2);
// Logs: "Processing: 42"
// Returns: Ok(84)
```

### `.tapAsync(fn)`

Execute an async side effect for `Ok` values.

```typescript
await Result.Ok(user)
  .tapAsync(async (u) => await logAuditTrail(u))
  .map((u) => u.id);
```

### `.tapErr(fn)`

Execute a side effect for `Err` values, then return `this` unchanged.

```typescript
Result.Err("Connection failed")
  .tapErr((err) => console.error(`[Error Log] ${err}`))
  .orElse((e) => Result.Ok(defaultValue));
```

### `.tapErrAsync(fn)`

Execute an async side effect for `Err` values.

```typescript
await Result.Err("API error")
  .tapErrAsync(async (e) => await reportToSentry(e))
  .orElse((e) => Result.Ok(backupData));
```

## Aggregation

### `Result.all(...results)`

Combine multiple Results, collecting all values or all errors. Unlike typical Result behavior which short-circuits on first error, `all` collects ALL errors.

```typescript
Result.all(Result.Ok(1), Result.Ok(2), Result.Ok(3)); // Ok([1, 2, 3])
Result.all(Result.Ok(1), Result.Err("a"), Result.Err("b")); // Err(["a", "b"])
Result.all(); // Ok([])
```

### `Result.any(...results)`

Return the first `Ok`, or collect all errors if all are `Err`.

```typescript
Result.any(Result.Err("Error 1"), Result.Ok("First success"), Result.Ok("Second success")); // Ok("First success")

Result.any(Result.Err("Error 1"), Result.Err("Error 2"), Result.Err("Error 3")); // Err(["Error 1", "Error 2", "Error 3"])
```

## Generator Methods

### `Result.gen(function* () { ... })`

Imperative-style chaining with `yield*` for sync operations. Short-circuits on first `Err`.

```typescript
const result = Result.gen(function* () {
  const a = yield* Result.Ok(1);
  const b = yield* Result.Ok(2);
  return a + b;
});
// Ok(3)
```

### `Result.genAdapter(function* ($) { ... })`

Better type inference with adapter function `$`.

```typescript
const result = Result.genAdapter(function* ($) {
  const a = yield* $(Result.Ok(1));
  const b = yield* $(Result.Ok(2));
  return a + b;
});
// Ok(3)
```

### `Result.asyncGen(async function* () { ... })`

Async variant of `gen`. Use `yield* await` for async operations.

```typescript
const result = await Result.asyncGen(async function* () {
  const a = yield* Result.Ok(1);
  const data = yield* await fetchData(a);
  return data;
});
```

### `Result.asyncGenAdapter(async function* ($) { ... })`

Async variant with adapter that handles both sync and async Results automatically.

```typescript
const result = await Result.asyncGenAdapter(async function* ($) {
  const user = yield* $(Result.Ok(1)); // sync
  const orders = yield* $(fetchOrders(user)); // async - auto-awaited
  return orders;
});
```

## Conversion

### `.toOption()`

Convert `Result` to `Option`, discarding error information. `Ok` becomes `Some`, `Err` becomes `None`.

```typescript
Result.Ok(42).toOption(); // Some(42)
Result.Err("fail").toOption(); // None
```

### `.flip()`

Swap the `Ok` and `Err` states, turning success into failure and vice versa.

```typescript
Result.Ok("Success value").flip(); // Err("Success value")
Result.Err("Error value").flip(); // Ok("Error value")
```

## Inner Transformations

### `.innerMap(mapper)`

Map over array elements inside a `Result<Array<T>, E>`.

```typescript
Result.Ok([1, 2, 3]).innerMap((x) => x * 2); // Ok([2, 4, 6])
Result.Err("fail").innerMap((x) => x * 2); // Err("fail")
```
