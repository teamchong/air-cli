# Playwright CLI - Claude Instructions

When users ask about browser automation, web scraping, or testing web applications, you can use the `air` CLI tool.

## Core Capabilities

The Playwright CLI provides direct browser control through Chrome DevTools Protocol (CDP). It automatically launches Chrome with debugging enabled if not already running.

## Command Usage Patterns

### Installation & Setup
```bash
air install           # Install Playwright browsers (chromium, firefox, webkit)
air install chromium  # Install only Chromium browser
air close             # Close browser connection
```

### Starting a Browser Session
```bash
air open              # Smart open - launches Chrome or connects if running
air open <url>        # Open browser and navigate to URL
air open --port 9222  # Use specific debugging port
air open -n <url>     # Always open URL in a new tab
air open --new-tab <url>  # Same as -n
```

### Navigation
```bash
air navigate <url>              # Navigate to a URL
air back                        # Go back in browser history
air forward                     # Go forward in browser history (TODO: implement)
```

### Interaction
```bash
air click <selector>            # Click on an element
air type <selector> <text>      # Type text into an input
air press <key>                 # Press a keyboard key (e.g., Enter, Escape)
air fill <fields...>            # Fill multiple form fields (selector=value pairs)
air select <selector> <values> # Select dropdown option(s)
air hover <selector>            # Hover over an element
air drag <source> <target>      # Drag from source to target element
air upload <selector> <files>   # Upload file(s) to a file input
air wait [selector]             # Wait for element or timeout
```

### Capture & Analysis
```bash
air screenshot [path]           # Capture screenshot
air pdf [path]                  # Save page as PDF
air snapshot                    # Get accessibility tree snapshot
```

### Advanced Operations
```bash
air eval <code>                 # Execute JavaScript in browser context
air exec <file>                 # Execute JavaScript file in browser
air console                     # Monitor console output
air network                     # Monitor network requests
air dialog <accept|dismiss>     # Handle browser dialogs
air list                        # List open pages and contexts
air codegen [url]               # Generate Playwright test code interactively
air test [spec]                 # Run Playwright tests
```

### Window Management
```bash
air tabs [action]               # Manage tabs (list, new, close, select)
air resize <width> <height>     # Resize browser window
```

### Session Management
```bash
air session save <name>         # Save current browser state
air session load <name>         # Restore saved session
air session list                # Show saved sessions
```

## Best Practices

1. **Use smart open**: The `open` command automatically connects or launches as needed
2. **Use --new-tab**: When opening multiple URLs, use `-n` flag to keep them in separate tabs
3. **Use specific selectors**: Prefer ID and class selectors over complex XPath
4. **Wait for elements**: Use `air wait` before interacting with dynamic content
5. **Save sessions**: For repetitive tasks, save and reuse sessions

## Common Workflows

### Web Scraping
```bash
air open "https://example.com"
air wait ".content"
air snapshot                    # Get page structure
air eval "document.querySelector('.data').innerText"
air screenshot output.png
```

### Form Automation
```bash
air open "https://form.example.com"
# Fill multiple fields at once
air fill "#email=user@example.com" "#password=secret" "#name=John Doe"
# Or use individual commands
air type "#comments" "This is a longer text field"
air select "#country" "USA"
air click "button[type='submit']"
air wait ".success"
```

### Advanced Interaction
```bash
air open "https://app.example.com"
air hover ".menu-trigger"       # Hover to show menu
air drag ".item" ".drop-zone"   # Drag and drop
air press "Escape"              # Press keyboard key
air upload "#file-input" document.pdf report.xlsx
```

### PDF Generation
```bash
air open "https://report.example.com"
air wait ".report-ready"
air resize 1200 800             # Set specific viewport
air pdf report.pdf
```

### Network Monitoring
```bash
air open "https://api.example.com"
air network                     # Start monitoring
# Perform actions...
# Press Ctrl+C to stop monitoring
```

### Tab Management
```bash
air tabs list                   # List all open tabs
air tabs new --url "https://example.com"
air tabs select --index 2       # Switch to tab 2
air tabs close --index 0        # Close first tab
```

### Test Generation & Execution
```bash
air codegen                     # Start recording interactions
air codegen "https://example.com"  # Start recording from URL
air test                        # Run all tests
air test tests/login.spec.ts    # Run specific test file
air test --ui                   # Open test UI mode
air test --debug                # Run tests in debug mode
```

### JavaScript Execution
```bash
air eval "document.title"       # Execute inline JavaScript
air eval "Array.from(document.querySelectorAll('a')).map(a => a.href)"
air exec script.js              # Execute JavaScript file
echo "console.log(location.href)" | air exec  # Execute from stdin
```

## Writing Complex Automation Scripts

Claude Code can write JavaScript files that use the Playwright CLI's execution context. These scripts have access to:
- `page` - Current page object
- `context` - Browser context for creating new pages/tabs
- `browser` - Browser instance

### Example: Multi-Page Automation Script
```javascript
// Save as /tmp/automation.js and run with: air exec /tmp/automation.js
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
2. Execute with: `air exec /tmp/script.js`
3. Script has full access to Playwright API
4. Results are returned to stdout

## Error Handling

- If Chrome is not installed, suggest: `air install chromium`
- If connection fails, check if another Chrome instance is using the debugging port
- For selector not found errors, suggest using `air list` to inspect page structure

## Expected Output Examples

### Successful Commands
```bash
$ air open https://example.com
✅ Connected to Chrome at localhost:9222
🌐 Navigated to: https://example.com

$ air click "button.submit"
✅ Clicked element: button.submit

$ air screenshot
📸 Screenshot saved: screenshot-2024-01-15-143022.png

$ air eval "document.title"
📊 Result: "Example Domain"
```

### Error Outputs
```bash
$ air click ".nonexistent"
❌ Element not found: .nonexistent

$ air open
❌ Failed to connect to Chrome
💡 Try: air install chromium
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