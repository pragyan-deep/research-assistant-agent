import { chromium, Browser, Page } from 'playwright';
import type { ScrapedContent, ContentMetadata } from '../types';

/**
 * Simple Web Scraper Module - Playwright-based Content Extraction
 * 
 * This module provides basic web scraping functionality for the research assistant.
 * Focuses on speed and simplicity over complex features.
 */

// ========================================
// CONFIGURATION
// ========================================

const BROWSER_CONFIG = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
};

const TIMEOUTS = {
  page: 20000,
  navigation: 20000
};

const CONTENT_SELECTORS = [
  'article',
  'main',
  '.content',
  '.post-content',
  '.entry-content',
  '.article-content',
  '[role="main"]',
  'body'  // fallback
];

// Note: DELAYS configuration removed - parallel processing doesn't need artificial delays

const CONTENT_QUALITY = {
  minimumLength: 100
};

// ========================================
// BROWSER OPERATIONS
// ========================================

const createBrowser = async (): Promise<Browser> => {
  return await chromium.launch(BROWSER_CONFIG);
};

const createPage = async (browser: Browser): Promise<Page> => {
  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUTS.page);
  
  // Set user agent to avoid bot detection
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  return page;
};

const navigateToUrl = async (page: Page, url: string): Promise<void> => {
  await page.goto(url, { 
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.navigation 
  });
  
  // Wait a bit more for dynamic content to load
  await page.waitForTimeout(2000);
};

const closeBrowserSafely = async (browser: Browser): Promise<void> => {
  try {
    await browser.close();
  } catch (closeError) {
    console.error('Error closing browser:', closeError);
  }
};

// ========================================
// CONTENT EXTRACTION
// ========================================

const extractPageTitle = async (page: Page): Promise<string> => {
  return await page.title() || '';
};

const findContentWithSelector = async (page: Page, selector: string): Promise<string> => {
  try {
    const element = await page.$(selector);
    if (element) {
      const content = await element.textContent() || '';
      return content.trim();
    }
  } catch (error) {
    // Selector failed, return empty string
  }
  return '';
};

const extractMainContent = async (page: Page): Promise<string> => {
  for (const selector of CONTENT_SELECTORS) {
    const content = await findContentWithSelector(page, selector);
    if (isContentSubstantial(content)) {
      return content;
    }
  }
  return '';
};

const isContentSubstantial = (content: string): boolean => {
  return content.length > CONTENT_QUALITY.minimumLength;
};

const cleanContent = (rawContent: string): string => {
  return rawContent
    .replace(/\s+/g, ' ')      // Replace multiple whitespace with single space
    .replace(/\n+/g, '\n')     // Replace multiple newlines with single newline
    .trim();                   // Remove leading/trailing space
};

const calculateWordCount = (content: string): number => {
  return content.split(/\s+/).filter(word => word.length > 0).length;
};

const createMetadata = (content: string): ContentMetadata => {
  return {
    wordCount: calculateWordCount(content)
  };
};

// ========================================
// RESULT CREATION
// ========================================

const createSuccessResult = (
  url: string, 
  title: string, 
  content: string, 
  scrapingTime: number
): ScrapedContent => {
  return {
    url,
    title,
    content,
    metadata: createMetadata(content),
    scrapingTime,
    success: true
  };
};

const createErrorResult = (
  url: string, 
  error: Error | unknown, 
  scrapingTime: number
): ScrapedContent => {
  return {
    url,
    title: "",
    content: "",
    metadata: { wordCount: 0 },
    scrapingTime,
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error'
  };
};

// ========================================
// TIMING & DELAYS
// ========================================

const measureTime = () => {
  const startTime = Date.now();
  return () => Date.now() - startTime;
};

// Note: waitBetweenRequests removed - no longer needed with parallel processing

// ========================================
// MAIN FUNCTIONS
// ========================================

/**
 * Scrape content from a single URL
 * 
 * @param url - URL to scrape content from
 * @returns Promise<ScrapedContent> - Scraped content with basic metadata
 */
export const scrapeUrl = async (url: string): Promise<ScrapedContent> => {
  const getElapsedTime = measureTime();
  
  let browser: Browser | undefined;
  
  try {
    browser = await createBrowser();
    const page = await createPage(browser);
    
    await navigateToUrl(page, url);
    
    const title = await extractPageTitle(page);
    const rawContent = await extractMainContent(page);
    const content = cleanContent(rawContent);
    
    await closeBrowserSafely(browser);
    
    const scrapingTime = getElapsedTime();
    const wordCount = calculateWordCount(content);
    
    return createSuccessResult(url, title, content, scrapingTime);
    
  } catch (error) {
    return createErrorResult(url, error, getElapsedTime());
  } finally {
    if (browser) {
      await closeBrowserSafely(browser);
    }
  }
};

/**
 * Scrape multiple URLs in parallel with timeout handling
 * 
 * @param urls - Array of URLs to scrape
 * @returns Promise<ScrapedContent[]> - Array of scraped content
 */
export const scrapeMultipleUrls = async (urls: string[]): Promise<ScrapedContent[]> => {
  console.log(`🚀 Processing ${urls.length} URLs in parallel...`);
  
  // Create individual scraping promises with timeout
  const scrapePromises = urls.map(async (url, index) => {
    const urlIndex = index + 1;
    console.log(`📄 [${urlIndex}/${urls.length}] Starting to scrape: ${url}`);
    
    try {
      // Add timeout to prevent hanging on slow/broken websites
      const result = await Promise.race([
        scrapeUrl(url),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout after 15 seconds`)), 15000)
        )
      ]);
      
      console.log(`✅ [${urlIndex}/${urls.length}] Successfully scraped: ${url} (${result.metadata.wordCount} words)`);
      return result;
      
    } catch (error) {
      console.error(`❌ [${urlIndex}/${urls.length}] Failed to scrape ${url}:`, error instanceof Error ? error.message : error);
      return createErrorResult(url, error, 0);
    }
  });
  
  // Wait for all scraping operations to complete
  console.log(`⏳ Waiting for all ${urls.length} URLs to complete...`);
  const results = await Promise.all(scrapePromises);
  
  // Log final results
  const successCount = results.filter(result => result.success).length;
  const failedCount = results.length - successCount;
  const totalWords = results
    .filter(result => result.success)
    .reduce((sum, result) => sum + result.metadata.wordCount, 0);
  
  console.log(`🎉 Parallel scraping completed:`);
  console.log(`   ✅ Successful: ${successCount}/${results.length}`);
  console.log(`   ❌ Failed: ${failedCount}/${results.length}`);
  console.log(`   📊 Total words extracted: ${totalWords.toLocaleString()}`);
  
  return results;
}; 