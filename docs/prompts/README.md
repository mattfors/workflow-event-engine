# Prompt-first workflow

Store reusable task prompts here and paste them into Copilot Chat when starting work.

## Recommended flow
1. Pick template:
   - `docs/prompts/engine.md` for engine features
   - `docs/prompts/engine-wms-pick.md` for the WMS pick/XState flow
   - `docs/prompts/demo.md` for demo/integration work
   - `docs/prompts/demo-wms-cli.md` for interactive terminal pick workflows
2. Fill in placeholders (`<...>`).
3. Paste the completed prompt into chat.
4. Iterate by editing the prompt file as requirements change.

## Why this works
- Keeps `.github/copilot-instructions.md` stable for repo-wide rules.
- Keeps feature intent/versioned prompts in one place.
- Makes engine vs demo scope explicit before coding starts.
