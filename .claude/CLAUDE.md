# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**air-cli** is an implementation of Agentic Information Retrieval (Agentic IR) - a paradigm that gives users control over their information diet by combining browser automation (Playwright), AI agents (LLMs), and user-defined preferences.

Unlike traditional IR systems that filter content using opaque algorithms optimized for engagement, Agentic IR helps users achieve their target information state through:

- Direct browser access to platforms users visit daily (Facebook, Twitter, news sites)
- LLM-powered content analysis based on user's stated preferences, not platform algorithms
- Proactive curation and filtering (like Perplexity/NotebookLM, but for all web platforms)

The CLI provides direct browser control through Chrome DevTools Protocol (CDP), designed for AI agents and automation workflows.

## Development Commands

### Core Commands

```bash
# Development
bun run dev                    # Run CLI in development mode with hot reload

# Building
bun run build                  # Full build (Bun standalone executable)
bun run build:ts               # TypeScript compilation only
bun run build:bun-js           # Bun JavaScript build

# Platform-specific builds
bun run build:windows          # Windows x64 executable
bun run build:linux            # Linux x64 executable
bun run build:all              # All platform executables

# Installation
bun run install                # Install as Claude Code skill
bun run uninstall              # Remove skill
```

### Testing

```bash
# Test execution
bun test                       # Run all tests
bun run test:ci                # CI tests with bail on 3 failures
bun run test:watch             # Watch mode for development
bun run test:coverage          # Run with coverage report

# Note: Tests use Bun's native test runner (Jest-compatible API)
# Tests run sequentially to prevent browser process conflicts
```

### Code Quality

```bash
bun run lint                   # ESLint checks
bun run lint:fix               # Auto-fix linting issues
bun run format                 # Format code with Prettier
bun run format:check           # Check formatting without changes
bun run typecheck              # TypeScript type checking
bun run ci                     # Full CI pipeline (type + lint + format + test)
```

## Architecture

### Core Structure

- **Entry Point**: `src/index.ts` - Main CLI bootstrap with Bun compatibility
- **CLI Framework**: `src/yargs/cli.ts` - Yargs-based command system replacing Commander.js
- **Command Organization**: Commands grouped by functionality in `src/yargs/commands/`:
  - `navigation/` - Browser lifecycle (open, close, navigate, tabs)
  - `interaction/` - User actions (click, type, fill, select)
  - `capture/` - Screenshots, PDFs, snapshots
  - `advanced/` - JavaScript execution, debugging, performance
  - `utility/` - Sessions, installation, code generation

### Key Services

- **Browser Service**: `src/lib/browser-service.ts` - Main browser management
- **Browser Connection**: `src/lib/browser-connection.ts` - CDP connection handling
- **Session Manager**: `src/lib/session-manager.ts` - Browser state persistence
- **Ref Manager**: `src/lib/ref-manager.ts` - Element reference system for reuse
- **DI Container**: `src/lib/di-container.ts` - Dependency injection for services
- **Performance Monitor**: `src/lib/performance-monitor.ts` - Browser performance tracking

### Command Architecture

- **Command Builder**: `src/yargs/lib/command-builder.ts` - Consistent command creation
- **Global Middleware**: `src/yargs/middleware/global-options.ts` - Port, verbose, JSON flags
- **Validation**: `src/lib/validation.ts` - Argument validation with detailed guides
- **Tab Targeting**: All interaction commands support `--tab-id` and `--tab-index`

### Testing Strategy

- **Test Utils**: `src/test-utils/` - Shared browser setup and teardown
- **Global Setup/Teardown**: Browser lifecycle management for test suites
- **Mock Helpers**: `src/lib/__tests__/mock-helpers.ts` - Service mocking utilities
- **Sequential Execution**: Tests run in single fork to prevent browser conflicts
- **Real vs Mock**: `.real.test.ts` files use actual browsers, excluded in CI

### Build System

- **TypeScript**: Compilation to CommonJS for Node compatibility
- **Bun**: Native standalone executables with embedded runtime (~60MB)
- **Bun Test**: Built-in test runner with Jest-compatible API
- **Multi-platform**: Targets macOS ARM64, Windows x64, Linux x64

## Key Implementation Notes

### Browser Connection

- Connects to existing Chrome instances via CDP on port 9222
- Auto-launches Chrome with debugging if no instance found
- Persistent connection maintained across CLI commands
- Session state preserved including cookies and localStorage

### Command Execution Pattern

- All commands use dependency injection for browser services
- Global options (port, verbose, JSON) processed by middleware
- Commands support both CSS selectors and text-based element targeting
- Enhanced validation with intelligent error suggestions

### Element Interaction

- **Ref System**: Capture element references with `snapshot` for reuse
- **Text Selectors**: Commands accept text content for element targeting
- **Multi-field Fill**: Enhanced syntax for form completion
- **Action History**: Persistent tracking of user interactions for context

### Error Handling

- Detailed validation messages with suggestions
- Graceful browser connection failures
- Test-friendly error capture to stdout
- Debug mode with stack traces

### Development Workflow

1. Make changes to TypeScript source in `src/`
2. Use `bun run dev` for immediate testing
3. Run `bun test` to validate changes
4. Use `bun run ci` before commits
5. Build with `bun run build` for distribution testing

## Installation System

The project uses bun scripts for installation as a Claude Code skill:

**Install as Claude Code skill:**

```bash
bun run install
```

This command:

- Builds the standalone binary with `bun run build`
- Creates `~/.claude/skills/air-cli/` directory
- Copies binary (`air`) and skill definition (`SKILL.md`) to the skill directory
- Sets executable permissions

**Uninstall:**

```bash
bun run uninstall
```

Removes the entire `~/.claude/skills/air-cli/` directory.

**Skill Structure:**

- Binary: `~/.claude/skills/air-cli/air`
- Skill definition: `~/.claude/skills/air-cli/SKILL.md`
- Self-contained in skill directory (no PATH modification)
- Claude Code auto-discovers skills on startup
