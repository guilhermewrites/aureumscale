import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles, Send, Plus, Trash2, Loader2, ChevronDown, ChevronRight,
  Brain, MessageSquare, BookOpen, X,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Memory {
  id: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ClientContext {
  name?: string;
  service?: string;
  handle?: string;
  bio?: string;
  recentTweets?: string;
}

interface AIAssistantProps {
  storagePrefix: string;
  clientId?: string;
  clientContext?: ClientContext;
}

const MEMORY_CATEGORIES = [
  { id: 'tone', label: 'Tone & Voice', placeholder: 'e.g. "I write in a casual, punchy tone. Short sentences. No fluff."' },
  { id: 'audience', label: 'Audience', placeholder: 'e.g. "My audience is startup founders, aged 25-40, on Twitter."' },
  { id: 'rules', label: 'Rules & Preferences', placeholder: 'e.g. "Never use emojis. Always include a hook in the first line."' },
  { id: 'examples', label: 'Examples of Good Content', placeholder: 'Paste a tweet or post you love — the AI will learn from it.' },
  { id: 'general', label: 'Other Instructions', placeholder: 'Anything else the AI should know about your style.' },
];

// ─── Component ──────────────────────────────────────────────────────────────

const AIAssistant: React.FC<AIAssistantProps> = ({ storagePrefix, clientId, clientContext }) => {
  const [activeView, setActiveView] = useState<'chat' | 'memory'>('chat');

  // ── Memory state ──
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['tone']));

  // ── Chat state ──
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load memories ──
  useEffect(() => {
    if (!supabase) return;
    setMemoriesLoading(true);
    supabase
      .from('ai_memory')
      .select('*')
      .eq('user_id', storagePrefix)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMemories(data ?? []);
        setMemoriesLoading(false);
      });
  }, [storagePrefix]);

  // ── Load chat history ──
  useEffect(() => {
    if (!supabase) return;
    setChatLoading(true);
    let query = supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', storagePrefix)
      .order('created_at', { ascending: true });

    if (clientId) {
      query = query.eq('client_id', clientId);
    } else {
      query = query.is('client_id', null);
    }

    query.then(({ data }) => {
      setMessages((data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })));
      setChatLoading(false);
    });
  }, [storagePrefix, clientId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Memory CRUD ──
  const addMemory = useCallback(async (category: string) => {
    if (!supabase) return;
    const mem: any = {
      id: crypto.randomUUID(),
      user_id: storagePrefix,
      content: '',
      category,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMemories(prev => [...prev, mem]);
    await supabase.from('ai_memory').insert(mem);
  }, [storagePrefix]);

  const updateMemory = useCallback(async (id: string, content: string) => {
    setMemories(prev => prev.map(m => m.id === id ? { ...m, content, updated_at: new Date().toISOString() } : m));
    if (supabase) {
      await supabase.from('ai_memory').update({ content, updated_at: new Date().toISOString() }).eq('id', id);
    }
  }, []);

  const deleteMemory = useCallback(async (id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
    if (supabase) {
      await supabase.from('ai_memory').delete().eq('id', id);
    }
  }, []);

  // ── Send message ──
  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    // Save user message to DB
    if (supabase) {
      supabase.from('ai_conversations').insert({
        id: userMsg.id,
        user_id: storagePrefix,
        client_id: clientId || null,
        role: 'user',
        content: text,
      });
    }

    try {
      // Build messages for API
      const apiMessages = [...messages, userMsg].slice(-20).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          memories,
          clientContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message to DB
      if (supabase) {
        supabase.from('ai_conversations').insert({
          id: assistantMsg.id,
          user_id: storagePrefix,
          client_id: clientId || null,
          role: 'assistant',
          content: data.message,
        });
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, something went wrong: ${err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, sending, messages, memories, clientContext, storagePrefix, clientId]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    if (supabase) {
      let query = supabase.from('ai_conversations').delete().eq('user_id', storagePrefix);
      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.is('client_id', null);
      }
      await query;
    }
  }, [storagePrefix, clientId]);

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const memoryCount = memories.length;

  // ── Render ──
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#1c1c1c', borderRadius: 20 }}>

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #222' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <img src="/aureum-logo.svg" alt="Aureum" style={{ width: 18, height: 18 }} />
          <span className="text-sm font-bold" style={{ color: '#ECECEC' }}>Aureum Agent</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveView('chat')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: activeView === 'chat' ? '#D4A843' : 'transparent',
              color: activeView === 'chat' ? '#fff' : '#666',
            }}
          >
            <MessageSquare size={12} /> Chat
          </button>
          <button
            onClick={() => setActiveView('memory')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: activeView === 'memory' ? '#D4A843' : 'transparent',
              color: activeView === 'memory' ? '#fff' : '#666',
            }}
          >
            <Brain size={12} /> Memory {memoryCount > 0 && <span className="opacity-60">({memoryCount})</span>}
          </button>
        </div>
      </div>

      {/* ── CHAT VIEW ── */}
      {activeView === 'chat' && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={18} className="animate-spin" style={{ color: '#D4A843' }} />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(212,168,67,0.1)' }}>
                  <img src="/aureum-logo.svg" alt="Aureum" style={{ width: 26, height: 26 }} />
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: '#ECECEC' }}>
                  Aureum Agent
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#666' }}>
                  Ask me to brainstorm tweet ideas, refine your copy, suggest hooks, or anything content-related. Teach me your style in the Memory tab.
                </p>
                {/* Quick prompts */}
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {[
                    'Give me 5 tweet ideas',
                    'Write a thread hook',
                    'Rewrite this tweet better',
                  ].map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => { setInputText(prompt); inputRef.current?.focus(); }}
                      className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
                      style={{ background: '#252525', color: '#999', border: '1px solid #333' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#D4A843'; e.currentTarget.style.color = '#ECECEC'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#999'; }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[90%]"
                      style={{
                        background: msg.role === 'user' ? '#D4A843' : '#252525',
                        color: msg.role === 'user' ? '#fff' : '#ECECEC',
                        borderBottomRightRadius: msg.role === 'user' ? 6 : 16,
                        borderBottomLeftRadius: msg.role === 'user' ? 16 : 6,
                      }}
                    >
                      {msg.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <br />}
                          {line}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
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
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="p-3" style={{ borderTop: '1px solid #222' }}>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1 text-[10px] font-medium mb-2 px-2 py-1 rounded-md transition-colors"
                style={{ color: '#555' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                <Trash2 size={10} /> Clear chat
              </button>
            )}
            <div className="flex items-end gap-2 rounded-xl p-2" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 bg-transparent text-[13px] leading-5 focus:outline-none resize-none placeholder-[#444]"
                style={{ color: '#ECECEC', maxHeight: 120 }}
                placeholder="Ask anything about content…"
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

      {/* ── MEMORY VIEW ── */}
      {activeView === 'memory' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {memoriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin" style={{ color: '#D4A843' }} />
            </div>
          ) : (
            <>
              <p className="text-[11px] leading-relaxed px-1 mb-3" style={{ color: '#666' }}>
                Teach the AI your style. Everything you add here is included in every conversation so it always writes like you.
              </p>

              {MEMORY_CATEGORIES.map(cat => {
                const catMemories = memories.filter(m => m.category === cat.id);
                const isOpen = expandedCats.has(cat.id);

                return (
                  <div key={cat.id} className="rounded-xl overflow-hidden" style={{ background: '#161616' }}>
                    {/* Category header */}
                    <button
                      onClick={() => toggleCat(cat.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 transition-colors"
                      style={{ color: '#ECECEC' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center gap-2">
                        {isOpen ? <ChevronDown size={13} style={{ color: '#666' }} /> : <ChevronRight size={13} style={{ color: '#666' }} />}
                        <span className="text-xs font-semibold">{cat.label}</span>
                        {catMemories.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(167,139,250,0.15)', color: '#D4A843' }}>
                            {catMemories.length}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); addMemory(cat.id); if (!isOpen) toggleCat(cat.id); }}
                        className="p-1 rounded-md transition-colors"
                        style={{ color: '#555' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#D4A843'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#555'; }}
                      >
                        <Plus size={13} />
                      </button>
                    </button>

                    {/* Category items */}
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        {catMemories.length === 0 ? (
                          <button
                            onClick={() => addMemory(cat.id)}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-medium transition-colors"
                            style={{ color: '#555', border: '1px dashed #2a2a2a' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#D4A843'; e.currentTarget.style.borderColor = '#D4A84344'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#555'; e.currentTarget.style.borderColor = '#2a2a2a'; }}
                          >
                            <Plus size={12} /> Add {cat.label.toLowerCase()}
                          </button>
                        ) : (
                          catMemories.map(mem => (
                            <div key={mem.id} className="relative group/mem">
                              <textarea
                                value={mem.content}
                                onChange={e => updateMemory(mem.id, e.target.value)}
                                className="w-full bg-transparent text-[12px] leading-5 focus:outline-none resize-none placeholder-[#3a3a3a] rounded-lg p-2 transition-colors"
                                style={{ color: '#ccc', border: '1px solid #252525' }}
                                onFocus={e => (e.currentTarget.style.borderColor = '#D4A84344')}
                                onBlur={e => (e.currentTarget.style.borderColor = '#252525')}
                                placeholder={cat.placeholder}
                                rows={Math.max(2, mem.content.split('\n').length)}
                              />
                              <button
                                onClick={() => deleteMemory(mem.id)}
                                className="absolute top-1 right-1 p-1 rounded-md opacity-0 group-hover/mem:opacity-100 transition-opacity"
                                style={{ color: '#555' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                              >
                                <X size={11} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
