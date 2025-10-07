#!/bin/bash
# Check if Playwright version in CI matches package.json

PACKAGE_VERSION=$(node -p "require('./package.json').dependencies.playwright.replace('^', '')")
CI_VERSION=$(grep -o 'playwright:v[0-9.]*' .github/workflows/ci.yml | head -1 | sed 's/playwright:v//')

echo "📦 Package.json Playwright version: $PACKAGE_VERSION"
echo "🔧 CI Playwright version: $CI_VERSION"

if [ "$PACKAGE_VERSION" != "$CI_VERSION" ]; then
  echo "❌ Version mismatch!"
  echo "Please update .github/workflows/ci.yml to use mcr.microsoft.com/playwright:v$PACKAGE_VERSION-jammy"
  exit 1
else
  echo "✅ Versions match!"
fi
