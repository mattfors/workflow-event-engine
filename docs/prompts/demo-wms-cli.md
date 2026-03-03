# Demo Prompt: WMS Pick CLI

Use this prompt to build an interactive terminal demo for the WMS pick engine.

## Prompt
You are implementing `packages/demo/index.js` as a command line interface that consumes the `engine` package.

### Goal
Create a terminal flow that lists assigned picks, lets the user select a pick with keypad/number input, and then walks through the pick states until completion.

### Required CLI behavior
- Show only picks assigned to the current user that are not completed.
- Render a numbered list and prompt for selection (`1`, `2`, `3`, ...).
- After selection, guide the user step-by-step:
  1. scan location
  2. scan box (open)
  3. confirm/change attributes (lot number, origin code)
  4. scan UPC/EAN code until required count is reached
  5. scan box again (close)
  6. complete pick
- After completion, return to pick list until no eligible picks remain.

### Input/interaction rules
- Use Node terminal input (`readline`) for prompts.
- Treat all actions as engine events; do not mutate pick state directly in demo.
- For item scans, accept values from the pick’s allowed code array (UPC/EAN).
- Show clear validation errors from engine and re-prompt without crashing.

### Output expectations
- Print current state after each event.
- Print helpful prompt text for the next expected action.
- Print completion summary when all assigned picks are done.

### Constraints
- Keep demo logic in `packages/demo` only.
- Keep business workflow rules inside `packages/engine`.
- Do not add UI frameworks or web interfaces.

### Verification
- Run: `node packages/demo/index.js`
- Demonstrate:
  - successful completion path,
  - invalid scan order rejection,
  - invalid UPC/EAN rejection,
  - prevention of selecting completed/unassigned picks
