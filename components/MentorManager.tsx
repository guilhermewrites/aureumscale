import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  Plus,
  X,
  ChevronRight,
  Settings,
  Target,
  BookOpen,
  Sparkles,
  Moon,
  Dumbbell,
  Utensils,
  SmilePlus,
  StickyNote,
  Trash2,
  Check,
  Brain,
  Clock,
  Camera,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ── Types ──

interface LifeGoal {
  id: string;
  text: string;
  deadline: string;
  completed: boolean;
}

interface LifeArea {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  goals: LifeGoal[];
}

interface MentorProfile {
  mentor_name: string;
  mentor_photo: string;
  personality: string;
  custom_personality: string;
  tone: string;
  life_areas: LifeArea[];
  wake_time: string;
  sleep_time: string;
}

interface MentorLog {
  id: string;
  date: string;
  category: string;
  content: string;
  metadata: any;
  created_at: string;
}

interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

const DEFAULT_PROFILE: MentorProfile = {
  mentor_name: 'Aurelius',
  mentor_photo: '',
  personality: 'stoic',
  custom_personality: '',
  tone: 'direct',
  life_areas: [
    { id: '1', name: 'Business (Aureum)', priority: 'high', goals: [] },
    { id: '2', name: 'Fitness', priority: 'high', goals: [] },
    { id: '3', name: 'Health', priority: 'high', goals: [] },
  ],
  wake_time: '07:00',
  sleep_time: '23:00',
};

const PERSONALITIES = [
  { id: 'stoic', label: 'Stoic', desc: 'Calm authority. Discipline over motivation.' },
  { id: 'tough_love', label: 'Tough Love', desc: 'No excuses. Radical accountability.' },
  { id: 'strategic', label: 'Strategic', desc: 'Systems thinker. CEO mindset.' },
  { id: 'gentle', label: 'Gentle', desc: 'Supportive. Sustainable progress.' },
  { id: 'motivational', label: 'Motivational', desc: 'High energy. Fire and drive.' },
];

const TONES = ['direct', 'analytical', 'casual', 'formal'];

const LOG_CATEGORIES = [
  { id: 'food', label: 'Food', icon: Utensils, placeholder: 'What did you eat?' },
  { id: 'sleep', label: 'Sleep', icon: Moon, placeholder: 'How did you sleep? Hours?' },
  { id: 'workout', label: 'Workout', icon: Dumbbell, placeholder: 'What did you do?' },
  { id: 'mood', label: 'Mood', icon: SmilePlus, placeholder: 'How are you feeling? (1-10)' },
  { id: 'note', label: 'Note', icon: StickyNote, placeholder: 'Any thoughts or updates...' },
];

const KNOWLEDGE_CATEGORIES = [
  'Agency Operations',
  'Sales & Outreach',
  'Scaling',
  'Mindset',
  'Fitness',
  'Nutrition',
  'Productivity',
  'Other',
];

const SUGGESTED_PROMPTS = [
  "What do I have to do today?",
  "How am I doing this week?",
  "Review my goals",
  "What should I prioritize right now?",
];

// ── Helpers ──

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Simple Markdown renderer ──

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headings (optional)
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="font-semibold text-[#ECECEC] mt-2 mb-1">{line.slice(4)}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-semibold text-[#ECECEC] mt-2 mb-1">{line.slice(3)}</h3>);
      continue;
    }

    // Bullet points
    const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[2];
      elements.push(
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-[#555] flex-shrink-0 mt-0.5">{'•'}</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Empty line = spacing
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i}>{renderInline(line)}</p>);
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Bold **text** and bullet-proof
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index} className="font-semibold text-[#ECECEC]">{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ── Component ──

interface MentorManagerProps {
  storagePrefix: string;
}

const MentorManager: React.FC<MentorManagerProps> = ({ storagePrefix }) => {
  const [activeTab, setActiveTab] = useState<'today' | 'goals' | 'knowledge' | 'settings'>('today');

  // User photo from localStorage
  const userPhoto = useMemo(() => {
    try {
      const users = JSON.parse(localStorage.getItem('writestakeover_users') || '[]');
      return users[0]?.photoUrl || null;
    } catch { return null; }
  }, []);

  // Profile
  const [profile, setProfile] = useState<MentorProfile>(DEFAULT_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentorPhotoRef = useRef<HTMLInputElement>(null);

  const handleMentorPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const scale = Math.min(200 / img.width, 200 / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      saveProfile({ ...profile, mentor_photo: dataUrl });
    };
    img.src = url;
  };

  // Logs
  const [todayLogs, setTodayLogs] = useState<MentorLog[]>([]);
  const [logCategory, setLogCategory] = useState<string | null>(null);
  const [logInput, setLogInput] = useState('');

  // Knowledge
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({ category: 'Agency Operations', title: '', content: '', source: '' });

  // Calendar events (for context)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Goals editing
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');
  const [newAreaName, setNewAreaName] = useState('');

  // ── Load data from Supabase ──

  useEffect(() => {
    if (!storagePrefix) return;
    loadProfile();
    loadTodayLogs();
    loadConversations();
    loadKnowledge();
    loadCalendarEvents();
  }, [storagePrefix]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from('mentor_profile')
      .select('*')
      .eq('user_id', storagePrefix)
      .single();
    if (data) {
      setProfile({
        mentor_name: data.mentor_name || 'Aurelius',
        mentor_photo: data.mentor_photo || '',
        personality: data.personality || 'stoic',
        custom_personality: data.custom_personality || '',
        tone: data.tone || 'direct',
        life_areas: (data.life_areas as LifeArea[]) || DEFAULT_PROFILE.life_areas,
        wake_time: data.wake_time || '07:00',
        sleep_time: data.sleep_time || '23:00',
      });
    }
    setProfileLoaded(true);
  };

  const saveProfile = async (updated: MentorProfile) => {
    setProfile(updated);
    await supabase.from('mentor_profile').upsert({
      user_id: storagePrefix,
      mentor_name: updated.mentor_name,
      mentor_photo: updated.mentor_photo,
      personality: updated.personality,
      custom_personality: updated.custom_personality,
      tone: updated.tone,
      life_areas: updated.life_areas,
      wake_time: updated.wake_time,
      sleep_time: updated.sleep_time,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  };

  const loadTodayLogs = async () => {
    const today = todayStr();
    const { data } = await supabase
      .from('mentor_logs')
      .select('*')
      .eq('user_id', storagePrefix)
      .eq('date', today)
      .order('created_at', { ascending: false });
    if (data) setTodayLogs(data);
  };

  const loadConversations = async () => {
    const { data } = await supabase
      .from('mentor_conversations')
      .select('*')
      .eq('user_id', storagePrefix)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data.map(d => ({ id: d.id, role: d.role, content: d.content, created_at: d.created_at })));
  };

  const loadKnowledge = async () => {
    const { data } = await supabase
      .from('mentor_knowledge')
      .select('*')
      .eq('user_id', storagePrefix)
      .order('created_at', { ascending: false });
    if (data) setKnowledge(data);
  };

  const loadCalendarEvents = async () => {
    const today = todayStr();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const endDate = `${threeDaysLater.getFullYear()}-${String(threeDaysLater.getMonth() + 1).padStart(2, '0')}-${String(threeDaysLater.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', storagePrefix)
      .gte('date', today)
      .lte('date', endDate)
      .order('date')
      .order('start_time');
    if (data) {
      setCalendarEvents(data.map(d => ({
        id: d.id,
        date: d.date,
        title: d.title || 'Untitled',
        startTime: d.start_time,
        endTime: d.end_time,
        notes: d.notes,
      })));
    }
  };

  // ── Build AI context ──

  const buildContext = useCallback(() => {
    const now = new Date();
    const today = todayStr();

    return {
      personality: profile.personality,
      customPersonality: profile.custom_personality,
      tone: profile.tone,
      lifeAreas: profile.life_areas,
      currentDateTime: now.toLocaleString(),
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      todayEvents: calendarEvents.filter(e => e.date === today),
      upcomingEvents: calendarEvents.filter(e => e.date !== today),
      recentLogs: todayLogs.map(l => ({ date: l.date, category: l.category, content: l.content })),
      knowledgeEntries: knowledge.slice(0, 20).map(k => ({ category: k.category, title: k.title, content: k.content })),
      clientsSummary: null,
      financeSummary: null,
    };
  }, [profile, calendarEvents, todayLogs, knowledge]);

  // ── Chat ──

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async (text?: string) => {
    const content = text || chatInput.trim();
    if (!content || isLoading) return;

    const userMsg: ChatMessage = {
      id: genId(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsLoading(true);
    scrollToBottom();

    // Save user message
    await supabase.from('mentor_conversations').insert({
      user_id: storagePrefix,
      role: 'user',
      content,
    });

    try {
      // Build messages for API (last 20 for context window)
      const recentMessages = [...messages.slice(-18), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: recentMessages,
          context: buildContext(),
        }),
      });

      const data = await res.json();
      const assistantContent = data.message || data.error || 'No response.';

      // Handle tool calls (save_knowledge, add_calendar_event)
      if (data.toolCalls && data.toolCalls.length > 0) {
        for (const tool of data.toolCalls) {
          if (tool.name === 'save_knowledge') {
            const entry = {
              user_id: storagePrefix,
              category: tool.input.category || 'Other',
              title: tool.input.title || 'Untitled',
              content: tool.input.content || '',
              source: 'Mentor AI',
            };
            const { data: saved } = await supabase.from('mentor_knowledge').insert(entry).select().single();
            if (saved) setKnowledge(prev => [saved, ...prev]);
          } else if (tool.name === 'add_calendar_event') {
            await supabase.from('calendar_events').insert({
              user_id: storagePrefix,
              date: tool.input.date,
              title: tool.input.title,
              start_time: tool.input.start_time,
              end_time: tool.input.end_time,
              notes: tool.input.notes || '',
              color: '#2a2a2a',
            });
            loadCalendarEvents();
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message
      await supabase.from('mentor_conversations').insert({
        user_id: storagePrefix,
        role: 'assistant',
        content: assistantContent,
      });
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: `Error: ${err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }

    setIsLoading(false);
    scrollToBottom();
  };

  const clearConversation = async () => {
    setMessages([]);
    await supabase.from('mentor_conversations').delete().eq('user_id', storagePrefix);
  };

  // ── Logs ──

  const addLog = async () => {
    if (!logCategory || !logInput.trim()) return;
    const today = todayStr();
    const newLog = {
      user_id: storagePrefix,
      date: today,
      category: logCategory,
      content: logInput.trim(),
      metadata: {},
    };

    const { data } = await supabase.from('mentor_logs').insert(newLog).select().single();
    if (data) setTodayLogs(prev => [data, ...prev]);
    setLogInput('');
    setLogCategory(null);
  };

  const deleteLog = async (id: string) => {
    await supabase.from('mentor_logs').delete().eq('id', id);
    setTodayLogs(prev => prev.filter(l => l.id !== id));
  };

  // ── Knowledge ──

  const addKnowledge = async () => {
    if (!knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return;
    const entry = {
      user_id: storagePrefix,
      category: knowledgeForm.category,
      title: knowledgeForm.title.trim(),
      content: knowledgeForm.content.trim(),
      source: knowledgeForm.source.trim() || null,
    };
    const { data } = await supabase.from('mentor_knowledge').insert(entry).select().single();
    if (data) setKnowledge(prev => [data, ...prev]);
    setKnowledgeForm({ category: 'Agency Operations', title: '', content: '', source: '' });
    setShowAddKnowledge(false);
  };

  const deleteKnowledge = async (id: string) => {
    await supabase.from('mentor_knowledge').delete().eq('id', id);
    setKnowledge(prev => prev.filter(k => k.id !== id));
  };

  // ── Goals ──

  const addGoal = (areaId: string) => {
    if (!newGoalText.trim()) return;
    const updated = { ...profile };
    const area = updated.life_areas.find(a => a.id === areaId);
    if (!area) return;
    area.goals.push({
      id: genId(),
      text: newGoalText.trim(),
      deadline: newGoalDeadline || '',
      completed: false,
    });
    saveProfile(updated);
    setNewGoalText('');
    setNewGoalDeadline('');
  };

  const toggleGoal = (areaId: string, goalId: string) => {
    const updated = { ...profile };
    const area = updated.life_areas.find(a => a.id === areaId);
    const goal = area?.goals.find(g => g.id === goalId);
    if (goal) goal.completed = !goal.completed;
    saveProfile(updated);
  };

  const deleteGoal = (areaId: string, goalId: string) => {
    const updated = { ...profile };
    const area = updated.life_areas.find(a => a.id === areaId);
    if (area) area.goals = area.goals.filter(g => g.id !== goalId);
    saveProfile(updated);
  };

  const addArea = () => {
    if (!newAreaName.trim()) return;
    const updated = { ...profile };
    updated.life_areas.push({ id: genId(), name: newAreaName.trim(), priority: 'medium', goals: [] });
    saveProfile(updated);
    setNewAreaName('');
  };

  const deleteArea = (areaId: string) => {
    const updated = { ...profile };
    updated.life_areas = updated.life_areas.filter(a => a.id !== areaId);
    saveProfile(updated);
  };

  const setAreaPriority = (areaId: string, priority: 'high' | 'medium' | 'low') => {
    const updated = { ...profile };
    const area = updated.life_areas.find(a => a.id === areaId);
    if (area) area.priority = priority;
    saveProfile(updated);
  };

  // ── Greeting ──

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const tabs = [
    { id: 'today' as const, label: 'Chat', icon: Sparkles },
    { id: 'goals' as const, label: 'Goals', icon: Target },
    { id: 'knowledge' as const, label: 'Knowledge', icon: BookOpen },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  // ── Render ──

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-[#ECECEC]">{greeting}, Guilherme.</h1>
          <p className="text-xs text-[#555] mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-none ${
                activeTab === tab.id
                  ? 'bg-[#252525] text-[#ECECEC]'
                  : 'text-[#555] hover:text-[#888]'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════ TODAY TAB ════════════════════ */}
      {activeTab === 'today' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick log row */}
          <div className="flex-shrink-0 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              {LOG_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setLogCategory(logCategory === cat.id ? null : cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-none ${
                    logCategory === cat.id
                      ? 'bg-[#252525] text-[#ECECEC] border border-[#3a3a3a]'
                      : 'bg-[#1c1c1c] text-[#666] hover:text-[#888] border border-[#2a2a2a]'
                  }`}
                >
                  <cat.icon size={12} />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Log input */}
            {logCategory && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={logInput}
                  onChange={e => setLogInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLog()}
                  placeholder={LOG_CATEGORIES.find(c => c.id === logCategory)?.placeholder}
                  className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a]"
                />
                <button
                  onClick={addLog}
                  className="px-3 py-2 bg-[#252525] hover:bg-[#2a2a2a] text-[#ECECEC] rounded-lg text-xs font-medium transition-none"
                >
                  Log
                </button>
              </div>
            )}

            {/* Today's logs */}
            {todayLogs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {todayLogs.map(log => {
                  const catInfo = LOG_CATEGORIES.find(c => c.id === log.category);
                  const Icon = catInfo?.icon || StickyNote;
                  return (
                    <div key={log.id} className="flex items-center gap-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-1.5 group">
                      <Icon size={11} className="text-[#555]" />
                      <span className="text-xs text-[#9B9B9B]">{log.content}</span>
                      <span className="text-[10px] text-[#333]">{formatTime(log.created_at)}</span>
                      <button
                        onClick={() => deleteLog(log.id)}
                        className="text-[#333] hover:text-[#888] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#1c1c1c] rounded-xl border border-[#2a2a2a] overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Brain size={32} className="text-[#333] mb-3" />
                  <p className="text-sm text-[#555] mb-4">Ask your mentor anything.</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {SUGGESTED_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="px-3 py-1.5 bg-[#252525] hover:bg-[#2a2a2a] border border-[#2a2a2a] rounded-lg text-xs text-[#888] hover:text-[#ECECEC] transition-none"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {/* Mentor avatar */}
                  {msg.role === 'assistant' && (
                    profile.mentor_photo ? (
                      <img src={profile.mentor_photo} alt={profile.mentor_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                        <Brain size={14} className="text-[#888]" />
                      </div>
                    )
                  )}
                  <div
                    className={`max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#252525] text-[#ECECEC]'
                        : 'bg-[#171717] text-[#CDCDCD] border border-[#2a2a2a]'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : <div className="whitespace-pre-wrap">{msg.content}</div>}
                  </div>
                  {/* User avatar */}
                  {msg.role === 'user' && (
                    userPhoto ? (
                      <img src={userPhoto} alt="You" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
                        GU
                      </div>
                    )
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-end gap-2.5 justify-start">
                  {profile.mentor_photo ? (
                    <img src={profile.mentor_photo} alt={profile.mentor_name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#252525] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <Brain size={14} className="text-[#888]" />
                    </div>
                  )}
                  <div className="bg-[#171717] border border-[#2a2a2a] rounded-xl px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#555] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-[#2a2a2a] p-3">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask your mentor..."
                  rows={1}
                  className="flex-1 bg-[#171717] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a] resize-none"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !chatInput.trim()}
                  className="px-3 py-2 bg-[#252525] hover:bg-[#2a2a2a] text-[#ECECEC] rounded-lg transition-none disabled:opacity-30"
                >
                  <Send size={16} />
                </button>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="mt-2 text-[10px] text-[#333] hover:text-[#666] transition-none"
                >
                  Clear conversation
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ GOALS TAB ════════════════════ */}
      {activeTab === 'goals' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {profile.life_areas.map(area => (
            <div key={area.id} className="bg-[#1c1c1c] rounded-xl border border-[#2a2a2a] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-[#ECECEC]">{area.name}</h3>
                  <select
                    value={area.priority}
                    onChange={e => setAreaPriority(area.id, e.target.value as any)}
                    className="bg-[#171717] border border-[#2a2a2a] rounded px-2 py-0.5 text-[10px] text-[#888] focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <button onClick={() => deleteArea(area.id)} className="text-[#333] hover:text-[#888] transition-none">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Goals */}
              <div className="space-y-1.5">
                {area.goals.map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 group">
                    <button
                      onClick={() => toggleGoal(area.id, goal.id)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-none ${
                        goal.completed
                          ? 'bg-[#ECECEC] border-[#ECECEC]'
                          : 'border-[#3a3a3a] hover:border-[#555]'
                      }`}
                    >
                      {goal.completed && <Check size={10} className="text-[#171717]" />}
                    </button>
                    <span className={`text-sm flex-1 ${goal.completed ? 'text-[#555] line-through' : 'text-[#CDCDCD]'}`}>
                      {goal.text}
                    </span>
                    {goal.deadline && (
                      <span className="text-[10px] text-[#444] flex items-center gap-1">
                        <Clock size={9} />
                        {goal.deadline}
                      </span>
                    )}
                    <button
                      onClick={() => deleteGoal(area.id, goal.id)}
                      className="text-[#333] hover:text-[#888] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add goal */}
              {editingAreaId === area.id ? (
                <div className="mt-3 flex gap-2">
                  <input
                    autoFocus
                    value={newGoalText}
                    onChange={e => setNewGoalText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGoal(area.id)}
                    placeholder="New goal..."
                    className="flex-1 bg-[#171717] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a]"
                  />
                  <input
                    type="date"
                    value={newGoalDeadline}
                    onChange={e => setNewGoalDeadline(e.target.value)}
                    className="bg-[#171717] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-[#888] focus:outline-none"
                  />
                  <button onClick={() => addGoal(area.id)} className="px-3 py-1.5 bg-[#252525] hover:bg-[#2a2a2a] text-[#ECECEC] rounded-lg text-xs transition-none">
                    Add
                  </button>
                  <button onClick={() => { setEditingAreaId(null); setNewGoalText(''); setNewGoalDeadline(''); }} className="text-[#555] hover:text-[#888]">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingAreaId(area.id)}
                  className="mt-3 flex items-center gap-1.5 text-[11px] text-[#444] hover:text-[#888] transition-none"
                >
                  <Plus size={12} /> Add goal
                </button>
              )}
            </div>
          ))}

          {/* Add area */}
          <div className="flex gap-2">
            <input
              value={newAreaName}
              onChange={e => setNewAreaName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addArea()}
              placeholder="Add life area..."
              className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a]"
            />
            <button onClick={addArea} className="px-4 py-2 bg-[#252525] hover:bg-[#2a2a2a] text-[#ECECEC] rounded-lg text-xs font-medium transition-none">
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════ KNOWLEDGE TAB ════════════════════ */}
      {activeTab === 'knowledge' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#555]">Feed your mentor knowledge about your business, processes, and strategies.</p>
            <button
              onClick={() => setShowAddKnowledge(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] hover:bg-[#2a2a2a] text-[#ECECEC] rounded-lg text-xs font-medium transition-none"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Add knowledge modal */}
          {showAddKnowledge && (
            <div className="bg-[#1c1c1c] rounded-xl border border-[#2a2a2a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#ECECEC]">Add Knowledge</h3>
                <button onClick={() => setShowAddKnowledge(false)} className="text-[#555] hover:text-[#888]">
                  <X size={14} />
                </button>
              </div>
              <select
                value={knowledgeForm.category}
                onChange={e => setKnowledgeForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-[#171717] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none"
              >
                {KNOWLEDGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={knowledgeForm.title}
                onChange={e => setKnowledgeForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Title (e.g. How to close high-ticket clients)"
                className="w-full bg-[#171717] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a]"
              />
              <textarea
                value={knowledgeForm.content}
                onChange={e => setKnowledgeForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Content — the actual knowledge, process, framework..."
                rows={4}
                className="w-full bg-[#171717] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a] resize-none"
              />
              <input
                value={knowledgeForm.source}
                onChange={e => setKnowledgeForm(p => ({ ...p, source: e.target.value }))}
                placeholder="Source URL (optional)"
                className="w-full bg-[#171717] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a]"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddKnowledge(false)} className="px-3 py-1.5 text-xs text-[#888] hover:text-[#ECECEC] transition-none">
                  Cancel
                </button>
                <button onClick={addKnowledge} className="px-4 py-1.5 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-xs font-medium transition-none">
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Knowledge entries */}
          {knowledge.length === 0 && !showAddKnowledge && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen size={32} className="text-[#333] mb-3" />
              <p className="text-sm text-[#555] mb-1">No knowledge added yet.</p>
              <p className="text-xs text-[#444]">Add business playbooks, processes, and frameworks for your mentor to reference.</p>
            </div>
          )}

          {knowledge.map(entry => (
            <div key={entry.id} className="bg-[#1c1c1c] rounded-xl border border-[#2a2a2a] p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#555] font-medium">{entry.category}</span>
                  </div>
                  <h4 className="text-sm font-medium text-[#ECECEC] mb-1">{entry.title}</h4>
                  <p className="text-xs text-[#888] line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
                  {entry.source && (
                    <a href={entry.source} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#555] hover:text-[#888] mt-1 inline-block">
                      {entry.source}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => deleteKnowledge(entry.id)}
                  className="text-[#333] hover:text-[#888] opacity-0 group-hover:opacity-100 transition-opacity ml-3"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════ SETTINGS TAB ════════════════════ */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
          {/* Personality */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#555] font-medium mb-3">Mentor Personality</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {PERSONALITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => saveProfile({ ...profile, personality: p.id })}
                  className={`p-3 rounded-xl border text-left transition-none ${
                    profile.personality === p.id
                      ? 'bg-[#252525] border-[#3a3a3a] text-[#ECECEC]'
                      : 'bg-[#1c1c1c] border-[#2a2a2a] text-[#888] hover:text-[#ECECEC] hover:border-[#333]'
                  }`}
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[10px] text-[#555] mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom personality */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#555] font-medium mb-2">Custom Instructions</h3>
            <textarea
              value={profile.custom_personality}
              onChange={e => saveProfile({ ...profile, custom_personality: e.target.value })}
              placeholder="Additional instructions for how your mentor should behave, speak, or what to focus on..."
              rows={3}
              className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a] resize-none"
            />
          </div>

          {/* Tone */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#555] font-medium mb-2">Communication Tone</h3>
            <div className="flex gap-2">
              {TONES.map(t => (
                <button
                  key={t}
                  onClick={() => saveProfile({ ...profile, tone: t })}
                  className={`px-4 py-2 rounded-lg text-xs font-medium capitalize transition-none ${
                    profile.tone === t
                      ? 'bg-[#252525] text-[#ECECEC] border border-[#3a3a3a]'
                      : 'bg-[#1c1c1c] text-[#888] border border-[#2a2a2a] hover:text-[#ECECEC]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#555] font-medium mb-2">Your Schedule</h3>
            <div className="flex gap-4">
              <div>
                <label className="text-[10px] text-[#555] uppercase tracking-wider">Wake time</label>
                <input
                  type="time"
                  value={profile.wake_time}
                  onChange={e => saveProfile({ ...profile, wake_time: e.target.value })}
                  className="block mt-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#555] uppercase tracking-wider">Sleep time</label>
                <input
                  type="time"
                  value={profile.sleep_time}
                  onChange={e => saveProfile({ ...profile, sleep_time: e.target.value })}
                  className="block mt-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Mentor identity */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#555] font-medium mb-3">Mentor Identity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => mentorPhotoRef.current?.click()}
                className="w-16 h-16 rounded-full overflow-hidden bg-[#2a2a2a] flex items-center justify-center text-[#888] hover:brightness-110 transition-none flex-shrink-0 relative group"
              >
                {profile.mentor_photo ? (
                  <img src={profile.mentor_photo} alt="Mentor" className="w-full h-full object-cover" />
                ) : (
                  <Brain size={24} />
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={14} className="text-white" />
                </div>
              </button>
              <input ref={mentorPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleMentorPhotoUpload} />
              <div className="flex-1">
                <label className="text-[10px] text-[#555] uppercase tracking-wider">Name</label>
                <input
                  value={profile.mentor_name}
                  onChange={e => saveProfile({ ...profile, mentor_name: e.target.value })}
                  className="block mt-1 w-48 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#ECECEC] focus:outline-none focus:border-[#3a3a3a]"
                />
                <p className="text-[10px] text-[#444] mt-1">Click the circle to upload a photo for your mentor.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorManager;
