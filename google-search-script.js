const { chromium } = require('playwright');

async function searchGoogle() {
  console.log('Launching browser...\n');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to Google...\n');
    await page.goto('https://www.google.com', { waitUntil: 'networkidle' });

    console.log('Searching for "claude code doc"...\n');

    // Accept cookies if the dialog appears
    try {
      const acceptButton = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
      if (await acceptButton.isVisible({ timeout: 2000 })) {
        await acceptButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // No cookie dialog or already accepted
    }

    // Find search box and enter query
    const searchBox = page.locator('textarea[name="q"], input[name="q"]').first();
    await searchBox.fill('claude code doc');
    await searchBox.press('Enter');

    // Wait for results to load
    await page.waitForSelector('#search', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('Extracting search results...\n');
    console.log('='.repeat(80));
    console.log('GOOGLE SEARCH RESULTS FOR: claude code doc');
    console.log('='.repeat(80));
    console.log();

    // Extract search results
    const results = await page.locator('#search .g, #search .MjjYud').evaluateAll(elements => {
      return elements.slice(0, 10).map((el, index) => {
        const titleEl = el.querySelector('h3');
        const linkEl = el.querySelector('a');
        const snippetEl = el.querySelector('.VwiC3b, .yXK7lf, [data-sncf="1"]');

        return {
          position: index + 1,
          title: titleEl ? titleEl.textContent.trim() : 'No title',
          url: linkEl ? linkEl.href : 'No URL',
          snippet: snippetEl ? snippetEl.textContent.trim() : 'No snippet available'
        };
      }).filter(result => result.title !== 'No title');
    });

    if (results.length === 0) {
      console.log('No results found or unable to parse results.');
    } else {
      results.forEach(result => {
        console.log(`${result.position}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        console.log(`   ${result.snippet}`);
        console.log();
      });
    }

    console.log('='.repeat(80));
    console.log(`Total results extracted: ${results.length}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error during search:', error.message);
    throw error;
  } finally {
    await browser.close();
    console.log('\nBrowser closed.');
  }
}

searchGoogle().catch(console.error);
