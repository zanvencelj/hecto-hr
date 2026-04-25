# Architecture

This document describes the project structure, technology stack, design decisions, and how the build pipeline works.

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 22 (via mise) | JavaScript runtime |
| **Package Manager** | pnpm | 10+ (via mise) | Fast, efficient monorepo dependency management |
| **Monorepo Tool** | Nx | 22+ | Task orchestration and caching |
| **Backend Framework** | NestJS | 11 | Opinionated TypeScript framework for server apps |
| **TypeScript** | TypeScript | 6 | Type-safe JavaScript |
| **Bundler** | Webpack | 5 | Production app bundling |
| **Transpiler (Dev)** | SWC | 1.15+ | Fast TypeScript compilation during development |
| **Testing** | Jest | 29+ | Unit testing framework |
| **Linting** | ESLint | 10+ | Code quality and style checking |
| **Containerization** | Docker | latest | Cross-platform app deployment |
| **Orchestration** | Docker Compose | latest | Multi-container local development |
| **Tool Management** | mise | latest | Manages Node, pnpm, and other tools per-project |

## Project Structure

```
hectohr/
├── apps/
│   └── backend/                          # NestJS backend application
│       ├── src/
│       │   ├── main.ts                   # Bootstrap entry point
│       │   └── app/
│       │       ├── app.module.ts         # Root DI module
│       │       ├── app.controller.ts     # HTTP routes
│       │       ├── app.service.ts        # Business logic
│       │       ├── app.service.spec.ts   # Unit test
│       │       ├── health.controller.ts  # Health check endpoint
│       │       └── [other modules]/
│       ├── Dockerfile                    # Multi-stage production build
│       ├── .swcrc                        # SWC compiler config (dev only)
│       ├── eslint.config.mjs             # ESLint config with type-aware checks
│       ├── jest.config.ts                # Jest test runner config
│       ├── tsconfig.app.json             # App TypeScript config
│       ├── tsconfig.spec.json            # Test TypeScript config
│       └── package.json                  # Backend-specific dependencies
│
├── docs/                                 # Documentation (this folder)
│   ├── README.md                         # Main documentation index
│   ├── getting-started.md                # Setup and first run
│   ├── development.md                    # Daily workflows and patterns
│   ├── architecture.md                   # This file
│   ├── docker.md                         # Docker and deployment
│   ├── troubleshooting.md                # Common issues and fixes
│   └── commands.md                       # Complete task reference
│
├── .vscode/
│   ├── extensions.json                   # Recommended VS Code extensions
│   └── launch.json                       # VS Code debugger config (optional)
│
├── .env.example                          # Environment variable template
├── .env                                  # Environment variables (local, not in git)
├── .gitattributes                        # Line ending config (LF for cross-platform)
├── .gitignore                            # Git ignore patterns
├── .dockerignore                         # Docker build ignore patterns
├── .swcrc                                # (Deprecated; use apps/backend/.swcrc)
│
├── docker-compose.yml                    # Local development containers
├── eslint.config.mjs                     # Root ESLint config
├── jest.config.ts                        # Root Jest config (delegates to projects)
├── jest.preset.js                        # Jest preset for Nx
├── jest.setup.js                         # Jest global setup (optional)
│
├── mise.toml                             # Tool versions and development tasks
├── nx.json                               # Nx workspace config
├── opencode.json                         # (Project metadata, optional)
│
├── tsconfig.base.json                    # Base TypeScript config (shared by all projects)
├── tsconfig.json                         # Root TypeScript config (project references)
│
├── pnpm-workspace.yaml                   # pnpm monorepo setup
├── pnpm-lock.yaml                        # Dependency lock file (reproducible installs)
├── package.json                          # Root workspace dependencies
│
├── README.md                             # Project overview (optional)
├── CLAUDE.md                             # Development guidelines for this project
├── AGENTS.md                             # AI agent guidelines (optional)
│
└── node_modules/                         # Root dependencies (symlinks to .pnpm store)
    └── .pnpm/                            # pnpm flat store (all actual packages)
```

## Dependency Structure

### Root-Level Dependencies (Workspace-Wide)

These are shared tools and libraries available to all projects:

```json
{
  "devDependencies": {
    "typescript": "^6.0.3",
    "@nx/jest": "^22.6.5",
    "@nx/eslint": "^22.6.5",
    "@typescript-eslint/eslint-plugin": "^8.59.0",
    "@typescript-eslint/parser": "^8.59.0",
    "eslint": "^10.2.1",
    "jest": "^29.4.9",
    "ts-jest": "^29.4.9"
  }
}
```

### Backend Dependencies

Backend-specific dependencies are in `apps/backend/package.json`:

**Production** (included in Docker):
```json
{
  "@nestjs/common": "^11.0.0",
  "@nestjs/core": "^11.0.0",
  "@nestjs/config": "^4.0.0",
  "@nestjs/platform-express": "^11.0.0",
  "reflect-metadata": "^0.1.13",
  "rxjs": "^7.8.0"
}
```

**Development** (dev machines and CI, not in Docker runtime):
```json
{
  "@nestjs/testing": "^11.0.0",
  "@swc-node/register": "^1.11.1",
  "webpack-cli": "^5.0.0"
}
```

### pnpm Workspaces

All packages and apps are linked via `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

This allows:
- `apps/backend` to import shared code from `packages/*` (not yet created)
- Each package's dependencies to have different peer versions (isolating NestJS peer deps)

## Build Pipeline

### Development: Hot-Reload (`mise run dev`)

```
┌─────────────────────────────────────────┐
│ Terminal: Node.js with --watch flag     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Watch: Node detects file change         │
│ (e.g., app.service.ts modified)        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Transpile: @swc-node/register           │
│ (reads .swcrc → Rust transpiler)        │
│ Time: ~50–100ms                         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ CommonJS Module: Loaded into Node       │
│ (no bundling required)                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ DI Container: NestJS reloads module     │
│ (decorators already applied)            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Server Ready: Accept requests           │
│ Total time: 150–300ms                   │
└─────────────────────────────────────────┘
```

**Key Features**:
- ✅ SWC (Rust-based) ~10x faster than tsc
- ✅ No bundling step (direct execution)
- ✅ Decorators preserved via `.swcrc`
- ✅ Native Node `--watch` (no extra dependency)

### Production: Docker Build (`mise run build` / `docker build`)

```
┌──────────────────────────────────────┐
│ Stage 1: deps                        │
│ - Install all dependencies           │
│ - pnpm install --frozen-lockfile     │
│ Time: 1–2m (cached)                  │
└──────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────┐
│ Stage 2: builder                     │
│ - Copy deps from stage 1             │
│ - pnpm nx run backend:prune          │
│   (creates dist/ with pruned deps)   │
│ - Webpack build                      │
│ Time: 30–60s (with cache)            │
└──────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────┐
│ Stage 3: runner                      │
│ - Alpine base image (minimal)        │
│ - Copy only prod artifacts           │
│   (main.js, pruned node_modules)     │
│ - NODE_ENV=production                │
│ - CMD: node main.js                  │
│ Final image: ~150–200MB              │
└──────────────────────────────────────┘
```

**Multi-stage Benefits**:
- ✅ Minimal final image (build deps excluded)
- ✅ Fast rebuilds (deps stage cached)
- ✅ Secure (no source code in production)
- ✅ Cross-platform (Alpine + Linux containers)

## Nx Task Configuration

Key Nx targets are defined in `apps/backend/package.json`:

```json
{
  "nx": {
    "targets": {
      "serve": {
        "executor": "nx:run-commands",
        "options": {
          "command": "node --watch --require @swc-node/register ./src/main.ts",
          "cwd": "apps/backend",
          "env": {
            "NODE_ENV": "development",
            "SWCRC": "true"
          }
        }
      },
      "build": {
        "executor": "nx:run-commands",
        "options": {
          "command": "webpack-cli build",
          "args": ["--node-env=production"],
          "cwd": "apps/backend"
        }
      },
      "prune-lockfile": {
        "executor": "@nx/js:prune-lockfile",
        "dependsOn": ["build"],
        "options": {
          "buildTarget": "build"
        }
      },
      "test": {
        "executor": "@nx/jest:jest",
        "options": {
          "jestConfig": "apps/backend/jest.config.ts",
          "watch": false
        }
      }
    }
  }
}
```

## TypeScript Configuration Hierarchy

```
tsconfig.base.json (shared compiler options)
│
├── tsconfig.json (project references)
│
└── apps/backend/
    ├── tsconfig.app.json (app compilation)
    └── tsconfig.spec.json (test compilation)
```

### tsconfig.base.json
Shared settings for all projects:
- `strict: true` — Enforce strict mode
- `target: es2022` — Modern JavaScript output
- `module: nodenext` — Node.js module resolution
- `noUnusedLocals: true` — Catch dead code

### apps/backend/tsconfig.app.json
Application runtime:
- `module: commonjs` — CJS for Node.js
- `emitDecoratorMetadata: true` — NestJS requires this

### apps/backend/tsconfig.spec.json
Test compilation:
- `module: commonjs` — Jest runs in Node (CJS)
- `rootDir: "."` — TypeScript 6 requirement
- `ignoreDeprecations: "6.0"` — Suppress node10 deprecation warning

## ESLint Configuration

### Root (`eslint.config.mjs`)
Base rules for all projects:
- No `project: true` (avoids finding incorrect tsconfig)
- Recommends TypeScript parser
- Prettier integration

### Backend (`apps/backend/eslint.config.mjs`)
Type-aware rules for the backend:
- `project: ['./tsconfig.app.json', './tsconfig.spec.json']` — Explicit tsconfig
- Includes `recommended-type-checked` rules
- Forbids floating promises (`@typescript-eslint/no-floating-promises`)

## Design Decisions

### Why pnpm?
- **Faster**: Linked packages, no duplication
- **Safer**: Prevents hidden dependencies (flat node_modules lie)
- **Monorepo-friendly**: Built-in workspace support
- **Cross-platform**: Works on Windows, macOS, Linux

### Why Nx?
- **Task caching**: Rebuild only changed projects
- **Dependency graph**: Auto-run dependent tasks
- **Scalability**: Foundation for 10+ projects
- **CLI**: Consistent interface across projects

### Why SWC (dev) + Webpack (prod)?
- **Dev**: SWC is 10x faster for quick feedback during development
- **Prod**: Webpack handles tree-shaking, code splitting, and optimization for minimal final bundle
- **Consistency**: Both compile TypeScript to JavaScript correctly

### Why NestJS?
- **Opinionated**: Clear project structure (modules, controllers, services)
- **Batteries included**: DI, validation, auth, guards, interceptors
- **TypeScript-first**: Decorators and types throughout
- **Scalable**: Supports monorepo growth

### Why Docker?
- **Reproducibility**: Same environment dev, test, production
- **Portability**: Works on any machine with Docker
- **Isolation**: Dependencies don't interfere with host system
- **CI/CD**: Docker images deploy to any cloud

### Why mise?
- **Zero global deps**: All tools per-project (reproducible across machines)
- **Easy switching**: Simple version management
- **Cross-platform**: Windows, macOS, Linux
- **Optional**: Users can install tools manually if preferred

## Performance Characteristics

### Dev Startup Time
- **First run**: ~5–10s (pnpm install + deps)
- **Subsequent starts**: ~2–3s (modules cached)
- **File change reload**: ~200–300ms (SWC + NestJS DI)

### Production Build
- **Full build** (clean): ~3–5min (webpack + Docker)
- **Incremental** (with cache): ~30–60s (Docker layer cache)

### Test Suite
- **First run**: ~10–15s (Jest setup + compile)
- **Subsequent runs** (watch): ~1–3s per test file
- **Full suite**: ~5–10s

### Docker Image
- **Size**: ~150–200MB (Alpine + Node 22 + pruned deps)
- **Build time**: ~1–2min (first), ~30–60s (cached)

## Security Considerations

### Dependency Management
- ✅ Lock file (`pnpm-lock.yaml`) ensures reproducible installs
- ✅ No scripts execute during `pnpm install` (only via `onlyBuiltDependencies`)
- ✅ Peer dependencies isolated per project (pnpm workspaces)

### Docker
- ✅ Alpine base image (minimal surface area)
- ✅ Multi-stage build (no source code in runtime image)
- ✅ Non-root user recommended (optional, not configured)
- ✅ Healthcheck monitors service availability

### TypeScript
- ✅ Strict mode enabled globally
- ✅ No implicit `any` types
- ✅ Unused variables flagged
- ✅ `@typescript-eslint/no-floating-promises` prevents unhandled rejections

## Scalability Path

As the project grows, the foundation supports:

1. **Multiple apps**: Add `apps/frontend`, `apps/admin` (Nx handles orchestration)
2. **Shared libraries**: Create `packages/common`, `packages/api-client`
3. **Monorepo caching**: Nx caches build outputs (skip unchanged projects)
4. **Testing strategies**: Nx affected testing (only test changed + dependents)
5. **Deployment**: Docker Compose → Kubernetes (same containers)

Example future structure:
```
apps/
  ├── backend/          # NestJS API
  ├── frontend/         # React/Vue SPA
  ├── admin-panel/      # Admin dashboard
  └── mobile/           # Expo/React Native
packages/
  ├── api-client/       # Shared HTTP client
  ├── types/            # Shared TypeScript types
  ├── ui/               # Shared UI components
  └── config/           # Shared configuration
```

## Troubleshooting Architecture Issues

**Q: Why does TypeScript complain about missing modules?**
A: Ensure `tsconfig.base.json` has correct `baseUrl` and `paths`. Run `pnpm nx sync` to update TypeScript project references.

**Q: Can I use the Docker image without Compose?**
A: Yes. Build with `docker build -f apps/backend/Dockerfile -t hectohr-backend:prod .`, then run with `docker run -p 3000:3000 hectohr-backend:prod`.

**Q: How do I add a database (PostgreSQL)?**
A: Update `docker-compose.yml` to add a `postgres` service, then add a driver library (e.g., `@nestjs/typeorm` + `pg`) to `apps/backend/package.json`.

## Next Steps

- **Development**: Read [Development Guide](./development.md) for daily workflows
- **Docker & Deployment**: Read [Docker & Deployment](./docker.md) for deployment
- **Commands**: See [Commands Reference](./commands.md) for task reference
