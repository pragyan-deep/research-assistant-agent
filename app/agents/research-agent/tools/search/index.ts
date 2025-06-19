import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Search Tool - Web Search Functionality
 * 
 * This tool provides web search capabilities using the Serper API.
 * It searches the web for relevant information based on user queries.
 */

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  position?: number;
}

interface SerperResponse {
  organic?: SearchResult[];
  error?: string;
}

/**
 * Core search function that calls the Serper API
 * @param query - The search query string
 * @returns Promise<string> - JSON stringified search results
 */
const executeSearch = async ({ query }: { query: string }): Promise<string> => {
  console.log("🔍 SEARCH TOOL CALLED with query:", query);
  
  // Validate API key
  if (!process.env.SERPER_API_KEY) {
    console.log("❌ SERPER_API_KEY not found");
    throw new Error("SERPER_API_KEY environment variable is not set. Please add it to your .env.local file.");
  }

  console.log("✅ SERPER_API_KEY found, making API call...");

  try {
    // Make API call to Serper
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    console.log("📡 API Response status:", response.status);

    // Check response status
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status} ${response.statusText}`);
    }
    
    // Parse response data
    const data: SerperResponse = await response.json();
    
    if (data.error) {
      throw new Error(`Search API error: ${data.error}`);
    }

    // Extract and limit results
    const results = data.organic?.slice(0, 5) || [];
    console.log("✅ Search completed, found", results.length, "results");
    
    return JSON.stringify(results, null, 2);
  } catch (error) {
    console.error("❌ Search tool error:", error);
    throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * LangChain tool definition for web search
 */
const searchTool = tool(
  executeSearch,
  {
    name: "web_search",
    description: "Search the web for current information using Google search. Returns up to 5 relevant results with titles, snippets, and links.",
    schema: z.object({
      query: z.string().describe("The search query to execute - be specific and descriptive for better results")
    })
  }
);

export default searchTool;

// Export types for use in other parts of the application
export type { SearchResult, SerperResponse }; 