import { ExperimentalOption as Option, ExperimentalResult as Result, Flow } from "@carbonteq/fp";

// ============================================
// Async Map Operations
// ============================================

// Option.mapAsync
const asyncMapOption = await Option.Some(5).mapAsync(async (x) => {
  await delay(100);
  return x * 2;
});
// Some(10)

// Result.mapAsync
const asyncMapResult = await Result.Ok(5).mapAsync(async (x) => {
  await delay(100);
  return x * 2;
});
// Ok(10)

// ============================================
// Async FlatMap Operations
// ============================================

// Option.flatMapAsync - chain async operations
async function fetchUserOption(id: number): Promise<Option<User>> {
  await delay(100);
  return Option.Some({ id, name: `User ${id}` });
}

async function fetchProfileOption(user: User): Promise<Option<Profile>> {
  await delay(100);
  return Option.Some({ userId: user.id, bio: "Bio" });
}

const optionChain = await Option.Some(1)
  .flatMapAsync(fetchUserOption)
  .flatMapAsync(fetchProfileOption);
// Option<Profile>

// Result.flatMapAsync - chain async operations
async function fetchUserResult(id: number): Promise<Result<User, Error>> {
  await delay(100);
  return Result.Ok({ id, name: `User ${id}` });
}

async function fetchProfileResult(user: User): Promise<Result<Profile, Error>> {
  await delay(100);
  return Result.Ok({ userId: user.id, bio: "Bio" });
}

const resultChain = await Result.Ok(1)
  .flatMapAsync(async (id) => await fetchUserResult(id))
  .flatMapAsync(async (user) => await fetchProfileResult(user));
// Result<Profile, Error>

// ============================================
// Async Filter Operations
// ============================================

// Option.filterAsync
const asyncFilter = await Option.Some("test@example.com").filterAsync(async (email) => {
  await delay(100);
  return email.includes("@");
});
// Some("test@example.com")

// Practical: async validation
async function isEmailUnique(email: string): Promise<boolean> {
  await delay(100);
  return Math.random() > 0.5; // Random for demo
}

const uniqueEmail = await Option.Some("new@example.com").filterAsync(isEmailUnique);
// Some("new@example.com") or None

// ============================================
// Async Zip Operations
// ============================================

// Option.zipAsync
async function getDiscount(price: number): Promise<number> {
  await delay(100);
  return price * 0.9;
}

const zipAsync = await Option.Some(100).zipAsync(async (price) => await getDiscount(price));
// Some([100, 90])

// Result.zipAsync
const resultZipAsync = await Result.Ok(100).zipAsync(async (price) => await getDiscount(price));
// Ok([100, 90])

// ============================================
// Async FlatZip Operations
// ============================================

// Option.flatZipAsync
async function fetchRelatedProduct(id: number): Promise<Option<Product>> {
  await delay(100);
  return Option.Some({ id: id + 1, name: "Related" });
}

const flatZipAsync = await Option.Some(1).flatZipAsync(async (id) => await fetchRelatedProduct(id));
// Option<[1, Product]>

// Result.flatZipAsync
async function fetchProductCategory(productId: number): Promise<Result<Category, Error>> {
  await delay(100);
  return Result.Ok({ id: 1, name: "Electronics" });
}

const resultFlatZipAsync = await Result.Ok(1).flatZipAsync(
  async (id) => await fetchProductCategory(id),
);
// Result<[1, Category], Error>

// ============================================
// Async MapErr Operations
// ============================================

// Result.mapErrAsync
const mapErrAsync = await Result.Err<number, string>("timeout").mapErrAsync(async (err) => {
  await delay(100);
  return `Error: ${err} at ${Date.now()}`;
});
// Err("Error: timeout at ...")

// ============================================
// Async OrElse Operations
// ============================================

// Result.orElseAsync
async function fetchFromPrimary(): Promise<Result<Data, Error>> {
  await delay(100);
  return Result.Err(new Error("Primary failed"));
}

async function fetchFromBackup(): Promise<Result<Data, Error>> {
  await delay(100);
  return Result.Err(new Error("Backup failed"));
}

async function fetchFromDefaults(): Promise<Result<Data, never>> {
  await delay(100);
  return Result.Ok({ data: "default" });
}

const orElseChain = await fetchFromPrimary()
  .orElseAsync(async () => await fetchFromBackup())
  .orElseAsync(async () => await fetchFromDefaults());
// Ok({ data: "default" })

// ============================================
// Async Validate Operations
// ============================================

// Result.validateAsync - run async validators
async function checkEmailUnique(email: string): Promise<Result<boolean, Error>> {
  await delay(100);
  return Result.Ok(true);
}

async function checkUsernameAvailable(username: string): Promise<Result<boolean, Error>> {
  await delay(100);
  return Result.Err(new Error("Username taken"));
}

const validated = await Result.Ok({
  email: "test@example.com",
  username: "testuser",
}).validateAsync([
  async (data) => await checkEmailUnique(data.email),
  async (data) => await checkUsernameAvailable(data.username),
]);
// Err([Error("Username taken")])

// ============================================
// Async Match Operations
// ============================================

// Option.matchAsync
const matchedOption = await Option.Some(1).matchAsync({
  Some: async (id) => {
    const user = await fetchUser(id);
    return `User: ${user.name}`;
  },
  None: async () => "No user",
});
// "User: User 1"

// Result.matchAsync
const matchedResult = await Result.Ok(1).matchAsync({
  Ok: async (id) => {
    const user = await fetchUser(id);
    return `User: ${user.name}`;
  },
  Err: async (err) => `Error: ${err.message}`,
});
// "User: User 1"

// Option.foldAsync
const folded = await Option.Some(1).foldAsync(
  async (id) => await fetchUser(id),
  async () => ({ name: "Guest" }),
);

// Result.foldAsync
const resultFolded = await Result.Ok(1).foldAsync(
  async (id) => await fetchUser(id),
  async () => ({ name: "Guest" }),
);

// ============================================
// Async Tap Operations
// ============================================

// Option.tapAsync
await Option.Some({ id: 1 })
  .tapAsync(async (user) => {
    await logToAnalytics(user.id);
  })
  .map((user) => user.id);

// Result.tapAsync
await Result.Ok({ id: 1 })
  .tapAsync(async (user) => {
    await logToDatabase(user.id);
  })
  .map((user) => user.id);

// Result.tapErrAsync
await Result.Err(new Error("Failed"))
  .tapErrAsync(async (err) => {
    await reportToSentry(err);
  })
  .orElse(() => Result.Ok({ id: 0 }));

// ============================================
// Async Gen Operations
// ============================================

// Option.asyncGen - explicit await
const optionGen = await Option.asyncGen(async function* () {
  const id = yield* Option.Some(1);
  const user = yield* await fetchUserOption(id); // await Promise<Option> first
  const profile = yield* await fetchProfileOption(user);
  return profile;
});

// Option.asyncGenAdapter - cleaner syntax
const optionGenAdapter = await Option.asyncGenAdapter(async function* ($) {
  const id = yield* $(Option.Some(1));
  const user = yield* $(await fetchUserOption(id)); // auto-awaited
  const profile = yield* $(await fetchProfileOption(user));
  return profile;
});

// Result.asyncGen - explicit await
const resultGen = await Result.asyncGen(async function* () {
  const id = yield* Result.Ok(1);
  const user = yield* await fetchUserResult(id); // await Promise<Result> first
  const profile = yield* await fetchProfileResult(user);
  return profile;
});

// Result.asyncGenAdapter - cleaner syntax
const resultGenAdapter = await Result.asyncGenAdapter(async function* ($) {
  const id = yield* $(Result.Ok(1));
  const user = yield* $(await fetchUserResult(id)); // auto-awaited
  const profile = yield* $(await fetchProfileResult(user));
  return profile;
});

// ============================================
// Flow Async Gen with Mixed Types
// ============================================

// Flow.asyncGen - explicit await
const flowGen = await Flow.asyncGen(async function* () {
  const id = yield* Option.Some(1);
  const user = yield* await fetchUserResult(id);
  const settings = yield* await fetchSettingsOption(user.id);
  return { user, settings };
});

// Flow.asyncGenAdapter - cleaner syntax
const flowGenAdapter = await Flow.asyncGenAdapter(async function* ($) {
  const id = yield* $(Option.Some(1));
  const user = yield* $(await fetchUserResult(id));
  const settings = yield* $(await fetchSettingsOption(user.id));
  return { user, settings };
});

// ============================================
// Combining Sync and Async Operations
// ============================================

const mixedSyncAsync = await Option.asyncGenAdapter(async function* ($) {
  // Sync operations
  const id = yield* $(Option.Some(1));
  const validated = yield* $(Option.fromNullable(id > 0 ? id : null));

  // Async operations
  const user = yield* $(await fetchUserOption(validated));
  const profile = yield* $(await fetchProfileOption(user));

  // Back to sync
  const enriched = yield* $(Option.Some({ ...profile, processed: true }));

  return enriched;
});

// ============================================
// Real-world: API Pipeline with Retries
// ============================================

async function fetchWithRetry<T>(
  fn: () => Promise<Result<T, Error>>,
  maxRetries: number = 3,
): Promise<Result<T, Error>> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await fn();
    if (result.isOk()) {
      return result;
    }
    // Wait before retry (exponential backoff)
    await delay(Math.pow(2, i) * 100);
  }
  return Result.Err(new Error("Max retries exceeded"));
}

async function fetchUserDataWithRetry(userId: number) {
  return await fetchWithRetry(() => fetchFromApi(userId));
}

// ============================================
// Real-world: Parallel Async Operations
// ============================================

async function fetchAllUserData(userId: number): Promise<Result<CompleteData, Error[]>> {
  // Fetch everything in parallel
  const [userResult, postsResult, likesResult] = await Promise.all([
    fetchUserResult(userId),
    fetchPostsResult(userId),
    fetchLikesResult(userId),
  ]);

  // Combine all results, collecting all errors
  return Result.all(userResult, postsResult, likesResult).map(([user, posts, likes]) => ({
    user,
    posts,
    likes,
  }));
}

// ============================================
// Real-world: Async Validation Pipeline
// ============================================

interface RegisterInput {
  email: string;
  username: string;
  password: string;
}

async function validateRegistration(
  input: RegisterInput,
): Promise<Result<RegisterInput, string[]>> {
  return Result.Ok(input).validateAsync([
    async ({ email }) => {
      const exists = await checkEmailExists(email);
      return exists ? Result.Err<boolean, string>("Email already registered") : Result.Ok(true);
    },
    async ({ username }) => {
      const available = await checkUsernameAvailableFlag(username);
      return !available ? Result.Err<boolean, string>("Username not available") : Result.Ok(true);
    },
    async ({ password }) => {
      const breached = await checkPasswordBreached(password);
      return breached
        ? Result.Err<boolean, string>("Password found in data breaches")
        : Result.Ok(true);
    },
  ]);
}

// ============================================
// Helper function for demos
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface User {
  id: number;
  name: string;
}

interface Profile {
  userId: number;
  bio: string;
}

interface Product {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Data {
  data: string;
}

interface CompleteData {
  user: User;
  posts: Post[];
  likes: Like[];
}

type Post = Record<string, unknown>;
type Like = Record<string, unknown>;

async function fetchUser(id: number): Promise<User> {
  return { id, name: `User ${id}` };
}

async function fetchFromApi<T>(id: number): Promise<Result<T, Error>> {
  return Result.Ok({} as T);
}

async function fetchPostsResult(userId: number): Promise<Result<Post[], Error>> {
  return Result.Ok([]);
}

async function fetchLikesResult(userId: number): Promise<Result<Like[], Error>> {
  return Result.Ok([]);
}

async function fetchSettingsOption(userId: number): Promise<Option<Settings>> {
  return Option.Some({ userId, theme: "dark" });
}

interface Settings {
  userId: number;
  theme: string;
}

async function logToAnalytics(id: number): Promise<void> {}
async function logToDatabase(id: number): Promise<void> {}
async function reportToSentry(err: Error): Promise<void> {}

async function checkEmailExists(email: string): Promise<boolean> {
  return false;
}

async function checkUsernameAvailableFlag(username: string): Promise<boolean> {
  return true;
}

async function checkPasswordBreached(password: string): Promise<boolean> {
  return false;
}

export {};
