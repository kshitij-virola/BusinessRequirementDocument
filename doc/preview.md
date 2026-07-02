If you want users to generate projects in **multiple technologies** (React, Vue, Angular, HTML/CSS, WordPress), then the preview system should be **framework-agnostic**. The preview engine shouldn't care what framework is being used—it should only know **how to start it**.

---

# Architecture

```text
                AI Generated Project
                        │
                        ▼
                Detect Project Type
                        │
        ┌───────────────┼────────────────┐
        │               │                │
      React           Vue            Angular
        │               │                │
        └───────────────┼────────────────┘
                        │
                   HTML/CSS
                        │
                   WordPress
                        │
                        ▼
              Start Appropriate Server
                        │
                        ▼
                 Preview URL
                        │
                        ▼
               Display in iframe
```

---

# Phase 1: Detect Project Type

## Goal

Determine which framework the AI generated.

### Detection Rules

| Framework    | Detection                                     |
| ------------ | --------------------------------------------- |
| React (Vite) | `vite.config.*` + `react` dependency          |
| React (CRA)  | `react-scripts` dependency                    |
| Next.js      | `next` dependency                             |
| Vue          | `vue` dependency                              |
| Angular      | `angular.json`                                |
| HTML/CSS     | `index.html` only                             |
| WordPress    | `wp-config.php` or WordPress folder structure |

---

# Phase 2: Framework Configuration

Create a configuration object.

```ts
const FRAMEWORKS = {
  react: {
    install: "npm install",
    start: "npm run dev",
    defaultPort: 5173,
  },
  vue: {
    install: "npm install",
    start: "npm run dev",
    defaultPort: 5173,
  },
  angular: {
    install: "npm install",
    start: "npm start",
    defaultPort: 4200,
  },
  html: {
    install: "",
    start: "npx serve .",
    defaultPort: 3000,
  },
  wordpress: {
    start: "docker compose up",
    defaultPort: 8080,
  },
};
```

---

# Phase 3: Start Based on Framework

```text
Detect Framework
        │
        ▼
Read Configuration
        │
        ▼
Install Dependencies
        │
        ▼
Run Start Command
        │
        ▼
Capture Port
```

---

# Phase 4: React Preview

### Commands

```bash
npm install
npm run dev
```

Preview

```text
http://localhost:5173
```

---

# Phase 5: Vue Preview

### Commands

```bash
npm install
npm run dev
```

Preview

```text
http://localhost:5173
```

---

# Phase 6: Angular Preview

### Commands

```bash
npm install
npm start
```

or

```bash
ng serve
```

Preview

```text
http://localhost:4200
```

---

# Phase 7: HTML/CSS Preview

Since there's no build process:

Run a lightweight static server.

```bash
npx serve .
```

or

```bash
python -m http.server
```

Preview

```text
http://localhost:3000
```

---

# Phase 8: WordPress Preview

WordPress requires PHP and MySQL, so use Docker.

Example services:

* PHP + Apache
* MySQL
* phpMyAdmin (optional)

Flow:

```text
Generated WordPress Project
            │
            ▼
docker compose up
            │
            ▼
http://localhost:8080
```

---

# Phase 9: Create a Preview Manager

Instead of separate logic for each framework, create a single service:

```text
PreviewManager
├── detectFramework()
├── installDependencies()
├── startServer()
├── stopServer()
├── restartServer()
├── getPreviewUrl()
└── getLogs()
```

This keeps the rest of your application independent of the framework.

---

# Phase 10: Preview API

```text
POST /api/preview/start
```

Request

```json
{
  "projectId": "123"
}
```

Response

```json
{
  "framework": "react",
  "status": "running",
  "previewUrl": "/api/preview/123"
}
```

---

# Phase 11: Show Preview

Use the same component for every framework:

```tsx
<iframe
  src={previewUrl}
  className="w-full h-full"
/>
```

The iframe doesn't need to know whether it's rendering React, Vue, Angular, HTML, or WordPress.

---

# Recommended Project Structure

```text
lib/
└── preview/
    ├── PreviewManager.ts
    ├── FrameworkDetector.ts
    ├── ProcessManager.ts
    ├── ProxyServer.ts
    ├── DockerManager.ts
    └── FrameworkConfigs.ts
```

---

# Framework Support Matrix

| Framework    | Install | Start                    | Live Reload | Recommended Runtime  |
| ------------ | ------- | ------------------------ | ----------- | -------------------- |
| React (Vite) | ✅       | `npm run dev`            | ✅           | Node.js              |
| Vue          | ✅       | `npm run dev`            | ✅           | Node.js              |
| Angular      | ✅       | `npm start` / `ng serve` | ✅           | Node.js              |
| HTML/CSS     | ❌       | `npx serve .`            | Optional    | Static server        |
| WordPress    | Depends | `docker compose up`      | Limited     | Docker (PHP + MySQL) |

## Notes

* **React, Vue, and Angular** can all use the same Node.js-based preview infrastructure.
* **HTML/CSS** only needs a static file server.
* **WordPress** should be isolated in Docker because it requires PHP and a database.

This approach gives you a single preview workflow while allowing different startup strategies depending on the generated project type.
