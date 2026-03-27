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
- CRITICAL: When the user shares their schedule, routine, content plan, or any structured plan, ALWAYS save it to knowledge immediately. This is the ONLY way you'll remember it in future conversations. The conversation history resets but knowledge persists forever.
- When you save knowledge, briefly confirm what you saved.
- Pick an appropriate category: Agency Operations, Sales & Outreach, Scaling, Mindset, Fitness, Nutrition, Productivity, or Other.
- When the user asks "do you remember X?", ALWAYS search knowledge first before answering.

KNOWLEDGE RETRIEVAL:
- You have a tool called "search_knowledge" to search your knowledge base for relevant information.
- ALWAYS use search_knowledge BEFORE answering questions about the user's business, preferences, routines, strategies, or anything you may have previously saved.
- Search proactively — don't guess from memory. If the user asks about pricing, search "pricing". If they ask about routines, search "routine". If they ask what you know about them, search broadly.
- You can search multiple times in a conversation if needed.
- Only the 5 most recent entries are shown by default. Everything else requires a search.

APP MANAGEMENT:
- You have FULL control over the user's Aureum app. You can manage their calendar, clients, finances, goals, and task board.
- Calendar: add_calendar_event, edit_calendar_event, delete_calendar_event
- Goals: add_goal (add a goal to a life area), complete_goal (toggle completion), delete_goal, add_life_area (create new life area)
- Task Board: add_board_task (create a task card), list_board_tasks (view all tasks with IDs), update_board_task (edit title/description/client/status/revenue), delete_board_task (remove a task), move_board_task (move to different column)
- Clients: list_clients (to see all clients), update_client_notes (to update a client's notes/details), update_client_status (to change happy/moderate/frustrated)
- Finance: list_invoices (to see financial data), update_invoice_status (to mark paid/pending/overdue)
- When the user asks you to do something ("book a call", "mark invoice as paid", "add a goal", "create a task"), just DO IT with the right tool. Don't ask for confirmation unless the action is destructive (like deleting).
- Always confirm what you did after taking an action.
- When adding goals, ALWAYS use add_goal with the correct life_area_id from the user's life areas listed above. If the life area doesn't exist yet, create it first with add_life_area.

CRITICAL — TOOL EFFICIENCY:
- ALWAYS call ALL the tools you need in a SINGLE response. Never chain them one by one.
- Example: if the user wants 5 calendar events, call add_calendar_event 5 times in ONE response — NOT one at a time across 5 responses.
- If you need to read data first (like list_board_tasks), call ALL read tools in one response, then call ALL write tools in the next response.
- Minimize the number of response rounds. Each round costs an API call. Batch aggressively.
- When saving knowledge the user shared, save it ALL in one save_knowledge call, not multiple.

SELF-SETTINGS:
- You have a tool called "update_mentor_settings" to update your own personality, custom instructions, tone, and name.
- Use it when the user tells you to change how you speak, your persona, your tone, or gives you a new identity/role to adopt.
- When the user says "save this to your settings" or "speak to me like this from now on", use this tool to persist the change.

Current date and time: ${context.currentDateTime}
Day of week: ${context.dayOfWeek}`;

  // Life areas and goals
  if (context.lifeAreas && context.lifeAreas.length > 0) {
    prompt += `\n\n--- USER'S LIFE AREAS & GOALS ---`;
    prompt += `\nIMPORTANT: Use these exact IDs when calling add_goal, complete_goal, delete_goal.`;
    for (const area of context.lifeAreas) {
      prompt += `\n\n**${area.name}** (ID: ${area.id}, Priority: ${area.priority || 'medium'})`;
      if (area.goals && area.goals.length > 0) {
        for (const goal of area.goals) {
          prompt += `\n- ${goal.completed ? '✅' : '⬜'} ${goal.text} (Goal ID: ${goal.id})${goal.deadline ? ` (deadline: ${goal.deadline})` : ''}`;
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
    if (cs.clients && cs.clients.length > 0) {
      prompt += `\n\nClient list:`;
      for (const c of cs.clients) {
        prompt += `\n- ${c}`;
      }
    }
  }

  if (context.financeSummary) {
    const fs = context.financeSummary;
    prompt += `\n\nFinancials — Collected: $${fs.paidThisMonth?.toLocaleString() || 0}, Pending: $${fs.pendingThisMonth?.toLocaleString() || 0}`;
    if (fs.overdueAmount > 0) prompt += `, OVERDUE: $${fs.overdueAmount.toLocaleString()}`;
    if (fs.recentInvoices && fs.recentInvoices.length > 0) {
      prompt += `\nRecent invoices:`;
      for (const inv of fs.recentInvoices) {
        prompt += `\n- ${inv}`;
      }
    }
  }

  // Board tasks
  if (context.boardTasks && context.boardTasks.length > 0) {
    prompt += `\n\n--- TASK BOARD (Kanban) ---`;
    const byStatus: Record<string, any[]> = {};
    for (const t of context.boardTasks) {
      if (!byStatus[t.status]) byStatus[t.status] = [];
      byStatus[t.status].push(t);
    }
    for (const [status, tasks] of Object.entries(byStatus)) {
      prompt += `\n\n[${status}]`;
      for (const t of tasks) {
        prompt += `\n- ${t.title} (ID: ${t.id})${t.client_name ? ` — Client: ${t.client_name}` : ''}${t.estimated_revenue > 0 ? ` — $${t.estimated_revenue}` : ''}${t.description ? ` — ${t.description}` : ''}`;
      }
    }
  }

  // Knowledge base — only inject 5 most recent for general awareness
  if (context.knowledgeEntries && context.knowledgeEntries.length > 0) {
    const recentEntries = context.knowledgeEntries.slice(0, 5);
    const totalKnowledge = context.totalKnowledgeCount || recentEntries.length;
    prompt += `\n\n--- RECENT KNOWLEDGE (${recentEntries.length} of ${totalKnowledge} total entries) ---`;
    prompt += `\nYou have ${totalKnowledge} total knowledge entries. Use the search_knowledge tool to look up specific topics when needed.`;
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
        max_tokens: 4096,
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
          {
            name: 'edit_calendar_event',
            description: 'Edit an existing calendar event. Use when the user asks to reschedule, rename, or update an event.',
            input_schema: {
              type: 'object',
              properties: {
                event_id: { type: 'string', description: 'The ID of the event to edit' },
                title: { type: 'string', description: 'New title (optional)' },
                date: { type: 'string', description: 'New date YYYY-MM-DD (optional)' },
                start_time: { type: 'string', description: 'New start time HH:MM (optional)' },
                end_time: { type: 'string', description: 'New end time HH:MM (optional)' },
                notes: { type: 'string', description: 'New notes (optional)' },
              },
              required: ['event_id'],
            },
          },
          {
            name: 'delete_calendar_event',
            description: 'Delete a calendar event. Only use when the user explicitly asks to remove/cancel an event.',
            input_schema: {
              type: 'object',
              properties: {
                event_id: { type: 'string', description: 'The ID of the event to delete' },
              },
              required: ['event_id'],
            },
          },
          {
            name: 'list_clients',
            description: 'List all clients in the app. Returns client names, IDs, status, payment info. Use this to look up client data before taking actions.',
            input_schema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'update_client_notes',
            description: 'Update notes or details for a specific client. Use list_clients first to get the client ID.',
            input_schema: {
              type: 'object',
              properties: {
                client_id: { type: 'string', description: 'The client ID' },
                field: { type: 'string', enum: ['strategy_overview', 'funnel_notes', 'google_drive_url'], description: 'Which field to update' },
                value: { type: 'string', description: 'The new value' },
              },
              required: ['client_id', 'field', 'value'],
            },
          },
          {
            name: 'update_client_status',
            description: 'Update a client\'s satisfaction status.',
            input_schema: {
              type: 'object',
              properties: {
                client_id: { type: 'string', description: 'The client ID' },
                status: { type: 'string', enum: ['Happy', 'Moderate', 'Frustrated'], description: 'New status' },
              },
              required: ['client_id', 'status'],
            },
          },
          {
            name: 'list_invoices',
            description: 'List recent invoices/finance items. Returns amounts, client names, dates, and payment status.',
            input_schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['paid', 'pending', 'overdue'], description: 'Optional: filter by status' },
              },
              required: [],
            },
          },
          {
            name: 'update_invoice_status',
            description: 'Update the payment status of an invoice.',
            input_schema: {
              type: 'object',
              properties: {
                invoice_id: { type: 'string', description: 'The invoice/finance item ID' },
                status: { type: 'string', enum: ['paid', 'pending', 'overdue'], description: 'New status' },
              },
              required: ['invoice_id', 'status'],
            },
          },
          {
            name: 'add_goal',
            description: 'Add a goal to one of the user\'s life areas (e.g. Business, Fitness, Health). Use when the user asks to set a goal, add a target, or create an objective. You MUST use a valid life_area_id from the user\'s current life areas.',
            input_schema: {
              type: 'object',
              properties: {
                life_area_id: { type: 'string', description: 'The ID of the life area to add the goal to (from the user\'s life areas list)' },
                text: { type: 'string', description: 'The goal text/description' },
                deadline: { type: 'string', description: 'Optional deadline in YYYY-MM-DD format' },
              },
              required: ['life_area_id', 'text'],
            },
          },
          {
            name: 'complete_goal',
            description: 'Toggle a goal as completed or uncompleted.',
            input_schema: {
              type: 'object',
              properties: {
                life_area_id: { type: 'string', description: 'The life area ID' },
                goal_id: { type: 'string', description: 'The goal ID to toggle' },
              },
              required: ['life_area_id', 'goal_id'],
            },
          },
          {
            name: 'delete_goal',
            description: 'Delete a goal from a life area.',
            input_schema: {
              type: 'object',
              properties: {
                life_area_id: { type: 'string', description: 'The life area ID' },
                goal_id: { type: 'string', description: 'The goal ID to delete' },
              },
              required: ['life_area_id', 'goal_id'],
            },
          },
          {
            name: 'add_life_area',
            description: 'Create a new life area for organizing goals. Use when the user mentions a life category that doesn\'t exist yet.',
            input_schema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the life area (e.g. "Relationships", "Finance", "Spirituality")' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Priority level (default: medium)' },
              },
              required: ['name'],
            },
          },
          {
            name: 'add_board_task',
            description: 'Create a task card on the Kanban board in the Clients section. Use when the user asks to create a task, add work to do for a client, or track revenue-generating work.',
            input_schema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title' },
                description: { type: 'string', description: 'Task description (optional)' },
                client_name: { type: 'string', description: 'Client name to assign (optional)' },
                status: { type: 'string', enum: ['Lead', 'Proposal', 'Onboarding', 'In Progress', 'Review', 'Complete'], description: 'Kanban column (default: Lead)' },
                estimated_revenue: { type: 'number', description: 'Estimated revenue in dollars (optional)' },
              },
              required: ['title'],
            },
          },
          {
            name: 'list_board_tasks',
            description: 'List all tasks on the Kanban board. Returns task IDs, titles, statuses, clients, and estimated revenue. ALWAYS call this first before updating or deleting tasks so you have the correct task_id.',
            input_schema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['Lead', 'Proposal', 'Onboarding', 'In Progress', 'Review', 'Complete'], description: 'Optional: filter by status column' },
              },
              required: [],
            },
          },
          {
            name: 'update_board_task',
            description: 'Update an existing task card on the Kanban board. Can change title, description, client, status, or estimated revenue. Use list_board_tasks first to get the task_id.',
            input_schema: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'The ID of the task to update (get from list_board_tasks)' },
                title: { type: 'string', description: 'New title (optional)' },
                description: { type: 'string', description: 'New description (optional)' },
                client_name: { type: 'string', description: 'New client name (optional)' },
                status: { type: 'string', enum: ['Lead', 'Proposal', 'Onboarding', 'In Progress', 'Review', 'Complete'], description: 'Move to a different column (optional)' },
                estimated_revenue: { type: 'number', description: 'New estimated revenue (optional)' },
              },
              required: ['task_id'],
            },
          },
          {
            name: 'delete_board_task',
            description: 'Delete a task card from the Kanban board. Use list_board_tasks first to get the task_id. Ask for confirmation before deleting.',
            input_schema: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'The ID of the task to delete (get from list_board_tasks)' },
              },
              required: ['task_id'],
            },
          },
          {
            name: 'move_board_task',
            description: 'Move a task card to a different Kanban column (change its status). Use list_board_tasks first to get the task_id.',
            input_schema: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'The ID of the task to move (get from list_board_tasks)' },
                new_status: { type: 'string', enum: ['Lead', 'Proposal', 'Onboarding', 'In Progress', 'Review', 'Complete'], description: 'Target column' },
              },
              required: ['task_id', 'new_status'],
            },
          },
          {
            name: 'update_mentor_settings',
            description: 'Update your own settings — personality, custom instructions, tone, or name. Use when the user tells you to change how you behave, speak, or adopt a new persona.',
            input_schema: {
              type: 'object',
              properties: {
                personality: { type: 'string', enum: ['stoic', 'tough_love', 'strategic', 'gentle', 'motivational'], description: 'Base personality preset (optional)' },
                custom_personality: { type: 'string', description: 'Custom personality instructions — the full text of how you should behave and speak. This REPLACES the existing custom instructions.' },
                tone: { type: 'string', enum: ['direct', 'analytical', 'casual', 'formal'], description: 'Communication tone (optional)' },
                mentor_name: { type: 'string', description: 'Your name (optional)' },
              },
              required: [],
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

    // ALL tools are client-side (executed against Supabase from the browser).
    // The server just passes tool calls back to the client for execution.
    const needsClientLoop = data.stop_reason === 'tool_use' && toolCalls.length > 0;

    if (!assistantMessage && !needsClientLoop) {
      assistantMessage = 'No response generated.';
    }

    return new Response(JSON.stringify({
      message: assistantMessage || '',
      toolCalls,
      needsFollowUp: needsClientLoop,
      rawAssistantContent: needsClientLoop ? data.content : undefined,
      stopReason: data.stop_reason,
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
