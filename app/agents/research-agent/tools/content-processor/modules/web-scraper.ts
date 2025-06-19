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
  page: 15000,
  navigation: 15000
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

const DELAYS = {
  betweenRequests: 1000
};

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
  return page;
};

const navigateToUrl = async (page: Page, url: string): Promise<void> => {
  await page.goto(url, { 
    waitUntil: 'networkidle',
    timeout: TIMEOUTS.navigation 
  });
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

const waitBetweenRequests = async (): Promise<void> => {
  console.log('⏳ Waiting 1 second before next request...');
  await new Promise(resolve => setTimeout(resolve, DELAYS.betweenRequests));
};

// ========================================
// LOGGING
// ========================================

const logScrapingStart = (url: string): void => {
  console.log(`🕷️ Scraping: ${url}`);
};

const logScrapingSuccess = (scrapingTime: number, wordCount: number): void => {
  console.log(`✅ Scraped in ${scrapingTime}ms - ${wordCount} words`);
};

const logScrapingError = (url: string, error: unknown): void => {
  console.error(`❌ Scraping failed for ${url}:`, error);
};

const logBatchProgress = (current: number, total: number, url: string): void => {
  console.log(`📄 Processing ${current}/${total}: ${url}`);
};

const logBatchCompletion = (successCount: number, totalCount: number): void => {
  console.log(`✅ Completed scraping ${successCount}/${totalCount} URLs successfully`);
};

const logBatchStart = (urlCount: number): void => {
  console.log(`🕷️ Scraping ${urlCount} URLs sequentially`);
};

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
  logScrapingStart(url);
  
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
    
    logScrapingSuccess(scrapingTime, wordCount);
    
    return createSuccessResult(url, title, content, scrapingTime);
    
  } catch (error) {
    logScrapingError(url, error);
    return createErrorResult(url, error, getElapsedTime());
  } finally {
    if (browser) {
      await closeBrowserSafely(browser);
    }
  }
};

/**
 * Scrape multiple URLs sequentially
 * 
 * @param urls - Array of URLs to scrape
 * @returns Promise<ScrapedContent[]> - Array of scraped content
 */
export const scrapeMultipleUrls = async (urls: string[]): Promise<ScrapedContent[]> => {
  logBatchStart(urls.length);
  
  const results: ScrapedContent[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const isLastUrl = i === urls.length - 1;
    
    logBatchProgress(i + 1, urls.length, url);
    
    try {
      const result = await scrapeUrl(url);
      results.push(result);
      
      if (!isLastUrl) {
        await waitBetweenRequests();
      }
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
      
      const errorResult = createErrorResult(url, error, 0);
      results.push(errorResult);
    }
  }
  
  const successCount = results.filter(result => result.success).length;
  logBatchCompletion(successCount, urls.length);
  
  return results;
}; 