// Vercel Serverless Function — Mentor AI endpoint
// Dedicated endpoint for the life coach with rich context injection

export const config = { runtime: 'edge' };

const PERSONALITY_PROMPTS: Record<string, string> = {
  stoic: `You are Aurelius, a stoic life mentor. You speak with calm authority and wisdom. You reference timeless principles of discipline, focus, and controlling what you can control. You don't sugarcoat but you're never harsh — you're the calm voice of reason. You believe in systems over motivation.`,
  tough_love: `You are a no-BS mentor. You call things as they are. If the user is slacking, you tell them directly. You push hard but always from a place of genuine care. You don't accept excuses. You believe in radical accountability.`,
  strategic: `You are a strategic advisor and life architect. You think in systems, frameworks, and leverage. Every recommendation is backed by logic. You help the user see the big picture and optimize their time ruthlessly. You think like a CEO about every area of life.`,
  gentle: `You are a supportive and empathetic mentor. You validate feelings while still guiding toward action. You celebrate small wins. You help the user build sustainable habits without burnout. You believe progress matters more than perfection.`,
  motivational: `You are an intense motivational coach. You bring energy and fire. You remind the user of their potential and why they started. You use powerful language that inspires action. You believe the user is capable of extraordinary things.`,
};

function buildSystemPrompt(context: any): string {
  const personality = PERSONALITY_PROMPTS[context.personality] || PERSONALITY_PROMPTS.stoic;
  const customPersonality = context.customPersonality ? `\n\nAdditional personality instructions from the user: ${context.customPersonality}` : '';
  const tone = context.tone || 'direct';

  let prompt = `${personality}${customPersonality}

Your communication tone is: ${tone}.

You are embedded in Aureum, a business management app. You have FULL awareness of the user's life — their schedule, business, health, goals, and daily habits. Use this data to give precise, actionable guidance.

IMPORTANT RULES:
- Be concise. No fluff. Get to the point.
- Reference specific data when giving advice (e.g. "You slept 6h last night" not "make sure you sleep well")
- When asked "what do I do today?", give a prioritized list based on their calendar, goals, and current state
- Track patterns — if they've been skipping workouts, mention it
- Give time-specific suggestions (e.g. "At 2pm, you have a gap — use it for deep work on Client X's deliverable")
- Never make up data you don't have. If you don't know something, ask.
- Format responses cleanly with line breaks. Use bullet points for lists.
- Keep responses under 300 words unless the user asks for detail.

KNOWLEDGE MANAGEMENT:
- You have a tool called "save_knowledge" to save important information to your knowledge base.
- Use it when the user says things like "remember this", "add this to knowledge", "note this down", "save this", or shares something important you should remember for future conversations.
- Also proactively use it when the user shares significant business strategies, personal preferences, frameworks, or routines that would be valuable to reference later.
- When you save knowledge, briefly confirm what you saved.
- Pick an appropriate category: Agency Operations, Sales & Outreach, Scaling, Mindset, Fitness, Nutrition, Productivity, or Other.

KNOWLEDGE RETRIEVAL:
- You have a tool called "search_knowledge" to search your knowledge base for relevant information.
- ALWAYS use search_knowledge BEFORE answering questions about the user's business, preferences, routines, strategies, or anything you may have previously saved.
- Search proactively — don't guess from memory. If the user asks about pricing, search "pricing". If they ask about routines, search "routine". If they ask what you know about them, search broadly.
- You can search multiple times in a conversation if needed.
- Only the 5 most recent entries are shown by default. Everything else requires a search.

Current date and time: ${context.currentDateTime}
Day of week: ${context.dayOfWeek}`;

  // Life areas and goals
  if (context.lifeAreas && context.lifeAreas.length > 0) {
    prompt += `\n\n--- USER'S LIFE AREAS & GOALS ---`;
    for (const area of context.lifeAreas) {
      prompt += `\n\n**${area.name}** (Priority: ${area.priority || 'medium'})`;
      if (area.goals && area.goals.length > 0) {
        for (const goal of area.goals) {
          prompt += `\n- ${goal.completed ? '✅' : '⬜'} ${goal.text}${goal.deadline ? ` (deadline: ${goal.deadline})` : ''}`;
        }
      }
    }
  }

  // Today's calendar
  if (context.todayEvents && context.todayEvents.length > 0) {
    prompt += `\n\n--- TODAY'S SCHEDULE ---`;
    for (const ev of context.todayEvents) {
      prompt += `\n- ${ev.startTime}–${ev.endTime}: ${ev.title}${ev.notes ? ` (${ev.notes})` : ''}`;
    }
  } else {
    prompt += `\n\n--- TODAY'S SCHEDULE ---\nNo events scheduled today.`;
  }

  // Upcoming events
  if (context.upcomingEvents && context.upcomingEvents.length > 0) {
    prompt += `\n\n--- UPCOMING (next 3 days) ---`;
    for (const ev of context.upcomingEvents) {
      prompt += `\n- ${ev.date} ${ev.startTime}–${ev.endTime}: ${ev.title}`;
    }
  }

  // Recent logs
  if (context.recentLogs && context.recentLogs.length > 0) {
    prompt += `\n\n--- RECENT LIFE LOGS (last 7 days) ---`;
    for (const log of context.recentLogs) {
      prompt += `\n- [${log.date}] ${log.category.toUpperCase()}: ${log.content}`;
    }
  }

  // Business context
  if (context.clientsSummary) {
    const cs = context.clientsSummary;
    prompt += `\n\n--- BUSINESS SNAPSHOT ---`;
    prompt += `\nActive clients: ${cs.activeCount}`;
    prompt += `\nTotal revenue: $${cs.totalRevenue?.toLocaleString() || 0}`;
    if (cs.pendingInvoices > 0) prompt += `\nPending invoices: ${cs.pendingInvoices}`;
  }

  if (context.financeSummary) {
    const fs = context.financeSummary;
    prompt += `\nThis month — Collected: $${fs.paidThisMonth?.toLocaleString() || 0}, Pending: $${fs.pendingThisMonth?.toLocaleString() || 0}`;
    if (fs.overdueAmount > 0) prompt += `, OVERDUE: $${fs.overdueAmount.toLocaleString()}`;
  }

  // Knowledge base — only inject 5 most recent for general awareness
  if (context.knowledgeEntries && context.knowledgeEntries.length > 0) {
    const recentEntries = context.knowledgeEntries.slice(0, 5);
    prompt += `\n\n--- RECENT KNOWLEDGE (${recentEntries.length} of ${context.knowledgeEntries.length} total entries) ---`;
    prompt += `\nYou have ${context.knowledgeEntries.length} total knowledge entries. Use the search_knowledge tool to look up specific topics when needed.`;
    for (const entry of recentEntries) {
      prompt += `\n\n[${entry.category.toUpperCase()}] ${entry.title}:\n${entry.content}`;
    }
  }

  return prompt;
}

export default async function handler(req: Request) {
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
      JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = await req.json();
    const { messages, context } = body;

    const systemPrompt = buildSystemPrompt(context || {});

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        tools: [
          {
            name: 'save_knowledge',
            description: 'Save important information to the knowledge base so you can reference it in future conversations. Use this when the user asks you to remember something, or when they share valuable business strategies, personal preferences, frameworks, or routines.',
            input_schema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  enum: ['Agency Operations', 'Sales & Outreach', 'Scaling', 'Mindset', 'Fitness', 'Nutrition', 'Productivity', 'Other'],
                  description: 'The category for this knowledge entry',
                },
                title: {
                  type: 'string',
                  description: 'A short descriptive title for this knowledge entry',
                },
                content: {
                  type: 'string',
                  description: 'The actual knowledge content to save',
                },
              },
              required: ['category', 'title', 'content'],
            },
          },
          {
            name: 'search_knowledge',
            description: 'Search the knowledge base for relevant information. Use this before answering questions about the user\'s business, preferences, routines, strategies, or anything previously discussed. Returns matching entries.',
            input_schema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query — keywords or topic to look up (e.g. "pricing", "morning routine", "client acquisition")',
                },
                category: {
                  type: 'string',
                  enum: ['Agency Operations', 'Sales & Outreach', 'Scaling', 'Mindset', 'Fitness', 'Nutrition', 'Productivity', 'Other'],
                  description: 'Optional: filter by category',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'add_calendar_event',
            description: 'Add an event to the user\'s calendar. Use when they ask to schedule something, block time, or set a reminder.',
            input_schema: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  description: 'Event date in YYYY-MM-DD format',
                },
                title: {
                  type: 'string',
                  description: 'Event title',
                },
                start_time: {
                  type: 'string',
                  description: 'Start time in HH:MM format (24h)',
                },
                end_time: {
                  type: 'string',
                  description: 'End time in HH:MM format (24h)',
                },
                notes: {
                  type: 'string',
                  description: 'Optional notes for the event',
                },
              },
              required: ['date', 'title', 'start_time', 'end_time'],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      let errMsg = 'AI request failed';
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson?.error?.message || errMsg;
      } catch {}
      return new Response(JSON.stringify({ error: `${errMsg} (${response.status})` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();

    // Extract text and tool calls from response
    let assistantMessage = '';
    const toolCalls: any[] = [];

    for (const block of (data.content || [])) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input,
        });
      }
    }

    // If Claude used tools, check if search_knowledge needs client-side handling
    // For non-search tools, do a server-side follow-up. For search, return to client.
    const hasSearch = toolCalls.some(tc => tc.name === 'search_knowledge');

    if (data.stop_reason === 'tool_use' && toolCalls.length > 0 && !hasSearch) {
      // No search needed — handle entirely server-side
      const toolResultContent = toolCalls.map(tc => ({
        type: 'tool_result' as const,
        tool_use_id: tc.id,
        content: `Done. ${tc.name === 'save_knowledge' ? `Saved "${tc.input.title}" to ${tc.input.category}.` : `Added "${tc.input.title}" to calendar on ${tc.input.date}.`}`,
      }));

      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [
            ...messages.map((m: any) => ({ role: m.role, content: m.content })),
            { role: 'assistant', content: data.content },
            { role: 'user', content: toolResultContent },
          ],
        }),
      });

      if (followUp.ok) {
        const followUpData = await followUp.json();
        assistantMessage = '';
        for (const block of (followUpData.content || [])) {
          if (block.type === 'text') {
            assistantMessage += block.text;
          }
        }
      }
    }

    // If search is needed, return tool calls + raw assistant content so client can handle the loop
    const needsClientLoop = data.stop_reason === 'tool_use' && hasSearch;

    if (!assistantMessage && toolCalls.length === 0) {
      assistantMessage = 'No response generated.';
    }

    return new Response(JSON.stringify({
      message: assistantMessage,
      toolCalls,
      needsFollowUp: needsClientLoop,
      rawAssistantContent: needsClientLoop ? data.content : undefined,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err: any) {
    console.error('Mentor API error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
