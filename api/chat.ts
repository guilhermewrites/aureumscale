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

  // Health check — visit /api/chat in browser to test
  if (req.method === 'GET') {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;
    return new Response(JSON.stringify({ status: 'ok', hasApiKey: hasKey }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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
    const { messages, memories, clientContext, pageContext } = body;

    // Build the system prompt with user's memories and client context
    let systemPrompt = `You are a creative content strategist and work assistant built into Aureum, a client management app. You help create content, write copy, manage client data, and do actual work — not just give advice.

IMPORTANT RULES:
- Be concise and actionable. Get straight to the work.
- When asked to write something, WRITE IT — don't just suggest ideas.
- When asked to add content to a section, USE THE TOOLS to actually add it.
- You can see the current page the user is on and all the data in each section.
- Format responses cleanly. Use line breaks for readability.
- Keep responses under 300 words unless the user asks for detail.

TOOLS — USE THEM PROACTIVELY:
- add_journal_entry: Add a tweet, post idea, or content draft to the Content Journal (Content tab)
- update_memory: Write or update entries in the client's AI memory (Audience, Tone & Voice, Content Rules, Examples, Other Context sections)
- add_memory: Add a new entry to a memory category
- update_client_detail: Update a client field (strategy_overview, funnel_notes, notes, ad_performance_notes, content_drafts)
- add_scripted_ad: Add a new scripted ad to the Scripts section

When the user says "write a tweet" or "push to content journal" — use add_journal_entry immediately.
When the user says "add this to audience" or "write content rules" or "add examples" — use the tools immediately. Don't ask for confirmation.
When the user says "help me work on it" — look at the current page content and start writing/improving it directly.`;

    if (memories && memories.length > 0) {
      systemPrompt += `\n\n--- CLIENT'S AI MEMORY (what you know about this client) ---\n`;
      for (const mem of memories) {
        systemPrompt += `[${mem.category.toUpperCase()}]: ${mem.content}\n\n`;
      }
    }

    if (clientContext) {
      systemPrompt += `\n--- CURRENT CLIENT ---\n`;
      if (clientContext.name) systemPrompt += `Client: ${clientContext.name}\n`;
      if (clientContext.service) systemPrompt += `Service: ${clientContext.service}\n`;
      if (clientContext.handle) systemPrompt += `Twitter: @${clientContext.handle}\n`;
      if (clientContext.bio) systemPrompt += `Bio: ${clientContext.bio}\n`;
      if (clientContext.recentTweets) systemPrompt += `Recent tweets:\n${clientContext.recentTweets}\n`;
    }

    if (pageContext) {
      systemPrompt += `\n--- CURRENT PAGE STATE ---\n`;
      systemPrompt += `Active tab: ${pageContext.activeTab}\n`;
      if (pageContext.clientStatus) systemPrompt += `Client status: ${pageContext.clientStatus}\n`;
      if (pageContext.paymentStatus) systemPrompt += `Payment: ${pageContext.paymentStatus}${pageContext.amount ? ` ($${pageContext.amount})` : ''}\n`;
      if (pageContext.strategyOverview) systemPrompt += `Strategy overview:\n${pageContext.strategyOverview}\n`;
      if (pageContext.notes) systemPrompt += `Notes:\n${pageContext.notes}\n`;
      if (pageContext.contentDrafts) systemPrompt += `Content drafts:\n${pageContext.contentDrafts}\n`;
      if (pageContext.funnelNotes) systemPrompt += `Funnel notes:\n${pageContext.funnelNotes}\n`;
      if (pageContext.adPerformanceNotes) systemPrompt += `Ad performance notes:\n${pageContext.adPerformanceNotes}\n`;
      if (pageContext.scriptedAds && pageContext.scriptedAds.length > 0) {
        systemPrompt += `Scripts:\n`;
        for (const ad of pageContext.scriptedAds) {
          systemPrompt += `- ${ad.title || 'Untitled'}: Hook: ${ad.hook || '(empty)'} | Body: ${ad.body || '(empty)'} | CTA: ${ad.cta || '(empty)'}\n`;
        }
      }
      if (pageContext.adsPerformance) {
        const ap = pageContext.adsPerformance;
        if (ap.roas || ap.spend) {
          systemPrompt += `Ads: ROAS ${ap.roas || '?'}, Spend $${ap.spend || '?'}, CTR ${ap.ctr || '?'}, Conversions ${ap.conversions || '?'}\n`;
        }
      }
      if (pageContext.twitterBio) systemPrompt += `Twitter bio: ${pageContext.twitterBio}\n`;
      if (pageContext.twitterFollowers) systemPrompt += `Twitter followers: ${pageContext.twitterFollowers}\n`;

      // Show memories organized by category
      if (pageContext.memories && pageContext.memories.length > 0) {
        const cats: Record<string, string[]> = {};
        for (const m of pageContext.memories) {
          if (!m.content) continue;
          if (!cats[m.category]) cats[m.category] = [];
          cats[m.category].push(m.content);
        }
        if (Object.keys(cats).length > 0) {
          systemPrompt += `\nMemory sections:\n`;
          for (const [cat, items] of Object.entries(cats)) {
            systemPrompt += `[${cat.toUpperCase()}]:\n${items.join('\n')}\n\n`;
          }
        }
      }
    }

    // Define tools when we have a client context
    const tools = clientContext ? [
      {
        name: 'update_memory',
        description: 'Update or replace content in a client memory section. Use when the user wants to modify existing memory entries in Audience, Tone & Voice, Content Rules, Examples, or Other Context.',
        input_schema: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['tone', 'audience', 'rules', 'examples', 'general'], description: 'Memory category to update' },
            content: { type: 'string', description: 'The full content to write' },
          },
          required: ['category', 'content'],
        },
      },
      {
        name: 'add_memory',
        description: 'Add a new entry to a client memory section. Use when adding NEW information to Audience, Tone & Voice, Content Rules, Examples, or Other Context. Each call creates a separate entry.',
        input_schema: {
          type: 'object',
          properties: {
            category: { type: 'string', enum: ['tone', 'audience', 'rules', 'examples', 'general'], description: 'Memory category' },
            content: { type: 'string', description: 'Content to add' },
          },
          required: ['category', 'content'],
        },
      },
      {
        name: 'update_client_detail',
        description: 'Update a client detail field. Fields: strategy_overview, funnel_notes, notes, ad_performance_notes, content_drafts.',
        input_schema: {
          type: 'object',
          properties: {
            field: { type: 'string', enum: ['strategy_overview', 'funnel_notes', 'notes', 'ad_performance_notes', 'content_drafts'], description: 'Which field to update' },
            value: { type: 'string', description: 'The new value' },
          },
          required: ['field', 'value'],
        },
      },
      {
        name: 'add_journal_entry',
        description: 'Add a new entry to the Content Journal on the Content tab. Use this when the user asks to write a tweet, post idea, content draft, or push anything to the content journal. Each call adds one entry.',
        input_schema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The content/tweet/idea to add to the journal' },
          },
          required: ['content'],
        },
      },
      {
        name: 'add_scripted_ad',
        description: 'Add a new scripted ad to the Scripts section. Include hook, body, and CTA.',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Ad script title' },
            hook: { type: 'string', description: 'Opening hook' },
            body: { type: 'string', description: 'Main body/script' },
            cta: { type: 'string', description: 'Call to action' },
          },
          required: ['title'],
        },
      },
    ] : undefined;

    const apiBody: any = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1536,
      system: systemPrompt,
      messages: messages.slice(-20).map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    };
    if (tools) apiBody.tools = tools;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(apiBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      let errMsg = 'AI request failed';
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson?.error?.message || errMsg;
      } catch {}
      return new Response(JSON.stringify({ error: `${errMsg} (${response.status})`, details: errText }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    // Extract text and tool calls
    let assistantMessage = '';
    const toolCalls: any[] = [];
    for (const block of (data.content || [])) {
      if (block.type === 'text') assistantMessage += block.text;
      if (block.type === 'tool_use') toolCalls.push({ id: block.id, name: block.name, input: block.input });
    }

    const hasToolCalls = toolCalls.length > 0;
    const needsFollowUp = data.stop_reason === 'tool_use' && hasToolCalls;

    return new Response(JSON.stringify({
      message: assistantMessage || (hasToolCalls ? '' : 'No response generated.'),
      needsFollowUp,
      toolCalls: hasToolCalls ? toolCalls : undefined,
      rawAssistantContent: hasToolCalls ? data.content : undefined,
    }), {
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
