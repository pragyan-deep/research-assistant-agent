import { NextRequest, NextResponse } from 'next/server';
import { researchAgent } from '@/app/agents/research-agent';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' }, 
        { status: 400 }
      );
    }

    // Use the research agent
    const result = await researchAgent.research({ query });
    
    return NextResponse.json({
      mode: 'full_agent',
      ...result
    });
    
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
} 