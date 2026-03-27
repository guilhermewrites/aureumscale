import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, Loader2, Minimize2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ── Markdown renderer for assistant messages ──
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    parts.push(<strong key={match.index} className="font-semibold text-[#ECECEC]">{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? <>{parts}</> : text;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ')) { elements.push(<h4 key={i} className="font-semibold text-[#ECECEC] mt-1.5 mb-0.5 text-[13px]">{line.slice(4)}</h4>); continue; }
    if (line.startsWith('## ')) { elements.push(<h3 key={i} className="font-semibold text-[#ECECEC] mt-1.5 mb-0.5 text-[13px]">{line.slice(3)}</h3>); continue; }
    const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      elements.push(<div key={i} className="flex gap-1.5 ml-0.5"><span className="text-[#555] flex-shrink-0">{'•'}</span><span>{renderInline(bulletMatch[2])}</span></div>);
      continue;
    }
    if (line.trim() === '') { elements.push(<div key={i} className="h-3" />); continue; }
    elements.push(<p key={i}>{renderInline(line)}</p>);
  }
  return <>{elements}</>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Memory {
  id: string;
  content: string;
  category: string;
}

interface ClientRecord {
  id: string;
  name: string;
  service: string;
  photo_url: string | null;
}

interface AIBubbleProps {
  storagePrefix: string;
  clientId?: string;
  clientName?: string;
  clientService?: string;
  clientHandle?: string;
  clientBio?: string;
  clientTweets?: string;
  pageContext?: Record<string, any>;
}

const AIBubble: React.FC<AIBubbleProps> = ({
  storagePrefix, clientId, clientName, clientService, clientHandle, clientBio, clientTweets, pageContext,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // @mention state
  const [allClients, setAllClients] = useState<ClientRecord[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);

  // Load all clients for @mention autocomplete
  useEffect(() => {
    if (!supabase) return;
    supabase.from('clients').select('id, name, service, photo_url').eq('user_id', storagePrefix)
      .then(({ data }) => setAllClients(data ?? []));
  }, [storagePrefix]);

  // Load conversations & memories when opened
  useEffect(() => {
    if (!isOpen || !supabase) return;
    setLoading(true);
    supabase.from('ai_conversations').select('*').eq('user_id', storagePrefix)
      .is('client_id', null).order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []).map((m: any) => ({
          id: m.id, role: m.role, content: m.content, created_at: m.created_at,
        })));
        setLoading(false);
      });
    supabase.from('ai_memory').select('id, content, category').eq('user_id', storagePrefix)
      .then(({ data }) => setMemories(data ?? []));
  }, [isOpen, storagePrefix]);

  useEffect(() => {
    if (!supabase || !clientId) return;
    supabase.from('ai_memory').select('id, content, category').eq('user_id', storagePrefix)
      .then(({ data }) => setMemories(data ?? []));
  }, [clientId, storagePrefix]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Filtered clients for @mention dropdown
  const mentionResults = mentionQuery !== null
    ? allClients.filter(c => c.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
    : [];

  // Handle input change — detect @mention
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setInputText(val);

    // Find if we're inside an @mention
    const beforeCursor = val.slice(0, cursorPos);
    const atMatch = beforeCursor.match(/@([^\s@]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursorPos - atMatch[0].length);
      setMentionIdx(0);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  // Insert mention
  const insertMention = (client: ClientRecord) => {
    const before = inputText.slice(0, mentionStart);
    const after = inputText.slice(inputRef.current?.selectionStart ?? inputText.length);
    const newText = before + '@' + client.name + ' ' + after;
    setInputText(newText);
    setMentionQuery(null);
    setMentionStart(-1);
    setTimeout(() => {
      const pos = before.length + client.name.length + 2;
      inputRef.current?.setSelectionRange(pos, pos);
      inputRef.current?.focus();
    }, 0);
  };

  // Handle keyboard in mention dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionResults.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionResults[mentionIdx]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    // Parse @mentions — find all @ClientName references
    const mentionedNames = [...text.matchAll(/@([^\s@]+(?:\s[^\s@]+)*)/g)].map(m => m[1]);
    const mentionedClients = mentionedNames
      .map(name => allClients.find(c => c.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean) as ClientRecord[];

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: text, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setMentionQuery(null);
    setSending(true);

    if (supabase) {
      supabase.from('ai_conversations').insert({
        id: userMsg.id, user_id: storagePrefix, client_id: null, role: 'user', content: text,
      });
    }

    try {
      const apiMessages = [...messages, userMsg].slice(-20).map(m => ({ role: m.role, content: m.content }));

      // Build client context — from URL-based client OR from @mention
      let clientContext: any = undefined;
      let clientMemories = memories;

      if (mentionedClients.length > 0) {
        // Use the first @mentioned client
        const mc = mentionedClients[0];
        // Load this client's memories
        if (supabase) {
          const { data: mcMems } = await supabase.from('ai_memory').select('id, content, category').eq('user_id', storagePrefix);
          if (mcMems) clientMemories = mcMems;
        }
        // Load client details
        let handle = '';
        if (supabase) {
          const { data: det } = await supabase.from('client_details').select('social_platforms').eq('client_id', mc.id).eq('user_id', storagePrefix).single();
          if (det?.social_platforms) handle = (det.social_platforms as any)?.twitter || '';
        }
        // Load recent tweets
        let recentTweets = '';
        if (supabase) {
          const { data: tweets } = await supabase.from('client_tweets').select('text').eq('client_id', mc.id).eq('user_id', storagePrefix).order('created_at', { ascending: false }).limit(5);
          if (tweets) recentTweets = tweets.map(t => t.text).filter(Boolean).join('\n---\n');
        }
        clientContext = { name: mc.name, service: mc.service, handle, recentTweets };
      } else if (clientId) {
        clientContext = {
          name: clientName, service: clientService, handle: clientHandle, bio: clientBio, recentTweets: clientTweets,
        };
      }

      // Fetch with retry for rate limits / overload
      const fetchWithRetry = async (body: any, retries = 3): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (res.status === 429 || res.status === 529 || res.status === 504) {
            if (attempt < retries) {
              const waitMs = Math.min(3000 * Math.pow(2, attempt), 15000);
              console.log(`API ${res.status}, retrying in ${waitMs}ms (${attempt + 1}/${retries})...`);
              await new Promise(r => setTimeout(r, waitMs));
              continue;
            }
          }
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('application/json')) {
            const t = await res.text();
            throw new Error(`API error (${res.status})`);
          }
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || json.details || `Failed (${res.status})`);
          return json;
        }
        throw new Error('API unavailable — try again in a moment.');
      };

      // Read active tab fresh from localStorage (it changes without URL change)
      const freshPageContext = pageContext && clientId
        ? { ...pageContext, activeTab: localStorage.getItem(`aureum_tab_${clientId}`) || 'Overview' }
        : pageContext;

      let data = await fetchWithRetry({ messages: apiMessages, memories: clientMemories, clientContext, pageContext: freshPageContext });

      // Tool execution loop — if AI wants to write to sections, execute and follow up
      let lastTextMessage = data.message || '';
      let loopMessages = apiMessages;
      let maxLoops = 5;
      let toolsExecuted = false;

      console.log('[AIBubble] Initial response:', { message: data.message?.slice(0, 80), needsFollowUp: data.needsFollowUp, toolCalls: data.toolCalls?.length });

      while (data.needsFollowUp && data.toolCalls && data.toolCalls.length > 0 && maxLoops > 0) {
        maxLoops--;
        toolsExecuted = true;
        const toolResults: { tool_use_id: string; content: string }[] = [];

        for (const tool of data.toolCalls) {
          console.log('[AIBubble] Executing tool:', tool.name, tool.input);
          try {
            if (tool.name === 'update_memory' && supabase) {
              // Add or update a memory entry (Audience, Content Rules, Examples, etc.)
              const { category, content: memContent } = tool.input;
              const existingMem = (pageContext?.memories || []).find((m: any) => m.category === category && m.content === '');
              if (existingMem) {
                await supabase.from('ai_memory').update({ content: memContent, updated_at: new Date().toISOString() }).eq('id', existingMem.id).eq('user_id', storagePrefix);
                toolResults.push({ tool_use_id: tool.id, content: `Updated ${category} memory.` });
              } else {
                await supabase.from('ai_memory').insert({ id: crypto.randomUUID(), user_id: storagePrefix, content: memContent, category, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
                toolResults.push({ tool_use_id: tool.id, content: `Added new ${category} entry.` });
              }

            } else if (tool.name === 'add_memory' && supabase) {
              const { category, content: memContent } = tool.input;
              await supabase.from('ai_memory').insert({ id: crypto.randomUUID(), user_id: storagePrefix, content: memContent, category, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
              toolResults.push({ tool_use_id: tool.id, content: `Added new ${category} entry: "${memContent.slice(0, 60)}..."` });

            } else if (tool.name === 'update_client_detail' && supabase) {
              const cid = clientId || clientContext?.id;
              const { field, value } = tool.input;
              const allowedFields = ['strategy_overview', 'funnel_notes', 'notes', 'ad_performance_notes', 'content_drafts'];
              if (!cid) {
                toolResults.push({ tool_use_id: tool.id, content: 'Error: No client selected.' });
              } else if (allowedFields.includes(field)) {
                const { error } = await supabase.from('client_details').update({ [field]: value }).eq('client_id', cid).eq('user_id', storagePrefix);
                toolResults.push({ tool_use_id: tool.id, content: error ? `Error: ${error.message}` : `Updated ${field}.` });
              } else {
                toolResults.push({ tool_use_id: tool.id, content: `Cannot update field "${field}" — not allowed.` });
              }

            } else if (tool.name === 'add_journal_entry' && supabase) {
              // Content Journal uses ad_performance_notes, entries separated by \n---\n
              const cid = clientId || clientContext?.id;
              if (!cid) {
                toolResults.push({ tool_use_id: tool.id, content: 'Error: No client selected.' });
              } else {
                const { data: det, error: selErr } = await supabase.from('client_details').select('ad_performance_notes').eq('client_id', cid).eq('user_id', storagePrefix).maybeSingle();
                if (selErr) {
                  toolResults.push({ tool_use_id: tool.id, content: `Error reading journal: ${selErr.message}` });
                } else if (!det) {
                  // Row doesn't exist — create it
                  const newVal = tool.input.content;
                  const { error: insErr } = await supabase.from('client_details').insert({ client_id: cid, user_id: storagePrefix, ad_performance_notes: newVal });
                  if (insErr) {
                    toolResults.push({ tool_use_id: tool.id, content: `Error creating journal: ${insErr.message}` });
                  } else {
                    toolResults.push({ tool_use_id: tool.id, content: `Added to Content Journal: "${tool.input.content.slice(0, 80)}"` });
                  }
                } else {
                  const existing = det.ad_performance_notes || '';
                  const newVal = existing ? `${existing}\n---\n${tool.input.content}` : tool.input.content;
                  const { error: updErr } = await supabase.from('client_details').update({ ad_performance_notes: newVal }).eq('client_id', cid).eq('user_id', storagePrefix);
                  if (updErr) {
                    toolResults.push({ tool_use_id: tool.id, content: `Error updating journal: ${updErr.message}` });
                  } else {
                    toolResults.push({ tool_use_id: tool.id, content: `Added to Content Journal: "${tool.input.content.slice(0, 80)}"` });
                  }
                }
              }

            } else if (tool.name === 'add_scripted_ad' && supabase) {
              const cid = clientId || clientContext?.id;
              if (!cid) { toolResults.push({ tool_use_id: tool.id, content: 'Error: No client selected.' }); continue; }
              const { data: det } = await supabase.from('client_details').select('scripted_ads').eq('client_id', cid).eq('user_id', storagePrefix).maybeSingle();
              const ads = det?.scripted_ads || [];
              const newAd = { id: crypto.randomUUID(), title: tool.input.title, hook: tool.input.hook || '', body: tool.input.body || '', cta: tool.input.cta || '' };
              ads.push(newAd);
              await supabase.from('client_details').update({ scripted_ads: ads }).eq('client_id', cid).eq('user_id', storagePrefix);
              toolResults.push({ tool_use_id: tool.id, content: `Added script "${tool.input.title}".` });

            } else {
              toolResults.push({ tool_use_id: tool.id, content: `Unknown tool: ${tool.name}` });
            }
          } catch (err: any) {
            toolResults.push({ tool_use_id: tool.id, content: `Error: ${err.message}` });
          }
        }

        // Send tool results back for follow-up
        loopMessages = [
          ...loopMessages,
          { role: 'assistant', content: data.rawAssistantContent },
          { role: 'user', content: toolResults.map(r => ({ type: 'tool_result', tool_use_id: r.tool_use_id, content: r.content })) },
        ];

        try {
          data = await fetchWithRetry({ messages: loopMessages, memories: clientMemories, clientContext, pageContext });
          if (data.message) lastTextMessage = data.message;
        } catch {
          lastTextMessage = lastTextMessage || toolResults.map(r => r.content).join('. ');
          break;
        }
      }

      // If tools were executed, notify ClientPanel to reload data
      if (toolsExecuted) {
        console.log('[AIBubble] Tools executed — dispatching refresh event');
        window.dispatchEvent(new CustomEvent('aureum-data-refresh'));
      }

      const finalContent = lastTextMessage || data.message || 'Done.';
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant', content: finalContent, created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (supabase) {
        supabase.from('ai_conversations').insert({
          id: assistantMsg.id, user_id: storagePrefix, client_id: null, role: 'assistant', content: finalContent,
        });
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant', content: `Something went wrong: ${err.message}`, created_at: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, sending, messages, memories, allClients, storagePrefix, clientId, clientName, clientService, clientHandle, clientBio, clientTweets, pageContext]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    if (supabase) {
      supabase.from('ai_conversations').delete().eq('user_id', storagePrefix).is('client_id', null);
    }
  }, [storagePrefix]);

  // Render @mention in message text
  const renderMessageText = (text: string) => {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        const isClient = allClients.some(c => c.name.toLowerCase() === name.toLowerCase());
        if (isClient) {
          return <span key={i} className="font-semibold" style={{ color: '#D4A843' }}>{part}</span>;
        }
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  };

  return (
    <>
      {/* ── Floating bubble ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-[9999] rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group"
          style={{
            bottom: 28, right: 28, width: 56, height: 56,
            background: '#1c1c1c', border: '1px solid #333',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <img src="/aureum-logo.svg" alt="Aureum Agent" style={{ width: 28, height: 28 }} />
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(212,168,67,0.15)', animationDuration: '3s' }} />
        </button>
      )}

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          className="fixed z-[9999] flex flex-col shadow-2xl"
          style={{
            bottom: 28, right: 28, width: 400, height: 540,
            background: '#1c1c1c', borderRadius: 20,
            border: '1px solid #2a2a2a', overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #222' }}>
            <div className="flex items-center gap-2.5">
              <img src="/aureum-logo.svg" alt="" style={{ width: 20, height: 20 }} />
              <div>
                <span className="text-sm font-bold" style={{ color: '#ECECEC' }}>Aureum Agent</span>
                {clientName && (
                  <span className="text-[11px] ml-2" style={{ color: '#888' }}>· {clientName}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={clearChat} className="p-1.5 rounded-lg transition-colors" style={{ color: '#555' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')} title="Clear chat"
                ><Trash2 size={14} /></button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: '#555' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ECECEC')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              ><Minimize2 size={14} /></button>
            </div>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="animate-spin" style={{ color: '#D4A843' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(212,168,67,0.1)' }}>
                  <img src="/aureum-logo.svg" alt="" style={{ width: 30, height: 30 }} />
                </div>
                <p className="text-[15px] font-semibold mb-1" style={{ color: '#ECECEC' }}>Aureum Agent</p>
                <p className="text-xs leading-relaxed mb-1" style={{ color: '#666' }}>
                  {clientName
                    ? `Ask me anything about ${clientName} — content ideas, strategy, copy...`
                    : 'Ask me to brainstorm content, refine copy, or strategize.'
                  }
                </p>
                <p className="text-[11px]" style={{ color: '#555' }}>
                  Type <span style={{ color: '#888' }}>@</span> to mention a client
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {(clientName ? [
                    `Give me 5 tweet ideas for @${clientName}`,
                    'Write a thread hook',
                    'Suggest a content calendar',
                  ] : [
                    'Give me 5 tweet ideas',
                    'Write a thread hook',
                    'Help me brainstorm',
                  ]).map(prompt => (
                    <button key={prompt}
                      onClick={() => { setInputText(prompt); inputRef.current?.focus(); }}
                      className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                      style={{ background: '#252525', color: '#999', border: '1px solid #333' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#ECECEC'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#999'; }}
                    >{prompt}</button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[85%]"
                    style={{
                      background: msg.role === 'user' ? '#D4A843' : '#252525',
                      color: msg.role === 'user' ? '#fff' : '#ECECEC',
                      borderBottomRightRadius: msg.role === 'user' ? 6 : 16,
                      borderBottomLeftRadius: msg.role === 'user' ? 16 : 6,
                    }}
                  >
                    {msg.role === 'user'
                      ? <div className="whitespace-pre-wrap">{msg.content}</div>
                      : <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                    }
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ background: '#252525' }}>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#D4A843', animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#D4A843', animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#D4A843', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-3 relative" style={{ borderTop: '1px solid #222' }}>
            {/* @mention dropdown */}
            {mentionQuery !== null && mentionResults.length > 0 && (
              <div className="absolute bottom-full left-3 right-3 mb-1 rounded-xl overflow-hidden shadow-2xl" style={{ background: '#252525', border: '1px solid #333' }}>
                {mentionResults.map((c, i) => (
                  <button
                    key={c.id}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(c); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                    style={{ background: i === mentionIdx ? '#333' : 'transparent' }}
                    onMouseEnter={() => setMentionIdx(i)}
                  >
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: '#444', color: '#ccc' }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: '#ECECEC' }}>{c.name}</div>
                      {c.service && <div className="text-[11px]" style={{ color: '#666' }}>{c.service}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-xl p-2" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-[13px] leading-5 focus:outline-none resize-none placeholder-[#444]"
                style={{ color: '#ECECEC', maxHeight: 100 }}
                placeholder={clientName ? `Ask about ${clientName}...` : 'Type @ to mention a client...'}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim() || sending}
                className="flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-30"
                style={{ background: inputText.trim() ? '#D4A843' : 'transparent', color: '#fff' }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIBubble;
