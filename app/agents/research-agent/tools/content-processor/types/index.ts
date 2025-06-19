/**
 * TypeScript interfaces for Content Processor Tool
 * 
 * This file contains all type definitions used throughout the content processing pipeline
 */

// ========================================
// INPUT/OUTPUT INTERFACES
// ========================================

export interface ContentProcessorInput {
  urls: string[];
  query: string;
}

export interface ContentProcessorOutput {
  processedContent: ProcessedContent[];
  summary: ProcessingSummary;
}

// ========================================
// WEB SCRAPER INTERFACES
// ========================================

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: ContentMetadata;
  scrapingTime: number;
  success: boolean;
  error?: string;
}

export interface ContentMetadata {
  author?: string;
  publishDate?: string;
  canonicalUrl?: string;
  description?: string;
  keywords?: string[];
  wordCount: number;
  language?: string;
}

export interface ScrapingConfig {
  timeout: number;
  waitForNetworkIdle: boolean;
  removeElements: string[];
  contentSelectors: string[];
}

// ========================================
// CONTENT CLEANER INTERFACES
// ========================================

export interface CleanedContent {
  url: string;
  title: string;
  cleanText: string;
  metadata: ContentMetadata;
  sections: ContentSection[];
  citations: string[];
}

export interface ContentSection {
  heading?: string;
  content: string;
  level: number;
  position: number;
}

// ========================================
// TEXT CHUNKER INTERFACES
// ========================================

export interface TextChunk {
  id: string;
  content: string;
  wordCount: number;
  position: number;
  metadata: ChunkMetadata;
  source: ChunkSource;
}

export interface ChunkMetadata {
  section?: string;
  headings: string[];
  hasCode: boolean;
  hasList: boolean;
  hasTable: boolean;
}

export interface ChunkSource {
  url: string;
  title: string;
  startPosition: number;
  endPosition: number;
}

export interface ChunkingConfig {
  maxChunkSize: number;
  minChunkSize: number;
  overlapSize: number;
  preserveFormatting: boolean;
}

// ========================================
// RELEVANCE SCORER INTERFACES
// ========================================

export interface ScoredChunk extends TextChunk {
  relevanceScore: number;
  embedding?: number[];
  matchedKeywords: string[];
}

export interface RelevanceConfig {
  threshold: number;
  embeddingModel: string;
  maxResults: number;
  useKeywordBoost: boolean;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  model: string;
  tokens: number;
}

// ========================================
// FINAL OUTPUT INTERFACES
// ========================================

export interface ProcessedContent {
  source: {
    url: string;
    title: string;
    author?: string;
    publishDate?: string;
  };
  relevantChunks: ScoredChunk[];
  totalChunks: number;
  processingTime: number;
  success: boolean;
  error?: string;
}

export interface ProcessingSummary {
  totalUrls: number;
  successfulUrls: number;
  failedUrls: number;
  totalChunks: number;
  relevantChunks: number;
  averageRelevanceScore: number;
  totalProcessingTime: number;
  timestamp: string;
}

// ========================================
// ERROR HANDLING INTERFACES
// ========================================

export interface ProcessingError {
  url: string;
  stage: 'scraping' | 'cleaning' | 'chunking' | 'scoring';
  error: string;
  errorType: 'timeout' | 'network' | 'parsing' | 'unknown';
  timestamp: string;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// ========================================
// BROWSER MANAGEMENT INTERFACES
// ========================================

export interface BrowserConfig {
  headless: boolean;
  timeout: number;
  userAgent?: string;
  viewport?: {
    width: number;
    height: number;
  };
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
}

export interface BrowserInstance {
  id: string;
  browser: any; // Playwright Browser type
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
  tabCount: number;
}

// ========================================
// UTILITY INTERFACES
// ========================================

export interface ProcessingStats {
  stage: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: number;
  itemsProcessed: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ========================================
// CONFIGURATION INTERFACES
// ========================================

export interface ContentProcessorConfig {
  maxUrls?: number;
  chunkSize?: number;
  relevanceThreshold?: number;
  timeout?: number;
  retryAttempts?: number;
  preserveFormatting?: boolean;
  scraping?: ScrapingConfig;
  chunking?: ChunkingConfig;
  relevance?: RelevanceConfig;
  browser?: BrowserConfig;
  retry?: RetryConfig;
} 