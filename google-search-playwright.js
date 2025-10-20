const { chromium } = require('playwright');

async function searchGoogle() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate to Google
    console.log('Navigating to Google...');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle' });

    // Accept cookies if prompted (common in EU regions)
    try {
      const acceptButton = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
      if (await acceptButton.isVisible({ timeout: 3000 })) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // No cookie dialog, continue
    }

    // Find search box and enter query
    console.log('Searching for "claude code"...');
    const searchBox = page.locator('textarea[name="q"], input[name="q"]').first();
    await searchBox.fill('claude code');
    await searchBox.press('Enter');

    // Wait for results to load
    await page.waitForSelector('#search', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give it a moment to fully load

    // Extract search results
    console.log('\n=== SEARCH RESULTS ===\n');

    const results = await page.locator('#search .g').evaluateAll((elements) => {
      return elements.slice(0, 10).map((el) => {
        const titleEl = el.querySelector('h3');
        const linkEl = el.querySelector('a');
        const descEl = el.querySelector('.VwiC3b, .yXK7lf, [data-sncf]');

        return {
          title: titleEl ? titleEl.innerText : 'N/A',
          url: linkEl ? linkEl.href : 'N/A',
          description: descEl ? descEl.innerText : 'N/A'
        };
      }).filter(r => r.title !== 'N/A');
    });

    // Report results
    if (results.length === 0) {
      console.log('No results found or unable to parse results.');

      // Take a screenshot for debugging
      await page.screenshot({ path: 'google-search-debug.png', fullPage: true });
      console.log('\nScreenshot saved to google-search-debug.png for debugging');
    } else {
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   ${result.description}`);
        console.log('');
      });

      console.log(`\nTotal results extracted: ${results.length}`);
    }

  } catch (error) {
    console.error('Error during search:', error.message);

    // Take screenshot on error
    try {
      await page.screenshot({ path: 'google-search-error.png', fullPage: true });
      console.log('Error screenshot saved to google-search-error.png');
    } catch (screenshotError) {
      // Ignore screenshot errors
    }

    throw error;
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

// Run the search
searchGoogle().catch(console.error);
