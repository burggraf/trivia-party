# Tauri Integration Plan for SvelteKit Project

## Objective

Integrate Tauri to enable local MacOS ARM desktop builds using the default `/src-tauri` directory, while preserving the existing static web build and deployment workflow.

---

## Step-by-Step Plan

### 1. Initialize Tauri

- Run:
  ```bash
  npx tauri init
  ```
- Choose the default `/src-tauri` directory.
- When prompted, set the frontend directory to your SvelteKit static build output (e.g., `build`).

### 2. Configure Tauri

- In `/src-tauri/tauri.conf.json`, set:
  ```json
  {
    "build": {
      "distDir": "../build",
      "devPath": "http://localhost:5173"
    }
  }
  ```
- Ensure SvelteKit outputs static files to `build/` (adjust if your output dir differs).

### 3. Update Scripts

- In `package.json`, add:
  ```json
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
  ```
- Keep existing static web build scripts unchanged.

### 4. Build & Run

- For static web:
  ```bash
  npm run build
  ```
- For desktop (MacOS ARM):
  ```bash
  npm run build && npm run tauri:build
  ```
- For desktop dev mode:
  ```bash
  npm run tauri:dev
  ```

### 5. Preserve Static Web Deployment

- Existing deployment scripts (e.g., Cloudflare) remain unchanged.
- Tauri integration does not affect static web output.

### 6. Prepare for Multiplatform Builds

- Tauri config supports Mac/Win/Linux/iOS/Android.
- Future: Add GitHub Actions workflows for automated builds.

---

## Mermaid Diagram

```mermaid
flowchart TD
    A[SvelteKit Project] -->|npm run build| B[Static Web Output (build/)]
    B -->|Deploy| C[Static Hosting (Cloudflare, etc.)]
    A -->|Tauri Init| D[/src-tauri/]
    B -->|Tauri Config| E[Tauri Desktop App]
    D --> E
    E -->|Build| F[MacOS ARM .app]
```

---

## Notes

- No server-side code is introduced.
- All Tauri files are isolated in `/src-tauri`.
- Static web and desktop builds are independent.
- Future multiplatform automation will extend this setup.

---

**Please review this plan. If you approve, I will switch to code mode for implementation instructions and scripts.**
