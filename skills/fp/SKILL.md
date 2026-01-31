---
name: carbon-fp
description: This skill should be used when the user asks to "use @carbonteq/fp", "use Option type", "use Result type", "create functional error handling", "use Flow generators", or mentions fp programming patterns in TypeScript. Provides guidance for functional programming with @carbonteq/fp.
---

# @carbonteq/fp Skill

Functional programming utilities for TypeScript with `Option` and `Result` types.

## Overview

`@carbonteq/fp` provides type-safe containers for handling optional values (`Option`) and fallible operations (`Result`) without null checks or try/catch.

```bash
npm i @carbonteq/fp
```

## Quick Reference

### Option (Some/None)

| Operation                           | Description                        |
| ----------------------------------- | ---------------------------------- |
| `Option.Some(value)`                | Create a Some                      |
| `Option.None`                       | The None singleton                 |
| `Option.fromNullable(value)`        | Convert nullable to Option         |
| `Option.fromFalsy(value)`           | Convert falsy to Option            |
| `Option.fromPredicate(value, pred)` | Create from predicate              |
| `.map(fn)`                          | Transform the value                |
| `.flatMap(fn)`                      | Chain operations returning Option  |
| `.filter(pred)`                     | Convert to None if predicate fails |
| `.zip(fn)`                          | Pair with derived value `[T, U]`   |
| `.flatZip(fn)`                      | Combine with another Option        |
| `.unwrap()`                         | Get value (throws if None)         |
| `.unwrapOr(default)`                | Get value with fallback            |
| `.isSome()` / `.isNone()`           | Type guards                        |
| `.match({ Some, None })`            | Pattern match                      |

### Result (Ok/Err)

| Operation                                  | Description                         |
| ------------------------------------------ | ----------------------------------- |
| `Result.Ok(value)`                         | Create an Ok                        |
| `Result.Err(error)`                        | Create an Err                       |
| `Result.fromNullable(value, error)`        | Convert nullable to Result          |
| `Result.fromPredicate(value, pred, error)` | Create from predicate               |
| `Result.tryCatch(fn, onError)`             | Wrap try/catch                      |
| `.map(fn)`                                 | Transform the success value         |
| `.flatMap(fn)`                             | Chain operations returning Result   |
| `.mapErr(fn)`                              | Transform the error                 |
| `.zipErr(fn)`                              | Validate with new error             |
| `.zip(fn)`                                 | Pair with derived value             |
| `.flatZip(fn)`                             | Combine with another Result         |
| `.orElse(fn)`                              | Recover from error                  |
| `.validate([fn, ...])`                     | Run all validators, collect errors  |
| `Result.all(...)`                          | Combine Results, collect all errors |
| `.unwrap()` / `.unwrapErr()`               | Get value or error                  |
| `.match({ Ok, Err })`                      | Pattern match                       |

### Flow Generators

| Method                      | Description                         |
| --------------------------- | ----------------------------------- |
| `Flow.gen(fn*)`             | Mixed Option/Result sync generator  |
| `Flow.genAdapter(fn*)`      | Sync generator with adapter `$`     |
| `Flow.asyncGen(fn*)`        | Mixed Option/Result async generator |
| `Flow.asyncGenAdapter(fn*)` | Async generator with adapter `$`    |
| `yield* new FlowError()`    | Short-circuit with custom error     |

## Common Patterns

### Chaining Optionals

```typescript
import { Option } from "@carbonteq/fp";

const email = Option.fromNullable(user?.profile)
  .flatMap((p) => Option.fromNullable(p.contact))
  .flatMap((c) => Option.fromNullable(c.email));
```

### Error Recovery

```typescript
import { Result } from "@carbonteq/fp";

const data = await fetchFromPrimary()
  .orElse(() => fetchFromCache())
  .orElse(() => Result.Ok(defaultData));
```

### Validation with All Errors

```typescript
import { Result } from "@carbonteq/fp";

const result = Result.Ok(input).validate([
  (v) => (v.length >= 8 ? Result.Ok(true) : Result.Err("too short")),
  (v) => (/[A-Z]/.test(v) ? Result.Ok(true) : Result.Err("needs uppercase")),
]);
// Ok(input) or Err(["too short", "needs uppercase"])
```

### Flow Generator

```typescript
import { Flow, Option, Result } from "@carbonteq/fp";

const result = Flow.gen(function* () {
  const user = yield* Option.fromNullable(getUser());
  const profile = yield* Result.Ok(fetchProfile(user.id));
  const settings = yield* Option.fromNullable(profile.settings);
  return { user, profile, settings };
});
```

## Further Reading

- **[Option Reference](references/option.md)** - Complete Option API
- **[Result Reference](references/result.md)** - Complete Result API
- **[Flow Reference](references/flow.md)** - Generator workflows
- **[Patterns Guide](references/patterns.md)** - Common patterns and anti-patterns
- **[Examples](examples/)** - Working code examples
