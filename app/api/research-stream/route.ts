import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/app/agents/research-agent';

// Stream event types for different stages of research
interface StreamEvent {
  type: 'search' | 'scraping' | 'processing' | 'analysis' | 'summary' | 'complete' | 'error';
  data: any;
  progress: number; // 0-100
  timestamp: string;
  metadata?: any;
}

// Helper function to extract clean content from agent response (same as original API)
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

// Helper function to create SSE formatted message
function createSSEMessage(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Helper function to send SSE event
function sendEvent(controller: ReadableStreamDefaultController, event: StreamEvent): void {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(createSSEMessage(event)));
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

    console.log(`🔍 Starting streaming research for: "${query}"`);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event
          sendEvent(controller, {
            type: 'search',
            data: { message: 'Starting research...', query },
            progress: 0,
            timestamp: new Date().toISOString(),
            metadata: { stage: 'initialization' }
          });

          // Create event callbacks for the research agent
          const eventCallbacks = {
            onSearchComplete: (searchResults: any) => {
              console.log('📡 Streaming search results...');
              sendEvent(controller, {
                type: 'search',
                data: { 
                  message: 'Found relevant sources',
                  searchResults,
                  sourcesFound: searchResults?.length || 0
                },
                progress: 15,
                timestamp: new Date().toISOString(),
                metadata: { stage: 'search_complete' }
              });
            },

            onScrapingStart: (urls: string[]) => {
              console.log('📡 Streaming scraping start...');
              sendEvent(controller, {
                type: 'scraping',
                data: { 
                  message: `Processing ${urls.length} sources...`,
                  urls,
                  totalUrls: urls.length
                },
                progress: 20,
                timestamp: new Date().toISOString(),
                metadata: { stage: 'scraping_start' }
              });
            },

            onScrapingProgress: (completed: number, total: number, currentUrl?: string) => {
              console.log(`📡 Streaming scraping progress: ${completed}/${total}`);
              const progressPercent = 20 + Math.round((completed / total) * 30); // 20-50%
              sendEvent(controller, {
                type: 'scraping',
                data: { 
                  message: `Processed ${completed} of ${total} sources`,
                  completed,
                  total,
                  currentUrl
                },
                progress: progressPercent,
                timestamp: new Date().toISOString(),
                metadata: { stage: 'scraping_progress' }
              });
            },

            onProcessingStart: (contentPieces: number) => {
              console.log('📡 Streaming processing start...');
              sendEvent(controller, {
                type: 'processing',
                data: { 
                  message: `Analyzing ${contentPieces} pieces of content...`,
                  contentPieces
                },
                progress: 55,
                timestamp: new Date().toISOString(),
                metadata: { stage: 'processing_start' }
              });
            },

            onAnalysisStart: () => {
              console.log('📡 Streaming analysis start...');
              sendEvent(controller, {
                type: 'analysis',
                data: { 
                  message: 'Performing relevance analysis and content filtering...'
                },
                progress: 70,
                timestamp: new Date().toISOString(),
                metadata: { stage: 'analysis_start' }
              });
            },

            onSummaryStart: (topChunks: number) => {
              console.log('📡 Streaming summary start...');
              sendEvent(controller, {
                type: 'summary',
                data: { 
                  message: `Generating comprehensive summary from ${topChunks} key insights...`,
                  topChunks
                },
                progress: 85,
                timestamp: new Date().toISOString(),
                metadata: { stage: 'summary_start' }
              });
            },

            onError: (error: Error, stage: string) => {
              console.error('📡 Streaming error:', error);
              sendEvent(controller, {
                type: 'error',
                data: { 
                  message: `Error during ${stage}: ${error.message}`,
                  error: error.message,
                  stage
                },
                progress: -1,
                timestamp: new Date().toISOString(),
                metadata: { stage: 'error' }
              });
            }
          };

          // Start the research with streaming callbacks
          const result = await researchAgent.researchWithStreaming({ 
            query,
            callbacks: eventCallbacks
          });

          // Send final complete result using the same formatting as original API
          console.log('📡 Streaming final results...');
          const formattedResponse = formatResearchResponse(result);
          
          if (!formattedResponse.success) {
            sendEvent(controller, {
              type: 'error',
              data: { 
                message: formattedResponse.error || 'Research formatting failed',
                error: formattedResponse.error,
                details: formattedResponse.details
              },
              progress: -1,
              timestamp: new Date().toISOString(),
              metadata: { stage: 'formatting_error' }
            });
          } else {
            sendEvent(controller, {
              type: 'complete',
              data: {
                message: 'Research completed successfully',
                result: formattedResponse
              },
              progress: 100,
              timestamp: new Date().toISOString(),
              metadata: { stage: 'complete' }
            });
          }

        } catch (error) {
          console.error('❌ Streaming research error:', error);
          sendEvent(controller, {
            type: 'error',
            data: { 
              message: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              error: error instanceof Error ? error.message : 'Unknown error'
            },
            progress: -1,
            timestamp: new Date().toISOString(),
            metadata: { stage: 'fatal_error' }
          });
        } finally {
          // Close the stream
          controller.close();
        }
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Research Stream API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Streaming research failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
} 