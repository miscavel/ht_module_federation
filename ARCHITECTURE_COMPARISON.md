# Architecture Comparison: Module Federation vs. NPM Packages

## Context
We are building a system with the following components:
*   **Core**: Host application, contains Capacitor native plugins, shared UI, and authentication. Stable lifecycle.
*   **WMS**: Warehouse Management System. High velocity, sits in a mono-repo with its backend.
*   **ASRS**: Robotics Control. High velocity, sits in a mono-repo, depends on Core and WMS.

**Deployment Requirements:**
*   Dynamic combinations: (Core + WMS), (Core + ASRS), (Core + WMS + ASRS).
*   Independent versioning: e.g., Run Core v1.7.0 with WMS v2.5.1 and ASRS v2.7.0
*   Infrastructure: Docker-based integration testing, Gateway-based production routing.

---

## Evaluation Summary

| Feature | Module Federation (Recommended) | NPM Package (Monolith) |
| :--- | :--- | :--- |
| **Versioning** | **Decoupled**. WMS can be released independently of Core. | **Coupled**. Updating WMS requires rebuilding and releasing Core. |
| **Development** | **Isolated**. Devs run WMS standalone or compose with Core at runtime. | **Linked**. Requires `npm link` or local file references. Slower feedback loop. |
| **Deployment** | **Composite**. Deploy artifacts (containers) independently. | **Atomic**. One large bundle contains everything. |
| **Build Time** | **Fast (Parallel)**. Building WMS does not require building Core. | **Slow (Sequential)**. Core build time increases as sub-modules grow. |
| **Native Access** | **Via Host**. Remotes access native features via exposed Core interfaces. | **Direct**. Libraries import native plugins directly. |
| **Consistency** | **Runtime Check**. Risk of version mismatch if not managed. | **Build-time Check**. Guaranteed consistency, easier type safety. |

---

## Detailed Analysis

### 1. Ease and Separation of Versioning
*   **NPM Approach**:
    *   **Pros**:
        *   **Deterministic**: You know exactly what version of WMS is in Core at build time.
        *   **Auditability**: `package-lock.json` captures the entire dependency tree.
    *   **Cons**:
        *   **Release Train**: Since WMS is a dependency of Core, if WMS releases `v2.5.1`, you must update `package.json` in Core, run `npm install`, and cut a new release of Core (e.g., `v1.7.1`).
        *   **Coupling**: Core must be released whenever any child module changes, contradicting the goal of independent mono-repos.
*   **Module Federation**:
    *   **Pros**:
        *   **Decoupled**: Core `v1.7.0` loads `remoteEntry.js` from a URL. You can deploy WMS `v2.5.1` to that URL without touching Core.
        *   **Independent Velocity**: WMS team can push hotfixes to production instantly.
    *   **Cons**:
        *   **Runtime Risk**: Compatibility across Core, WMS and ASRS modules are not caught during build time (may cause unexpected crash). Can be mitigated via Semantic Versioning

### 2. Ease and Separation of Development
*   **NPM Approach**:
    *   **Pros**:
        *   **Simplicity**: Just run `npm install` and `npm start`.
        *   **Type Safety**: TypeScript types are automatically resolved from `node_modules`.
    *   **Cons**:
        *   **Slow Feedback**: To test integration, developers often need to build the entire monolith.
        *   **Linking Pain**: "Works on my machine" issues arise from symlinking local packages (`npm link`).
*   **Module Federation**:
    *   **Pros**:
        *   **Isolation**: WMS developers can run the WMS app in isolation (fast dev server).
        *   **Production Parity**: To test integration, they run the Core host and point the remote modules env var to their local WMS port.
    *   **Cons**:
        *   **Complexity**: Requires running multiple dev servers to test integration.
        *   **Types**: Sharing TypeScript types requires extra tooling (e.g., a shared typing library `@core/types`).

### 3. Ease of Deployment as Single Application
*   **NPM Approach**:
    *   **Pros**:
        *   **Atomic Artifact**: You get one set of static assets (HTML/JS/CSS), single deployment
    *   **Cons**:
        *   **Monolithic**: You cannot easily deploy "Core + WMS" and "Core + ASRS" separately without maintaining two different build configurations.
*   **Module Federation**:
    *   **Cons**:
        *   **Composite**: Need to deploy 3 separate static sites (Core, WMS, ASRS), stitched via gateway (e.g. `/gateway/handy-terminal/wms/` -> WMS Container).
        *   **Network Latency**: Loading `remoteEntry.js` adds an initial network round-trip.


### 4. Alternative Solution: The "Combinator App" Pattern (NPM Variant)
A common alternative proposal is to have specific "Shell Apps" for each combination (e.g., a "WMS Shell" that installs `core` and `wms` packages, "Full Shell" that installs `core`, `wms` and `asrs` packages). While this achieves build-time composition, it fails to solve the maintenance overhead.

| Feature | NPM "Combinator" Approach | Module Federation Approach |
| :--- | :--- | :--- |
| **Update Core Logic** | Must rebuild & redeploy **ALL** Combinator apps (Core App, WMS App, ASRS App). | Deploy Core once. All apps update instantly. |
| **Native Plugins** | Must maintain Android/iOS projects in **ALL** repos. | Maintain Android/iOS project **ONLY** in Core. |
| **Dependency Conflict** | High risk of duplicate libraries (Diamond Dependency). | Runtime negotiation (Shared Scope). |
| **Build Time** | Slower (bundles everything). | Faster (bundles only local code). |

**Why "Combinator" fails for this scenario:**
1.  **The "Diamond Dependency" Hell**: If ASRS depends on WMS, and both depend on Core, you risk bundling two versions of Core if versions drift. This causes "Singleton" errors (e.g., React Hooks failures).
2.  **The "Native Plugin" Trap**: If you have 3 different Combinator Apps, you have 3 different Native Projects (Android/iOS). Adding a new plugin requires updating native code in 3 repositories. With Module Federation, you only have **one** Native App (Core).

### 5. Concrete Scenarios

#### Scenario A: Critical Security Fix in Core
*   **Context**: A vulnerability is found in the Login component in `Core`.
*   **NPM Approach**:
    1.  Fix bug in `Core` repo -> Release `Core v1.7.2`.
    2.  Go to `WMS` repo -> Update `package.json` -> `npm install` -> Rebuild -> Redeploy WMS App.
    3.  Go to `ASRS` repo -> Update `package.json` -> `npm install` -> Rebuild -> Redeploy ASRS App.
    *   *Result*: 3 deployments required. Risk of ASRS team forgetting to update.
*   **Module Federation**:
    1.  Fix bug in `Core` repo -> Release `Core v1.7.2` container.
    2.  Restart `Core` container.
    *   *Result*: WMS and ASRS users immediately see the fixed Login screen. 1 deployment required.

#### Scenario B: Adding a Native Barcode Scanner
*   **Context**: WMS needs to scan QR codes.
*   **NPM Approach**:
    1.  Install `@capacitor/barcode-scanner` in `WMS` repo.
    2.  **Problem**: The WMS web code runs inside the *Core* Native App shell. If the Core Native App hasn't added the Java/Swift code for the scanner, the app crashes.
    3.  You must update the `Core` repo's `android/` folder to include the plugin.
    4.  If you have a separate "WMS Combinator App", you must update *its* `android/` folder too.
*   **Module Federation**:
    1.  Update `Core` repo: Install plugin, update `android/` folder, expose `ScannerService`.
    2.  `WMS` team simply calls `import { scan } from 'core/ScannerService'`.
    3.  No native code changes ever happen in the `WMS` repo.

### 6. Strategy for Version Alignment (The "Singleton" Problem)

One of the biggest challenges in Module Federation is ensuring that shared libraries (like `react`, `@ionic/react`, or `react-router`) are compatible across different remotes. If Core uses Ionic v7 and WMS uses Ionic v6, the app might crash.

#### The Problem
*   **Singleton Requirement**: Libraries like `react` and `@ionic/react` rely on global state. If two versions are loaded simultaneously, you get errors like "Hooks can only be called inside the body of a function component".
*   **Version Drift**: Over time, the WMS team might upgrade their dependencies while the Core team stays on an older version.

#### The Solution Strategy

1.  **Strict Shared Configuration**:
    In `webpack.config.ts`, use the `shared` configuration to enforce singleton behavior.
    ```typescript
    shared: {
      'react': { singleton: true, requiredVersion: '^18.2.0' },
      'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      '@ionic/react': { singleton: true, requiredVersion: '^7.0.0' }
    }
    ```
    *   `singleton: true`: Ensures only one copy of the library is ever loaded (usually the Host's copy).
    *   `requiredVersion`: If the Remote's version is incompatible with the Host's, the Remote will fail to load (fail-fast) or warn in the console.

2.  **The "Core-First" Upgrade Policy**:
    *   Since Core is the Host, it dictates the "Platform Version".
    *   **Rule**: Core upgrades major versions (e.g., Ionic 7 -> 8) *first*.
    *   Remotes (WMS/ASRS) must support the version provided by Core. They can be *behind* (if the library is backward compatible) but rarely *ahead* for singleton libraries.

3.  **Shared "Contracts" Package**:
    *   Create a small NPM package (e.g., `@company/contracts`) that exports only TypeScript interfaces and version constants.
    *   Both Core and WMS install this package to ensure they agree on the data structures passed between them.

4.  **Runtime Version Check (Optional)**:
    *   Core can expose a `getVersion()` function.
    *   WMS can check `if (Core.getVersion() < 2.0) { showIncompatibleMessage() }` on startup.

## Conclusion

For the scenario of **independent mono-repos** and **Docker-based composition**, **Module Federation** is the superior choice. It allows the infrastructure (Docker/Nginx) to define the application composition rather than the build tool (Webpack/Vite), enabling true independent lifecycles for Core, WMS, and ASRS.
