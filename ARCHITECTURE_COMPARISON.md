# Architecture Comparison: Module Federation vs. NPM Packages

## Context
We are building a system with the following components:
*   **Core**: Host application, contains Capacitor native plugins, shared UI, and authentication. Stable lifecycle.
*   **WMS**: Warehouse Management System. High velocity, sits in a mono-repo with its backend.
*   **ASRS**: Robotics Control. High velocity, sits in a mono-repo, depends on Core and WMS.

**Deployment Requirements:**
*   Dynamic combinations: (Core + WMS), (Core + ASRS), (Core + WMS + ASRS).
*   Independent versioning: e.g., Run Core v1.7.0 with WMS v2.5.1.
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
    *   Since WMS is a dependency of Core, every time WMS releases `v2.5.1`, you must update `package.json` in Core, run `npm install`, and cut a new release of Core (e.g., `v1.7.1`).
    *   This creates a "release train" bottleneck where Core must be released whenever any child module changes.
    *   It contradicts the goal of having WMS versioned alongside its backend in a separate mono-repo.
*   **Module Federation**:
    *   Core `v1.7.0` is configured to load `remoteEntry.js` from a URL.
    *   You can deploy WMS `v2.5.1` to that URL (or update the Docker tag) without touching the Core codebase.
    *   This perfectly aligns with the requirement: `ASRS - v2.7.0 (uses Core v1.7.0 and WMS v2.5.0)`. You simply spin up those specific Docker containers, and they work together.

### 2. Ease and Separation of Development
*   **NPM Approach**:
    *   To test integration, developers often need to build the entire monolith.
    *   "Works on my machine" issues arise from symlinking local packages (`npm link`).
*   **Module Federation**:
    *   WMS developers can run the WMS app in isolation (fast dev server).
    *   To test integration, they run the Core host and point the `VITE_WMS_REMOTE` env var to their local WMS port.
    *   This mirrors the production Docker setup locally, reducing "it works locally but fails in prod" scenarios.

### 3. Ease of Deployment as Single Application
*   **NPM Approach**:
    *   **Pros**: You get one set of static assets (HTML/JS/CSS). Easy to put on an S3 bucket.
    *   **Cons**: You cannot easily deploy "Core + WMS" and "Core + ASRS" separately without maintaining two different build configurations (feature flags) or building two separate apps.
*   **Module Federation**:
    *   **Pros**: You deploy 3 separate static sites (Core, WMS, ASRS).
    *   **Gateway Composition**: An Nginx Gateway (or Docker Compose) stitches them together.
        *   `gateway/` -> Core Container
        *   `gateway/wms/` -> WMS Container
        *   `gateway/asrs/` -> ASRS Container
    *   This allows you to "compose" the application at the infrastructure level. To remove ASRS, you just stop the ASRS container and remove the route; Core handles the missing remote gracefully (as implemented with `catch` blocks).

### 4. Native Functionality (Capacitor)
*   **NPM Approach**:
    *   Easier initially. WMS code can directly import `@capacitor/camera`.
*   **Module Federation**:
    *   Remotes (WMS) should not directly depend on native plugins to avoid version conflicts and "multiple React instances" issues.
    *   **Solution**: Core exposes "Native Bridges" (e.g., `SharedNotification`, `CameraService`). WMS consumes these.
    *   **Benefit**: This enforces a clean architecture where Core controls the hardware, and feature modules just request actions.

### 5. Special Case: The "Combinator App" Pattern (NPM Variant)
A common alternative proposal is to have specific "Shell Apps" for each combination (e.g., a "WMS Shell" that installs `core` and `wms` packages). While this achieves build-time composition, it fails to solve the maintenance overhead.

| Feature | NPM "Combinator" Approach | Module Federation Approach |
| :--- | :--- | :--- |
| **Update Core Logic** | Must rebuild & redeploy **ALL** Combinator apps (Core App, WMS App, ASRS App). | Deploy Core once. All apps update instantly. |
| **Native Plugins** | Must maintain Android/iOS projects in **ALL** repos. | Maintain Android/iOS project **ONLY** in Core. |
| **Dependency Conflict** | High risk of duplicate libraries (Diamond Dependency). | Runtime negotiation (Shared Scope). |
| **Build Time** | Slower (bundles everything). | Faster (bundles only local code). |

**Why "Combinator" fails for this scenario:**
1.  **The "Diamond Dependency" Hell**: If ASRS depends on WMS, and both depend on Core, you risk bundling two versions of Core if versions drift. This causes "Singleton" errors (e.g., React Hooks failures).
2.  **The "Native Plugin" Trap**: If you have 3 different Combinator Apps, you have 3 different Native Projects (Android/iOS). Adding a camera plugin requires updating native code in 3 repositories. With Module Federation, you only have **one** Native App (Core).

### 6. Concrete Scenarios

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

### 7. Alternative Approaches Considered

It is healthy to doubt the complexity of Module Federation. Here are other industry-standard approaches and why they were ruled out for this specific project:

#### A. Ionic Portals (The "Enterprise" Native Solution)
*   **Concept**: A native mobile technology that allows you to embed multiple web apps (Portals) into a single native shell. It is essentially "Module Federation for Native".
*   **Pros**:
    *   Official support from Ionic.
    *   Granular updates via Appflow (Live Updates).
    *   Better isolation of native contexts.
*   **Cons**:
    *   **Cost**: It is a paid enterprise product.
    *   **Complexity**: Requires significant native (iOS/Android) development knowledge to wire up the Portals.
    *   **Fit**: Best for teams with dedicated native mobile engineers. Our team is primarily web-focused using Capacitor.

#### B. Automated Monorepo (The "Brute Force" NPM Solution)
*   **Concept**: Put Core, WMS, and ASRS into a single Git repository (Monorepo) using tools like Nx or Turbo.
*   **Pros**:
    *   Solves versioning: Everything is always at `HEAD`. No "v1 vs v2" conflicts.
    *   Solves native plugins: One `android/` folder for the whole repo.
*   **Cons**:
    *   **Violates Constraint**: We explicitly require **independent mono-repos** because WMS and ASRS have their own backends and lifecycles.
    *   **Coupling**: A bug in WMS can block the deployment of ASRS if the CI pipeline is shared.

#### C. Iframe Composition (The "Old School" Solution)
*   **Concept**: Core loads WMS inside an `<iframe>`.
*   **Pros**:
    *   Perfect isolation (CSS/JS cannot leak).
    *   Technology agnostic (WMS could be Angular, Core is React).
*   **Cons**:
    *   **UX**: Scrolling and navigation sync is difficult on mobile.
    *   **Native Access**: Accessing Capacitor plugins from an iframe requires a complex `postMessage` bridge.
    *   **Performance**: High memory usage (loading multiple browser contexts).

#### D. NPM Git Dependencies (The "Private" Solution)
*   **Concept**: Instead of a registry, Core depends directly on the Git repo: `"wms": "git+ssh://git@github.com/org/wms.git#v2.0.0"`.
*   **Pros**:
    *   No need for a private NPM registry (Nexus/Artifactory).
    *   Access to specific commits/branches.
*   **Cons**:
    *   **Build Speed**: `npm install` becomes extremely slow as it clones the full repo history.
    *   **Coupling**: Still suffers from the "Release Train" problem. You must rebuild Core to update the Git hash.

#### E. Import Maps (The "Future" Standard)
*   **Concept**: You publish WMS as an ES Module to a CDN. Core uses a browser native `<script type="importmap">` to map `import "wms"` to `https://cdn.com/wms/index.js`.
*   **Pros**:
    *   **Runtime Updates**: You can update the Import Map JSON to point to a new version without rebuilding Core.
    *   **Standard**: Uses native browser capabilities, no Webpack magic required.
*   **Cons**:
    *   **Maturity**: Tooling (like `vite-plugin-import-map`) is less mature than Module Federation.
    *   **Native Plugins**: Still faces the same issue—if WMS imports a native plugin, Core must have it installed. Module Federation handles the "sharing" of these dependencies more automatically via its `shared` config.

## Conclusion

For the scenario of **independent mono-repos** and **Docker-based composition**, **Module Federation** is the superior choice. It allows the infrastructure (Docker/Nginx) to define the application composition rather than the build tool (Webpack/Vite), enabling true independent lifecycles for Core, WMS, and ASRS.
