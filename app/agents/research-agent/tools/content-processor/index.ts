import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { scrapeMultipleUrls } from "./modules/web-scraper";
import { cleanMultipleContent, type CleanedContent } from "./modules/content-cleaner";
import { chunkMultipleTexts, type ChunkedContent, type TextChunk } from "./modules/text-chunker";

/**
 * Content Processor Tool - Web Content Processing Pipeline
 * 
 * This tool transforms raw web URLs into structured content using web scraping.
 * Currently implements Stage 1 (Web Scraping) with placeholders for future stages.
 */

interface ContentProcessorInput {
  urls: string[];
  query: string;
}

/**
 * Main content processing function that orchestrates the pipeline
 * 
 * Current Implementation:
 * 1. Web Scraper - Extract full content from URLs using headless browser ✅
 * 2. Content Cleaner - Clean and structure content ✅
 * 3. Text Chunker - Break content into chunks ✅
 * 4. Relevance Scorer - Score and filter chunks (TODO)
 * 
 * @param input - Object containing URLs array and search query
 * @returns Promise<string> - JSON stringified processed content
 */
const processContent = async ({ urls, query }: ContentProcessorInput): Promise<string> => {
  console.log("🔧 Starting content processing pipeline...");
  console.log(`📋 Processing ${urls.length} URLs for query: "${query}"`);
  
  try {
    // ========================================
    // STAGE 1: WEB SCRAPER ✅ IMPLEMENTED
    // ========================================
    console.log("🕷️ Stage 1: Web Scraping - Extracting content from URLs...");
    
    const scrapedResults = await scrapeMultipleUrls(urls);
    
    // Filter successful scrapes
    const successfulScrapes = scrapedResults.filter(result => result.success);
    const failedScrapes = scrapedResults.filter(result => !result.success);
    
    console.log(`✅ Scraping completed: ${successfulScrapes.length}/${urls.length} successful`);
    
    if (failedScrapes.length > 0) {
      console.log(`⚠️ Failed to scrape ${failedScrapes.length} URLs:`, 
        failedScrapes.map(f => f.url));
    }
    
    // ========================================
    // STAGE 2: CONTENT CLEANER ✅ IMPLEMENTED
    // ========================================
    console.log("🧹 Stage 2: Content Cleaning - Cleaning scraped content...");
    
    // Prepare content for cleaning
    const contentToClean = successfulScrapes.map(scraped => ({
      content: scraped.content,
      title: scraped.title,
      url: scraped.url
    }));
    
    // Clean the content using the content cleaner
    const cleanedResults = await cleanMultipleContent(contentToClean);
    
    console.log(`✅ Content cleaning completed for ${cleanedResults.length} items`);
    
    // ========================================
    // STAGE 3: TEXT CHUNKER ✅ IMPLEMENTED
    // ========================================
    console.log("✂️ Stage 3: Text Chunking - Breaking content into manageable chunks...");
    
    // Prepare content for chunking
    const contentToChunk = cleanedResults.map((cleaned, index) => ({
      content: cleaned.content,
      title: successfulScrapes[index].title,
      url: successfulScrapes[index].url,
      originalIndex: index
    }));
    
    // Chunk the content using the text chunker
    const chunkedResults = await chunkMultipleTexts(contentToChunk);
    
    // Flatten all chunks from all sources
    const allChunks = chunkedResults.flatMap(result => result.chunks);
    
    console.log(`✅ Text chunking completed: ${allChunks.length} total chunks created`);
    
    // ========================================
    // STAGE 4: RELEVANCE SCORER (TODO)
    // ========================================
    console.log("🎯 Stage 4: Relevance Scoring - Returning all chunks for now...");
    // TODO: Implement relevance scoring logic
    // For now, return all created chunks
    
    // ========================================
    // FINAL OUTPUT ASSEMBLY
    // ========================================
    console.log("📊 Assembling final processed content output...");
    
    // Create processed content from chunks
    const processedContent = allChunks.map(chunk => ({
      id: chunk.id,
      source: {
        url: chunk.source.url,
        title: chunk.source.title
      },
      content: chunk.content, // Use chunked content
      metadata: {
        chunkPosition: chunk.metadata.position,
        chunkWordCount: chunk.metadata.wordCount,
        chunkCharCount: chunk.metadata.charCount,
        hasOverlap: chunk.metadata.hasOverlap,
        chunkingMethod: chunk.metadata.chunkingMethod,
        originalIndex: chunk.source.originalIndex
      },
      success: true
    }));
    
    // Calculate processing metadata for each original source
    const sourceMetadata = successfulScrapes.map((scraped, index) => {
      const cleanedData = cleanedResults[index];
      const chunkedData = chunkedResults[index];
      const sourceChunks = allChunks.filter(chunk => chunk.source.originalIndex === index);
      
      return {
        url: scraped.url,
        title: scraped.title,
        originalWordCount: scraped.metadata.wordCount,
        cleanedWordCount: Math.round(cleanedData.content.split(/\s+/).length),
        totalChunks: chunkedData.metadata.totalChunks,
        averageChunkSize: chunkedData.metadata.averageChunkSize,
        scrapingTime: scraped.scrapingTime,
        cleaningTime: cleanedData.metadata.processingTime,
        chunkingTime: chunkedData.metadata.processingTime,
        contentReduction: cleanedData.metadata.reductionPercentage
      };
    });
    
    const summary = {
      totalUrls: urls.length,
      successfulUrls: successfulScrapes.length,
      failedUrls: failedScrapes.length,
      totalChunks: allChunks.length,
      originalTotalWords: successfulScrapes.reduce((sum, s) => sum + s.metadata.wordCount, 0),
      cleanedTotalWords: sourceMetadata.reduce((sum, s) => sum + s.cleanedWordCount, 0),
      chunkedTotalWords: processedContent.reduce((sum, p) => sum + p.metadata.chunkWordCount, 0),
      averageOriginalWordsPerUrl: successfulScrapes.length > 0 
        ? Math.round(successfulScrapes.reduce((sum, s) => sum + s.metadata.wordCount, 0) / successfulScrapes.length)
        : 0,
      averageCleanedWordsPerUrl: sourceMetadata.length > 0
        ? Math.round(sourceMetadata.reduce((sum, s) => sum + s.cleanedWordCount, 0) / sourceMetadata.length)
        : 0,
      averageChunksPerUrl: sourceMetadata.length > 0
        ? Math.round(sourceMetadata.reduce((sum, s) => sum + s.totalChunks, 0) / sourceMetadata.length)
        : 0,
      averageChunkSize: allChunks.length > 0
        ? Math.round(allChunks.reduce((sum, chunk) => sum + chunk.metadata.wordCount, 0) / allChunks.length)
        : 0,
      averageContentReduction: sourceMetadata.length > 0
        ? Math.round(sourceMetadata.reduce((sum, s) => sum + s.contentReduction, 0) / sourceMetadata.length)
        : 0,
      processingTime: Date.now(),
      timestamp: new Date().toISOString()
    };
    
    const result = {
      processedContent,
      sourceMetadata,
      summary,
      query,
      stage: "web_scraping_cleaning_and_chunking" // Indicates current implementation level
    };
    
    console.log("✅ Content processing pipeline completed successfully");
    console.log(`📊 Summary: ${summary.successfulUrls}/${summary.totalUrls} URLs, ${summary.totalChunks} chunks, ${summary.chunkedTotalWords} words (avg ${summary.averageChunkSize} words/chunk)`);
    
    return JSON.stringify(result, null, 2);
    
  } catch (error) {
    console.error("❌ Content processing pipeline failed:", error);
    throw new Error(`Content processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * LangChain tool definition for content processing
 */
const contentProcessorTool = tool(
  processContent,
  {
    name: "content_processor",
    description: "Process web URLs to extract full content using web scraping. Currently implements web scraping stage with structured output including titles, content, and metadata.",
    schema: z.object({
      urls: z.array(z.string()).describe("Array of URLs to process and extract content from"),
      query: z.string().describe("Original search query for context (used in future stages)")
    })
  }
);

export default contentProcessorTool; 