'use client';

import { useState } from 'react';
import Image from "next/image";

export default function Home() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleResearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: query.trim()
        }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        error: 'Request failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setLoading(false);
    }
  };

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
            Powered by Gemini AI and real-time web search.
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
                placeholder="Ask me anything... e.g., 'Latest AI developments in 2024'"
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
                    Researching...
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
              'Climate change solutions 2024',
              'Latest AI breakthroughs',
              'Renewable energy trends'
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

        {/* Results */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              Research Results
            </h3>
            
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">!</span>
                  </div>
                  <p className="text-red-800 font-medium">Error: {result.error}</p>
                </div>
                {result.details && (
                  <p className="text-red-600 text-sm ml-7">{result.details}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Raw Agent Response</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                      {JSON.stringify(result.result, null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <span>Query: "{result.searchQuery}"</span>
                    <span>•</span>
                    <span>{new Date(result.timestamp).toLocaleString()}</span>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Search</h3>
              <p className="text-gray-600">Access the latest information from across the web with intelligent search capabilities.</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis</h3>
              <p className="text-gray-600">Powered by Google's Gemini AI for comprehensive analysis and synthesis of information.</p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Raw Data Access</h3>
              <p className="text-gray-600">Get complete, unfiltered agent responses with full conversation history and tool calls.</p>
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
              Powered by Gemini AI & LangChain
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
