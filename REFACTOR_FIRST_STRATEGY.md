# Refactor-First Strategy: The Modular Monolith

This strategy focuses on cleaning up the existing codebase *before* introducing the complexity of Module Federation. The goal is to transform it into a Modular Monolith where boundaries are strictly enforced by tooling.

**Why this approach?**
*   **Safety**: We don't break the build. We fix dependencies while the app is still one cohesive unit.
*   **Velocity**: Refactoring is 10x faster because our IDE (VS Code) can trace references, rename symbols, and move files across the entire project instantly.
*   **Validation**: We can prove that "Core", "WMS" and "ASRS" can be split into separate modules before breaking out.

---

## Phase 1: The Logical Split (In-Place)

The first goal is to organize the code into "Domains" that mirror our future repositories.

### 1. Restructure Folders
Move files from technical layers (components, services, utils) to domain layers.

**Current (Example):**
```text
/src
  /components
    /Button
  /pages
    /Login
    /BerthReceiving
    /BinToStation
  /services
    /auth.endpoints.ts
    /wms.endpoints.ts
    /owm.endpoints.ts
```

**Target Structure (Example):**
```text
/src
  /Core
    /pages
      /Login
    /services
      /auth.endpoints.ts
  /WMS
    /pages
      /BerthReceiving
    /services
      /wms.endpoints.ts
  /ASRS
    /pages
      /BinToStation
    /services
      /owm.endpoints.ts
  /Shared     (Code shared across Core, WMS and ASRS, e.g. Types, Shared Components)
    /components
      /Button
```

### 2. The Golden Rules of Dependency
We must enforce these rules to ensure the modules can eventually be split:

1.  **Core** cannot import from **WMS** or **ASRS**. (Host shouldn't depend on Remotes).
2.  **Core** *can* import from **Shared**.
3.  **WMS** cannot import from **ASRS**. (Remotes should be siblings, not parents).
4.  **WMS** *can* import from **Core** and **Shared**.
5.  **ASRS** *can* import from **Core**, **Shared** and **WMS** (tentative).
6.  **Shared** cannot import from anywhere (Leaf node).

---

## Recommended Tools

### 1. Visualization & Analysis: `madge`
`madge` is excellent for generating visual graphs of our dependencies and finding circular references.

*   **Install**: `npm install -g madge`
*   **Usage**:
    *   **Find Circular Dependencies**: `madge --circular ./src`
    *   **Visualize WMS Dependencies**: `madge --image graph.png ./src/WMS`
    *   **Check what WMS depends on**: `madge --summary ./src/WMS`

### 2. Strict Enforcement: `dependency-cruiser`
It allows us to write rules in JSON/JS that fail the build if a forbidden import occurs.

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
        },
        ...
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
        { "type": "ASRS", "pattern": "src/ASRS" },
        { "type": "Shared", "pattern": "src/Shared" },
      ]
    },
    "rules": {
      "boundaries/element-types": [
        2,
        {
          "default": "disallow",
          "rules": [
            { "from": "WMS", "allow": ["Core", "Shared"] },
            { "from": "ASRS", "allow": ["Core", "Shared"] },
            { "from": "Core", "allow": ["Shared"] },
            { "from": "Shared", "allow": [] } 
          ]
        }
      ]
    }
    ```

## State Management Strategy: Dynamic Redux

A common blocker in Modular Monoliths is the root `store.ts` importing reducers from all modules. This violates the rule that **Core cannot import from WMS**.

### The Problem
```typescript
// ❌ BAD: Core depends on WMS
import { wmsReducer } from '../WMS/reducer'; 
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

WMS cannot access Core's files directly. To make this work, we use **Bi-directional Federation**:
1.  **Core** acts as a Host, but *also* as a Remote. It `exposes` the `./StoreUtils` file in its webpack config.
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

#### 3. Using Selectors
Modules can use `useSelector` hook, which connects to the `<Provider>` in Core.

```typescript
import { useSelector } from 'react-redux';
import { RootState } from '../../Shared/types'; 

export const WmsDashboard = () => {
  // This works because WMS is rendered inside Core's Provider
  const user = useSelector((state: RootState) => state.auth.user);
  
  return <h1>Hello {user.name}</h1>;
};
```

### Rules for Selectors
1.  **Non-Core modules selecting Core state**: **Allowed**. (`state.auth.user`)
2.  **Core selecting Non-Core states**: **Forbidden**. Core should not know `state.wms` exists, for example.
3.  **Non-Core modules selecting other Non-Core states**: **Forbidden**. Cross module state reading should be avoided to have clear separation

---

## Phase 2: The Proof of Concept (In-Repo Split)

Before moving code to separate Git repositories, we will build the actual Microfrontend architecture *inside* the current repository. This allows us to verify the build pipeline, Docker setup, and runtime integration without the overhead of managing multiple repos.

### 1. Create Independent Projects
Create a new folder structure (e.g., `apps/`) alongside our existing `src/`.
*   `apps/Core`: A standalone React project.
*   `apps/WMS`: A standalone React project.
*   `apps/ASRS`: A standalone React project.
*   `packages/Shared`: Shared logic/types/components (symlinked or local npm package).

### 2. Configure Module Federation
Set up `webpack.config.ts` for each project.
*   **Core**: Configured as Host (`remotes: { wms: '...' }`).
*   **WMS**: Configured as Remote (`exposes: { './App': './src/App' }`).
*   **ASRS**: Configured as Remote (`exposes: { './App': './src/App' }`).
*   **Shared**: Configured as symlinked or local npm package

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
      mf-asrs:
        build: ./apps/ASRS
        ports: ["3003:80"]
    ```

### 4. Verification
Run `docker-compose up`. We should be able to:
1.  Open `localhost:3000` and see the Old Monolith working.
2.  Open `localhost:3001` and see the New Core loading WMS from `localhost:3002` and ASRS from `localhost:3003`

---

## Phase 3: The Physical Split (Migration)

Once the `docker-compose` setup proves that the Microfrontend architecture works as a single SPA:

1.  **Create New Repositories** (e.g., `ht-core` and `ht-shared-modules`).
2.  **Migrate Projects**:
    *   Move `apps/Core` -> `ht-core` repo.
    *   Move `apps/WMS` -> `WMS` monorepo.
    *   Move `apps/ASRS` -> `rr_oks` / `ASRS` repo.
    *   Move `packages/Shared` -> `ht-shared-modules` repo
3.  **Migrate CI/CD**: Copy the Docker build steps from the root `docker-compose` into the CI pipelines of the new repositories.
4.  **Update docker-compose**: Update the docker-compose of each repo to run the desired combination of services (with versioning management)

