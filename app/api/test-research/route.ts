import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/app/agents/research-agent';

// Helper function to extract clean content from agent response
function formatResearchResponse(agentResult: any) {
  try {
    const messages = agentResult.result?.messages || [];
    
    // Find the final AI message with the research summary
    // Try different content locations based on LangChain message structure
    let finalContent = '';
    
    // Look for the last message with content
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      
      // Check different possible content locations
      if (msg.kwargs?.content && typeof msg.kwargs.content === 'string') {
        finalContent = msg.kwargs.content;
        break;
      } else if (msg.content && typeof msg.content === 'string') {
        finalContent = msg.content;
        break;
      } else if (Array.isArray(msg.kwargs?.content)) {
        // Handle content arrays (tool use format)
        const textContent = msg.kwargs.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n');
        if (textContent) {
          finalContent = textContent;
          break;
        }
      }
    }
    
    if (!finalContent) {
      console.error('No content found. Message structure:', JSON.stringify(messages.slice(-2), null, 2));
      return {
        success: false,
        error: 'No research content found in agent response',
        debug: {
          messageCount: messages.length,
          lastMessageType: messages[messages.length - 1]?.type || 'unknown'
        }
      };
    }
    
    // Extract metadata from the response
    const toolCalls = messages
      .filter((msg: any) => msg.tool_calls?.length > 0)
      .flatMap((msg: any) => msg.tool_calls);
    
    const searchCalls = toolCalls.filter((call: any) => call.name === 'web_search');
    const processorCalls = toolCalls.filter((call: any) => call.name === 'content_processor');
    const summarizerCalls = toolCalls.filter((call: any) => call.name === 'summarizer');
    
    return {
      success: true,
      query: agentResult.searchQuery || 'Unknown query',
      content: finalContent,
      metadata: {
        timestamp: agentResult.timestamp || new Date().toISOString(),
        toolsUsed: {
          search: searchCalls.length > 0,
          contentProcessor: processorCalls.length > 0,
          summarizer: summarizerCalls.length > 0
        },
        processingStats: {
          totalMessages: messages.length,
          toolCalls: toolCalls.length,
          searchQueries: searchCalls.length,
          contentProcessed: processorCalls.length,
          summariesGenerated: summarizerCalls.length
        }
      }
    };
    
  } catch (error) {
    console.error('Error formatting response:', error);
    return {
      success: false,
      error: 'Failed to format research response',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' }, 
        { status: 400 }
      );
    }

    console.log(`🔍 Processing research query: "${query}"`);

    // Use the research agent
    const agentResult = await researchAgent.research({ query });
    
    // Format the response for user-friendly display
    const formattedResponse = formatResearchResponse(agentResult);
    
    if (!formattedResponse.success) {
      return NextResponse.json(formattedResponse, { status: 500 });
    }
    
    console.log(`✅ Research completed for: "${query}"`);
    
    return NextResponse.json(formattedResponse);
    
  } catch (error) {
    console.error('Research API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Research failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
} 