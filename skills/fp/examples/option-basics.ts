import { Option } from "@carbonteq/fp";

// ============================================
// Creating Options
// ============================================

// Some - wrap a value
const someNumber = Option.Some(42);
console.log(someNumber.toString()); // "Option::Some(42)"

// None - singleton representing absence
const noneValue = Option.None;
console.log(noneValue.toString()); // "Option::None"

// fromNullable - convert nullable to Option
const fromNull = Option.fromNullable<string>(null); // None
const fromUndefined = Option.fromNullable<string>(undefined); // None
const fromValue = Option.fromNullable("hello"); // Some("hello")
const fromZero = Option.fromNullable(0); // Some(0) - 0 is not nullish
const fromEmptyString = Option.fromNullable(""); // Some("") - empty string is not nullish

// fromFalsy - convert falsy values to None
const falsyString = Option.fromFalsy(""); // None
const falsyZero = Option.fromFalsy(0); // None
const falsyFalse = Option.fromFalsy(false); // None
const truthyString = Option.fromFalsy("hello"); // Some("hello")

// fromPredicate - create from predicate
const age = 25;
const adult = Option.fromPredicate(age, (a) => a >= 18); // Some(25)
const minor = Option.fromPredicate(15, (a) => a >= 18); // None

// ============================================
// Using map
// ============================================

// Transform the value inside Some
const doubled = Option.Some(5).map((x) => x * 2); // Some(10)
const mappedNone = Option.None.map((x) => x * 2); // None

// Chaining maps
const chained = Option.Some("hello")
  .map((s) => s.toUpperCase())
  .map((s) => `${s}!`)
  .map((s) => s.length); // Some(6)

// Type transformation
const parsed = Option.Some("123").map((s) => parseInt(s, 10)); // Some(123)

// ============================================
// Using flatMap
// ============================================

// Chain operations returning Options
const result = Option.Some(5).flatMap((x) => Option.Some(x + 1)); // Some(6)
const shortCircuit = Option.Some(5).flatMap((x) => Option.None); // None
const noneFlatMap = Option.None.flatMap((x) => Option.Some(x + 1)); // None

// Practical: nested optional access
interface User {
  profile?: {
    settings?: {
      email: string;
    };
  };
}

const user: User = { profile: { settings: { email: "test@example.com" } } };

const email = Option.fromNullable(user.profile)
  .flatMap((p) => Option.fromNullable(p.settings))
  .flatMap((s) => Option.fromNullable(s.email));
// Some("test@example.com")

// ============================================
// Using zip
// ============================================

// Pair with derived value
const priceWithDiscount = Option.Some(100).zip((price) => price * 0.9);
// Some([100, 90])

// Keep original while computing metadata
const request = { id: 1, data: "test" };
const withMeta = Option.Some(request).zip((req) => ({
  size: JSON.stringify(req).length,
  timestamp: Date.now(),
}));
// Some([request, { size, timestamp }])

// ============================================
// Using flatZip
// ============================================

// Combine two independent Options
const combined = Option.Some(5).flatZip((x) => Option.Some(10));
// Some([5, 10])

const firstFails = Option.Some(5).flatZip((x) => Option.None);
// None

const secondFails = Option.None.flatZip((x) => Option.Some(10));
// None

// Practical: combine independent lookups
function fetchProductPrice(id: number): Option<number> {
  return Option.Some(99.99);
}

function fetchProductStock(id: number): Option<number> {
  return Option.Some(50);
}

const productDetails = Option.Some(123).flatZip((id) =>
  fetchProductPrice(id).flatMap((price) =>
    fetchProductStock(id).map((stock) => ({ id, price, stock })),
  ),
);

// ============================================
// Using filter
// ============================================

// Filter by predicate
const positive = Option.Some(5).filter((x) => x > 0); // Some(5)
const negative = Option.Some(-5).filter((x) => x > 0); // None
const noneFilter = Option.None.filter((x) => x > 0); // None

// Multiple filters
const password = Option.Some("Secure123!");
const validPassword = password
  .filter((pw) => pw.length >= 8)
  .filter((pw) => /[A-Z]/.test(pw))
  .filter((pw) => /[0-9]/.test(pw))
  .filter((pw) => /[!@#$%^&*]/.test(pw));
// Some("Secure123!")

// ============================================
// Using unwrap methods
// ============================================

// unwrap() - throws if None
const unwrapped = Option.Some(42).unwrap(); // 42
try {
  Option.None.unwrap();
} catch (e) {
  console.log("Caught UnwrappedNone");
}

// unwrapOr() - safe with default
const withDefault = Option.None.unwrapOr(0); // 0
const noDefaultNeeded = Option.Some(42).unwrapOr(0); // 42

// unwrapOrElse() - lazy default computation
let computed = false;
const lazyDefault = Option.None.unwrapOrElse(() => {
  computed = true;
  return 0;
});
console.log(computed); // true - default was computed

const noLazy = Option.Some(42).unwrapOrElse(() => {
  computed = true;
  return 0;
});
console.log(computed); // still true (from above), but this didn't run

// safeUnwrap() - returns null for None
const safeValue = Option.Some(42).safeUnwrap(); // 42
const safeNull = Option.None.safeUnwrap(); // null

// ============================================
// Using match
// ============================================

// Object syntax
const message = Option.Some(42).match({
  Some: (value) => `Got: ${value}`,
  None: () => "Got nothing",
});
// "Got: 42"

// Positional syntax (fold)
const message2 = Option.Some(42).fold(
  (value) => `Got: ${value}`,
  () => "Got nothing",
);
// "Got: 42"

// ============================================
// Aggregation with all
// ============================================

// Combine multiple Options - all must be Some
const allSome = Option.all(Option.Some(1), Option.Some(2), Option.Some(3));
// Some([1, 2, 3])

const withNone = Option.all(Option.Some(1), Option.None, Option.Some(3));
// None

const emptyAll = Option.all();
// Some([])

// ============================================
// Aggregation with any
// ============================================

// Return first Some
const firstSuccess = Option.any(Option.None, Option.Some("First"), Option.Some("Second"));
// Some("First")

const allNone = Option.any(Option.None, Option.None);
// None

// Practical: try multiple fallback sources
function getEnvVar(key: string): string | undefined {
  return undefined;
}

const config = Option.any(
  Option.fromNullable(process.env.API_KEY),
  Option.fromNullable(getEnvVar("API_KEY")),
  Option.Some("default-key"),
);
// Some("default-key")

// ============================================
// Using tap for side effects
// ============================================

// Execute side effects without breaking chain
const result = Option.Some([1, 2, 3])
  .tap((arr) => console.log(`Processing ${arr.length} items`))
  .map((arr) => arr.map((x) => x * 2))
  .tap((arr) => console.log(`Result: ${arr}`));
// Some([2, 4, 6])

// ============================================
// Using toResult
// ============================================

// Convert Option to Result with error for None
const okResult = Option.Some(42).toResult("value missing");
// Ok(42)

const errResult = Option.None.toResult("value missing");
// Err("value missing")

// Practical: convert nullable lookup to Result
function findUser(id: string): User | null {
  return null;
}

const userResult = Option.fromNullable(findUser("123")).toResult(new Error("User not found"));
// Ok(user) or Err(Error)
