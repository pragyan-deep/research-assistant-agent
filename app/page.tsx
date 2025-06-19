'use client';

import { useState, useRef, useEffect } from 'react';
import Image from "next/image";

// Stream event interface
interface StreamEvent {
  type: 'search' | 'scraping' | 'processing' | 'analysis' | 'summary' | 'complete' | 'error';
  data: any;
  progress: number;
  timestamp: string;
  metadata?: any;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleResearch = async () => {
    if (!query.trim()) return;
    
    // Reset state
    setLoading(true);
    setResult(null);
    setStreamEvents([]);
    setCurrentStage('Initializing...');
    setProgress(0);
    
    // Close existing EventSource if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    try {
      // Create POST request to initiate streaming
      const response = await fetch('/api/research-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: query.trim()
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Create EventSource for streaming updates
      // Note: We need to use a different approach since EventSource doesn't support POST
      // Instead, we'll read the stream response directly
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                handleStreamEvent(eventData);
              } catch (e) {
                console.error('Error parsing stream data:', e);
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Streaming research error:', error);
      setResult({ 
        success: false,
        error: 'Streaming request failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStreamEvent = (event: StreamEvent) => {
    console.log('📡 Received stream event:', event);
    
    // Add event to history
    setStreamEvents(prev => [...prev, event]);
    
    // Update current stage and progress
    setProgress(event.progress);
    
    switch (event.type) {
      case 'search':
        setCurrentStage(event.data.message || 'Searching...');
        break;
      case 'scraping':
        setCurrentStage(event.data.message || 'Processing content...');
        break;
      case 'processing':
        setCurrentStage(event.data.message || 'Analyzing content...');
        break;
      case 'analysis':
        setCurrentStage(event.data.message || 'Performing analysis...');
        break;
      case 'summary':
        setCurrentStage(event.data.message || 'Generating summary...');
        break;
      case 'complete':
        setCurrentStage('Research completed!');
        console.log('📡 Setting final result:', event.data.result);
        console.log('📡 Result content:', event.data.result?.content);
        setResult(event.data.result);
        setLoading(false);
        break;
      case 'error':
        setCurrentStage('Error occurred');
        console.error('📡 Stream error event:', event.data);
        setResult({
          success: false,
          error: event.data.error || 'Unknown error',
          details: event.data.message
        });
        setLoading(false);
        break;
    }
  };

   // Cleanup on component unmount
   useEffect(() => {
     return () => {
       if (eventSourceRef.current) {
         eventSourceRef.current.close();
       }
     };
   }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">RA</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Research Assistant</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            AI-Powered Research Assistant
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get comprehensive, well-researched answers to any question. 
            Powered by Claude AI with real-time web search, content processing, and intelligent summarization.
          </p>
        </div>

        {/* Search Interface */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="mb-4">
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to research?
            </label>
            <div className="flex gap-3">
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me anything... e.g., 'What is machine learning?'"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleResearch()}
              />
              <button
                onClick={handleResearch}
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="min-w-0 truncate">{currentStage}</span>
                  </div>
                ) : (
                  'Research'
                )}
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Try:</span>
            {[
              'What is React Server Components?',
              'Latest AI developments 2024',
              'How does TypeScript work?'
            ].map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar and Streaming Events */}
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Research Progress</h3>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              ></div>
            </div>
            
            {/* Current Stage */}
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">{currentStage}</span>
            </div>

            {/* Recent Events */}
            {streamEvents.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Activity:</h4>
                <div className="space-y-1">
                  {streamEvents.slice(-5).map((event, index) => (
                    <div key={index} className="text-xs text-gray-500 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        event.type === 'error' ? 'bg-red-500' :
                        event.type === 'complete' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}></div>
                      <span className="truncate">{event.data.message}</span>
                      <span className="text-gray-400 ml-auto">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                result.success ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <span className="text-white text-xs">{result.success ? '✓' : '!'}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                {result.success ? 'Research Results' : 'Error'}
              </h3>
            </div>
            
            {!result.success ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error: {result.error}</p>
                {result.details && (
                  <p className="text-red-600 text-sm mt-2">{result.details}</p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Main Research Content */}
                <div>
                  <div className="prose prose-lg max-w-none">
                    <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {result.content}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Streaming Events Summary */}
                {streamEvents.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mt-6">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">📡 Research Timeline</h4>
                    <div className="space-y-2">
                      {streamEvents.map((event, index) => (
                        <div key={index} className="flex items-center gap-3 text-sm">
                          <div className={`w-3 h-3 rounded-full ${
                            event.type === 'search' ? 'bg-purple-500' :
                            event.type === 'scraping' ? 'bg-orange-500' :
                            event.type === 'processing' ? 'bg-yellow-500' :
                            event.type === 'analysis' ? 'bg-blue-500' :
                            event.type === 'summary' ? 'bg-green-500' :
                            event.type === 'complete' ? 'bg-green-600' :
                            'bg-red-500'
                          }`}></div>
                          <span className="flex-1 text-blue-800">{event.data.message}</span>
                          <span className="text-blue-600 text-xs">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools Used */}
                {result.metadata?.toolsUsed && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">🔧 Tools Used</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.metadata.toolsUsed.search && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          🔍 Web Search
                        </span>
                      )}
                      {result.metadata.toolsUsed.contentProcessor && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ⚙️ Content Processor
                        </span>
                      )}
                      {result.metadata.toolsUsed.summarizer && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          📝 AI Summarizer
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Stats */}
                {result.metadata?.processingStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {result.metadata.processingStats.searchQueries}
                      </div>
                      <div className="text-xs text-gray-600">Search Queries</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {result.metadata.processingStats.contentProcessed}
                      </div>
                      <div className="text-xs text-gray-600">URLs Processed</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {result.metadata.processingStats.summariesGenerated}
                      </div>
                      <div className="text-xs text-gray-600">AI Summaries</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {result.metadata.processingStats.toolCalls}
                      </div>
                      <div className="text-xs text-gray-600">Total Tool Calls</div>
                    </div>
                  </div>
                )}
                
                {/* Query and Timestamp */}
                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">Query:</span>
                    <span>"{result.query}"</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🕒</span>
                    <span>{new Date(result.metadata?.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features */}
        {!result && (
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Web Search</h3>
              <p className="text-gray-600">Intelligently searches multiple sources and extracts relevant information from the web.</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Processing</h3>
              <p className="text-gray-600">4-stage pipeline: scraping, cleaning, chunking, and relevance scoring for quality content.</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Summarization</h3>
              <p className="text-gray-600">Claude-powered summarization with quality validation and comprehensive analysis.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">RA</span>
              </div>
              <span className="text-gray-600 text-sm">Research Assistant Agent</span>
            </div>
            <div className="text-sm text-gray-500">
              Powered by Claude AI & LangChain
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
