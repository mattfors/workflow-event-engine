# Engine Prompt: WMS Pick Flow (XState)

Use this prompt to generate the first implementation of the engine.

## Prompt
You are implementing core logic in `packages/engine` for a WMS pick operation using XState.

### Goal
Build an event-driven state machine engine that loads one or more picks and walks an operator through completing them.

### Domain flow
- The engine is initialized with an array of picks.
- A user can start any pick that:
  - is not completed, and
  - is assigned to the current user.
- For each selected pick, required sequence is:
  1. scan location
  2. scan box
  3. confirm or change attributes (at minimum: lot number, origin code)
  4. scan item code required number of times
     - acceptable code values come from an array (supports UPC and EAN values)
  5. scan box again (close/confirm)
  6. mark pick completed
- Repeat until all eligible picks are completed.

### Architecture requirements
- Use XState as the workflow/state engine.
- Design everything as a stream of events (no direct imperative step jumping).
- Keep engine reusable in `packages/engine`; no demo-specific logic.
- Export a clear public API from `packages/engine/index.js`.

### Event model (minimum)
Create typed/structured event names and payloads for:
- load picks
- start pick
- scan location
- scan box (open)
- set/confirm attributes
- scan item code
- scan box (close)
- complete pick
- reject/validation error

### Validation rules
- Reject starting picks that are completed or assigned to another user.
- Reject invalid scan order.
- Reject item-code scans not in acceptable code array.
- Enforce required scan count before allowing close-box and complete-pick.

### Data assumptions
Use minimal, explicit shapes (can evolve later):
- pick identity
- assigned user id
- completion status
- location code
- box code
- attributes: lot number, origin code
- acceptable codes array
- required scan count
- current scan count

### Deliverables
1. Implement machine + exported API in `packages/engine/index.js`
2. Add an interactive CLI usage path in `packages/demo/index.js` that:
  - lists picks assigned to the current user,
  - lets the operator choose a pick via keypad/number input,
  - guides the operator through each required scan/confirm step,
  - logs state transitions and validation errors in the terminal,
  - marks the pick complete and returns to pick selection until all eligible picks are done
3. Keep changes minimal and aligned with current repo structure
4. Provide run instructions and sample output expectations

### Verification
- Install any needed dependency (XState)
- Run demo with:
  - `node packages/demo/index.js`
- Show that the CLI can:
  - display assigned picks,
  - accept keypad/number selection,
  - complete picks through valid event streams,
  - reject invalid streams with clear terminal feedback
