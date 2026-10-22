# CoSign — AI for Clinical Documentation and Healthcare Analytics

Parkview-inspired React 19 + TypeScript 6 clinical documentation and healthcare analytics workspace.

## 1. Node.js Runtime & Environment Setup

- **Supported Node.js Engines (`package.json`):** `^22.13.0 || >=24.0.0`
- **Recommended Target Runtime:** **Node.js 24 LTS** (`.nvmrc` is set to `24`)
- **Verified Local Workstation Runtime:** **Node.js v22.20.0 LTS** (`/usr/local/bin/node`, `npm 10.9.3`)
  > **Note for macOS shells with `nvm`:** If your shell initializes `nvm` to an older Node 20 binary (`~/.nvm/versions/node/v20.20.2`), either install Node 24 LTS (`nvm install 24 && nvm use 24`) or ensure `/usr/local/bin` (`v22.20.0`) precedes `~/.nvm` on `PATH`:
  > ```bash
  > export PATH="/usr/local/bin:$PATH"
  > ```

## 2. Development & Verification Commands

```bash
# Install dependencies cleanly (no --force or --legacy-peer-deps)
npm install

# Start local Vite development server (http://localhost:5173)
npm run dev

# Run TypeScript typechecking
npm run typecheck

# Run ESLint (React Hooks + JSX a11y + TypeScript)
npm run lint

# Run Vitest unit & component integration tests
npm run test

# Build production bundle
npm run build
```

## 3. Architecture & Documentation

- [Frontend architecture](docs/frontend-architecture.md)
- [Demo walkthrough](docs/demo-walkthrough.md)
- [Implementation status](docs/implementation-status.md)
- [Parkview UX benchmark](docs/parkview-benchmark.md)
- [Architecture & Implementation Plan](docs/cosign_architecture_plan.md)
- [Verified 62-Frame Figma Prototype Inventory](docs/figma_inventory.md)
