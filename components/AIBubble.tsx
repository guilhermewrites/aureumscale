import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, Loader2, X, Minimize2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

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

interface AIBubbleProps {
  storagePrefix: string;
  /** Current client context (if viewing a client panel) */
  clientId?: string;
  clientName?: string;
  clientService?: string;
  clientHandle?: string;
  clientBio?: string;
  clientTweets?: string;
}

const AIBubble: React.FC<AIBubbleProps> = ({
  storagePrefix, clientId, clientName, clientService, clientHandle, clientBio, clientTweets,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load conversations & memories when opened
  useEffect(() => {
    if (!isOpen || !supabase) return;
    setLoading(true);

    // Load chat history (global, not per-client)
    supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', storagePrefix)
      .is('client_id', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages((data ?? []).map((m: any) => ({
          id: m.id, role: m.role, content: m.content, created_at: m.created_at,
        })));
        setLoading(false);
      });

    // Load all memories (global + client-specific)
    supabase
      .from('ai_memory')
      .select('id, content, category')
      .eq('user_id', storagePrefix)
      .then(({ data }) => setMemories(data ?? []));
  }, [isOpen, storagePrefix]);

  // Load client-specific memories when clientId changes
  useEffect(() => {
    if (!supabase || !clientId) return;
    supabase
      .from('ai_memory')
      .select('id, content, category')
      .eq('user_id', storagePrefix)
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

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: text, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSending(true);

    // Save user message
    if (supabase) {
      supabase.from('ai_conversations').insert({
        id: userMsg.id, user_id: storagePrefix, client_id: null, role: 'user', content: text,
      });
    }

    try {
      const apiMessages = [...messages, userMsg].slice(-20).map(m => ({ role: m.role, content: m.content }));

      // Build client context if viewing a client
      const clientContext = clientId ? {
        name: clientName, service: clientService, handle: clientHandle, bio: clientBio, recentTweets: clientTweets,
      } : undefined;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, memories, clientContext }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const t = await res.text();
        throw new Error(`API returned ${res.status}: ${t.slice(0, 200)}`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || `Failed (${res.status})`);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: 'assistant', content: data.message, created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (supabase) {
        supabase.from('ai_conversations').insert({
          id: assistantMsg.id, user_id: storagePrefix, client_id: null, role: 'assistant', content: data.message,
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
  }, [inputText, sending, messages, memories, storagePrefix, clientId, clientName, clientService, clientHandle, clientBio, clientTweets]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    if (supabase) {
      supabase.from('ai_conversations').delete().eq('user_id', storagePrefix).is('client_id', null);
    }
  }, [storagePrefix]);

  // Render the bubble + panel
  return (
    <>
      {/* ── Floating bubble ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-[9999] rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group"
          style={{
            bottom: 28,
            right: 28,
            width: 56,
            height: 56,
            background: '#1c1c1c',
            border: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src="/aureum-logo.svg" alt="Aureum Agent" style={{ width: 28, height: 28 }} />
          {/* Subtle pulse ring */}
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(212,168,67,0.15)', animationDuration: '3s' }}
          />
        </button>
      )}

      {/* ── Chat panel ── */}
      {isOpen && (
        <div
          className="fixed z-[9999] flex flex-col shadow-2xl"
          style={{
            bottom: 28,
            right: 28,
            width: 400,
            height: 540,
            background: '#1c1c1c',
            borderRadius: 20,
            border: '1px solid #2a2a2a',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #222' }}>
            <div className="flex items-center gap-2.5">
              <img src="/aureum-logo.svg" alt="" style={{ width: 20, height: 20 }} />
              <div>
                <span className="text-sm font-bold" style={{ color: '#ECECEC' }}>Aureum Agent</span>
                {clientName && (
                  <span className="text-[11px] ml-2" style={{ color: '#D4A843' }}>
                    {clientName}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: '#555' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                  title="Clear chat"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#555' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ECECEC')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
              >
                <Minimize2 size={14} />
              </button>
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
                <p className="text-xs leading-relaxed" style={{ color: '#666' }}>
                  {clientName
                    ? `Ask me anything about ${clientName} — content ideas, strategy, copy...`
                    : 'Ask me to brainstorm content, refine copy, or strategize. I learn from your Memory.'
                  }
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {(clientName ? [
                    `Give me 5 tweet ideas for ${clientName}`,
                    'Write a thread hook',
                    'Suggest a content calendar',
                  ] : [
                    'Give me 5 tweet ideas',
                    'Write a thread hook',
                    'Help me brainstorm',
                  ]).map(prompt => (
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
                    {msg.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <br />}
                        {line}
                      </React.Fragment>
                    ))}
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

          {/* Input */}
          <div className="p-3" style={{ borderTop: '1px solid #222' }}>
            <div className="flex items-end gap-2 rounded-xl p-2" style={{ background: '#161616', border: '1px solid #2a2a2a' }}>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                className="flex-1 bg-transparent text-[13px] leading-5 focus:outline-none resize-none placeholder-[#444]"
                style={{ color: '#ECECEC', maxHeight: 100 }}
                placeholder={clientName ? `Ask about ${clientName}...` : 'Ask anything...'}
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
