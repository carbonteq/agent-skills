import { Flow, FlowError, Option, Result, UnwrappedNone } from "@carbonteq/fp";

// ============================================
// Basic Flow.gen - Mixed Option/Result
// ============================================

const basicFlow = Flow.gen(function* () {
  const a = yield* Option.Some(5); // Unwraps Option<number> -> number
  const b = yield* Result.Ok<number, never>(10); // Unwraps Result<number> -> number
  const c = yield* Option.fromNullable(20); // Unwraps Option<number> -> number

  return a + b + c;
});

console.log(basicFlow.unwrap()); // 35

// ============================================
// Short-circuiting on None
// ============================================

const noneShortCircuit = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Option.None; // Short-circuits here!
  const c = yield* Option.Some(3); // Never executes
  return a + b + c;
});

console.log(noneShortCircuit); // Err(UnwrappedNone)

// ============================================
// Short-circuiting on Err
// ============================================

const errShortCircuit = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Result.Err<number, string>("something failed"); // Short-circuits!
  const c = yield* Option.Some(3); // Never executes
  return a + b + c;
});

console.log(errShortCircuit); // Err("something failed")

// ============================================
// Flow.genAdapter with $
// ============================================

const adapterFlow = Flow.genAdapter(function* ($) {
  const val1 = yield* $(Option.Some(10));
  const val2 = yield* $(Result.Ok<number, string>(20));
  return val1 + val2;
});

console.log(adapterFlow.unwrap()); // 30

// ============================================
// Async Flow with Flow.asyncGen
// ============================================

async function fetchProfile(id: number): Promise<Result<{ name: string }, string>> {
  // Simulate async operation
  return Result.Ok({ name: "Alice" });
}

const asyncFlow = await Flow.asyncGen(async function* () {
  const user = yield* Option.Some({ id: 1 });
  const profile = yield* await fetchProfile(user.id); // await Promise<Result> first
  return profile;
});

console.log(asyncFlow.unwrap()); // { name: "Alice" }

// ============================================
// Async Flow with adapter
// ============================================

const asyncAdapterFlow = await Flow.asyncGenAdapter(async function* ($) {
  const user = yield* $(Option.Some({ id: 1 }));
  const profile = yield* $(await fetchProfile(user.id)); // adapter handles it
  return profile;
});

console.log(asyncAdapterFlow.unwrap()); // { name: "Alice" }

// ============================================
// Real-world: Multi-step data fetching
// ============================================

interface User {
  id: number;
  email: string;
}

interface Profile {
  userId: number;
  bio: string;
}

interface Settings {
  userId: number;
  theme: "light" | "dark";
}

async function getUser(id: number): Promise<Result<User, Error>> {
  return Result.Ok({ id, email: `user${id}@example.com` });
}

async function getProfile(userId: number): Promise<Result<Profile, Error>> {
  return Result.Ok({ userId, bio: "Hello!" });
}

async function getSettings(userId: number): Promise<Option<Settings>> {
  return Option.Some({ userId, theme: "dark" });
}

async function fetchCompleteUserData(userId: number) {
  return await Flow.asyncGenAdapter(async function* ($) {
    // Fetch user (Result)
    const user = yield* $(await getUser(userId));

    // Fetch profile (Result)
    const profile = yield* $(await getProfile(user.id));

    // Fetch settings (Option - may not exist)
    const settings = yield* $(await getSettings(user.id));

    return { user, profile, settings };
  });
}

const completeData = await fetchCompleteUserData(1);
console.log(completeData.unwrap());
// { user: { id: 1, email: "user1@example.com" }, profile: { userId: 1, bio: "Hello!" }, settings: { userId: 1, theme: "dark" } }

// ============================================
// Using FlowError for custom errors
// ============================================

class ValidationError extends FlowError {
  readonly _tag = "ValidationError";
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const withCustomError = Flow.gen(function* () {
  const value = yield* Option.Some(-5);

  if (value < 0) {
    yield* new ValidationError("Value must be positive");
  }

  return value * 2;
});

console.log(withCustomError); // Err(ValidationError: Value must be positive)

// ============================================
// Complex workflow with validation
// ============================================

interface CreateUserInput {
  email: string;
  age: number;
}

function parseInput(input: unknown): Result<CreateUserInput, Error> {
  return Result.Ok(input as CreateUserInput);
}

function validateEmail(email: string): Result<string, Error> {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? Result.Ok(email)
    : Result.Err(new Error("Invalid email format"));
}

function validateAge(age: number): Result<number, Error> {
  return age >= 18
    ? Result.Ok(age)
    : Result.Err(new Error("Must be 18 or older"));
}

async function createUser(rawInput: unknown) {
  return await Flow.asyncGenAdapter(async function* ($) {
    // Parse input
    const input = yield* $(parseInput(rawInput));

    // Validate email
    const email = yield* $(validateEmail(input.email));

    // Validate age
    const age = yield* $(validateAge(input.age));

    // Check if user already exists (returns Option)
    const existingUser = yield* $(Option.fromNullable(await findUserByEmail(email)));

    if (existingUser) {
      yield* new ValidationError("User already exists");
    }

    return { email, age };
  });
}

async function findUserByEmail(email: string): Promise<User | null> {
  return null; // Simulate no existing user
}

// ============================================
// Parallel independent operations
// ============================================

async function fetchPosts(userId: number): Promise<Result<string[], Error>> {
  return Result.Ok(["post1", "post2"]);
}

async function fetchLikes(userId: number): Promise<Result<number, Error>> {
  return Result.Ok(42);
}

async function fetchUserSummary(userId: number) {
  return await Flow.asyncGenAdapter(async function* ($) {
    // Fetch user and profile in parallel
    const [user, profile] = yield* $(Result.all(
      getUser(userId),
      getProfile(userId)
    ));

    // Fetch posts and likes in parallel
    const [posts, likes] = yield* $(Result.all(
      fetchPosts(user.id),
      fetchLikes(user.id)
    ));

    return { user, profile, posts, likes };
  });
}

// ============================================
// Cache-aside pattern
// ============================================

const cache = new Map<string, any>();

async function getFromCache<T>(key: string): Promise<Option<T>> {
  return Option.fromNullable(cache.get(key) as T);
}

async function getFromDatabase<T>(key: string): Promise<Result<T, Error>> {
  const value = await fetchFromDb<T>(key);
  return Result.Ok(value);
}

async function fetchFromDb<T>(key: string): Promise<T> {
  return {} as T; // Simulate DB fetch
}

async function getCachedOrDb<T>(key: string): Promise<Result<T, Error>> {
  return Flow.asyncGenAdapter(async function* ($) {
    // Try cache first (returns Option)
    const cached = yield* $(await getFromCache<T>(key));

    if (cached) {
      return Result.Ok(cached);
    }

    // Cache miss - fetch from DB (returns Result)
    const value = yield* $(await getFromDatabase<T>(key));

    // Update cache (fire and forget, don't await)
    cache.set(key, value).catch(() => {});

    return value;
  });
}

// ============================================
// Combining independent Options
// ============================================

const optionCombination = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Option.Some(2);
  const c = yield* Option.fromNullable(3);

  // Use Option.all to combine into tuple
  const tuple = yield* $(Option.all(
    Option.some(a + 1),
    Option.some(b + 2),
    Option.fromNullable(c + 3)
  ));

  return tuple;
});

console.log(optionCombination.unwrap()); // [2, 4, 6]

// ============================================
// Return type examples
// ============================================

// Only Options -> Result<T, UnwrappedNone>
const onlyOptions = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Option.fromNullable("hello");
  return { a, b };
});
// Result<{ a: number; b: string }, UnwrappedNone>

// Only Results -> Result<T, E>
const onlyResults = Flow.gen(function* () {
  const a = yield* Result Ok<number, string>(1);
  const b = yield* Result.Ok("hello");
  return { a, b };
});
// Result<{ a: number; b: string }, string>

// Mixed -> Result<T, E | UnwrappedNone>
const mixed = Flow.gen(function* () {
  const a = yield* Option.Some(1);
  const b = yield* Result Ok<number, string>(2);
  return a + b;
});
// Result<number, string | UnwrappedNone>

export {};
