# Migration Strategy: Keeping Up with the Old Codebase

## Context
We are transitioning from a monolithic "Old Codebase" to a new Module Federation architecture split into 3 repositories: **Core**, **WMS**, and **ASRS**. A major risk is the "Moving Target" problem: the Old Codebase continues to evolve (bugs, features) while we are trying to migrate code to the new architecture.

## Core Principles
1.  **Single Source of Truth**: At any point in time, a specific module (e.g., "Inbound Receiving") must have exactly one "Master" location. It is either the Old Repo OR the New Repo, never both.
2.  **Minimize Double Entry**: Avoid manually implementing the same feature in two places.
3.  **Vertical Slicing**: Migrate feature-by-feature rather than layer-by-layer.

---

## Recommended Strategy: "The Strangler Fig" with Code Freeze

This strategy involves freezing specific sections of the old application, migrating them, and then routing traffic to the new implementation.

### Phase 1: The "Core" Foundation (High Risk of Divergence)
*   **Goal**: Establish the Host application (Shell), Authentication, and Navigation.
*   **Status**:
    *   **Old Codebase**: Active Master for Auth/Shell.
    *   **New Codebase**: Under Construction.
*   **Sync Strategy**: **Double Entry (Manual)**.
    *   Since the architecture is changing (Monolith -> Federated Host), you cannot simply copy-paste Auth logic.
    *   **Rule**: Any change to Authentication or Global Styles in the Old Codebase must be manually re-implemented in the New Core immediately.
    *   **Mitigation**: Keep this phase as short as possible.

### Phase 2: Vertical Migration (e.g., WMS Module)
*   **Goal**: Move the WMS functionality to the new `wms` remote.
*   **Status**:
    *   **Old Codebase**: **FROZEN** for WMS.
    *   **New Codebase**: Active Development for WMS.
*   **Sync Strategy**: **Freeze and Squeeze**.
    1.  **Announce Freeze**: "Starting Dec 1st, no new features for WMS in the Old Repo. Critical bugs only."
    2.  **Bulk Port**: Copy WMS code to the new repo. Refactor for Federation.
    3.  **Emergency Fixes**: If a critical bug occurs in Old WMS:
        *   Fix it in Old Repo (to save Production).
        *   **Immediately** apply the same fix to the New Repo.
    4.  **Cutover**: Once WMS is ready in the new repo, update the Old App (or Gateway) to load the new WMS Remote.

### Phase 3: Shared Logic Extraction (The Bridge)
*   **Goal**: Handle business logic that *must* stay in sync but cannot be migrated yet.
*   **Strategy**: **Shared NPM Packages**.
    *   Identify complex logic used by both (e.g., `TaxCalculator`, `BarcodeParser`).
    *   Extract this code from the Old Repo into a shared NPM package (e.g., `@company/logic`).
    *   Publish this package.
    *   **Install** this package in **BOTH** the Old Repo and the New Repo.
    *   **Benefit**: A bug fix in the package updates both systems via `npm update`.

---

## Decision Matrix: How to handle a change?

When a request comes in for a change, use this flowchart:

| Scenario | Action |
| :--- | :--- |
| **New Feature for WMS** (Migration started) | **Reject in Old**. Implement ONLY in New Repo. |
| **Critical Bug in WMS** (Migration started) | **Fix in Old** -> Manually Port to New. |
| **Change to Shared UI (Button, Input)** | **Extract to UI Kit**. Create/Update shared UI library. Update both repos. |
| **Global Auth Change** | **Double Entry**. Implement in Old. Re-architect/Implement in New. |

---

## Tactical Tips

### 1. Use `git cherry-pick` (If applicable)
If the new repo was started as a copy of the old one (preserving git history), you might be able to use `git cherry-pick` to move commits over.
*   *Note*: If directory structures differ significantly (which is likely), this will require manual conflict resolution.

### 2. Feature Flags
In the Old Codebase, wrap the module being migrated in a Feature Flag.
*   `if (FLAGS.useNewWms) { window.location.href = "/new-wms"; } else { renderOldWms(); }`
*   This allows you to test the new module in production with a subset of users while keeping the old one as a backup.

### 3. The "Code Watch" Role
Assign one developer as the "Migration Warden".
*   Their job is to watch the commit log of the Old Repo every morning.
*   If they see a commit touching files in the "WMS" folder, they flag it and ensure it is accounted for in the New Repo.

## Summary Timeline

1.  **Week 1-2**: Build New Core (Host). **Manual Sync** of Auth/Styles.
2.  **Week 3**: **Freeze WMS** in Old Repo. Extract shared logic to NPM.
3.  **Week 4-6**: Port WMS to New Repo. **Reject** new WMS features in Old Repo.
4.  **Week 7**: **Cutover**. WMS is now live from New Repo. Old WMS code is deleted.
5.  **Week 8**: Repeat for ASRS.

---

## Alternative Strategy: "Refactor-First" (Modular Monolith)

You asked about **refactoring inside the old project first** before splitting the repositories. This is a valid, often safer approach, especially if the current codebase has high coupling (spaghetti code).

### The Concept
Instead of creating new repositories immediately, you reorganize the existing monolith into strict "Domains" (folders) that mimic the future repositories.

### Pros
1.  **IDE Power**: Refactoring tools (Rename, Move File, Find Usages) work perfectly across the entire codebase.
2.  **Type Safety**: TypeScript checks everything instantly. No need to publish `@core/types` packages yet.
3.  **Low Infra Overhead**: You don't need to set up 3 CI pipelines or Webpack Module Federation configs until the code is ready.

### Cons
1.  **Delayed Value**: You don't get independent deployments until the *very end*.
2.  **"Hidden Coupling" Risk**: It is very easy to accidentally import a file from `Core` into `WMS` that works in a monolith (because it's all one bundle) but will **crash** in Module Federation (e.g., importing a React Context that relies on a specific Provider being up the tree).

### Recommendation: The "Strict Boundary" Rule
If you choose this path, you **MUST** enforce boundaries using tooling, or you will fail when you try to split.

1.  **Create Structure**:
    ```text
    /src
      /Core  (Can only import libraries)
      /WMS   (Can import Core, but NOT ASRS)
      /ASRS  (Can import Core, but NOT WMS)
    ```
2.  **Enforce with ESLint**:
    Use `eslint-plugin-boundaries` or `dependency-cruiser` to fail the build if `WMS` imports `ASRS`.
    ```json
    // .eslintrc.json example
    "rules": {
      "import/no-restricted-paths": [
        "error",
        {
          "zones": [
            { "target": "./src/WMS", "from": "./src/ASRS" },
            { "target": "./src/Core", "from": "./src/WMS" } // Core shouldn't depend on features
          ]
        }
      ]
    }
    ```

### Verdict
*   **Choose "Refactor-First" if**: Your current codebase is highly coupled (spaghetti). Splitting it now would result in 1,000 build errors.
*   **Choose "Strangler Fig" (Repo Split) if**: Your codebase is already reasonably modular, and your main pain point is *deployment velocity*.
