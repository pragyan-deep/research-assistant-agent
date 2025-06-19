# 🔍 Search Tool

Web search functionality for the Research Assistant Agent using the Serper API.

## Overview

The Search Tool provides web search capabilities by integrating with Google Search through the Serper API. It returns relevant search results with titles, snippets, and links that can be used for further content processing.

## Features

- ✅ **Google Search Integration** - Uses Serper API for reliable search results
- ✅ **Error Handling** - Comprehensive error handling with detailed logging
- ✅ **Result Limiting** - Returns top 5 most relevant results
- ✅ **Type Safety** - Full TypeScript support with defined interfaces
- ✅ **LangChain Integration** - Seamlessly works with LangChain agents

## Configuration

### Environment Variables

```bash
SERPER_API_KEY=your_serper_api_key_here
```

Get your API key from: https://serper.dev/

## Usage

### As a LangChain Tool

```typescript
import searchTool from './tools/search';

// Use with LangChain agent
const agent = createReactAgent({
  llm: llm,
  tools: [searchTool],
});
```

### Direct Function Call

```typescript
import searchTool from './tools/search';

const results = await searchTool.invoke({ 
  query: "latest AI developments 2024" 
});
```

## Response Format

```json
[
  {
    "title": "Article Title",
    "snippet": "Brief description of the content...",
    "link": "https://example.com/article",
    "position": 1
  }
]
```

## Error Handling

The tool handles various error scenarios:

- ❌ **Missing API Key** - Clear error message with setup instructions
- ❌ **API Rate Limits** - Proper error propagation
- ❌ **Network Issues** - Timeout and connection error handling
- ❌ **Invalid Responses** - JSON parsing and validation errors

## Logging

The tool provides detailed console logging:

- 🔍 **Query Start** - Logs the search query being processed
- ✅ **API Key Check** - Confirms API key availability
- 📡 **API Response** - Logs response status
- ✅ **Success** - Reports number of results found
- ❌ **Errors** - Detailed error information

## File Structure

```
search/
├── index.ts          # Main tool implementation
└── README.md         # This documentation
```

## Types

### SearchResult
```typescript
interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  position?: number;
}
```

### SerperResponse
```typescript
interface SerperResponse {
  organic?: SearchResult[];
  error?: string;
}
```

## Future Enhancements

- [ ] Support for different search types (images, news, etc.)
- [ ] Configurable result limits
- [ ] Search result caching
- [ ] Multiple search provider support
- [ ] Advanced search filters 