// agent created from langchain using anthropic claude use the search tool to search the web for information
import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

import searchTool from "./tools/search";
import contentProcessorTool from "./tools/content-processor/index";
import type { ResearchQuery, AgentConfig } from "./type";

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
    
    // Create the React agent with tools
    this.agent = createReactAgent({
      llm: this.llm,
      tools: [searchTool, contentProcessorTool],
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
            3. Synthesize information from multiple sources when possible  
            4. Provide specific, factual information with proper citations
            5. Mention key sources and findings
            6. If you can't find complete information, acknowledge this

            Available tools:
            - web_search: Find URLs and snippets related to your query
            - content_processor: Extract full content from URLs for detailed analysis

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




}

// Export a default instance for easy usage
export const researchAgent = new ResearchAgent();