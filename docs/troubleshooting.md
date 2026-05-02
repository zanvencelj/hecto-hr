# Troubleshooting

Common issues and their solutions.

## Getting Started Issues

### mise command not found

**Problem**: `mise: command not found`

**Solution**:
1. Install mise: `curl https://mise.jdx.dev/install.sh | sh`
2. Activate in your shell:
   ```bash
   eval "$(mise activate zsh)"  # or bash, fish, etc.
   ```
3. Add to your rc file (`.zshrc`, `.bashrc`, etc.) for auto-activation

### pnpm not found (but mise install was run)

**Problem**: 
```bash
$ pnpm install
pnpm: command not found
```

**Solution**:
Ensure mise shims are in your PATH:
```bash
export PATH="/home/zan/.local/share/mise/shims:$PATH"
pnpm --version
```

Add this to your shell rc file for permanent activation.

### Node version mismatch

**Problem**: 
```bash
$ node --version
v18.0.0
```

But `mise.toml` specifies Node 22.

**Solution**:
1. Activate mise: `eval "$(mise activate zsh)"`
2. Verify: `mise ls`
3. Force update: `mise install node@22`

### pnpm install hangs or fails

**Problem**: 
```bash
$ pnpm install
# Hangs or asks for interactive approval
```

**Solution 1** (if it hangs):
- Press Ctrl+C to stop
- Run: `pnpm install --no-frozen-lockfile` (installs latest compatible versions)

**Solution 2** (if asks for interactive approval):
- Type `a` to approve all scripts
- Or use `--ignore-scripts` (but this may break native dependencies)
- The project uses `pnpm.onlyBuiltDependencies` in `package.json`, so only safe build scripts run

## Development Issues

### Port 3000 already in use

**Problem**: 
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution**:
```bash
# Option 1: Kill the process using port 3000
lsof -ti:3000 | xargs kill -9     # macOS/Linux
netstat -ano | findstr :3000      # Windows (then taskkill /PID <pid> /F)

# Option 2: Use a different port
PORT=3001 pnpm nx serve backend
```

### Backend won't start (SyntaxError)

**Problem**: 
```
SyntaxError: Unexpected token
```

**Solution**:
1. Check for decorator syntax errors:
   ```bash
   pnpm nx typecheck backend
   ```
2. Verify `.swcrc` file exists and is valid JSON:
   ```bash
   cat apps/backend/.swcrc
   ```
3. Clear and reinstall:
   ```bash
   rm -rf apps/backend/node_modules node_modules
   pnpm install
   ```

### TypeScript errors in IDE but tests pass

**Problem**: IDE shows red squiggles but tests pass

**Solution**:
- **VS Code**: Restart TypeScript language server
  - Ctrl+Shift+P → "TypeScript: Restart TS Server"
- **WebStorm/IntelliJ**: Restart IDE or File → Invalidate Caches

### Module not found errors

**Problem**: 
```
Cannot find module '@nestjs/common'
```

**Solution**:
1. Verify installation:
   ```bash
   pnpm ls @nestjs/common
   ```
2. If missing, reinstall:
   ```bash
   pnpm install
   ```
3. If still broken, clear cache:
   ```bash
   rm -rf node_modules apps/*/node_modules pnpm-lock.yaml
   pnpm install
   ```

### Hot-reload not working

**Problem**: File changes don't trigger restart

**Solution**:
1. Verify Node.js `--watch` is supported (v22+):
   ```bash
   node --version  # Should be v22+
   ```
2. Check `.swcrc` file:
   ```bash
   cat apps/backend/.swcrc
   ```
3. Restart dev server:
   ```bash
   Ctrl+C
   pnpm nx serve backend
   ```

### @swcrc environment variable not set

**Problem**: 
```
Expression expected
(at @Module decorator line)
```

**Solution**:
This happens when `SWCRC=true` is not set. The `serve` target sets it automatically, so check:
```bash
# Should show: SWCRC: 'true'
cat apps/backend/package.json | grep -A 10 '"serve"'
```

## Testing Issues

### Jest tests fail with syntax errors

**Problem**: 
```
SyntaxError: Unexpected token (for decorators)
```

**Solution**:
1. Verify `jest.config.ts` uses `@nx/jest`:
   ```bash
   grep -A 5 "jest" apps/backend/jest.config.ts
   ```
2. Ensure `tsconfig.spec.json` has decorator support:
   ```bash
   cat apps/backend/tsconfig.spec.json | grep -E "experimentalDecorators|emitDecoratorMetadata"
   ```
3. Run with verbose output:
   ```bash
   pnpm nx test backend -- --verbose
   ```

### Tests hang or timeout

**Problem**: 
```
Jest timeout exceeded
```

**Solution**:
1. Increase timeout:
   ```bash
   pnpm nx test backend -- --testTimeout=30000
   ```
2. Check for unresolved promises:
   ```typescript
   // ❌ Bad: forgot await
   it('fetches data', () => {
     fetchData();  // Missing await!
   });

   // ✅ Good
   it('fetches data', async () => {
     await fetchData();
   });
   ```

### ESLint/Prettier conflicts

**Problem**: 
```
Linting failed; Prettier formatting differs
```

**Solution**:
1. Format code:
   ```bash
   pnpm exec prettier --write "apps/backend/src/**/*.ts"
   ```
2. Or use ESLint to fix:
   ```bash
   pnpm nx lint backend -- --fix
   ```

## Email & SMTP Issues

### Worker sends emails to localhost instead of Mailhog

**Problem**:
```
connect ECONNREFUSED 127.0.0.1:1025
```
Appears in `docker compose logs worker`.

**Cause**: `SMTP_HOST=localhost` is set in `.env`. Inside the Docker network, `localhost` resolves to the container itself — not the Mailhog service.

**Fix**: Remove or comment out `SMTP_HOST` from `.env`:
```bash
# SMTP_HOST=localhost   ← remove this line
```

Docker Compose sets `SMTP_HOST=mailhog` by default when the variable is unset. Restart the worker after changing `.env`:
```bash
docker compose up -d --force-recreate worker
```

### Emails not appearing in Mailhog

**Problem**: Verification emails are not showing up at `http://localhost:8025`.

**Checklist**:
1. Is the worker running?
   ```bash
   docker compose ps       # check worker status
   docker compose logs worker
   ```
2. Is Redis healthy (worker needs Redis to receive jobs)?
   ```bash
   docker compose ps redis
   ```
3. Is `SMTP_HOST` correctly set? (see above)
4. If running without Docker, is the local worker process running?
   ```bash
   pnpm nx serve worker
   ```

### Verification code expired

**Problem**: "Verification code has expired or not found" error on submit.

Codes expire after **10 minutes**. Request a new code:
- Click "Resend Code" on the verification screen (available after 30-second cooldown)
- Or restart registration with the same email — a new verification record replaces the old one

### Too many wrong verification attempts

**Problem**: "Too many incorrect attempts. Please request a new code." error.

After **5 wrong attempts**, the verification record is locked. The user must restart registration to get a fresh code.

### Maximum resends reached

**Problem**: "Maximum resend limit reached" error.

Each verification session allows **3 resends**. After that, the user must restart registration (submit the email form again).

### Resend cooldown active

**Problem**: "Please wait X seconds before requesting another code" error.

A **30-second cooldown** applies between resend requests. The frontend countdown timer shows when the next resend is available.

## Database Issues

### Migrations not applied

**Problem**: Schema errors or "column does not exist" errors at startup.

**Fix**:
```bash
pnpm db:migrate
```

### Schema drift warning

**Problem**: `drizzle-kit` warns about differences between schema and database.

**Fix**: Generate and apply a new migration:
```bash
pnpm db:generate   # creates a new SQL migration
pnpm db:migrate    # applies it
```

### Database connection refused

**Problem**: `ECONNREFUSED localhost:5432` when starting the backend locally.

**Fix**: Ensure Postgres is running:
```bash
mise run up
docker compose ps postgres   # should show "healthy"
```

### Reset the database

```bash
docker compose down -v   # WARNING: destroys all data
mise run up
pnpm db:migrate
mise run seed            # optional: re-seed with sample users
```

## Redis Issues

### Redis connection refused (local dev)

**Problem**: `ECONNREFUSED 127.0.0.1:6379` when starting the backend or worker locally.

**Fix**: Ensure Redis is running:
```bash
mise run up
docker compose ps redis   # should show "healthy"
```

### BullMQ jobs not processing

**Problem**: Registration emails queued but not sent.

**Checklist**:
1. Is the worker process running (locally: `pnpm nx serve worker`, Docker: check `docker compose ps worker`)?
2. Is Redis healthy?
3. Check worker logs for errors:
   ```bash
   docker compose logs -f worker
   ```

## Docker Issues

### Container won't start

**Problem**: 
```
docker: error during connect: ... daemon is not running
```

**Solution**:
1. Start Docker Desktop (macOS/Windows) or Docker daemon (Linux):
   ```bash
   # Linux
   sudo systemctl start docker
   ```
2. Verify:
   ```bash
   docker ps
   ```

### Port 3000 already in use in Docker

**Problem**: 
```
Error response from daemon: Ports are not available
```

**Solution**:
```bash
# Option 1: Use a different port
BACKEND_PORT=3001 mise run up

# Option 2: Stop the container
docker ps
docker stop <container-id>
docker rm <container-id>

# Option 3: Kill the process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Container exits immediately

**Problem**: 
```
docker: Container exited with code 1
```

**Solution**:
1. Check logs:
   ```bash
   docker logs hectohr-backend-1
   ```
2. Common causes:
   - Missing dependencies: `pnpm install` in build
   - Wrong working directory: Check `WORKDIR` in Dockerfile
   - Missing main.js: Check `pnpm nx run backend:prune` builds correctly

### Health check failing

**Problem**: 
```
Container is unhealthy
```

**Solution**:
1. Test health endpoint:
   ```bash
   docker exec hectohr-backend-1 wget -qO- http://localhost:3000/api/health
   ```
2. Check logs:
   ```bash
   docker logs hectohr-backend-1
   ```
3. If app isn't ready, increase `start_period` in `docker-compose.yml`:
   ```yaml
   healthcheck:
     start_period: 30s  # Increase from 10s
   ```

### Docker build fails

**Problem**: 
```
failed to solve with frontend dockerfile.v0
```

**Solution**:
```bash
# Clear Docker build cache
docker builder prune

# Rebuild
docker build -f apps/backend/Dockerfile -t hectohr:latest .

# Or use no-cache
docker build --no-cache -f apps/backend/Dockerfile -t hectohr:latest .
```

## Git & Version Control Issues

### Uncommitted changes after install

**Problem**: `pnpm install` modifies files that shouldn't change

**Solution**:
1. Check what changed:
   ```bash
   git status
   ```
2. If it's just `pnpm-lock.yaml` formatting, that's normal:
   ```bash
   git add pnpm-lock.yaml
   git commit -m "deps: lock file"
   ```
3. If other files changed unexpectedly, revert:
   ```bash
   git checkout -- .
   pnpm install
   ```

### Wrong branch or merge conflicts

**Problem**: 
```
error: Your local changes to the following files would be overwritten by merge
```

**Solution**:
1. Stash changes:
   ```bash
   git stash
   git checkout <correct-branch>
   git stash pop
   ```
2. Or discard and start fresh:
   ```bash
   git checkout -- .
   git pull origin main
   ```

## Performance Issues

### Backend slow to start

**Problem**: Takes >5 seconds to start

**Solution**:
1. Check if dependencies are cached:
   ```bash
   rm -rf node_modules apps/backend/node_modules
   pnpm install
   pnpm nx serve backend  # Should be faster second time
   ```
2. Increase Node.js memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=2048" pnpm nx serve backend
   ```

### Tests slow

**Problem**: Each test takes 5+ seconds

**Solution**:
1. Run tests in parallel:
   ```bash
   pnpm nx test backend -- --maxWorkers=4
   ```
2. Avoid slow operations in tests (use mocks):
   ```typescript
   // ❌ Slow: real file I/O
   it('reads file', () => {
     const data = fs.readFileSync('./huge-file.json');
   });

   // ✅ Fast: mock
   it('reads file', () => {
     const data = { /* mocked */ };
   });
   ```

### Docker build slow

**Problem**: Build takes >5 minutes

**Solution**:
1. Enable BuildKit:
   ```bash
   DOCKER_BUILDKIT=1 docker build -f apps/backend/Dockerfile .
   ```
2. Check `.dockerignore` excludes large dirs:
   ```bash
   cat .dockerignore
   ```
3. On macOS/Windows, builds are slower due to VM overhead. Use native Linux (CI/CD) for faster builds.

## IDE Integration Issues

### VS Code doesn't recognize paths

**Problem**: Cannot find module errors (but code works)

**Solution**:
1. Restart TypeScript server: Ctrl+Shift+P → "TypeScript: Restart TS Server"
2. Check `tsconfig.json` references are correct:
   ```bash
   cat tsconfig.json
   ```

### ESLint not working in editor

**Problem**: Red squiggles don't appear

**Solution**:
1. Install ESLint extension (VS Code)
2. Restart VS Code
3. Check eslint is installed:
   ```bash
   pnpm ls eslint
   ```

### Prettier formatting not applying

**Problem**: `Ctrl+Shift+I` (format) does nothing

**Solution**:
1. Install Prettier extension (VS Code)
2. Set as default formatter:
   - Ctrl+Shift+P → "Format Document"
   - Select "Prettier - Code formatter"
3. Enable format on save (Settings → Format On Save)

## Contact & More Help

- Check **[Getting Started](./getting-started.md)** for setup issues
- Check **[Development Guide](./development.md)** for workflow issues
- Check **[Commands Reference](./commands.md)** for task help
- For project-specific issues, check `CLAUDE.md` or `AGENTS.md`
