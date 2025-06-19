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
// BROWSER MANAGEMENT (Single Browser + Multiple Pages)
// ========================================

/**
 * Single Browser Manager for optimal resource usage
 * Creates one browser with multiple pages for parallel processing
 */
class SingleBrowserManager {
  private browser: Browser | null = null;
  private pages: Page[] = [];
  private maxPages: number;

  constructor(maxPages = 5) {
    this.maxPages = maxPages;
  }

  /**
   * Pre-create browser and pages based on URL count
   */
  async initialize(urlCount: number): Promise<void> {
    console.log(`🌐 Initializing single browser with ${urlCount} pages...`);
    
    // Create single browser instance
    this.browser = await chromium.launch(BROWSER_CONFIG);
    
    // Create pages based on URL count (up to maxPages)
    const pageCount = Math.min(urlCount, this.maxPages);
    const pagePromises = Array(pageCount).fill(0).map(() => this.createPage());
    this.pages = await Promise.all(pagePromises);
    
    console.log(`✅ Browser initialized with ${this.pages.length} pages ready`);
  }

  /**
   * Create a configured page from the browser
   */
  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    
    // Set default timeouts and headers
    page.setDefaultTimeout(TIMEOUTS.page);
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    return page;
  }

  /**
   * Get a pre-created page for scraping
   */
  getPage(index: number): Page {
    if (index >= this.pages.length) {
      throw new Error(`Page index ${index} out of range (${this.pages.length} pages available)`);
    }
    return this.pages[index];
  }

  /**
   * Get all pages for parallel processing
   */
  getAllPages(): Page[] {
    return [...this.pages];
  }

  /**
   * Close browser and all pages
   */
  async closeAll(): Promise<void> {
    if (this.browser && this.browser.isConnected()) {
      console.log(`🔒 Closing browser with ${this.pages.length} pages...`);
      
      try {
        await this.browser.close();
        this.browser = null;
        this.pages = [];
        console.log('✅ Browser closed successfully');
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    }
  }

  /**
   * Get manager status for debugging
   */
  getStatus() {
    return {
      browserConnected: this.browser?.isConnected() || false,
      totalPages: this.pages.length,
      maxPages: this.maxPages
    };
  }
}

/**
 * Browser Pool for efficient browser instance management
 * Reduces startup overhead by reusing browser instances
 * (Legacy implementation - kept for fallback)
 */
class BrowserPool {
  private browsers: Browser[] = [];
  private maxBrowsers: number;
  private activeBrowserCount = 0;

  constructor(maxBrowsers = 3) {
    this.maxBrowsers = maxBrowsers;
  }

  /**
   * Get an available browser instance (create if needed)
   */
  async getBrowser(): Promise<Browser> {
    // Find an existing browser that's still connected
    for (const browser of this.browsers) {
      if (browser.isConnected()) {
        return browser;
      }
    }

    // Remove disconnected browsers
    this.browsers = this.browsers.filter(b => b.isConnected());

    // Create new browser if under limit
    if (this.browsers.length < this.maxBrowsers) {
      console.log(`🌐 Creating new browser instance (${this.browsers.length + 1}/${this.maxBrowsers})`);
      const browser = await chromium.launch(BROWSER_CONFIG);
      this.browsers.push(browser);
      return browser;
    }

    // Return random existing browser if at limit
    return this.browsers[Math.floor(Math.random() * this.browsers.length)];
  }

  /**
   * Get a new page from the browser pool
   */
  async getPage(): Promise<{ browser: Browser; page: Page }> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Set default timeouts and headers
    page.setDefaultTimeout(TIMEOUTS.page);
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    return { browser, page };
  }

  /**
   * Close all browser instances
   */
  async closeAll(): Promise<void> {
    console.log(`🔒 Closing ${this.browsers.length} browser instances...`);
    
    const closePromises = this.browsers.map(async (browser) => {
      try {
        if (browser.isConnected()) {
          await browser.close();
        }
      } catch (error) {
        console.error('Error closing browser:', error);
      }
    });

    await Promise.all(closePromises);
    this.browsers = [];
    console.log('✅ All browsers closed');
  }

  /**
   * Get pool status for debugging
   */
  getStatus() {
    return {
      totalBrowsers: this.browsers.length,
      connectedBrowsers: this.browsers.filter(b => b.isConnected()).length,
      maxBrowsers: this.maxBrowsers
    };
  }
}

// Global browser pool instance
let globalBrowserPool: BrowserPool | null = null;

/**
 * Get or create the global browser pool
 */
const getBrowserPool = (): BrowserPool => {
  if (!globalBrowserPool) {
    globalBrowserPool = new BrowserPool(3); // Max 3 concurrent browsers
  }
  return globalBrowserPool;
};

/**
 * Cleanup function for graceful shutdown
 * Handles both optimized and legacy browser management
 */
export const closeBrowserPool = async (): Promise<void> => {
  if (globalBrowserPool) {
    await globalBrowserPool.closeAll();
    globalBrowserPool = null;
  }
  
  // Note: SingleBrowserManager instances are cleaned up automatically
  // in their respective functions, but this ensures any global cleanup
  console.log('🧹 Browser cleanup completed');
};

// ========================================
// BROWSER OPERATIONS
// ========================================

// Browser creation functions removed - now handled by BrowserPool

const navigateToUrl = async (page: Page, url: string): Promise<void> => {
  await page.goto(url, { 
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.navigation 
  });
  
  // Wait a bit more for dynamic content to load
  await page.waitForTimeout(2000);
};

// Browser closing function removed - now handled by BrowserPool

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
 * Scrape content from a single URL using pre-created page
 * (Optimized version for parallel processing)
 */
const scrapeWithPreCreatedPage = async (
  url: string, 
  page: Page, 
  index: number, 
  total: number
): Promise<ScrapedContent> => {
  const getElapsedTime = measureTime();
  
  try {
    console.log(`📄 [${index}/${total}] Starting to scrape: ${url}`);
    
    // Use the pre-created page directly (no browser creation overhead)
    await navigateToUrl(page, url);
    
    const title = await extractPageTitle(page);
    const rawContent = await extractMainContent(page);
    const content = cleanContent(rawContent);
    
    const result = createSuccessResult(url, title, content, getElapsedTime());
    console.log(`✅ [${index}/${total}] Successfully scraped: ${url} (${result.metadata.wordCount} words)`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ [${index}/${total}] Failed to scrape ${url}:`, error instanceof Error ? error.message : error);
    return createErrorResult(url, error, getElapsedTime());
  }
  // Note: Don't close page - it will be closed with the browser
};

/**
 * Scrape content from a single URL using browser pool
 * (Legacy version - kept for backward compatibility)
 * 
 * @param url - URL to scrape content from
 * @returns Promise<ScrapedContent> - Scraped content with basic metadata
 */
export const scrapeUrl = async (url: string): Promise<ScrapedContent> => {
  const getElapsedTime = measureTime();
  
  let page: Page | undefined;
  
  try {
    // Get page from browser pool (much faster than creating new browser)
    const browserPool = getBrowserPool();
    const { browser, page: newPage } = await browserPool.getPage();
    page = newPage;
    
    await navigateToUrl(page, url);
    
    const title = await extractPageTitle(page);
    const rawContent = await extractMainContent(page);
    const content = cleanContent(rawContent);
    
    const scrapingTime = getElapsedTime();
    
    return createSuccessResult(url, title, content, scrapingTime);
    
  } catch (error) {
    return createErrorResult(url, error, getElapsedTime());
  } finally {
    // Close only the page, not the browser (browser is reused)
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error('Error closing page:', closeError);
      }
    }
  }
};

/**
 * Scrape multiple URLs with single browser + multiple pages (OPTIMIZED)
 * 
 * @param urls - Array of URLs to scrape
 * @returns Promise<ScrapedContent[]> - Array of scraped content
 */
const scrapeMultipleUrlsOptimized = async (urls: string[]): Promise<ScrapedContent[]> => {
  console.log(`🚀 Processing ${urls.length} URLs with single browser + multiple pages...`);
  
  const browserManager = new SingleBrowserManager();
  
  try {
    // Phase 1: Pre-create browser and pages (2-3 seconds)
    await browserManager.initialize(urls.length);
    const status = browserManager.getStatus();
    console.log(`🌐 Browser Status: ${status.browserConnected ? 'Connected' : 'Disconnected'}, ${status.totalPages} pages ready`);
    
    // Phase 2: Distribute URLs to pre-created pages and scrape in parallel (5-7 seconds)
    console.log(`⏳ Starting parallel scraping with pre-created pages...`);
    
    const scrapePromises = urls.map(async (url, index) => {
      const urlIndex = index + 1;
      
      try {
        // Add timeout to prevent hanging on slow/broken websites
        const result = await Promise.race([
          scrapeWithPreCreatedPage(url, browserManager.getPage(index), urlIndex, urls.length),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout after 15 seconds`)), 15000)
          )
        ]);
        
        return result;
        
      } catch (error) {
        console.error(`❌ [${urlIndex}/${urls.length}] Failed to scrape ${url}:`, error instanceof Error ? error.message : error);
        return createErrorResult(url, error, 0);
      }
    });
    
    const results = await Promise.all(scrapePromises);
    
    // Log final results
    const successCount = results.filter(result => result.success).length;
    const failedCount = results.length - successCount;
    const totalWords = results
      .filter(result => result.success)
      .reduce((sum, result) => sum + result.metadata.wordCount, 0);
    
    console.log(`🎉 Single browser scraping completed:`);
    console.log(`   ✅ Successful: ${successCount}/${results.length}`);
    console.log(`   ❌ Failed: ${failedCount}/${results.length}`);
    console.log(`   📊 Total words extracted: ${totalWords.toLocaleString()}`);
    console.log(`   🌐 Browser optimization: 1 browser, ${status.totalPages} pages used`);
    
    return results;
    
  } finally {
    // Always cleanup browser
    await browserManager.closeAll();
  }
};

/**
 * Scrape multiple URLs in parallel with browser pool optimization (LEGACY)
 * 
 * @param urls - Array of URLs to scrape
 * @returns Promise<ScrapedContent[]> - Array of scraped content
 */
const scrapeMultipleUrlsLegacy = async (urls: string[]): Promise<ScrapedContent[]> => {
  console.log(`🚀 Processing ${urls.length} URLs in parallel with browser pool...`);
  
  const browserPool = getBrowserPool();
  const poolStatus = browserPool.getStatus();
  console.log(`🌐 Browser Pool Status: ${poolStatus.connectedBrowsers}/${poolStatus.maxBrowsers} browsers ready`);
  
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
  
  // Log final results with browser pool status
  const successCount = results.filter(result => result.success).length;
  const failedCount = results.length - successCount;
  const totalWords = results
    .filter(result => result.success)
    .reduce((sum, result) => sum + result.metadata.wordCount, 0);
  
  const finalPoolStatus = browserPool.getStatus();
  
  console.log(`🎉 Parallel scraping completed with browser pool:`);
  console.log(`   ✅ Successful: ${successCount}/${results.length}`);
  console.log(`   ❌ Failed: ${failedCount}/${results.length}`);
  console.log(`   📊 Total words extracted: ${totalWords.toLocaleString()}`);
  console.log(`   🌐 Browser pool: ${finalPoolStatus.connectedBrowsers} browsers still active`);
  
  return results;
};

/**
 * Main export: Scrape multiple URLs with intelligent optimization
 * Uses single browser + multiple pages for optimal performance
 * Falls back to browser pool if needed
 * 
 * @param urls - Array of URLs to scrape
 * @returns Promise<ScrapedContent[]> - Array of scraped content
 */
export const scrapeMultipleUrls = async (urls: string[]): Promise<ScrapedContent[]> => {
  // Validation
  if (!urls || urls.length === 0) {
    console.log('⚠️ No URLs provided for scraping');
    return [];
  }

  // Use optimized single browser approach for typical workloads
  if (urls.length <= 5) {
    try {
      return await scrapeMultipleUrlsOptimized(urls);
    } catch (error) {
      console.warn('⚠️ Single browser optimization failed, falling back to browser pool:', error instanceof Error ? error.message : error);
      return await scrapeMultipleUrlsLegacy(urls);
    }
  } else {
    // For larger workloads, use legacy browser pool approach
    console.log(`📊 Large workload detected (${urls.length} URLs), using browser pool approach`);
    return await scrapeMultipleUrlsLegacy(urls);
  }
}; 