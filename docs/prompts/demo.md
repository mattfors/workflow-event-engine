# Demo Prompt Template

Use this when wiring or showcasing behavior in `packages/demo`.

## Prompt
You are implementing demo/integration behavior in the `demo` package of this npm workspace monorepo.

### Scope
- Keep core business logic in `packages/engine`.
- Use `packages/demo/index.js` to consume `engine` and show usage.
- Avoid moving demo concerns into `engine`.

### Requirements
- Demo goal: <what should be shown>
- Engine API used: <function names/exports>
- Output expected in terminal: <exact or approximate>

### Implementation rules
- Minimal, readable demo code.
- No extra frameworks or tools.
- Keep changes aligned with current plain JavaScript setup.

### Verification
- Run: `node packages/demo/index.js`
- Confirm output matches goal.

### Deliverable format
1. What changed
2. How to run
3. Expected output
4. Next extension ideas (optional)
