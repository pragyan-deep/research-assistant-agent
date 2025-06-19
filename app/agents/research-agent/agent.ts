// agent created from langchain using anthropic claude use the search tool to search the web for information
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

import searchTool from "./tools/search";
import contentProcessorTool from "./tools/content-processor/index";
import { summarizerTool } from "./tools/summarizer/index";
import type { ResearchQuery, AgentConfig } from "./type";

// Streaming callbacks interface
interface StreamingCallbacks {
  onSearchComplete?: (searchResults: any) => void;
  onScrapingStart?: (urls: string[]) => void;
  onScrapingProgress?: (completed: number, total: number, currentUrl?: string) => void;
  onProcessingStart?: (contentPieces: number) => void;
  onAnalysisStart?: () => void;
  onSummaryStart?: (topChunks: number) => void;
  onError?: (error: Error, stage: string) => void;
}

interface StreamingResearchQuery extends ResearchQuery {
  callbacks?: StreamingCallbacks;
}

export class ResearchAgent {
    private llm: ChatAnthropic;
    private agent!: ReturnType<typeof createReactAgent>;
    private config: AgentConfig;

    constructor(config: AgentConfig = {}) {
        this.config = {
            maxResults: 5,
            model: "claude-3-5-sonnet-20241022",
            temperature: 0,
            ...config,
        };

        this.llm = new ChatAnthropic({
            model: this.config.model!,
            temperature: this.config.temperature!,
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        this.initializeAgent();
    }

      private initializeAgent() {
    // Debug: Check if tools are loaded
    console.log("🔧 Initializing agent with tools:");
    console.log("  - Search tool:", searchTool.name);
    console.log("  - Content processor tool:", contentProcessorTool.name);
    console.log("  - Summarizer tool:", summarizerTool.name);
    
    // Create the React agent with tools
    this.agent = createReactAgent({
      llm: this.llm,
      tools: [searchTool, contentProcessorTool, summarizerTool],
    });
  }

    async research(query: ResearchQuery): Promise<{
        result: unknown;
        searchQuery: string;
        timestamp: string;
    }> {
        try {
            console.log(`🔍 Starting research for: "${query.query}"`);

            // Create the research prompt
            const researchPrompt = `You are a helpful research assistant. Please research the following question and provide a comprehensive, well-structured answer:
            "${query.query}"

            Instructions:
            1. Use the web_search tool to find relevant URLs and basic information
            2. Use the content_processor tool to extract full content from promising URLs found in step 1
            3. Use the summarizer tool to generate a high-quality structured summary from the processed content
            4. Provide specific, factual information with proper citations
            5. Mention key sources and findings
            6. If you can't find complete information, acknowledge this

            Available tools:
            - web_search: Find URLs and snippets related to your query
            - content_processor: Extract and filter full content from URLs for detailed analysis  
            - summarizer: Generate structured summaries from filtered content chunks with quality validation

            Workflow:
            1. Search for relevant information using web_search
            2. Process the most promising URLs using content_processor to get filtered, relevant chunks
            3. Generate a comprehensive summary using summarizer with the filtered chunks
            4. Present the final summary with source attribution

            Format your response as a well-structured research summary with proper source attribution.`;

            // Invoke the agent
            console.log("🤖 Invoking agent with prompt...");
            const result = await this.agent.invoke(
                { messages: [new HumanMessage(researchPrompt)] }
            );
            console.log("🤖 Agent response received, messages count:", result.messages?.length || 0);

            return {
                result,
                searchQuery: query.query,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error("Research failed:", error);
            throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async researchWithStreaming(query: StreamingResearchQuery): Promise<{
        result: unknown;
        searchQuery: string;
        timestamp: string;
    }> {
        try {
            console.log(`🔍 Starting streaming research for: "${query.query}"`);

            // Create enhanced research prompt with streaming context
            const researchPrompt = `You are a helpful research assistant. Please research the following question and provide a comprehensive, well-structured answer:
            "${query.query}"

            Instructions:
            1. Use the web_search tool to find relevant URLs and basic information
            2. Use the content_processor tool to extract full content from promising URLs found in step 1
            3. Use the summarizer tool to generate a high-quality structured summary from the processed content
            4. Provide specific, factual information with proper citations
            5. Mention key sources and findings
            6. If you can't find complete information, acknowledge this

            Available tools:
            - web_search: Find URLs and snippets related to your query
            - content_processor: Extract and filter full content from URLs for detailed analysis  
            - summarizer: Generate structured summaries from filtered content chunks with quality validation

            Workflow:
            1. Search for relevant information using web_search
            2. Process the most promising URLs using content_processor to get filtered, relevant chunks
            3. Generate a comprehensive summary using summarizer with the filtered chunks
            4. Present the final summary with source attribution

            Format your response as a well-structured research summary with proper source attribution.

            IMPORTANT: This is a streaming request - tools will emit progress updates during execution.`;

            // Create enhanced agent for streaming with callback interception
            console.log("🤖 Invoking streaming agent with callbacks...");
            
            // Store callbacks globally for tools to access
            (global as any).streamingCallbacks = query.callbacks;

            const result = await this.agent.invoke(
                { messages: [new HumanMessage(researchPrompt)] }
            );

            // Clear global callbacks
            (global as any).streamingCallbacks = undefined;

            console.log("🤖 Streaming agent response received, messages count:", result.messages?.length || 0);

            return {
                result,
                searchQuery: query.query,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error("Streaming research failed:", error);
            
            // Notify error through callback if available
            if (query.callbacks?.onError) {
                query.callbacks.onError(
                    error instanceof Error ? error : new Error('Unknown error'),
                    'agent_execution'
                );
            }
            
            throw new Error(`Streaming research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

}

// Export a default instance for easy usage
export const researchAgent = new ResearchAgent();