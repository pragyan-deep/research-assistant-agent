import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { content } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }
    
    // This is a placeholder for the actual OpenAI API call
    // In a real implementation, you would use the OpenAI SDK
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that summarizes study notes. Be concise and accurate.'
          },
          {
            role: 'user',
            content: `Please summarize the following study notes in 3-5 bullet points:\n\n${content}`
          }
        ],
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: 'Failed to generate summary', details: error },
        { status: 500 }
      );
    }
    
    const data = await response.json();
    const summary = data.choices[0].message.content;
    
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error in summarize API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 