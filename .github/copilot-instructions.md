# Copilot instructions for workflow-event-engine

## Big picture
- This repo is an npm workspaces monorepo rooted at `package.json` with `workspaces: ["packages/*"]`.
- There are two packages under `packages/`:
  - `packages/engine`: core package boundary for workflow/event logic (`name: "engine"`).
  - `packages/demo`: consumer package for manual/demo usage (`name: "demo"`) and depends on `engine` via workspace version `"*"`.
- Current implementation is intentionally minimal:
  - `packages/engine/index.js` is a placeholder comment.
  - `packages/demo/index.js` prints `Hello World`.

## Package boundaries and data flow
- Treat `packages/engine` as the source of reusable behavior and `packages/demo` as the integration surface.
- Cross-package integration should happen through `engine`’s public entry (`packages/engine/index.js`) and be consumed from `demo`.
- Keep demo-only code in `packages/demo`; avoid leaking demo scaffolding into `engine`.

## Developer workflows (current state)
- Install dependencies from repo root: `npm install`.
- There are no `scripts` defined in root or package `package.json` files yet.
- Run the demo directly with Node from repo root:
  - `node packages/demo/index.js`
- When adding scripts, define them explicitly in the relevant `package.json` rather than assuming conventions.

## Conventions observed in this codebase
- Module format is plain JavaScript entry files (`index.js`) with CommonJS-style package metadata (`main: "index.js"`).
- Keep package entry points simple and explicit; this repo currently uses a single-file entry per package.
- Prefer minimal structure changes unless a new feature clearly requires extra files.

## Guidance for AI coding agents
- Start feature work in `packages/engine/index.js`; wire usage examples in `packages/demo/index.js`.
- If introducing exports in `engine`, keep them stable and consume them through the package dependency in `demo`.
- If build/test tooling is introduced, also update this file and `README.md` with exact commands.
- Reference files that define repo intent:
  - Root workspace config: `package.json`
  - Engine boundary: `packages/engine/index.js`
  - Consumer/integration example: `packages/demo/index.js`
