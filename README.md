# Ionic Capacitor Project Structure: Module Federation vs NPM Package

This repository demonstrates two approaches for structuring an Ionic Capacitor project with multiple modules (Core, WMS, ASRS).

## Structure

```
./
  /module_federation
      /Core (Host App + Capacitor)
      /WMS (Remote App)
      /ASRS (Remote App)
  /npm_package
     /Core (Host App + Capacitor)
     /WMS (Library Package)
     /ASRS (Library Package)
```

## Application Flow

Both approaches now share a consistent navigation flow and user experience:

1.  **Login Page (`/login`)**: Entry point. Enter any username to proceed.
2.  **Dashboard (`/app/home`)**: Main landing page with quick links.
3.  **Side Menu**: Accessible via the hamburger icon, providing navigation to:
    *   Home
    *   Profile
    *   WMS Module
    *   ASRS Module
4.  **Profile Page (`/app/profile`)**: Displays user info and Logout button.

## 1. Module Federation Approach

In this approach, `Core` is the host application that dynamically loads `WMS` and `ASRS` at runtime. This allows for independent deployment and updates of the modules.

### Setup & Run

1.  **Install Dependencies:**
    Navigate to each folder (`Core`, `WMS`, `ASRS`) and run `npm install`.

2.  **Run WMS (Remote):**
    ```bash
    cd module_federation/WMS
    npm run dev
    # Runs on http://localhost:5001
    ```

3.  **Run ASRS (Remote):**
    ```bash
    cd module_federation/ASRS
    npm run dev
    # Runs on http://localhost:5002
    ```

4.  **Run Core (Host):**
    ```bash
    cd module_federation/Core
    npm run dev
    # Runs on http://localhost:5000 (or similar, check console)
    ```

    *Note: Ensure WMS and ASRS are running before accessing them from Core.*

### Deployment Strategy

*   **Core:** Deployed to the device (via Capacitor) or Edge Server. Points to remote URLs for WMS and ASRS.
*   **WMS/ASRS:** Deployed to an Edge Server.
*   **Updates:** You can update WMS or ASRS on the server without redeploying the Core app on the device (unless shared dependencies change significantly).

## 2. NPM Package Approach

In this approach, `WMS` and `ASRS` are built as libraries (NPM packages) and installed into `Core` at build time.

### Setup & Run

1.  **Build WMS Library:**
    ```bash
    cd npm_package/WMS
    npm install
    npm run build
    ```

2.  **Build ASRS Library:**
    ```bash
    cd npm_package/ASRS
    npm install
    npm run build
    ```

3.  **Run Core:**
    ```bash
    cd npm_package/Core
    npm install
    npm run dev
    ```

    *Note: The `package.json` in Core uses `file:../WMS` and `file:../ASRS` to link the local packages.*

### Deployment Strategy

*   **Monolithic Build:** `Core` bundles `WMS` and `ASRS` code into a single application.
*   **Updates:** To update WMS or ASRS, you must rebuild and redeploy the entire Core application.

## Key Differences

| Feature | Module Federation | NPM Package |
| :--- | :--- | :--- |
| **Integration** | Runtime (Dynamic) | Build-time (Static) |
| **Deployment** | Independent modules | Monolithic bundle |
| **Updates** | Instant (for remotes) | Requires app update |
| **Complexity** | Higher (config, sharing) | Lower (standard import) |
| **Native Access** | Via exposed Core components | Via props/context from Core |