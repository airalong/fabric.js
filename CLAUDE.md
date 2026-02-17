# Fabric.js

HTML5 canvas library. TypeScript, Rollup build, Vitest + Playwright tests.

## Commands

```bash
npm run build              # Full production build (with minification)
npm run build:fast         # Fast build without minification
npm run dev                # Watch mode for development
npm run lint -- --fix      # Lint and auto-fix
npm run prettier:write     # Format all files
npm run test:vitest        # Unit tests (Node/jsdom)
npm run test:vitest -- src/shapes/Rect.spec.ts  # Single test file
npm run test:vitest:chromium   # Browser tests (Chromium)
npm run test:vitest:firefox    # Browser tests (Firefox)
npm run test:e2e               # Playwright e2e tests
npm run test:e2e -- --ui       # E2E with UI
```

## Architecture

- `src/` - Main source (TypeScript)
  - `canvas/` - StaticCanvas, Canvas, DOMManagers
  - `shapes/` - FabricObject, Rect, Circle, Group, Text, Image, Path, etc.
  - `brushes/` - Drawing brushes
  - `controls/` - Interactive controls
  - `filters/` - Image filters (35+)
  - `parser/` - SVG parser
  - `util/` - Utilities, animation, path math
  - `env/` - Environment detection (browser/node)
- `extensions/` - Optional add-ons (built separately to dist-extensions/)
- `e2e/` - Playwright e2e tests
- `test/` - Test fixtures and utilities

Entry points: `index.ts` (browser), `index.node.ts` (Node), `extensions/index.ts`

## Code Style

- 2-space indent, single quotes (Prettier)
- Use `type` imports/exports: `import type { Foo } from './bar'`
- Prefix unused args with `_`
- Tests colocated with source as `.spec.ts` or `.test.ts`

## Gotchas

- **No `Math.hypot`** - Chrome has accuracy issues. Use `Math.sqrt(a*a + b*b)` instead.
- **No `Math` aliasing** - Can't destructure or alias `Math` (e.g., `const { sqrt } = Math` is banned).
- **No `console.*`** - Use the `log` util from `src/util/internals/console.ts`.
- **No `new Error()`** - Use `FabricError` instead.
- **No global `window`/`document`** - Use fabric's env utilities (`getWindow()`, `getDocument()`).
- **Pre-commit hooks** run ESLint (with --fix), Prettier, and TypeScript type-checking via lint-staged.

## Testing

- Vitest for unit tests, Playwright for e2e
- Custom matchers: `toMatchObjectSnapshot`, `toMatchSVGSnapshot`, `toEqualRoundedMatrix`, `toEqualSVG`
- SVG snapshots auto-sanitize dynamic IDs
- Node >=20.0.0 required
