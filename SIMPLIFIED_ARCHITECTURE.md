# Simplified Architecture: Alternatives to Module Federation

## The Problem
You correctly identified that Module Federation (MF) introduces significant complexity (Webpack/Vite config, shared dependencies, singleton management). For a team with junior developers, this can become a bottleneck.

**Core Goal**: Ensure that the UI code for WMS is always compatible with the WMS Backend.
**Constraint**: Avoid the "Version Matrix Hell" (e.g., "Does UI v5.3 work with WMS Backend v2.1?").

Here are two alternative architectures that solve the versioning problem with significantly less complexity.

---

## Option 1: The "Multi-SPA" Approach (Recommended)

Instead of trying to stitch 3 applications together into one JavaScript bundle (Federation), you deploy them as **3 separate websites** that link to each other.

### How it works
1.  **Repositories**:
    *   **Core Repo**: Contains Core UI + Native Shell (Capacitor).
    *   **WMS Repo**: Contains WMS Backend + **WMS UI**.
    *   **ASRS Repo**: Contains ASRS Backend + **ASRS UI**.
2.  **Deployment**:
    *   Core UI -> `https://app.internal/`
    *   WMS UI -> `https://app.internal/wms/`
    *   ASRS UI -> `https://app.internal/asrs/`
3.  **Integration**:
    *   To go to WMS, Core simply uses a standard link: `<a href="/wms">Go to Warehouse</a>`.
    *   The browser performs a full page load and loads the WMS React App.

### Solving the Versioning Problem
Since **WMS UI** lives in the **WMS Repo**, they are released together.
*   When you deploy WMS Backend v2.0, you automatically deploy WMS UI v2.0 to `/wms`.
*   There is **zero risk** of mismatch because they are the same build pipeline.

### Pros & Cons
| Feature | Module Federation | Multi-SPA (Links) |
| :--- | :--- | :--- |
| **Complexity** | High (Shared Scope, Remote Entry) | **Low** (Standard React Apps) |
| **Team Skill** | Requires Senior Architect | **Junior Friendly** |
| **Transitions** | Smooth (SPA) | **Hard** (Page Reload) |
| **State Sharing** | Redux/Context | **Cookies / LocalStorage** |
| **Native Plugins** | Complex (Host must expose) | **Tricky** (See below) |

### The "Native" Challenge (Capacitor)
If you are building a native app, "Page Reloads" are fine, but you need to ensure the **Capacitor Plugins** (Scanner, Camera) work in all apps.
*   **Solution**: The "Core" app acts as the Native Shell. It loads WMS UI via a WebView.
*   **Requirement**: You must inject the Capacitor JS bridge into the WMS UI index.html. This is standard practice for "Hybrid" apps.

---

## Option 2: The "Strict Monolith" with Runtime Handshake

If you decide that "Page Reloads" are unacceptable and you need a true Single Page Application, stick to a **Monolith UI** but enforce versioning via **Runtime Checks**.

### How it works
1.  **Repository**: Single `frontend-monolith` repo.
2.  **Versioning**: The UI has a `compatibility.json` file.
    ```json
    {
      "uiVersion": "5.3.0",
      "supportedBackends": {
        "wms": "^2.0.0",
        "asrs": "^1.5.0"
      }
    }
    ```
3.  **The Handshake**:
    *   On App Startup, the UI calls `GET /wms/api/health` and `GET /asrs/api/health`.
    *   The Backends return their version: `{ "version": "2.1.0" }`.
    *   The UI compares the versions using `semver`.
    *   **Mismatch?** The UI blocks the user: *"System Mismatch: WMS Backend is v1.9, but UI requires v2.0. Please contact IT."*

### Pros & Cons
| Feature | Module Federation | Strict Monolith |
| :--- | :--- | :--- |
| **Complexity** | High | **Medium** (Just logic) |
| **Repo Structure** | Split | **Unified** (UI is separate from Backend) |
| **Versioning** | Implicitly Solved | **Explicitly Enforced** |

---

## Recommendation for your Team

Given that you have **2 junior developers** and want to **colocate UI with Backend**:

**Go with Option 1 (Multi-SPA / Sub-paths).**

1.  **It solves the root problem**: WMS UI code sits in the WMS Repo.
2.  **It is simple**: Juniors just build a standard React App. No "Remote Entry", no "Shared Scope", no "Async Reducers".
3.  **It is robust**: If WMS UI crashes, it doesn't take down Core.
4.  **Native Support**: Since you are using Capacitor, you can simply point the WebView to the remote URL.
    *   *Caveat*: The device needs network access to load the WMS UI (unless you bundle it, which brings us back to Monolith).

### Migration Path for Option 1
1.  **Move Code**: Move `src/WMS` to the WMS Backend Repo.
2.  **Build**: Set up a Vite build in WMS Repo that outputs to `dist/`.
3.  **Deploy**: Configure Nginx/Apache to serve that `dist/` at `https://yoursite.com/wms`.
4.  **Link**: In Core, change the router link to a standard `<a href>` tag.
