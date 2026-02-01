import { Result } from "@carbonteq/fp";

// ============================================
// Creating Results
// ============================================

// Ok - wrap a success value
const okNumber = Result.Ok<number, never>(42);
console.log(okNumber.toString()); // "Result::Ok<42>"

// Err - wrap an error
const errString = Result.Err<never, string>("Something failed");
console.log(errString.toString()); // "Result::Err<Something failed>"

// fromNullable - convert nullable to Result
const fromNull = Result.fromNullable<string, string>(null, "was null");
// Err("was null")

const fromValue = Result.fromNullable("hello", "was null");
// Ok("hello")

const fromZero = Result.fromNullable(0, "was null");
// Ok(0) - 0 is not nullish

// fromPredicate - create from predicate
const score = 85;
const passed = Result.fromPredicate(score, (s) => s >= 60, "Score too low");
// Ok(85)

const failed = Result.fromPredicate(45, (s) => s >= 60, "Score too low");
// Err("Score too low")

// tryCatch - wrap try/catch
function parseJson(json: string): Result<unknown, Error> {
  return Result.tryCatch(
    () => JSON.parse(json),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
}

const validJson = parseJson('{"name":"Alice"}');
// Ok({ name: "Alice" })

const invalidJson = parseJson("invalid json");
// Err(SyntaxError: ...)

// ============================================
// Using map
// ============================================

// Transform the success value
const doubled = Result.Ok<number, string>(5).map((x) => x * 2);
// Ok(10)

const mapErr = Result.Err<number, string>("fail").map((x) => x * 2);
// Err("fail") - error propagates unchanged

// Chaining maps
const chained = Result.Ok<string, string>("hello")
  .map((s) => s.toUpperCase())
  .map((s) => `${s}!`)
  .map((s) => s.length);
// Ok(6)

// ============================================
// Using flatMap
// ============================================

// Chain operations returning Results
const result = Result.Ok<number, string>(42)
  .flatMap((x) => Result.Ok<number, string>(x + 1))
  .flatMap((x) => Result.Err<number, string>("too big"));
// Err("too big")

// Error propagates through flatMap
const initialErr = Result.Err<number, string>("initial").flatMap((x) =>
  Result.Ok<number, string>(x + 1),
);
// Err("initial")

// Practical: chain fallible operations
function divide(a: number, b: number): Result<number, string> {
  return b === 0 ? Result.Err("Division by zero") : Result.Ok(a / b);
}

const division = Result.Ok(100)
  .flatMap((x) => divide(x, 5))
  .flatMap((x) => divide(x, 2));
// Ok(10)

// ============================================
// Using mapErr
// ============================================

// Transform the error value
const decoratedErr = Result.Err<number, string>("network error").mapErr((e) => `Network: ${e}`);
// Err("Network: network error")

// Ok passes through unchanged
const okMapErr = Result.Ok<number, string>(42).mapErr((e) => `Error: ${e}`);
// Ok(42)

// Add context to errors
const withContext = Result.Err<number, Error>(new Error("API failed")).mapErr(
  (e) => new Error(`Failed to fetch data: ${e.message}`),
);
// Err(Error: Failed to fetch data: API failed)

// ============================================
// Using zip
// ============================================

// Pair with derived value
const withDerived = Result.Ok<number, string>(42).zip((x) => x * 10);
// Ok([42, 420])

// Err propagates
const errZip = Result.Err<number, string>("fail").zip((x) => x * 10);
// Err("fail")

// Keep original while computing related value
interface User {
  id: number;
  permissions: string[];
}

const user: User = { id: 1, permissions: ["read", "write"] };
const withCount = Result.Ok<User, string>(user).zip((u) => u.permissions.length);
// Ok([user, 2])

// ============================================
// Using flatZip
// ============================================

// Combine two independent Results
const combined = Result.Ok<number, string>(42).flatZip((x) => Result.Ok<number, string>(x + 5));
// Ok([42, 47])

// First error wins
const firstErr = Result.Ok<number, string>(42).flatZip((x) => Result.Err<number, string>("x"));
// Err("x")

const secondErr = Result.Err<string, string>("init").flatZip((x) =>
  Result.Ok<string, string>("value"),
);
// Err("init")

// Practical: combine related data
function fetchUser(id: number): Result<User, string> {
  return Result.Ok({ id, permissions: ["read"] });
}

function fetchUserProfile(user: User): Result<{ name: string }, string> {
  return Result.Ok({ name: "Alice" });
}

const userData = Result.Ok(1)
  .flatMap((id) => fetchUser(id))
  .flatZip((user) => fetchUserProfile(user));
// Ok([user, { name: "Alice" }])

// ============================================
// Using zipErr
// ============================================

// Validate with new error while preserving original Ok
const checkPermissions = (userId: string) =>
  Result.Ok(userId).zipErr((id) =>
    id === "guest"
      ? Result.Err<string, undefined>("Guest users have limited access")
      : Result.Ok<string, undefined>(undefined),
  );

checkPermissions("admin-123"); // Ok("admin-123")
checkPermissions("guest"); // Err("Guest users have limited access")

// Already Err short-circuits
const alreadyErr = Result.Err<string, string>("Network error").zipErr(() =>
  Result.Err("Validation error"),
);
// Err("Network error")

// mapErr vs zipErr:
// mapErr: transforms error only, never runs on Ok
// zipErr: runs binder on Ok that can introduce new error

// ============================================
// Using orElse
// ============================================

// Recover from error
const recovered = Result.Err<number, string>("not found").orElse((e) => Result.Ok(0));
// Ok(0)

// Ok passes through unchanged
const okOrElse = Result.Ok<number, string>(42).orElse((e) => Result.Ok(0));
// Ok(42)

// Recovery chain
const chain = Result.Err<number, string>("primary failed")
  .orElse((e) => Result.Err<number, string>("backup failed"))
  .orElse((e) => Result.Ok<number, string>(0));
// Ok(0)

// Practical: fallback sources
async function fetchFromPrimary(): Promise<Result<Data, Error>> {
  return Result.Err(new Error("Primary down"));
}

async function fetchFromCache(): Promise<Result<Data, Error>> {
  return Result.Err(new Error("Cache miss"));
}

async function fetchWithFallback(): Promise<Result<Data, never>> {
  return (await fetchFromPrimary())
    .orElse(() => fetchFromCache())
    .orElse(() => Result.Ok({ data: "default" }));
}

// ============================================
// Using validate
// ============================================

// Run all validators, collect ALL errors
const validators = [
  (x: number) => (x > 0 ? Result.Ok(true) : Result.Err("must be positive")),
  (x: number) => (x < 100 ? Result.Ok(true) : Result.Err("must be < 100")),
  (x: number) => (x % 2 === 0 ? Result.Ok(true) : Result.Err("must be even")),
];

Result.Ok(42).validate(validators);
// Ok(42)

Result.Ok(101).validate(validators);
// Err(["must be < 100"])

Result.Ok(-5).validate(validators);
// Err(["must be positive", "must be even"])

// Err skips validators
Result.Err("init").validate(validators);
// Err("init")

// ============================================
// Using all
// ============================================

// Combine Results - collect all values OR all errors
Result.all(Result.Ok(1), Result.Ok(2), Result.Ok(3));
// Ok([1, 2, 3])

Result.all(Result.Ok(1), Result.Err("a"), Result.Err("b"));
// Err(["a", "b"])

// Empty -> Ok([])
Result.all();
// Ok([])

// ============================================
// Using any
// ============================================

// First Ok wins
Result.any(Result.Err("Error 1"), Result.Ok("First success"), Result.Ok("Second success"));
// Ok("First success")

// All Err -> collect all errors
Result.any(Result.Err("Error 1"), Result.Err("Error 2"), Result.Err("Error 3"));
// Err(["Error 1", "Error 2", "Error 3"])

// ============================================
// Using unwrap methods
// ============================================

// unwrap() - throws if Err
const unwrapped = Result.Ok(42).unwrap(); // 42

try {
  Result.Err("fail").unwrap();
} catch (e) {
  console.log("Caught error");
}

// unwrapOr() - safe with default
const withDefault = Result.Err("fail").unwrapOr(0); // 0
const noDefault = Result.Ok(42).unwrapOr(0); // 42

// unwrapErr() - get the error
const error = Result.Err("fail").unwrapErr(); // "fail"

try {
  Result.Ok(42).unwrapErr();
} catch (e) {
  console.log("Caught unwrapErr on Ok");
}

// safeUnwrap() - returns null for Err
const safeValue = Result.Ok(42).safeUnwrap(); // 42
const safeNull = Result.Err("fail").safeUnwrap(); // null

// ============================================
// Using match
// ============================================

// Object syntax
const message = Result.Ok(42).match({
  Ok: (val) => `Success: ${val}`,
  Err: (err) => `Failed: ${err}`,
});
// "Success: 42"

// Positional syntax (fold)
const message2 = Result.Err<string, string>("fail").fold(
  (val) => `Success: ${val}`,
  (err) => `Failed: ${err}`,
);
// "Failed: fail"

// ============================================
// Using tap for side effects
// ============================================

// Execute side effects without breaking chain
const tapped = Result.Ok([1, 2, 3])
  .tap((arr) => console.log(`Processing ${arr.length} items`))
  .map((arr) => arr.map((x) => x * 2))
  .tap((arr) => console.log(`Result: ${arr}`));
// Ok([2, 4, 6])

// tapErr for error logging
Result.Err("Connection failed")
  .tapErr((err) => console.error(`[Error] ${err}`))
  .orElse((e) => Result.Ok(0));
// Logs error, returns Ok(0)

// ============================================
// Using toOption
// ============================================

// Convert Result to Option, discarding error
const okToOption = Result.Ok(42).toOption();
// Some(42)

const errToOption = Result.Err("fail").toOption();
// None

// ============================================
// Using flip
// ============================================

// Swap Ok and Err
const flippedOk = Result.Ok("Success value").flip();
// Err("Success value")

const flippedErr = Result.Err("Error value").flip();
// Ok("Error value")

// Practical: invert validation
const blacklist = ["admin", "root"];
const isBlacklisted = (name: string) =>
  Result.fromPredicate(name, (n) => !blacklist.includes(n), "blacklisted").flip();
// Ok if blacklisted, Err if not

isBlacklisted("admin"); // Ok("admin")
isBlacklisted("user"); // Err("blacklisted")
