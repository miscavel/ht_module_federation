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

## Conclusion

For the scenario of **independent mono-repos** and **Docker-based composition**, **Module Federation** is the superior choice. It allows the infrastructure (Docker/Nginx) to define the application composition rather than the build tool (Webpack/Vite), enabling true independent lifecycles for Core, WMS, and ASRS.
