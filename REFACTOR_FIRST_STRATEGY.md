# Refactor-First Strategy: The Modular Monolith

## Executive Summary
This strategy focuses on cleaning up the existing codebase *before* introducing the complexity of Module Federation. The goal is to transform a into a Modular Monolith where boundaries are strictly enforced by tooling.

**Why this approach?**
*   **Safety**: We don't break the build. We fix dependencies while the app is still one cohesive unit.
*   **Velocity**: Refactoring is 10x faster because our IDE (VS Code) can trace references, rename symbols, and move files across the entire project instantly.
*   **Validation**: We can prove that "Core", "WMS" and "ASRS" can be split into separate modules before breaking out.

---

## Phase 1: The Logical Split (In-Place)

The first goal is to organize the code into "Domains" that mirror our future repositories.

### 1. Restructure Folders
Move files from technical layers (components, services, utils) to domain layers.

**Current (Likely):**
```text
/src
  /components
    /Button.tsx
    /WmsGrid.tsx
  /services
    /AuthService.ts
    /InventoryService.ts
```

**Target Structure:**
```text
/src
  /Core       (Future Host Repo)
    /components (Button.tsx)
    /services   (AuthService.ts)
  /WMS        (Future Remote Repo)
    /components (WmsGrid.tsx)
    /services   (InventoryService.ts)
  /ASRS       (Future Remote Repo)
  /Shared     (Code shared between WMS and ASRS, e.g. Types)
```

### 2. The Golden Rules of Dependency
We must enforce these rules to ensure the modules can eventually be split:

1.  **Core** cannot import from **WMS** or **ASRS**. (Host shouldn't depend on Remotes).
2.  **WMS** cannot import from **ASRS**. (Remotes should be siblings, not parents).
3.  **WMS** *can* import from **Core** (for Auth/Layout) and **Shared**.
4.  **Shared** cannot import from anywhere (Leaf node).

---

## Recommended Tools

### 1. Visualization & Analysis: `madge`
Before we start moving files, we need to see the mess. `madge` is excellent for generating visual graphs of our dependencies and finding circular references.

*   **Install**: `npm install -g madge`
*   **Usage**:
    *   **Find Circular Dependencies**: `madge --circular ./src`
    *   **Visualize WMS Dependencies**: `madge --image graph.png ./src/WMS`
    *   **Check what WMS depends on**: `madge --summary ./src/WMS`

### 2. Strict Enforcement: `dependency-cruiser`
This is the heavy lifter. It allows us to write rules in JSON/JS that fail the build if a forbidden import occurs.

*   **Install**: `npm install --save-dev dependency-cruiser`
*   **Configuration** (`.dependency-cruiser.js`):
    ```javascript
    module.exports = {
      forbidden: [
        {
          name: 'no-wms-to-asrs',
          comment: 'WMS cannot depend on ASRS',
          from: { path: '^src/WMS' },
          to: { path: '^src/ASRS' }
        },
        {
          name: 'no-core-to-modules',
          comment: 'Core cannot depend on Feature Modules',
          from: { path: '^src/Core' },
          to: { path: '^src/(WMS|ASRS)' }
        }
      ]
    };
    ```
*   **Run it**: `npx depcruise --validate .dependency-cruiser.js src`

### 3. Linter Enforcement: `eslint-plugin-boundaries`
For real-time feedback in VS Code (red squiggly lines), use this ESLint plugin.

*   **Install**: `npm install --save-dev eslint-plugin-boundaries`
*   **Config**:
    ```json
    "settings": {
      "boundaries/elements": [
        { "type": "Core", "pattern": "src/Core" },
        { "type": "WMS", "pattern": "src/WMS" },
        { "type": "ASRS", "pattern": "src/ASRS" }
      ]
    },
    "rules": {
      "boundaries/element-types": [
        2,
        {
          "default": "disallow",
          "rules": [
            { "from": "WMS", "allow": ["Core"] },
            { "from": "ASRS", "allow": ["Core"] },
            { "from": "Core", "allow": [] } 
          ]
        }
      ]
    }
    ```

---

## How to Find & Break Dependency Links

### Step 1: The "Barrel" File Check
Look for `index.ts` files that export everything.
*   **Problem**: If `Core/index.ts` exports `AuthService` AND `SomeHelper`, and `WMS` imports `SomeHelper`, it might accidentally pull in `AuthService` which might pull in other things.
*   **Fix**: Import directly from files (`import { X } from '@core/services/X'`) or split barrel files by domain.

### Step 2: The "Global State" Trap
Look for Redux slices or React Contexts.
*   **Problem**: `WMS` dispatches an action defined in `ASRS`.
*   **Fix**:
    *   Move the shared state to `Core` (if global).
    *   Or, use **Event Bus** pattern (Custom Events) if modules need to communicate loosely without importing each other's code.

### Step 3: The "Utils" Drawer
Everyone dumps code into `src/utils`.
*   **Problem**: `date-formatter.ts` is used by everyone.
*   **Fix**: Move generic utils to `src/Shared/utils`. If a util is specific to WMS logic, move it to `src/WMS/utils`.

### Step 4: Circular Dependencies
Use `madge --circular` to find them.
*   **Scenario**: `User` (Core) has a property `currentTask` (WMS). `Task` (WMS) has a property `assignedUser` (Core).
*   **Fix**: Create an interface in `Shared` or `Core`.
    *   `Core` defines `interface IUser { ... }`.
    *   `WMS` imports `IUser`.
    *   `Core` does *not* import `Task` class, but maybe a generic `ITask` interface if absolutely needed.

---

## State Management Strategy: Dynamic Redux

A common blocker in Modular Monoliths is the root `store.ts` importing reducers from all modules. This violates the rule that **Core cannot import from WMS**.

### The Problem
```typescript
// ❌ BAD: Core depends on WMS
import { wmsReducer } from '../WMS/features/inventory'; 
export const store = configureStore({
  reducer: {
    auth: authReducer,
    wms: wmsReducer, // <--- Hard dependency!
  },
});
```

### The Solution: Reducer Injection & Context
In Module Federation, we **cannot** import the `store` instance directly from another repo. However, because `react-redux` is a shared singleton, Remotes can access the Store via **React Context** provided by the Host.

#### 1. Modify Core Store (`src/Core/store/index.ts`)
Core needs to expose a utility to allow Remotes to add their reducers.

```typescript
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { authReducer } from './authSlice';

// Define static reducers (Core only)
const staticReducers = { auth: authReducer };
const asyncReducers: Record<string, any> = {};

export const store = configureStore({ reducer: staticReducers });

// --- EXPORT THIS UTILITY ---
// In the future, Core will expose this file as 'Core/StoreUtils'
export const injectReducer = (key: string, reducer: any) => {
  if (asyncReducers[key]) return;
  asyncReducers[key] = reducer;
  store.replaceReducer(combineReducers({ ...staticReducers, ...asyncReducers }));
};
```

#### 2. Register in Module (`src/WMS/index.tsx`)
WMS uses the injected utility.

**Q: How can WMS import from Core in Federation?**
You are right that WMS cannot access Core's files directly. To make this work, we use **Bi-directional Federation**:
1.  **Core** acts as a Host, but *also* as a Remote. It `exposes` the `./StoreUtils` file in its Vite config.
2.  **WMS** lists `Core` in its `remotes` configuration.
3.  At runtime, Module Federation resolves `import ... from 'Core/StoreUtils'` to the already-loaded Core instance.

**Q: How are types resolved?**
Since `Core` is in a different repo, TypeScript in `WMS` won't find the definitions for `'Core/StoreUtils'`. We have two options:

1.  **The Modern Way (Recommended)**: Use the `@module-federation/typescript` plugin.
    *   It automatically downloads the `d.ts` files from Core's build output into WMS's `node_modules/@types` folder during the build process.
    *   This keeps types perfectly in sync without manual work.

2.  **The Manual Way**: Create a declaration file in WMS.
    *   Create `src/remotes.d.ts`:
        ```typescript
        declare module 'Core/StoreUtils' {
            export const injectReducer: (key: string, reducer: any) => void;
        }
        ```

```typescript
import { useEffect } from 'react';
// Refactor Phase: import { injectReducer } from '@core/store';
// Split Phase: import { injectReducer } from 'Core/StoreUtils'; 
import { wmsReducer } from './slices/wmsSlice';

export const WmsApp = () => {
  useEffect(() => {
    injectReducer('wms', wmsReducer);
  }, []);
  return <div>WMS Content</div>;
};
```

#### 3. Using Selectors (The "Magic" of Context)
WMS does **not** need to import the store to read state. It uses the `useSelector` hook, which connects to the `<Provider>` in Core.

```typescript
import { useSelector } from 'react-redux';
// Import TYPES only from Shared (safe!)
import { RootState } from '../../Shared/types'; 

export const WmsDashboard = () => {
  // This works because WMS is rendered inside Core's Provider
  const user = useSelector((state: RootState) => state.auth.user);
  
  return <h1>Hello {user.name}</h1>;
};
```

### Rules for Selectors
1.  **WMS selecting Core state**: **Allowed**. (`state.auth.user`)
2.  **Core selecting WMS state**: **Forbidden**. Core should not know `state.wms` exists.
    *   *Alternative*: If Core needs to display WMS data (e.g., "5 Tasks"), WMS should export a Component (e.g., `<WmsNotificationBadge />`) that connects to the store itself.

---

## Phase 2: The Proof of Concept (In-Repo Split)

Before moving code to separate Git repositories, we will build the actual Microfrontend architecture *inside* the current repository. This allows us to verify the build pipeline, Docker setup, and runtime integration without the overhead of managing multiple repos.

### 1. Create Independent Projects
Create a new folder structure (e.g., `apps/`) alongside your existing `src/`.
*   `apps/Core`: A standalone Vite project.
*   `apps/WMS`: A standalone Vite project.
*   `apps/ASRS`: A standalone Vite project.
*   `packages/Shared`: Shared logic/types (symlinked or local npm package).

**Action**: Move the refactored code from `src/WMS` into `apps/WMS/src`.

### 2. Configure Module Federation
Set up `vite.config.ts` for each project.
*   **Core**: Configured as Host (`remotes: { wms: '...' }`).
*   **WMS**: Configured as Remote (`exposes: { './App': './src/App' }`).

### 3. Docker & Orchestration
We need to prove that these apps can run as a cohesive SPA in a production-like environment.

1.  **Dockerfiles**: Create a `Dockerfile` for each app (`apps/WMS/Dockerfile`) that builds the static assets and serves them (e.g., via Nginx).
2.  **Root `docker-compose.yml`**:
    ```yaml
    services:
      # The Old Monolith (Reference)
      monolith:
        build: .
        ports: ["3000:80"]

      # The New Microfrontends
      mf-core:
        build: ./apps/Core
        ports: ["3001:80"]
      mf-wms:
        build: ./apps/WMS
        ports: ["3002:80"]
    ```

### 4. Verification
Run `docker-compose up`. You should be able to:
1.  Open `localhost:3000` and see the Old Monolith working.
2.  Open `localhost:3001` and see the New Core loading WMS from `localhost:3002`.

---

## Phase 3: The Physical Split (Migration)

Once the `docker-compose` setup proves that the Microfrontend architecture works as a single SPA:

1.  **Create New Repositories** (e.g., `ht-core`, `ht-wms`, `ht-asrs`).
2.  **Migrate Projects**:
    *   Move `apps/Core` -> `ht-core` repo.
    *   Move `apps/WMS` -> `ht-wms` repo.
    *   Move `apps/ASRS` -> `ht-asrs` repo.
3.  **Migrate CI/CD**: Copy the Docker build steps from the root `docker-compose` into the CI pipelines of the new repositories.
4.  **Decommission**: Delete the `apps/` folder and the old `src/` folder from the original repository.

This ensures that when you finally split, the code is guaranteed to work in isolation.
