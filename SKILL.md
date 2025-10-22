---
name: air-cli
description: Browser automation and content curation tool using Playwright. Use when users ask about browser automation, web scraping, or testing web applications.
---

# air-cli - Browser Automation Skill

## What This Skill Provides

This skill gives you access to the `air` CLI tool for browser automation via Playwright. The binary is located at `./air` (relative to this skill's directory).

## How to Use This Skill

**IMPORTANT:** Use the Bash tool to execute `air` commands. The binary path is `./air` relative to the skill directory.

**Example usage:**

```bash
./air open https://example.com
```

## When to Use This Skill

Use this skill when users ask about:

- Browser automation, web scraping, or testing web applications
- Interacting with websites (clicking, filling forms, extracting data)
- Taking screenshots or generating PDFs from web pages
- Monitoring network requests or console logs

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Reference

All commands use `./air` (relative path from skill directory).

### Starting a Browser Session

```bash
./air open              # Smart open - launches Chrome or connects if running
./air open <url>        # Open browser and navigate to URL
./air open --port 9222  # Use specific debugging port
./air close             # Close browser connection
```

### Navigation

```bash
./air navigate <url>    # Navigate to a URL
./air back              # Go back in browser history
./air tabs list         # List all open tabs
```

### Interaction

```bash
./air click <selector>            # Click on an element
./air type <selector> <text>      # Type text into an input
./air fill <fields...>            # Fill multiple form fields
./air select <selector> <values>  # Select dropdown option(s)
./air press <key>                 # Press a keyboard key
./air wait [selector]             # Wait for element or timeout
```

### Capture & Analysis

```bash
./air screenshot [path]  # Capture screenshot
./air pdf [path]         # Save page as PDF
./air snapshot           # Get accessibility tree snapshot
```

### Advanced Operations

```bash
./air eval <code>        # Execute JavaScript in browser context
./air exec <file>        # Execute JavaScript file in browser
./air console            # Monitor console output
./air network            # Monitor network requests
```

## Common Workflows

All examples use `./air` relative to the skill directory.

### Web Scraping

```bash
./air open "https://example.com"
./air wait ".content"
./air snapshot
./air eval "document.querySelector('.data').innerText"
./air screenshot output.png
```

### Form Automation

```bash
./air open "https://form.example.com"
./air fill "#email=user@example.com" "#password=secret"
./air click "button[type='submit']"
./air wait ".success"
```

### Taking Screenshots

```bash
./air open "https://example.com"
./air screenshot /tmp/screenshot.png
```

### PDF Generation

```bash
./air open "https://report.example.com"
./air wait ".report-ready"
./air pdf /tmp/report.pdf
```

### JavaScript Execution

```bash
./air open "https://example.com"
./air eval "document.title"
./air eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"
```

## Writing Complex Automation Scripts

Claude Code can write JavaScript files that use the Playwright CLI's execution context. These scripts have access to:

- `page` - Current page object
- `context` - Browser context for creating new pages/tabs
- `browser` - Browser instance

### Example: Multi-Page Automation Script

```javascript
// Save as /tmp/automation.js and run with: ./air exec /tmp/automation.js
async function automateMultipleSites() {
  // Work with current page
  await page.goto('https://example.com');
  await page.fill('#search', 'query');
  await page.click('button[type="submit"]');

  // Create new tabs
  const newPage = await context.newPage();
  await newPage.goto('https://another-site.com');

  // Extract and return data
  const data = await page.evaluate(() => {
    return document.querySelector('.results')?.textContent;
  });

  console.log('Results:', data);
  return data;
}

automateMultipleSites();
```

### Example: Data Extraction Script

```javascript
// Save as /tmp/scraper.js
async function scrapeData() {
  const results = [];

  for (let i = 1; i <= 5; i++) {
    await page.goto(`https://example.com/page/${i}`);

    const pageData = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.item')).map(el => ({
        title: el.querySelector('.title')?.textContent,
        price: el.querySelector('.price')?.textContent
      }));
    });

    results.push(...pageData);
  }

  // Save results
  require('fs').writeFileSync('/tmp/data.json', JSON.stringify(results));
  console.log(`Scraped ${results.length} items`);
  return results;
}

scrapeData();
```

### Execution Pattern

1. Claude Code writes the script to `/tmp/script.js`
2. Execute with: `./air exec /tmp/script.js`
3. Script has full access to Playwright API
4. Results are returned to stdout

## Error Handling

- If Chrome is not installed, suggest: `./air install chromium`
- If connection fails, check if another Chrome instance is using the debugging port
- For selector not found errors, suggest using `./air list` to inspect page structure

## Expected Output Examples

### Successful Commands

```bash
$ ./air open https://example.com
✅ Connected to Chrome at localhost:9222
🌐 Navigated to: https://example.com

$ ./air click "button.submit"
✅ Clicked element: button.submit

$ ./air screenshot
📸 Screenshot saved: screenshot-2024-01-15-143022.png

$ ./air eval "document.title"
📊 Result: "Example Domain"
```

### Error Outputs

```bash
$ ./air click ".nonexistent"
❌ Element not found: .nonexistent

$ ./air open
❌ Failed to connect to Chrome
💡 Try: ./air install chromium
```

## Integration Notes

- The CLI maintains a persistent browser connection across commands
- Sessions persist browser state including cookies and localStorage
- Screenshots default to PNG format in the current directory
- JavaScript evaluation returns results as formatted output
- All commands exit cleanly after completion (exit code 0 on success, 1 on error)

## When NOT to Use

- For simple HTTP requests, use curl or fetch instead
- For API testing, use dedicated API testing tools
- For unit testing JavaScript, use test frameworks directly

## Troubleshooting

If browser doesn't launch:

1. Check if Chrome/Chromium is installed
2. Try `air install chromium` to install Playwright's browser
3. Verify no other process is using port 9222
4. Try with explicit port: `air open --port 9223`
