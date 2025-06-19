# 🔧 Content Processor Tool

Advanced content processing pipeline for the Research Assistant Agent that transforms raw web URLs into structured, relevant, and analyzable content.

## Overview

The Content Processor Tool is a comprehensive pipeline that takes URLs from search results and processes them through multiple stages to extract, clean, chunk, and filter content based on relevance to the original search query. This tool bridges the gap between basic search snippets and detailed content analysis.

## Architecture

The tool implements a **single comprehensive tool** approach with an internal pipeline consisting of four main stages:

```
URLs → Web Scraper → Content Cleaner → Text Chunker → Relevance Scorer → Structured Output
```

## Pipeline Stages

### 1. 🕷️ Web Scraper
**Purpose**: Extract full content from web pages using headless browser technology.

**Technology**: Playwright (headless Chromium)

**Process**:
- Launch headless browser instance
- Navigate to each URL
- Wait for dynamic content to load (JavaScript, lazy loading)
- Extract main content (article, main, .content selectors)
- Remove unwanted elements (ads, navigation, footer)
- Preserve content structure (headings, paragraphs, lists)

**Output**: Raw HTML content with metadata

### 2. 🧹 Content Cleaner
**Purpose**: Clean and structure the raw scraped content.

**Process**:
- Remove HTML tags and formatting
- Extract metadata (title, author, publish date)
- Identify and preserve citations
- Fix encoding issues
- Remove duplicate content
- Structure content into logical sections

**Output**: Clean text with structured metadata

### 3. ✂️ Text Chunker
**Purpose**: Break large content into manageable, contextual chunks.

**Approach**: Semantic chunking (preferred over fixed-size)

**Process**:
- Split content by natural boundaries (paragraphs, sections, topics)
- Maintain context within chunks
- Preserve important relationships
- Optimize chunk sizes for LLM processing (200-500 words)
- Include metadata with each chunk (source, position, etc.)

**Output**: Array of contextual text chunks

### 4. 🎯 Relevance Scorer
**Purpose**: Score and filter chunks based on relevance to the original query.

**Approach**: Embedding-based similarity (preferred over keyword matching)

**Process**:
- Convert query and chunks to embeddings
- Calculate cosine similarity scores
- Filter chunks above relevance threshold (0.7+)
- Sort by relevance score
- Maintain source attribution

**Output**: Filtered array of relevant chunks with scores

## Input/Output Format

### Input
```typescript
{
  urls: string[];           // Array of URLs to process
  query: string;           // Original search query for relevance scoring
}
```

### Output
```typescript
{
  processedContent: Array<{
    source: {
      url: string;
      title: string;
      author?: string;
      publishDate?: string;
    };
    relevantChunks: Array<{
      content: string;
      relevanceScore: number;
      position: number;
      metadata: {
        section?: string;
        wordCount: number;
      };
    }>;
    totalChunks: number;
    processingTime: number;
  }>;
  summary: {
    totalUrls: number;
    successfulUrls: number;
    totalChunks: number;
    relevantChunks: number;
    averageRelevanceScore: number;
  };
}
```

## Implementation Details

### Dependencies
```json
{
  "playwright": "^1.40.0",
  "cheerio": "^1.0.0-rc.12",
  "@langchain/core": "latest",
  "zod": "^3.22.0"
}
```

### Performance Considerations

**Browser Management**:
- Reuse browser instances across requests
- Implement connection pooling
- Set appropriate timeouts (15 seconds)
- Handle memory cleanup

**Concurrent Processing**:
- Process multiple URLs in parallel
- Limit concurrent browser tabs (max 5)
- Implement queue system for high loads

**Error Handling**:
- Graceful degradation for failed URLs
- Retry mechanism for network issues
- Fallback to cached content when available

### Configuration Options

```typescript
interface ContentProcessorConfig {
  maxUrls?: number;              // Default: 10
  chunkSize?: number;            // Default: 300 words
  relevanceThreshold?: number;   // Default: 0.7
  timeout?: number;              // Default: 15000ms
  retryAttempts?: number;        // Default: 2
  preserveFormatting?: boolean;  // Default: false
}
```

## Error Scenarios

### Handled Errors
- ❌ **URL Timeout** - Skip URL, continue with others
- ❌ **JavaScript Errors** - Extract available content
- ❌ **Network Issues** - Retry with exponential backoff
- ❌ **Memory Limits** - Implement chunked processing
- ❌ **Rate Limiting** - Add delays between requests

### Error Response Format
```typescript
{
  url: string;
  error: string;
  errorType: 'timeout' | 'network' | 'parsing' | 'unknown';
  timestamp: string;
}
```

## Logging & Monitoring

### Log Levels
- 🔧 **INFO** - Processing start/completion
- 🕷️ **DEBUG** - Individual URL processing
- ✂️ **TRACE** - Chunking and scoring details
- ❌ **ERROR** - Failed operations with context

### Metrics Tracked
- Processing time per URL
- Success/failure rates
- Average relevance scores
- Memory usage patterns
- Browser performance metrics

## Integration with Research Agent

### Tool Registration
```typescript
const tools = [
  searchTool,        // Step 1: Find URLs
  contentProcessor   // Step 2: Process URLs → Relevant content
];
```

### Agent Workflow
```typescript
// 1. Agent searches for URLs
const searchResults = await searchTool.invoke({ query });

// 2. Agent processes URLs for detailed content
const processedContent = await contentProcessor.invoke({ 
  urls: searchResults.map(r => r.link),
  query 
});

// 3. Agent synthesizes final response
const response = await synthesizeResponse(processedContent);
```

## Future Enhancements

### Phase 1 (Current)
- [x] Basic web scraping with Playwright
- [x] Content cleaning and structuring
- [x] Semantic text chunking
- [x] Embedding-based relevance scoring

### Phase 2 (Planned)
- [ ] Multi-format support (PDF, Word, etc.)
- [ ] Image content extraction (OCR)
- [ ] Table and structured data extraction
- [ ] Citation link resolution

### Phase 3 (Advanced)
- [ ] Content caching and deduplication
- [ ] Real-time content monitoring
- [ ] Multi-language support
- [ ] Advanced content summarization

## Testing Strategy

### Unit Tests
- Individual pipeline stage testing
- Mock browser responses
- Edge case handling

### Integration Tests
- End-to-end pipeline testing
- Real website processing
- Performance benchmarking

### Load Tests
- Concurrent URL processing
- Memory usage under load
- Browser instance management

## Security Considerations

- **URL Validation** - Prevent malicious URL processing
- **Content Sanitization** - Remove potentially harmful content
- **Rate Limiting** - Respect website robots.txt and rate limits
- **Privacy** - No storage of scraped content beyond processing
- **Resource Limits** - Prevent resource exhaustion attacks

## File Structure

```
content-processor/
├── index.ts              # Main tool implementation
├── README.md             # This documentation
├── modules/
│   ├── web-scraper.ts    # Playwright-based scraping
│   ├── content-cleaner.ts # Content cleaning utilities
│   ├── text-chunker.ts   # Semantic chunking logic
│   └── relevance-scorer.ts # Embedding-based scoring
├── types/
│   └── interfaces.ts     # TypeScript interfaces
└── __tests__/
    ├── unit/             # Unit tests
    └── integration/      # Integration tests
```

---

**The Content Processor Tool transforms shallow search results into deep, relevant content that enables comprehensive research responses.** 🚀 