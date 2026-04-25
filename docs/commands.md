# Commands Reference

Complete list of all available tasks and commands.

## Quick Reference

| Task | Command | Purpose |
|------|---------|---------|
| Start backend (dev) | `mise run dev` | Run with hot-reload (file changes auto-restart) |
| Run tests | `mise run test` | All unit tests (all projects) |
| Backend tests (watch) | `mise run test-backend` | Backend tests in watch mode |
| Lint code | `mise run lint` | Run ESLint on all projects |
| Type-check | `mise run typecheck` | TypeScript type checking |
| Full check | `mise run check` | lint + typecheck + test (all) |
| Build all | `mise run build` | Webpack build for backend |
| Docker up | `mise run up` | Start Docker Compose containers |
| Docker down | `mise run down` | Stop Docker Compose containers |

## Detailed Commands

### Development

#### `mise run dev` — Start Backend with Hot-Reload

```bash
mise run dev
```

**Equivalent to**:
```bash
pnpm nx serve backend
```

**What it does**:
- Starts Node.js with `--watch` flag
- Uses `@swc-node/register` for fast transpilation
- Automatically restarts on file changes
- Typical restart time: 150–300ms

**Environment**:
- `NODE_ENV=development`
- `SWCRC=true` (enables SWC decorator support)

**Output**:
```
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [NestFactory] Starting Nest application...
[Nest] 12345  - 04/24/2026, 8:00:00 PM    LOG   [NestApplication] Nest application successfully started
```

**Stop**: Press Ctrl+C

**Options**:
```bash
# Use a different port
PORT=3001 mise run dev

# Run without hot-reload (traditional node execution)
# (Not directly supported; edit mise.toml to change)
```

### Testing

#### `mise run test` — Run All Tests

```bash
mise run test
```

**Equivalent to**:
```bash
pnpm nx run-many -t test
```

**Runs**:
- Backend tests via Jest
- Any other project tests

**Output**:
```
> nx run backend:test
PASS  apps/backend/src/app/app.service.spec.ts
  AppService
    ✓ should return hello message (42ms)

Test Suites: 1 passed, 1 total
...
```

#### `mise run test-backend` — Backend Tests in Watch Mode

```bash
mise run test-backend
```

**Equivalent to**:
```bash
pnpm nx test backend --watch
```

**What it does**:
- Runs Jest in watch mode
- Re-runs tests when files change
- Type-checks before each run
- Exits with status code on failures

**Output**:
```
PASS  apps/backend/src/app/app.service.spec.ts
Tests:       1 passed, 1 total

Watch mode active. Press 'q' to quit, 'Enter' to re-run all tests.
```

**Options**:
```bash
# Run a single test file
pnpm nx test backend -- --testPathPattern=app.service

# Run with coverage
pnpm nx test backend -- --coverage

# Run without watch (one-time run)
pnpm nx test backend

# Run only changed tests since last commit
pnpm nx test backend -- --onlyChanged

# Run specific test by name
pnpm nx test backend -- -t "should return"
```

**Stop**: Press `q` to quit

### Code Quality

#### `mise run lint` — Lint All Code

```bash
mise run lint
```

**Equivalent to**:
```bash
pnpm nx run-many -t lint
```

**What it does**:
- Runs ESLint on all projects
- Checks code style, patterns, and potential bugs
- Reports warnings and errors

**Output**:
```
> nx run backend:lint
backend/src/app/app.module.ts
  5:1  error  Unused variable  @typescript-eslint/no-unused-vars

1 error in apps/backend
```

**Auto-fix issues**:
```bash
pnpm nx lint backend -- --fix
```

**Options**:
```bash
# Lint only specific project
pnpm nx lint backend

# Format with Prettier (if available)
pnpm exec prettier --write "apps/backend/src/**/*.ts"
```

#### `mise run typecheck` — Type-Check All Projects

```bash
mise run typecheck
```

**Equivalent to**:
```bash
pnpm nx run-many -t typecheck
```

**What it does**:
- Runs TypeScript type-checker
- Ensures strict type safety
- Reports type errors without compilation

**Output**:
```
> nx run backend:typecheck

error TS2339: Property 'nonexistent' does not exist on type 'AppService'.

Found 1 error in 2.34s.
```

**Options**:
```bash
# Type-check specific project
pnpm nx typecheck backend

# Check only changed projects
pnpm nx affected -t typecheck
```

#### `mise run check` — Full Quality Check

```bash
mise run check
```

**Equivalent to**:
```bash
pnpm nx run-many -t lint typecheck test
```

**What it does**:
1. Lints all code (ESLint)
2. Type-checks all code (TypeScript)
3. Runs all tests (Jest)

**Use before**:
- Committing code
- Creating pull requests
- Pushing to main branch

**Output**:
```
> nx run backend:lint
> nx run backend:typecheck
> nx run backend:test
... (all output combined)
```

### Building

#### `mise run build` — Build All Projects

```bash
mise run build
```

**Equivalent to**:
```bash
pnpm nx run-many -t build
```

**What it does**:
- Builds backend with Webpack
- Outputs to `apps/backend/dist/`
- Optimizes for production

**Output**:
```
> nx run backend:build
asset main.js 250 KiB [compared for emit] (name: main)
webpack 5.80.0 compiled successfully
```

**Options**:
```bash
# Build specific project
pnpm nx run backend:build

# Build with source maps (for debugging)
pnpm nx run backend:build -- --mode development

# Build and show stats
pnpm nx run backend:build -- --analyze
```

### Docker

#### `mise run up` — Start Docker Containers

```bash
mise run up
```

**Equivalent to**:
```bash
docker compose up --build -d
```

**What it does**:
1. Builds Docker image (if not cached)
2. Starts backend container
3. Exposes port 3000
4. Enables healthcheck

**Access**:
```bash
curl http://localhost:3000/api
```

**Options**:
```bash
# Without detach (see logs in terminal)
docker compose up --build

# Use custom port
BACKEND_PORT=3001 docker compose up

# Force rebuild (don't use cache)
docker compose up --build --force-recreate
```

#### `mise run down` — Stop Docker Containers

```bash
mise run down
```

**Equivalent to**:
```bash
docker compose down
```

**What it does**:
- Stops all containers
- Removes container instances (images kept)

**Options**:
```bash
# Remove images too (more cleanup)
docker compose down --rmi all

# Remove volumes (data cleanup)
docker compose down -v
```

### Advanced Nx Commands

#### Run Multiple Targets

```bash
# Run lint and build (in parallel where possible)
pnpm nx run-many -t lint build

# Run affected targets (only changed projects + dependents)
pnpm nx affected -t test
```

#### Build & Prune for Production

```bash
# Used internally by Docker builder
pnpm nx run backend:prune-lockfile
pnpm nx run backend:copy-workspace-modules
pnpm nx run backend:prune
```

#### Rebuild Everything (No Cache)

```bash
# Clear Nx cache
pnpm nx reset

# Force rebuild
pnpm nx run backend:build -- --force
```

### Manual pnpm Commands

#### Install Dependencies

```bash
# Install all dependencies
pnpm install

# Install with specific version
pnpm add package@1.0.0

# Add to backend only
pnpm add @nestjs/typeorm -w backend

# Remove package
pnpm remove package
```

#### Update Dependencies

```bash
# Check for outdated packages
pnpm outdated

# Update all packages
pnpm update

# Update specific package
pnpm update typescript@latest
```

#### Work with Workspace

```bash
# List workspace packages
pnpm ls --depth 0

# Add shared library
pnpm add packages/common -w backend

# Rebuild workspace
pnpm install --force
```

### Manual Node/npm Commands

#### TypeScript Compilation (not used normally)

```bash
# Direct tsc (for inspection)
pnpm exec tsc --version

# Type-check without emitting
pnpm exec tsc --noEmit
```

#### ESLint (direct)

```bash
# Run ESLint directly
pnpm exec eslint apps/backend/src --fix

# Lint specific file
pnpm exec eslint apps/backend/src/main.ts
```

#### Jest (direct)

```bash
# Run tests directly
pnpm exec jest

# Run specific test file
pnpm exec jest apps/backend/src/app/app.service.spec.ts

# Coverage report
pnpm exec jest --coverage
```

### Git Commands (for development)

```bash
# Check status
git status

# Add files
git add apps/backend/src/

# Commit changes
git commit -m "feat: add new endpoint"

# Push to remote
git push origin feature-branch

# Pull latest
git pull origin main
```

### Docker Commands (direct)

```bash
# Build image
docker build -f apps/backend/Dockerfile -t hectohr:latest .

# Run container
docker run -it -p 3000:3000 hectohr:latest

# View logs
docker logs hectohr-backend-1

# Stop container
docker stop hectohr-backend-1

# Remove container
docker rm hectohr-backend-1

# Push to registry
docker push my-registry.com/hectohr:latest
```

## Usage Examples

### Daily Development Workflow

```bash
# 1. Start backend with hot-reload
mise run dev

# 2. In another terminal, run backend tests in watch mode
mise run test-backend

# 3. In another terminal, start Docker containers (optional)
mise run up

# 4. Edit files and watch hot-reload + test results
# (changes appear within ~200ms)

# 5. Before committing
mise run check

# 6. If all pass, commit and push
git add .
git commit -m "feat: new feature"
git push origin feature-branch
```

### Debugging a Failing Test

```bash
# 1. Run specific test
pnpm nx test backend -- --testPathPattern=app.service

# 2. Add console.log() to code, save
# 3. Watch logs in test output
# 4. Fix code
# 5. Test reruns automatically (watch mode)
```

### Building for Production

```bash
# 1. Run full quality check
mise run check

# 2. Build locally
mise run build

# 3. Verify output
ls -la apps/backend/dist/

# 4. Start Docker for final test
mise run up

# 5. Test
curl http://localhost:3000/api

# 6. Stop Docker
mise run down

# 7. Deploy
docker push my-registry.com/hectohr:latest
```

### Fixing Code Style

```bash
# 1. See what's wrong
mise run lint

# 2. Auto-fix
pnpm nx lint backend -- --fix

# 3. Verify
mise run lint
```

## Command Flags & Options

### Nx Flags (prefix with `-` or `--`)

```bash
# Verbose logging
pnpm nx serve backend --verbose

# Output configuration (don't run)
pnpm nx run backend:serve --dry-run

# Skip cache
pnpm nx run backend:build --skip-nx-cache

# Output to JSON
pnpm nx run backend:build --output-style=json
```

### Jest Flags

```bash
# Watch mode
pnpm nx test backend --watch

# Coverage
pnpm nx test backend --coverage

# Update snapshots
pnpm nx test backend -u

# Show test names
pnpm nx test backend --verbose

# Run only changed
pnpm nx test backend --onlyChanged

# Debug mode
node --inspect-brk $(npm_bin)/jest
```

### ESLint Flags

```bash
# Fix auto-fixable issues
pnpm nx lint backend -- --fix

# Strict mode (no warnings, only errors)
pnpm nx lint backend -- --max-warnings=0

# Report unused files
pnpm nx lint backend -- --report-unused-disable-directives
```

### TypeScript Flags

```bash
# Force rebuild
pnpm nx typecheck backend -- --force

# Emit types (for library publishing)
pnpm nx typecheck backend -- --emitDeclarationOnly
```

## Environment Variables

### Common Variables

```bash
# Node environment
NODE_ENV=development   # or: production

# Port configuration
PORT=3000
BACKEND_PORT=3000

# SWC configuration
SWCRC=true            # Enable .swcrc file (dev only)

# Docker Compose
DOCKER_BUILDKIT=1     # Enable Docker BuildKit (faster builds)

# Nx
NX_VERBOSE_LOGGING=true
NX_SKIP_NX_CACHE=false
```

### Set Variables for a Command

```bash
# Single command
PORT=3001 pnpm nx serve backend

# For entire session
export NODE_ENV=production
pnpm nx run backend:build
```

## Getting Help

```bash
# Nx help
pnpm nx --help

# Specific command help
pnpm nx serve --help

# List available targets
pnpm nx show project backend

# Show dependencies
pnpm nx graph

# Interactive CLI
pnpm nx
```

## Performance Tips

### Parallel Execution

Nx automatically runs independent tasks in parallel:

```bash
# Runs lint, typecheck, and test in parallel (if possible)
pnpm nx run-many -t lint typecheck test
```

### Caching

Nx caches build outputs. To see what's cached:

```bash
# List cache contents
pnpm nx show cache

# Clear cache
pnpm nx reset
```

### Skip Cache

```bash
# Force rebuild without cache
pnpm nx run backend:build --skip-nx-cache
```

## Troubleshooting Commands

```bash
# Check Node version
node --version

# Check pnpm version
pnpm --version

# Check installed packages
pnpm ls

# Verify lockfile integrity
pnpm install --frozen-lockfile

# Clear all caches
pnpm store prune
pnpm nx reset

# Reinstall everything
rm -rf node_modules apps/*/node_modules pnpm-lock.yaml
pnpm install
```

## Next Steps

- **Getting Started**: Read [Getting Started](./getting-started.md) for initial setup
- **Development**: Read [Development Guide](./development.md) for daily workflows
- **Troubleshooting**: See [Troubleshooting](./troubleshooting.md) for common issues
