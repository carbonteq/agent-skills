# Option Reference

The `Option<T>` type represents a value that may or may not be present. It eliminates the need for `null` and `undefined` checks through the type system.

## Variants

- **`Some<T>`** - Contains a value of type `T`
- **`None`** - Represents absence of a value (singleton)

## Creating Options

### `Option.Some(value)`

Create a `Some` containing the provided value.

```typescript
const opt = Option.Some(42); // Option<number>
const str = Option.Some("hello"); // Option<string>
const obj = Option.Some({ id: 1 }); // Option<{ id: number }>
```

### `Option.None`

The singleton `None` value.

```typescript
const none = Option.None; // Option<never>
```

### `Option.fromNullable(value)`

Create an `Option` from a nullable value. Returns `None` for `null` or `undefined` only.

```typescript
Option.fromNullable("hello"); // Some("hello")
Option.fromNullable(null); // None
Option.fromNullable(0); // Some(0) - 0 is not nullish
Option.fromNullable(""); // Some("") - empty string is not nullish
```

### `Option.fromFalsy(value)`

Create an `Option` from a value, returning `None` for any falsy value (`false`, `0`, `""`, `null`, `undefined`).

```typescript
Option.fromFalsy("hello"); // Some("hello")
Option.fromFalsy(""); // None
Option.fromFalsy(0); // None
Option.fromFalsy(false); // None
```

### `Option.fromPredicate(value, predicate)`

Create an `Option` based on a predicate function. Returns `Some` if the predicate returns `true`, else `None`.

```typescript
const age = 25;
Option.fromPredicate(age, (a) => a >= 18); // Some(25)
Option.fromPredicate(15, (a) => a >= 18); // None
```

## Type Guards

### `.isSome()`

Returns `true` if this is a `Some`, narrows the type.

```typescript
const opt: Option<number> = Option.Some(42);
if (opt.isSome()) {
  // TypeScript knows opt is Some
  console.log(opt.unwrap()); // 42
}
```

### `.isNone()`

Returns `true` if this is `None`.

```typescript
const opt: Option<number> = Option.None;
if (opt.isNone()) {
  console.log("No value present");
}
```

## Transform Methods

### `.map(fn)`

Transform the contained value. If `Some`, applies the function and wraps the result. If `None`, returns `None`.

```typescript
Option.Some(5).map((x) => x * 2); // Some(10)
Option.None.map((x) => x * 2); // None

// Chaining
Option.Some("hello")
  .map((s) => s.toUpperCase())
  .map((s) => `${s}!`)
  .map((s) => s.length); // Some(6)
```

### `.mapAsync(fn)`

Transform using an async function. Returns `Promise<Option<U>>`.

```typescript
await Option.Some(5).mapAsync(async (x) => x * 2); // Promise<Some(10)>
```

### `.flatMap(fn)`

Chain operations that return Options, flattening nested Options.

```typescript
Option.Some(5).flatMap((x) => Option.Some(x + 1)); // Some(6)
Option.Some(5).flatMap((x) => Option.None); // None
Option.None.flatMap((x) => Option.Some(x + 1)); // None

// Practical: nested optional access
const email = findUser(userId)
  .flatMap((user) => Option.fromNullable(user.profile))
  .flatMap((profile) => Option.fromNullable(profile.email));
```

### `.flatMapAsync(fn)`

Chain async operations that return Options.

```typescript
const profile = await Option.Some(userId)
  .flatMapAsync(async (id) => await findUser(id))
  .flatMapAsync(async (user) => await getProfile(user.id));
```

### `.zip(fn)`

Pair the original value with a derived value in a tuple `[original, derived]`.

```typescript
Option.Some(5).zip((x) => x * 2); // Some([5, 10])
Option.None.zip((x) => x * 2); // None

// Keep original while computing derived
Option.Some(100).zip((price) => price * 0.9); // Some([100, 90])
```

### `.zipAsync(fn)`

Pair with an async derived value.

```typescript
await Option.Some(user).zipAsync(async (u) => await fetchCount(u));
// Some([user, number])
```

### `.flatZip(fn)`

Combine with another independent Option into a tuple `[T, U]`. Both must be `Some` to succeed.

```typescript
Option.Some(5).flatZip((x) => Option.Some(10)); // Some([5, 10])
Option.Some(5).flatZip((x) => Option.None); // None
Option.None.flatZip((x) => Option.Some(10)); // None

// Practical: combine independent lookups
const productData = Option.Some(productId).flatZip((id) => fetchProductPrice(id));
// Option<[productId, price]>
```

### `.flatZipAsync(fn)`

Combine with an async Option.

```typescript
await Option.Some(userId).flatZipAsync(async (id) => await fetchUser(id));
// Option<[userId, User]>
```

## Filter Methods

### `.filter(predicate)`

Convert `Some` to `None` if the predicate returns `false`.

```typescript
Option.Some(5).filter((x) => x > 3); // Some(5)
Option.Some(5).filter((x) => x > 10); // None
Option.None.filter((x) => x > 3); // None

// Multiple filters
const valid = Option.Some(password)
  .filter((pw) => pw.length >= 8)
  .filter((pw) => /[A-Z]/.test(pw))
  .filter((pw) => /[0-9]/.test(pw));
```

### `.filterAsync(predicate)`

Filter using an async predicate.

```typescript
const unique = await Option.Some(username).filterAsync(async (u) => await isUsernameAvailable(u));
```

## Match Methods

### `.match({ Some, None })`

Exhaustive pattern matching on both states.

```typescript
Option.Some(42).match({
  Some: (value) => `Got: ${value}`,
  None: () => "Got nothing",
});
// "Got: 42"

Option.None.match({
  Some: (value) => `Got: ${value}`,
  None: () => "Got nothing",
});
// "Got nothing"
```

### `.fold(onSome, onNone)`

Positional argument variant of `match` (FP convention).

```typescript
Option.Some(42).fold(
  (value) => `Got: ${value}`,
  () => "Got nothing",
);
// "Got: 42"
```

### `.foldAsync(onSome, onNone)`

Async pattern matching with positional arguments.

```typescript
await Option.Some(userId).foldAsync(
  async (id) => await fetchUser(id),
  async () => await getDefaultUser(),
);
```

### `.matchAsync({ Some, None })`

Async pattern matching with object syntax.

```typescript
await Option.Some(userId).matchAsync({
  Some: async (id) => await fetchUser(id),
  None: async () => await getDefaultUser(),
});
```

## Unwrap Methods

### `.unwrap()`

Get the contained value, throw `UnwrappedNone` if `None`.

```typescript
Option.Some(42).unwrap(); // 42
Option.None.unwrap(); // throws UnwrappedNone
```

### `.unwrapOr(defaultValue)`

Get the value or return the provided default.

```typescript
Option.Some(42).unwrapOr(0); // 42
Option.None.unwrapOr(0); // 0
```

### `.unwrapOrElse(fn)`

Get the value or compute a default via a function.

```typescript
Option.None.unwrapOrElse(() => {
  return expensivelyComputeDefault();
});
```

### `.safeUnwrap()`

Get the value or return `null`.

```typescript
Option.Some(42).safeUnwrap(); // 42
Option.None.safeUnwrap(); // null
```

## MapOr Methods

### `.mapOr(default, fn)`

Map the value or return a default (unwrapped, not wrapped in Option).

```typescript
Option.Some(5).mapOr(0, (x) => x * 2); // 10
Option.None.mapOr(0, (x) => x * 2); // 0
```

### `.mapOrAsync(default, fn)`

Async variant of `mapOr`.

```typescript
await Option.Some(5).mapOrAsync(0, async (x) => x * 2); // 10
```

## Tap (Side Effects)

### `.tap(fn)`

Execute a side effect for `Some`, then return `this` unchanged.

```typescript
Option.Some(user)
  .tap((u) => console.log(`Processing ${u.name}`))
  .map((u) => u.email);
```

### `.tapAsync(fn)`

Execute an async side effect for `Some`.

```typescript
await Option.Some(user)
  .tapAsync(async (u) => await logAnalytics(u.id))
  .map((u) => u.email);
```

## Conversion

### `.toResult(error)`

Convert `Option` to `Result`. `Some` becomes `Ok`, `None` becomes `Err` with the provided error.

```typescript
Option.Some(42).toResult("was none"); // Ok(42)
Option.None.toResult("was none"); // Err("was none")
```

## Inner Transformations

### `.innerMap(mapper)`

Map over array elements inside an `Option<Array<T>>`.

```typescript
Option.Some([1, 2, 3]).innerMap((n) => n * 2); // Some([2, 4, 6])
Option.None.innerMap((n) => n * 2); // None
```

## Aggregation

### `Option.all(...options)`

Combine multiple Options into a single Option of an array. Returns `Some` with all values if ALL inputs are `Some`, else `None`.

```typescript
Option.all(Option.Some(1), Option.Some(2), Option.Some(3)); // Some([1, 2, 3])

Option.all(Option.Some(1), Option.None, Option.Some(3)); // None
```

### `Option.any(...options)`

Return the first `Some` from a list of Options, or `None` if all are `None`.

```typescript
Option.any(Option.None, Option.Some("First value"), Option.Some("Second value")); // Some("First value")

Option.any(Option.None, Option.None, Option.None); // None
```

## Generator Methods

### `Option.gen(function* () { ... })`

Imperative-style chaining with `yield*` for sync operations. Short-circuits on first `None`.

```typescript
const result = Option.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Option.Some(2);
  return a + b;
});
// Some(3)

// None short-circuit
const shortCircuit = Option.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Option.None; // Short-circuits here
  const c = yield* Option.Some(3); // Never executes
  return a + b + c;
});
// None
```

### `Option.genAdapter(function* ($) { ... })`

Better type inference with adapter function `$`.

```typescript
const result = Option.genAdapter(function* ($) {
  const a = yield* $(Option.Some(1));
  const b = yield* $(Option.Some(2));
  return a + b;
});
// Some(3)
```

### `Option.asyncGen(async function* () { ... })`

Async variant of `gen`. Use `yield* await` for async operations.

```typescript
const result = await Option.asyncGen(async function* () {
  const a = yield* Option.Some(1);
  const b = yield* await asyncOperation(a);
  const c = yield* Option.Some(3);
  return a + b + c;
});
```

### `Option.asyncGenAdapter(async function* ($) { ... })`

Async variant with adapter that handles both sync and async Options automatically.

```typescript
const result = await Option.asyncGenAdapter(async function* ($) {
  const user = yield* $(Option.Some(1)); // sync
  const orders = yield* $(fetchOrders(user)); // async - auto-awaited
  return orders;
});
```
