# Hectohr Documentation

Welcome to Hectohr, a monorepo project built with Nx, featuring a NestJS backend with modern TypeScript tooling, Docker support, and optimized hot-reload development.

## Quick Start

### Prerequisites
- **Operating System**: macOS, Linux, or Windows
- **No global dependencies required** — all tools are managed by `mise` at the project level

### First-Time Setup

```bash
# Install mise (if not already installed)
# macOS/Linux: curl https://mise.jdx.dev/install.sh | sh
# Windows: choco install mise (or https://mise.jdx.dev/)

# Navigate to project directory
cd hectohr

# Activate mise (it manages Node.js, pnpm, and other tools)
# mise will auto-activate in the project directory
eval "$(mise activate zsh)"  # or eval "$(mise activate bash)"

# Verify tools are ready
mise ls  # shows installed tools

# Install dependencies
pnpm install

# Start development
mise run dev       # or: pnpm nx serve backend
```

### Common Tasks

| Task | Command | Purpose |
|------|---------|---------|
| **Start backend** | `mise run dev` | Run backend with hot-reload (file changes auto-restart) |
| **Run all tests** | `mise run test` | Unit tests with Jest |
| **Run backend tests** | `mise run test-backend` | Backend tests in watch mode |
| **Lint code** | `mise run lint` | Run ESLint on all projects |
| **Type-check** | `mise run typecheck` | TypeScript type checking |
| **Full quality check** | `mise run check` | lint + typecheck + test all |
| **Build all** | `mise run build` | Webpack build (backend) |
| **Start containers** | `mise run up` | Docker Compose up (daemon mode) |
| **Stop containers** | `mise run down` | Docker Compose down |

## Documentation Structure

- **[Getting Started](./getting-started.md)** — Detailed setup, first run, and verification
- **[Development Guide](./development.md)** — Daily workflow, hot-reload, debugging
- **[Architecture](./architecture.md)** — Project structure, tech stack, design decisions
- **[Docker & Deployment](./docker.md)** — Docker Compose, multi-stage builds, healthchecks
- **[Troubleshooting](./troubleshooting.md)** — Common issues and solutions
- **[Commands Reference](./commands.md)** — Complete task list and flags

## Key Features

✅ **Cross-Platform** — Works identically on macOS, Linux, Windows  
✅ **Zero Global Dependencies** — mise manages all tools (Node, pnpm)  
✅ **Fast Hot-Reload** — ~150–300ms restarts with `@swc-node/register`  
✅ **Monorepo Ready** — Nx + pnpm workspaces for scalability  
✅ **Type-Safe** — TypeScript 6 with strict mode, decorator support  
✅ **Docker-First** — Multi-stage builds, healthchecks, platform-aware  
✅ **ESLint & Jest** — Pre-configured linting and testing  

## Project Overview

```
hectohr/
├── apps/
│   └── backend/              # NestJS backend app
│       ├── src/              # TypeScript source
│       ├── Dockerfile        # Multi-stage production build
│       └── .swcrc            # SWC config (decorators, CommonJS)
├── docs/                     # This documentation
├── docker-compose.yml        # Local dev containers
├── mise.toml                 # Tool versions & tasks
├── eslint.config.mjs         # Lint configuration
├── jest.config.ts            # Test framework config
├── tsconfig.base.json        # Base TypeScript config
└── pnpm-workspace.yaml       # pnpm monorepo setup
```

## Support

For detailed guides, see the documentation files listed above. For issues specific to this project, check [Troubleshooting](./troubleshooting.md).
