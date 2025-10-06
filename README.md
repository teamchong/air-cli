# air-cli (WIP)

**Agentic Information Retrieval** - Take back control of your information diet.

[![CI Pipeline](https://github.com/yourusername/air-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/air-cli/actions/workflows/ci.yml)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

Traditional information retrieval systems filter existing content using opaque algorithms optimized for engagement, not your goals. **Agentic IR** helps you achieve your target information state through reasoning, interaction, and proactive task execution.

## The Problem

Big tech controls what information you see:
- Which friend updates appear in your feed
- What news stories get promoted
- Which ads disguise themselves as content
- How "algorithmic recommendations" shape your worldview

Their systems optimize for **engagement metrics**, not your actual goals.

## The Solution

`air-cli` gives you back control by combining:
- **Playwright** - Access the browsers/platforms you use daily (Facebook, Twitter, news sites)
- **AI Agents** - Understand YOUR stated preferences, not what Meta's algorithm guesses
- **Agentic IR** - Proactive curation (triggers before you ask questions)

Your AI agent. Your rules. Not Meta's.

## Features

- 🔌 **Direct browser control** - Connect to existing Chrome or auto-launch new instances
- 🎭 **Full Playwright API** - All browser automation via simple CLI commands
- 🎯 **Smart targeting** - CSS selectors, text matching, or ref-based element selection
- 📊 **Context awareness** - View page state, forms, action history across commands
- 🗂️ **Multi-tab support** - Control multiple tabs with `--tab-id` or `--tab-index`
- 💾 **Session persistence** - Save and restore browser sessions with cookies/storage
- 🚀 **LLM-optimized** - Designed for AI agents and automation workflows

## Installation

### Quick Install (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/air-cli
cd air-cli

# Interactive installation
./install.sh

# The installer will:
# - Build the CLI
# - Install to ~/.local/bin or /usr/local/bin
# - Update your ~/.claude/CLAUDE.md (if using Claude Code)
```

### Manual Installation

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Install Playwright browsers
bunx playwright install chromium

# Install the binary
cp air ~/.local/bin/  # or any directory in your PATH
```

### Windows

```powershell
# Run PowerShell as Administrator
git clone https://github.com/yourusername/air-cli
cd air-cli

# Run installer
powershell -ExecutionPolicy Bypass -File install.ps1
```

## Quick Start

```bash
# Open browser and navigate
air open https://facebook.com

# Capture page state
air snapshot

# Click element by text
air click "See more posts"

# Fill forms
air fill "email=user@example.com" "password=secret"

# Execute JavaScript
air eval "document.querySelector('.post').textContent"

# Take screenshot
air screenshot /tmp/page.png
```

## Core Workflows

### 1. Browser Lifecycle

```bash
# Launch browser (auto-connects if already running)
air open

# Navigate to URL
air navigate https://news.ycombinator.com

# Manage tabs
air tabs list
air tabs new --url https://twitter.com
air tabs select --index 1
air tabs close --index 0

# Close browser
air close
```

### 2. Element Interaction

```bash
# Snapshot captures interactive elements with refs
air snapshot
# Output:
# button "Submit" [A1]
# textbox "Email" [A2]
# link "Privacy Policy" [A3]

# Click using ref
air click --ref A1

# Type using text selector
air type "Email" "user@example.com"

# Fill multiple fields at once
air fill "email=user@example.com" "password=secret" "name=John Doe"

# Select dropdown option
air select "#country" "USA"

# Upload files
air upload "#file-input" /tmp/document.pdf

# Hover over element
air hover ".menu-trigger"

# Press keyboard key
air press "Enter"
```

### 3. Data Capture

```bash
# Capture accessibility tree snapshot
air snapshot
air snapshot --full  # Full tree, not just interactive
air snapshot --detailed  # Include form field details
air snapshot --visual  # Inject A-Z labels onto page elements

# Take screenshot
air screenshot /tmp/page.png
air screenshot /tmp/full.png --full-page

# Generate PDF
air pdf /tmp/page.pdf
air pdf /tmp/report.pdf --format A4 --landscape

# Resize viewport
air resize 1920 1080
```

### 4. JavaScript Execution

```bash
# Execute inline JavaScript
air eval "document.title"
air eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"

# Execute JavaScript file
air exec script.js

# Execute from stdin
echo "console.log(location.href)" | air exec

# Complex automation script
cat > /tmp/automation.js <<'EOF'
async function scrapeData() {
  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.item')).map(el => ({
      title: el.querySelector('.title')?.textContent,
      price: el.querySelector('.price')?.textContent
    }));
  });
  console.log(JSON.stringify(results, null, 2));
}
scrapeData();
EOF

air exec /tmp/automation.js
```

### 5. Session Management

```bash
# Save current browser state
air session save my-session

# List saved sessions
air session list

# Restore session
air session load my-session
```

### 6. Context & History

```bash
# View current context (page state, forms, recent actions)
air context

# View action history
air context --history

# View form details
air context --forms
```

## Advanced Features

### Tab Targeting

All interaction commands support targeting specific tabs:

```bash
# Create tab and capture its ID
air tabs new --url https://example.com
# Output: Tab ID: A1B2C3D4...

# Target tab by ID
air navigate https://google.com --tab-id A1B2C3D4
air click "Search" --tab-id A1B2C3D4

# Target tab by index (0-based)
air screenshot /tmp/page.png --tab-index 0
```

### Form Automation

```bash
# Simple form fill
air fill "username=john" "password=secret"

# Scope to specific form
air fill --form "#registration-form" "email=user@example.com" "name=John"

# Inline form scoping
air fill "#login-form email=user@example.com" "#login-form password=secret"

# JSON output for automation
air fill "email=test@example.com" --json
```

### Network & Performance

```bash
# Monitor network requests
air network

# Monitor console output
air console

# Measure performance
air perf
```

### Test Generation

```bash
# Record interactions and generate Playwright test code
air codegen
air codegen https://example.com

# Run tests
air test
air test tests/login.spec.ts
air test --ui
air test --debug
```

## Example: Agentic IR Workflow

Here's how an AI agent could use `air-cli` to curate your Facebook feed:

```bash
#!/bin/bash

# 1. Open Facebook
air open https://facebook.com

# 2. Wait for login (or restore saved session)
air session load facebook-session

# 3. Capture current feed state
air snapshot --json > /tmp/feed-snapshot.json

# 4. Use LLM to analyze feed against user preferences
# (Your AI agent reads the snapshot and decides what to filter)

# 5. Hide unwanted posts based on analysis
air eval "document.querySelectorAll('[data-ad-preview]').forEach(el => el.remove())"

# 6. Extract content that matches user's interests
air eval "
  const posts = Array.from(document.querySelectorAll('[data-pagelet^=\"FeedUnit\"]'));
  const relevantPosts = posts.filter(post => {
    // Your filtering logic based on LLM analysis
    return post.textContent.includes('AI') || post.textContent.includes('research');
  });
  relevantPosts.map(p => p.textContent);
" --json

# 7. Save session for next time
air session save facebook-session
```

## Command Reference

### Navigation
- `air open [url]` - Launch browser and optionally navigate
- `air navigate <url>` - Navigate to URL
- `air back` - Go back in history
- `air tabs` - Manage tabs (list, new, close, select)
- `air close` - Close browser

### Interaction
- `air click <selector>` - Click element
- `air type <selector> <text>` - Type into input
- `air fill <field=value>...` - Fill multiple form fields
- `air select <selector> <value>` - Select dropdown option
- `air upload <selector> <file>...` - Upload files
- `air hover <selector>` - Hover over element
- `air press <key>` - Press keyboard key
- `air wait [selector]` - Wait for element or timeout

### Capture
- `air snapshot` - Capture accessibility tree
- `air screenshot [path]` - Take screenshot
- `air pdf [path]` - Generate PDF
- `air resize <width> <height>` - Resize viewport

### Advanced
- `air eval <code>` - Execute JavaScript
- `air exec <file>` - Execute JavaScript file
- `air console` - Monitor console output
- `air network` - Monitor network requests
- `air perf` - Measure performance
- `air dialog <accept|dismiss>` - Handle dialogs

### Utility
- `air context` - View page context and action history
- `air session` - Manage browser sessions (save, load, list)
- `air codegen [url]` - Generate Playwright test code
- `air test [spec]` - Run Playwright tests
- `air install` - Install Playwright browsers

## Global Options

All commands support:
- `--port <number>` - Chrome debugging port (default: 9222)
- `--timeout <ms>` - Command timeout (default: 5000)
- `--tab-id <id>` - Target specific tab by ID
- `--tab-index <number>` - Target specific tab by index (0-based)
- `--json` - Output JSON format
- `--quiet` - Suppress output
- `--verbose` - Detailed logging

## Architecture

```
┌─────────────────────────────────────────────┐
│                  air CLI                    │
│  (Yargs command framework)                  │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼────────┐
│ Browser Helper │  │  CDP Connection │
│  (Tab Mgmt)    │  │     Pool        │
└───────┬────────┘  └────────┬────────┘
        │                    │
        └──────────┬─────────┘
                   │
         ┌─────────▼──────────┐
         │   Chrome Browser   │
         │ (DevTools Protocol)│
         └────────────────────┘
```

- **CLI Layer** - Yargs-based command system with validation
- **Browser Layer** - Browser lifecycle, tab management, session persistence
- **CDP Layer** - Chrome DevTools Protocol connection pool
- **Ref System** - Element reference management for reuse across commands
- **Action History** - Persistent tracking of user interactions

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests
bun test
bun test --watch

# Lint and format
bun run lint
bun run format

# Build
bun run build

# Run CI pipeline locally
bun run ci
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Philosophy

Big Tech's algorithms have turned the internet into an engagement-optimization machine. Your attention is the product, and their goal is to maximize time-on-site, not help you achieve your goals.

**Agentic IR flips this**:
1. **You state your goals** - "I want tech news, not political rage bait"
2. **Your agent accesses platforms** - Using Playwright to control your browsers
3. **LLM understands context** - Analyzes content against YOUR preferences
4. **Proactive curation** - Filters, summarizes, and organizes information
5. **You stay in control** - No black-box algorithms, no engagement optimization

This is information retrieval designed for humans, not advertisers.

## License

MIT

## Acknowledgments

Built on [Playwright](https://playwright.dev/) - the excellent browser automation framework.

Inspired by the vision of giving users back control over their information diet in an age of algorithmic manipulation.
