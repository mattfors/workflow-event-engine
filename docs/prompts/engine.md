# Engine Prompt Template

Use this when building core workflow/event behavior in `packages/engine`.

## Prompt
You are implementing core logic in the `engine` package of this npm workspace monorepo.

### Scope
- Work only in `packages/engine` unless wiring a usage example is required.
- Keep `engine` reusable and independent from demo-only concerns.
- Export behavior from `packages/engine/index.js` as the package public API.

### Requirements
- Implement: <describe feature>
- Inputs/outputs: <describe data shape>
- Constraints: <performance, edge cases, compatibility>
- Non-goals: <what not to build>

### Implementation rules
- Prefer minimal file changes.
- Keep entry points explicit and simple.
- Do not add tooling/scripts unless requested.

### Verification
- Run: `node packages/demo/index.js` only if demo wiring is requested.
- Summarize changed files and API surface.

### Deliverable format
1. Short plan
2. Code changes
3. Verification output
4. Follow-up options
