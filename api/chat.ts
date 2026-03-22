// Vercel Serverless Function — proxies requests to Claude API
// This keeps the ANTHROPIC_API_KEY safe on the server side

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Vercel. Go to Vercel → Settings → Environment Variables and add it.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json();
    const { messages, memories, clientContext } = body;

    // Build the system prompt with user's memories and client context
    let systemPrompt = `You are a creative content strategist and writing assistant built into Aureum, a client management app. You help create engaging social media content, brainstorm ideas, and refine copy.

Your responses should be:
- Concise and actionable
- Creative and engaging
- Tailored to the user's style and preferences
- Focused on social media content (especially Twitter/X)

When suggesting tweets, format them clearly. Keep them under 280 characters unless asked otherwise.`;

    if (memories && memories.length > 0) {
      systemPrompt += `\n\n--- USER'S PREFERENCES & STYLE GUIDE ---\nThe user has taught you the following about their style, audience, and preferences. ALWAYS follow these:\n\n`;
      for (const mem of memories) {
        systemPrompt += `[${mem.category.toUpperCase()}]: ${mem.content}\n\n`;
      }
    }

    if (clientContext) {
      systemPrompt += `\n--- CURRENT CLIENT CONTEXT ---\n`;
      if (clientContext.name) systemPrompt += `Client name: ${clientContext.name}\n`;
      if (clientContext.service) systemPrompt += `Service: ${clientContext.service}\n`;
      if (clientContext.handle) systemPrompt += `Twitter handle: ${clientContext.handle}\n`;
      if (clientContext.bio) systemPrompt += `Bio: ${clientContext.bio}\n`;
      if (clientContext.recentTweets) systemPrompt += `Recent tweets:\n${clientContext.recentTweets}\n`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return new Response(JSON.stringify({ error: 'AI request failed', details: errText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || 'No response generated.';

    return new Response(JSON.stringify({ message: assistantMessage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
