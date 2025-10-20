import { chromium } from 'playwright';

async function scrapeYouTubeVideo(url: string) {
  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for the video player to load
    await page.waitForSelector('ytd-watch-flexy', { timeout: 30000 });

    // Extract video information
    const videoInfo = await page.evaluate(() => {
      const getData = (selector: string): string | null => {
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || null;
      };

      const getMetaContent = (property: string): string | null => {
        const meta = document.querySelector(
          `meta[property="${property}"]`
        ) as HTMLMetaElement;
        return meta?.content || null;
      };

      // Get title
      const title =
        getData('h1.ytd-watch-metadata yt-formatted-string') ||
        getData('h1.title yt-formatted-string') ||
        getMetaContent('og:title');

      // Get channel name
      const channelName =
        getData('ytd-channel-name yt-formatted-string a') ||
        getData('ytd-channel-name a');

      // Get view count
      const viewCount = getData(
        'ytd-video-view-count-renderer span.view-count'
      );

      // Get upload date
      const uploadDate = getData('#info-strings yt-formatted-string');

      // Get description
      const description =
        getData(
          'ytd-text-inline-expander#description-inline-expander yt-formatted-string'
        ) ||
        getData('#description yt-formatted-string') ||
        getMetaContent('og:description');

      // Get likes (if visible)
      const likes = getData(
        'ytd-toggle-button-renderer#top-level-buttons-computed button[aria-label*="like"] span'
      );

      // Get video duration
      const duration = getMetaContent('duration');

      // Get tags/keywords
      const keywords = getMetaContent('keywords');

      // Get video URL
      const videoUrl = getMetaContent('og:url');

      // Get thumbnail
      const thumbnail = getMetaContent('og:image');

      return {
        title,
        channelName,
        viewCount,
        uploadDate,
        description,
        likes,
        duration,
        keywords,
        videoUrl,
        thumbnail
      };
    });

    // Try to get more detailed description if available
    try {
      const expandButton = await page.$('ytd-text-inline-expander #expand');
      if (expandButton) {
        await expandButton.click();
        await page.waitForTimeout(1000);

        const fullDescription = await page.evaluate(() => {
          const descElement = document.querySelector(
            'ytd-text-inline-expander#description-inline-expander yt-formatted-string'
          );
          return descElement?.textContent?.trim() || null;
        });

        if (fullDescription) {
          videoInfo.description = fullDescription;
        }
      }
    } catch (e) {
      // Expand button not found or already expanded
    }

    console.log('\n=== YouTube Video Information ===\n');
    console.log('Title:', videoInfo.title);
    console.log('Channel:', videoInfo.channelName);
    console.log('Views:', videoInfo.viewCount);
    console.log('Upload Date:', videoInfo.uploadDate);
    console.log('Likes:', videoInfo.likes);
    console.log('Duration:', videoInfo.duration);
    console.log('URL:', videoInfo.videoUrl);
    console.log('\nKeywords:', videoInfo.keywords);
    console.log('\nDescription:');
    console.log(videoInfo.description);
    console.log('\nThumbnail:', videoInfo.thumbnail);
    console.log('\n=================================\n');

    return videoInfo;
  } catch (error) {
    console.error('Error scraping video:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the scraper
const videoUrl = 'https://youtu.be/_AifxZGxwuk?si=olr4o8Bbf9ciKqMq';
scrapeYouTubeVideo(videoUrl)
  .then(() => console.log('Scraping completed!'))
  .catch(error => console.error('Scraping failed:', error));
