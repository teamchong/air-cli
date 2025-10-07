# Playwright Version Management

This document describes how to keep Playwright versions synchronized across the project.

## Why Version Sync Matters

The CI pipeline uses a Docker container with a pre-installed Playwright version. If this doesn't match the version in `package.json`, tests may fail due to browser binary mismatches.

## Current Version

**Playwright 1.55.0**

## Files to Update When Upgrading Playwright

1. **`package.json`** - Update the dependency version (use exact version, not ^):

   ```json
   "playwright": "1.55.0"
   ```

2. **`.github/workflows/ci.yml`** - Update the container image:

   ```yaml
   container:
     image: mcr.microsoft.com/playwright:v1.55.0-jammy
   ```

3. **Update the comment** in `ci.yml` to reflect the new version

## Upgrade Process

```bash
# 1. Update Playwright
bun add playwright@1.55.0

# 2. Update CI workflow
# Edit .github/workflows/ci.yml and update the container image

# 3. Run verification script
bash .github/workflows/scripts/check-playwright-version.sh

# 4. Test locally
bun run test

# 5. Commit changes
git add package.json bun.lock .github/workflows/ci.yml
git commit -m "chore: upgrade Playwright to 1.55.0"
```

## Version Check

The CI pipeline automatically checks for version mismatches and logs a warning if detected.

You can also manually verify:

```bash
bash .github/workflows/scripts/check-playwright-version.sh
```

## Available Playwright Containers

Microsoft provides official Playwright Docker images:

- `mcr.microsoft.com/playwright:v{VERSION}-jammy` (Ubuntu 22.04 LTS)
- `mcr.microsoft.com/playwright:v{VERSION}-focal` (Ubuntu 20.04 LTS)
- `mcr.microsoft.com/playwright:v{VERSION}-noble` (Ubuntu 24.04 LTS)

See: https://mcr.microsoft.com/en-us/product/playwright/about

## Troubleshooting

### Browser Binary Mismatch

If you see errors like "Executable doesn't exist" or browser version mismatches:

1. Check versions match in `package.json` and `ci.yml`
2. Clear local Playwright cache: `bunx playwright install --force`
3. Verify CI uses correct container image

### Local vs CI Behavior Differences

The test setup automatically detects CI environment and adjusts accordingly:

- **Local**: Launches browser with `bun run src/index.ts open`
- **CI**: Uses Playwright's pre-installed browsers from container

See `src/test-utils/global-setup.ts` for implementation details.
