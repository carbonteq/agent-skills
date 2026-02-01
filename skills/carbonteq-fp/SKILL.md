---
name: carbon-fp
description: Use when asked about @carbonteq/fp Option/Result/Flow patterns or functional error handling in TypeScript.
---

# @carbonteq/fp Skill

Core concepts only; prefer links for details.

## Core vs Experimental

- **Core**: `Option`/`Result`
  - accept Promise-returning mappers
  - async yields `Option<Promise<T>>` / `Result<Promise<T>, E>`
  - Resolve with `await unwrap()` or `toPromise()`
- **Experimental**: `ExperimentalOption`/`ExperimentalResult` add `*Async` helpers plus generator helpers
  `Flow` is built on experimental types.

```typescript
import {
  Option,
  Result,
  ExperimentalOption as XOption,
  ExperimentalResult as XResult,
  Flow,
  FlowError,
  UnwrappedNone,
} from "@carbonteq/fp";
```

## Flow essentials

- `Flow.gen`, `Flow.genAdapter`, `Flow.asyncGen`, `Flow.asyncGenAdapter`
- `Option.None` short-circuits to `Result.Err(new UnwrappedNone())`
- Use `yield* new FlowError(...)` or `yield* $.fail(error)` (adapter variants)

## References

- `references/option.md`
- `references/result.md`
- `references/flow.md`
- `references/patterns.md`
