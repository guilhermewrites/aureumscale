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
      elements.push(<h4 key={i} className="font-semibold text-[#f4f4f4] mt-2 mb-1">{line.slice(4)}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-semibold text-[#f4f4f4] mt-2 mb-1">{line.slice(3)}</h3>);
      continue;
    }

    // Bullet points
    const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      const content = bulletMatch[2];
      elements.push(
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-[#5a5a5a] flex-shrink-0 mt-0.5">{'•'}</span>
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
    parts.push(<strong key={match.index} className="font-semibold text-[#f4f4f4]">{match[1]}</strong>);
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

  // Business context (for system prompt)
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [financeData, setFinanceData] = useState<any[]>([]);
  const [boardTasksData, setBoardTasksData] = useState<any[]>([]);

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
    loadBusinessContext();
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

  const loadBusinessContext = async () => {
    const [clientsRes, financeRes, tasksRes] = await Promise.all([
      supabase.from('clients').select('id, name, service, status, payment_status, amount, leader').eq('user_id', storagePrefix).order('created_at', { ascending: false }),
      supabase.from('finance_items').select('id, client_name, amount, invoice_date, status, description').eq('user_id', storagePrefix).order('invoice_date', { ascending: false }).limit(20),
      supabase.from('board_tasks').select('*').eq('user_id', storagePrefix).order('status').order('order_num'),
    ]);
    if (clientsRes.data) setClientsData(clientsRes.data);
    if (financeRes.data) setFinanceData(financeRes.data);
    if (tasksRes.data) setBoardTasksData(tasksRes.data);
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
      knowledgeEntries: knowledge.slice(0, 5).map(k => ({ category: k.category, title: k.title, content: k.content })),
      totalKnowledgeCount: knowledge.length,
      clientsSummary: clientsData.length > 0 ? {
        activeCount: clientsData.filter(c => c.status !== 'inactive').length,
        totalRevenue: clientsData.reduce((sum, c) => sum + (c.amount || 0), 0),
        pendingInvoices: financeData.filter(f => f.status === 'pending').length,
        clients: clientsData.map(c => `${c.name} (${c.service || 'N/A'}) — ${c.status || 'active'} — $${c.amount || 0}`),
      } : null,
      financeSummary: financeData.length > 0 ? {
        paidThisMonth: financeData.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.amount || 0), 0),
        pendingThisMonth: financeData.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount || 0), 0),
        overdueAmount: financeData.filter(f => f.status === 'overdue').reduce((sum, f) => sum + (f.amount || 0), 0),
        recentInvoices: financeData.slice(0, 10).map(f => `${f.client_name}: $${f.amount} (${f.status})`),
      } : null,
      boardTasks: boardTasksData.length > 0 ? boardTasksData.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        client_name: t.client_name,
        estimated_revenue: t.estimated_revenue,
        description: t.description,
      })) : null,
    };
  }, [profile, calendarEvents, todayLogs, knowledge, clientsData, financeData, boardTasksData]);

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

    // Save user message to Supabase for persistence across refreshes
    const { error: saveErr } = await supabase.from('mentor_conversations').insert({
      user_id: storagePrefix,
      role: 'user',
      content,
    });
    if (saveErr) console.error('Failed to save user message:', saveErr);

    try {
      // Build messages for API (last 30 to keep payload small and avoid timeouts)
      const recentMessages = [...messages.slice(-28), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Retry-aware fetch — handles 429 rate limits with exponential backoff
      const fetchWithRetry = async (body: any, retries = 3): Promise<any> => {
        for (let attempt = 0; attempt < retries; attempt++) {
          const res = await fetch('/api/mentor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (res.status === 429 || res.status === 529 || res.status === 504) {
            const retryAfter = res.headers.get('retry-after');
            const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(3000 * Math.pow(2, attempt), 20000);
            console.log(`API ${res.status}. Waiting ${waitMs}ms before retry ${attempt + 1}/${retries}...`);
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }

          if (!res.ok) {
            const errText = await res.text();
            console.error('Mentor API error:', res.status, errText);
            throw new Error(`API error (${res.status})`);
          }

          return await res.json();
        }
        throw new Error('Rate limited — too many requests. Wait a moment and try again.');
      };

      let data = await fetchWithRetry({
        messages: recentMessages,
        context: buildContext(),
      });
      console.log('Mentor initial response:', { message: data.message?.slice(0, 100), needsFollowUp: data.needsFollowUp, toolCalls: data.toolCalls?.length, stopReason: data.stopReason });

      // Execute tool calls — handles all mentor tools
      const executeTools = async (toolCalls: any[]) => {
        const results: { tool_use_id: string; content: string }[] = [];
        // Keep a local copy of profile so chained tools within the same batch
        // see each other's mutations (React state won't update mid-loop).
        let latestProfile = { ...profile };
        const saveLatestProfile = async (p: MentorProfile) => {
          latestProfile = p;
          await saveProfile(p);
        };
        for (const tool of toolCalls) {
          try {
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
              results.push({ tool_use_id: tool.id, content: `Saved "${tool.input.title}" to ${tool.input.category}.` });

            } else if (tool.name === 'search_knowledge') {
              const query = tool.input.query?.toLowerCase() || '';
              const category = tool.input.category;
              let q = supabase.from('mentor_knowledge').select('*').eq('user_id', storagePrefix);
              if (category) q = q.eq('category', category);
              const { data: entries } = await q.order('created_at', { ascending: false }).limit(50);
              const matches = (entries || []).filter(e =>
                e.title.toLowerCase().includes(query) ||
                e.content.toLowerCase().includes(query) ||
                e.category.toLowerCase().includes(query)
              ).slice(0, 10);
              if (matches.length === 0) {
                results.push({ tool_use_id: tool.id, content: `No knowledge entries found matching "${tool.input.query}".` });
              } else {
                const formatted = matches.map(m => `[${m.category}] ${m.title}:\n${m.content}`).join('\n\n');
                results.push({ tool_use_id: tool.id, content: `Found ${matches.length} entries:\n\n${formatted}` });
              }

            } else if (tool.name === 'add_calendar_event') {
              const eventId = crypto.randomUUID();
              const { error: calErr } = await supabase.from('calendar_events').insert({
                id: eventId,
                user_id: storagePrefix,
                date: tool.input.date,
                title: tool.input.title,
                start_time: tool.input.start_time,
                end_time: tool.input.end_time,
                description: tool.input.notes || '',
              });
              if (calErr) {
                console.error('Calendar insert error:', calErr);
                results.push({ tool_use_id: tool.id, content: `Error adding event: ${calErr.message}` });
              } else {
                loadCalendarEvents();
                results.push({ tool_use_id: tool.id, content: `Added "${tool.input.title}" to calendar on ${tool.input.date} from ${tool.input.start_time} to ${tool.input.end_time}.` });
              }

            } else if (tool.name === 'edit_calendar_event') {
              const updates: any = {};
              if (tool.input.title) updates.title = tool.input.title;
              if (tool.input.date) updates.date = tool.input.date;
              if (tool.input.start_time) updates.start_time = tool.input.start_time;
              if (tool.input.end_time) updates.end_time = tool.input.end_time;
              if (tool.input.notes !== undefined) updates.notes = tool.input.notes;
              await supabase.from('calendar_events').update(updates).eq('id', tool.input.event_id).eq('user_id', storagePrefix);
              loadCalendarEvents();
              results.push({ tool_use_id: tool.id, content: `Updated calendar event ${tool.input.event_id}.` });

            } else if (tool.name === 'delete_calendar_event') {
              await supabase.from('calendar_events').delete().eq('id', tool.input.event_id).eq('user_id', storagePrefix);
              loadCalendarEvents();
              results.push({ tool_use_id: tool.id, content: `Deleted calendar event ${tool.input.event_id}.` });

            } else if (tool.name === 'list_calendar_events') {
              const { data: events } = await supabase
                .from('calendar_events')
                .select('*')
                .eq('user_id', storagePrefix)
                .gte('date', tool.input.start_date)
                .lte('date', tool.input.end_date)
                .order('date')
                .order('start_time');
              if (!events || events.length === 0) {
                results.push({ tool_use_id: tool.id, content: `No events found between ${tool.input.start_date} and ${tool.input.end_date}.` });
              } else {
                const formatted = events.map(e => `- [ID: ${e.id}] ${e.date} ${e.start_time}–${e.end_time}: ${e.title}${e.description ? ` (${e.description})` : ''}`).join('\n');
                results.push({ tool_use_id: tool.id, content: `${events.length} events:\n${formatted}` });
              }

            } else if (tool.name === 'list_clients') {
              const { data: clients } = await supabase.from('clients').select('id, name, service, status, payment_status, amount, leader').eq('user_id', storagePrefix).order('created_at', { ascending: false });
              if (!clients || clients.length === 0) {
                results.push({ tool_use_id: tool.id, content: 'No clients found.' });
              } else {
                const formatted = clients.map(c => `- ${c.name} (ID: ${c.id}) | Service: ${c.service || 'N/A'} | Status: ${c.status || 'N/A'} | Payment: ${c.payment_status || 'N/A'} | Amount: $${c.amount || 0} | Leader: ${c.leader || 'N/A'}`).join('\n');
                results.push({ tool_use_id: tool.id, content: `${clients.length} clients:\n${formatted}` });
              }

            } else if (tool.name === 'update_client_notes') {
              const { data: detail } = await supabase.from('client_details').select('*').eq('client_id', tool.input.client_id).eq('user_id', storagePrefix).single();
              if (detail) {
                await supabase.from('client_details').update({ [tool.input.field]: tool.input.value }).eq('client_id', tool.input.client_id).eq('user_id', storagePrefix);
              } else {
                await supabase.from('client_details').insert({ user_id: storagePrefix, client_id: tool.input.client_id, [tool.input.field]: tool.input.value });
              }
              results.push({ tool_use_id: tool.id, content: `Updated ${tool.input.field} for client ${tool.input.client_id}.` });

            } else if (tool.name === 'update_client_status') {
              await supabase.from('clients').update({ status: tool.input.status }).eq('id', tool.input.client_id).eq('user_id', storagePrefix);
              results.push({ tool_use_id: tool.id, content: `Updated client ${tool.input.client_id} status to ${tool.input.status}.` });

            } else if (tool.name === 'list_invoices') {
              let q = supabase.from('finance_items').select('id, client_name, amount, invoice_date, status, description').eq('user_id', storagePrefix);
              if (tool.input.status) q = q.eq('status', tool.input.status);
              const { data: invoices } = await q.order('invoice_date', { ascending: false }).limit(20);
              if (!invoices || invoices.length === 0) {
                results.push({ tool_use_id: tool.id, content: `No invoices found${tool.input.status ? ` with status "${tool.input.status}"` : ''}.` });
              } else {
                const formatted = invoices.map(inv => `- ${inv.client_name}: $${inv.amount} | ${inv.invoice_date} | ${inv.status}${inv.description ? ` | ${inv.description}` : ''} (ID: ${inv.id})`).join('\n');
                results.push({ tool_use_id: tool.id, content: `${invoices.length} invoices:\n${formatted}` });
              }

            } else if (tool.name === 'update_invoice_status') {
              await supabase.from('finance_items').update({ status: tool.input.status }).eq('id', tool.input.invoice_id).eq('user_id', storagePrefix);
              results.push({ tool_use_id: tool.id, content: `Updated invoice ${tool.input.invoice_id} status to ${tool.input.status}.` });

            } else if (tool.name === 'add_goal') {
              const updated = { ...latestProfile, life_areas: latestProfile.life_areas.map(a => ({ ...a, goals: [...a.goals] })) };
              const area = updated.life_areas.find(a => a.id === tool.input.life_area_id);
              if (!area) {
                results.push({ tool_use_id: tool.id, content: `Life area with ID "${tool.input.life_area_id}" not found. Available areas: ${updated.life_areas.map(a => `${a.name} (ID: ${a.id})`).join(', ')}` });
              } else {
                const goalId = genId();
                area.goals.push({
                  id: goalId,
                  text: tool.input.text,
                  deadline: tool.input.deadline || '',
                  completed: false,
                });
                await saveLatestProfile(updated);
                results.push({ tool_use_id: tool.id, content: `Added goal "${tool.input.text}" to ${area.name}.` });
              }

            } else if (tool.name === 'complete_goal') {
              const updated = { ...latestProfile, life_areas: latestProfile.life_areas.map(a => ({ ...a, goals: [...a.goals] })) };
              const area = updated.life_areas.find(a => a.id === tool.input.life_area_id);
              const goal = area?.goals.find(g => g.id === tool.input.goal_id);
              if (!goal) {
                results.push({ tool_use_id: tool.id, content: `Goal not found.` });
              } else {
                goal.completed = !goal.completed;
                await saveLatestProfile(updated);
                results.push({ tool_use_id: tool.id, content: `Marked goal "${goal.text}" as ${goal.completed ? 'completed' : 'incomplete'}.` });
              }

            } else if (tool.name === 'delete_goal') {
              const updated = { ...latestProfile, life_areas: latestProfile.life_areas.map(a => ({ ...a, goals: [...a.goals] })) };
              const area = updated.life_areas.find(a => a.id === tool.input.life_area_id);
              if (area) {
                const goal = area.goals.find(g => g.id === tool.input.goal_id);
                area.goals = area.goals.filter(g => g.id !== tool.input.goal_id);
                await saveLatestProfile(updated);
                results.push({ tool_use_id: tool.id, content: `Deleted goal "${goal?.text || tool.input.goal_id}".` });
              } else {
                results.push({ tool_use_id: tool.id, content: `Life area not found.` });
              }

            } else if (tool.name === 'add_life_area') {
              const updated = { ...latestProfile, life_areas: [...latestProfile.life_areas] };
              const newArea = {
                id: genId(),
                name: tool.input.name,
                priority: (tool.input.priority || 'medium') as 'high' | 'medium' | 'low',
                goals: [],
              };
              updated.life_areas.push(newArea);
              await saveLatestProfile(updated);
              results.push({ tool_use_id: tool.id, content: `Created life area "${tool.input.name}" (ID: ${newArea.id}).` });

            } else if (tool.name === 'add_board_task') {
              const taskId = crypto.randomUUID();
              const { data: existing } = await supabase.from('board_tasks').select('id').eq('user_id', storagePrefix).eq('status', tool.input.status || 'Lead');
              const orderNum = existing?.length || 0;
              await supabase.from('board_tasks').insert({
                id: taskId,
                user_id: storagePrefix,
                title: tool.input.title,
                description: tool.input.description || '',
                client_id: '',
                client_name: tool.input.client_name || '',
                status: tool.input.status || 'Lead',
                estimated_revenue: tool.input.estimated_revenue || 0,
                order_num: orderNum,
              });
              results.push({ tool_use_id: tool.id, content: `Created board task "${tool.input.title}" in ${tool.input.status || 'Lead'} column${tool.input.estimated_revenue ? ` ($${tool.input.estimated_revenue})` : ''}.` });

            } else if (tool.name === 'list_board_tasks') {
              let q = supabase.from('board_tasks').select('*').eq('user_id', storagePrefix);
              if (tool.input.status) q = q.eq('status', tool.input.status);
              const { data: boardTasks } = await q.order('status').order('order_num');
              if (!boardTasks || boardTasks.length === 0) {
                results.push({ tool_use_id: tool.id, content: `No board tasks found${tool.input.status ? ` in "${tool.input.status}" column` : ''}.` });
              } else {
                const formatted = boardTasks.map(t => `- [${t.status}] ${t.title} (ID: ${t.id})${t.client_name ? ` — Client: ${t.client_name}` : ''}${t.estimated_revenue > 0 ? ` — $${t.estimated_revenue}` : ''}`).join('\n');
                results.push({ tool_use_id: tool.id, content: `${boardTasks.length} tasks:\n${formatted}` });
              }

            } else if (tool.name === 'update_board_task') {
              const updates: Record<string, any> = {};
              if (tool.input.title) updates.title = tool.input.title;
              if (tool.input.description !== undefined) updates.description = tool.input.description;
              if (tool.input.client_name !== undefined) updates.client_name = tool.input.client_name;
              if (tool.input.status) updates.status = tool.input.status;
              if (tool.input.estimated_revenue !== undefined) updates.estimated_revenue = tool.input.estimated_revenue;
              const { error } = await supabase.from('board_tasks').update(updates).eq('id', tool.input.task_id).eq('user_id', storagePrefix);
              if (error) {
                results.push({ tool_use_id: tool.id, content: `Error updating task: ${error.message}` });
              } else {
                results.push({ tool_use_id: tool.id, content: `Updated board task "${tool.input.task_id}": ${Object.keys(updates).join(', ')}.` });
              }

            } else if (tool.name === 'delete_board_task') {
              const { error } = await supabase.from('board_tasks').delete().eq('id', tool.input.task_id).eq('user_id', storagePrefix);
              if (error) {
                results.push({ tool_use_id: tool.id, content: `Error deleting task: ${error.message}` });
              } else {
                results.push({ tool_use_id: tool.id, content: `Deleted board task "${tool.input.task_id}".` });
              }

            } else if (tool.name === 'move_board_task') {
              const { error } = await supabase.from('board_tasks').update({ status: tool.input.new_status }).eq('id', tool.input.task_id).eq('user_id', storagePrefix);
              if (error) {
                results.push({ tool_use_id: tool.id, content: `Error moving task: ${error.message}` });
              } else {
                results.push({ tool_use_id: tool.id, content: `Moved task to "${tool.input.new_status}" column.` });
              }

            } else if (tool.name === 'update_mentor_settings') {
              const updates: Partial<MentorProfile> = {};
              if (tool.input.personality) updates.personality = tool.input.personality;
              if (tool.input.custom_personality !== undefined) updates.custom_personality = tool.input.custom_personality;
              if (tool.input.tone) updates.tone = tool.input.tone;
              if (tool.input.mentor_name) updates.mentor_name = tool.input.mentor_name;
              const newProfile = { ...latestProfile, ...updates };
              await saveLatestProfile(newProfile);
              results.push({ tool_use_id: tool.id, content: `Updated mentor settings: ${Object.keys(updates).join(', ')}.` });

            } else {
              results.push({ tool_use_id: tool.id, content: `Unknown tool: ${tool.name}` });
            }
          } catch (err: any) {
            results.push({ tool_use_id: tool.id, content: `Error executing ${tool.name}: ${err.message}` });
          }
        }
        return results;
      };

      // Tool loop — execute tools and send results back until Claude responds with text
      // Capped at 3 rounds with delays to avoid rate limiting.
      let loopMessages = [...recentMessages];
      let maxLoops = 3;
      let lastTextMessage = data.message || '';
      let allToolsSummary: string[] = [];

      while (data.needsFollowUp && data.toolCalls && data.toolCalls.length > 0 && maxLoops > 0) {
        maxLoops--;
        console.log(`Tool loop iteration ${3 - maxLoops}, executing ${data.toolCalls.length} tools:`, data.toolCalls.map((t: any) => t.name));
        const toolResults = await executeTools(data.toolCalls);
        allToolsSummary.push(...toolResults.map(r => r.content));

        // Build the conversation with assistant's tool calls + our results
        loopMessages = [
          ...loopMessages,
          { role: 'assistant', content: data.rawAssistantContent },
          { role: 'user', content: toolResults.map((r: any) => ({ type: 'tool_result', tool_use_id: r.tool_use_id, content: r.content })) },
        ];

        // Delay between follow-up calls to avoid rate limiting
        await new Promise(r => setTimeout(r, 1500));

        try {
          data = await fetchWithRetry({
            messages: loopMessages,
            context: buildContext(),
          });
          console.log('Follow-up response:', { message: data.message?.slice(0, 100), needsFollowUp: data.needsFollowUp, toolCalls: data.toolCalls?.length });
          if (data.message) lastTextMessage = data.message;
        } catch (loopErr: any) {
          console.error('Follow-up error:', loopErr.message);
          // Graceful fallback — show what tools already completed
          if (allToolsSummary.length > 0) {
            lastTextMessage = `Done. Here's what I did:\n${allToolsSummary.map(s => `- ${s}`).join('\n')}`;
          }
          break;
        }
      }

      // If loop exhausted without text, build a summary from what tools did
      if (!lastTextMessage && !data.message && allToolsSummary.length > 0) {
        lastTextMessage = `Done. Here's what I did:\n${allToolsSummary.map(s => `- ${s}`).join('\n')}`;
      }

      // Execute any remaining tool calls from the final response
      if (data.toolCalls && data.toolCalls.length > 0 && !data.needsFollowUp) {
        const finalResults = await executeTools(data.toolCalls);
        allToolsSummary.push(...finalResults.map(r => r.content));
        if (!lastTextMessage && !data.message) {
          lastTextMessage = `Done. Here's what I did:\n${allToolsSummary.map(s => `- ${s}`).join('\n')}`;
        }
      }

      const assistantContent = data.message || lastTextMessage || data.error || 'Something went wrong — try again.';

      const assistantMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: assistantContent,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Save assistant message to Supabase for persistence across refreshes
      const { error: saveAssistErr } = await supabase.from('mentor_conversations').insert({
        user_id: storagePrefix,
        role: 'assistant',
        content: assistantContent,
      });
      if (saveAssistErr) console.error('Failed to save assistant message:', saveAssistErr);
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
          <h1 className="text-lg font-semibold text-[#f4f4f4]">{greeting}, Guilherme.</h1>
          <p className="text-xs text-[#5a5a5a] mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-none-none text-xs font-medium transition-none ${
                activeTab === tab.id
                  ? 'bg-[#0d0d0d] text-[#f4f4f4]'
                  : 'text-[#5a5a5a] hover:text-[#909090]'
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-none-none text-xs font-medium transition-none ${
                    logCategory === cat.id
                      ? 'bg-[#0d0d0d] text-[#f4f4f4] border border-[#242424]'
                      : 'bg-[#0a0a0a] text-[#5a5a5a] hover:text-[#909090] border border-[#1a1a1a]'
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
                  className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424]"
                />
                <button
                  onClick={addLog}
                  className="px-3 py-2 bg-[#0d0d0d] hover:bg-[#0d0d0d] text-[#f4f4f4] rounded-none-none text-xs font-medium transition-none"
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
                    <div key={log.id} className="flex items-center gap-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-1.5 group">
                      <Icon size={11} className="text-[#5a5a5a]" />
                      <span className="text-xs text-[#909090]">{log.content}</span>
                      <span className="text-[10px] text-[#333]">{formatTime(log.created_at)}</span>
                      <button
                        onClick={() => deleteLog(log.id)}
                        className="text-[#333] hover:text-[#909090] opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a] rounded-none-none border border-[#1a1a1a] overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Brain size={32} className="text-[#333] mb-3" />
                  <p className="text-sm text-[#5a5a5a] mb-4">Ask your mentor anything.</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-md">
                    {SUGGESTED_PROMPTS.map(prompt => (
                      <button
                        key={prompt}
                        onClick={() => sendMessage(prompt)}
                        className="px-3 py-1.5 bg-[#0d0d0d] hover:bg-[#0d0d0d] border border-[#1a1a1a] rounded-none-none text-xs text-[#909090] hover:text-[#f4f4f4] transition-none"
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
                      <img src={profile.mentor_photo} alt={profile.mentor_name} className="w-7 h-7 rounded-none-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-none-full bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                        <Brain size={14} className="text-[#909090]" />
                      </div>
                    )
                  )}
                  <div
                    className={`max-w-[78%] rounded-none-none px-3 py-2 text-sm leading-snug ${
                      msg.role === 'user'
                        ? 'bg-[#0d0d0d] text-[#f4f4f4]'
                        : 'bg-[#0a0a0a] text-[#CDCDCD] border border-[#1a1a1a]'
                    }`}
                  >
                    {msg.role === 'assistant' ? renderMarkdown(msg.content) : <div className="whitespace-pre-wrap">{msg.content}</div>}
                  </div>
                  {/* User avatar */}
                  {msg.role === 'user' && (
                    userPhoto ? (
                      <img src={userPhoto} alt="You" className="w-7 h-7 rounded-none-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-none-full bg-emerald-500 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white">
                        GU
                      </div>
                    )
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-end gap-2.5 justify-start">
                  {profile.mentor_photo ? (
                    <img src={profile.mentor_photo} alt={profile.mentor_name} className="w-7 h-7 rounded-none-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-none-full bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      <Brain size={14} className="text-[#909090]" />
                    </div>
                  )}
                  <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-[#555] rounded-none-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#555] rounded-none-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#555] rounded-none-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-[#1a1a1a] p-2.5">
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
                  className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424] resize-none"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !chatInput.trim()}
                  className="px-3 py-2 bg-[#0d0d0d] hover:bg-[#0d0d0d] text-[#f4f4f4] rounded-none-none transition-none disabled:opacity-30"
                >
                  <Send size={16} />
                </button>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="mt-2 text-[10px] text-[#333] hover:text-[#5a5a5a] transition-none"
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
            <div key={area.id} className="bg-[#0a0a0a] rounded-none-none border border-[#1a1a1a] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-[#f4f4f4]">{area.name}</h3>
                  <select
                    value={area.priority}
                    onChange={e => setAreaPriority(area.id, e.target.value as any)}
                    className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-none px-2 py-0.5 text-[10px] text-[#909090] focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <button onClick={() => deleteArea(area.id)} className="text-[#333] hover:text-[#909090] transition-none">
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Goals */}
              <div className="space-y-1.5">
                {area.goals.map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 group">
                    <button
                      onClick={() => toggleGoal(area.id, goal.id)}
                      className={`w-4 h-4 rounded-none border flex-shrink-0 flex items-center justify-center transition-none ${
                        goal.completed
                          ? 'bg-[#ECECEC] border-[#ECECEC]'
                          : 'border-[#242424] hover:border-[#555]'
                      }`}
                    >
                      {goal.completed && <Check size={10} className="text-[#171717]" />}
                    </button>
                    <span className={`text-sm flex-1 ${goal.completed ? 'text-[#5a5a5a] line-through' : 'text-[#CDCDCD]'}`}>
                      {goal.text}
                    </span>
                    {goal.deadline && (
                      <span className="text-[10px] text-[#3a3a3a] flex items-center gap-1">
                        <Clock size={9} />
                        {goal.deadline}
                      </span>
                    )}
                    <button
                      onClick={() => deleteGoal(area.id, goal.id)}
                      className="text-[#333] hover:text-[#909090] opacity-0 group-hover:opacity-100 transition-opacity"
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
                    className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-1.5 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424]"
                  />
                  <input
                    type="date"
                    value={newGoalDeadline}
                    onChange={e => setNewGoalDeadline(e.target.value)}
                    className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-2 py-1.5 text-xs text-[#909090] focus:outline-none"
                  />
                  <button onClick={() => addGoal(area.id)} className="px-3 py-1.5 bg-[#0d0d0d] hover:bg-[#0d0d0d] text-[#f4f4f4] rounded-none-none text-xs transition-none">
                    Add
                  </button>
                  <button onClick={() => { setEditingAreaId(null); setNewGoalText(''); setNewGoalDeadline(''); }} className="text-[#5a5a5a] hover:text-[#909090]">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingAreaId(area.id)}
                  className="mt-3 flex items-center gap-1.5 text-[11px] text-[#3a3a3a] hover:text-[#909090] transition-none"
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
              className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424]"
            />
            <button onClick={addArea} className="px-4 py-2 bg-[#0d0d0d] hover:bg-[#0d0d0d] text-[#f4f4f4] rounded-none-none text-xs font-medium transition-none">
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════ KNOWLEDGE TAB ════════════════════ */}
      {activeTab === 'knowledge' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[#5a5a5a]">Feed your mentor knowledge about your business, processes, and strategies.</p>
            <button
              onClick={() => setShowAddKnowledge(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d0d0d] hover:bg-[#0d0d0d] text-[#f4f4f4] rounded-none-none text-xs font-medium transition-none"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Add knowledge modal */}
          {showAddKnowledge && (
            <div className="bg-[#0a0a0a] rounded-none-none border border-[#1a1a1a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#f4f4f4]">Add Knowledge</h3>
                <button onClick={() => setShowAddKnowledge(false)} className="text-[#5a5a5a] hover:text-[#909090]">
                  <X size={14} />
                </button>
              </div>
              <select
                value={knowledgeForm.category}
                onChange={e => setKnowledgeForm(p => ({ ...p, category: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] focus:outline-none"
              >
                {KNOWLEDGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                value={knowledgeForm.title}
                onChange={e => setKnowledgeForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Title (e.g. How to close high-ticket clients)"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424]"
              />
              <textarea
                value={knowledgeForm.content}
                onChange={e => setKnowledgeForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Content — the actual knowledge, process, framework..."
                rows={4}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424] resize-none"
              />
              <input
                value={knowledgeForm.source}
                onChange={e => setKnowledgeForm(p => ({ ...p, source: e.target.value }))}
                placeholder="Source URL (optional)"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424]"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddKnowledge(false)} className="px-3 py-1.5 text-xs text-[#909090] hover:text-[#f4f4f4] transition-none">
                  Cancel
                </button>
                <button onClick={addKnowledge} className="px-4 py-1.5 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-none-none text-xs font-medium transition-none">
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Knowledge entries */}
          {knowledge.length === 0 && !showAddKnowledge && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen size={32} className="text-[#333] mb-3" />
              <p className="text-sm text-[#5a5a5a] mb-1">No knowledge added yet.</p>
              <p className="text-xs text-[#3a3a3a]">Add business playbooks, processes, and frameworks for your mentor to reference.</p>
            </div>
          )}

          {knowledge.map(entry => (
            <div key={entry.id} className="bg-[#0a0a0a] rounded-none-none border border-[#1a1a1a] p-4 group">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#5a5a5a] font-medium">{entry.category}</span>
                  </div>
                  <h4 className="text-sm font-medium text-[#f4f4f4] mb-1">{entry.title}</h4>
                  <p className="text-xs text-[#909090] line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
                  {entry.source && (
                    <a href={entry.source} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#5a5a5a] hover:text-[#909090] mt-1 inline-block">
                      {entry.source}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => deleteKnowledge(entry.id)}
                  className="text-[#333] hover:text-[#909090] opacity-0 group-hover:opacity-100 transition-opacity ml-3"
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
            <h3 className="text-xs uppercase tracking-wider text-[#5a5a5a] font-medium mb-3">Mentor Personality</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {PERSONALITIES.map(p => (
                <button
                  key={p.id}
                  onClick={() => saveProfile({ ...profile, personality: p.id })}
                  className={`p-3 rounded-none-none border text-left transition-none ${
                    profile.personality === p.id
                      ? 'bg-[#0d0d0d] border-[#242424] text-[#f4f4f4]'
                      : 'bg-[#0a0a0a] border-[#1a1a1a] text-[#909090] hover:text-[#f4f4f4] hover:border-[#242424]'
                  }`}
                >
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[10px] text-[#5a5a5a] mt-0.5">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom personality */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#5a5a5a] font-medium mb-2">Custom Instructions</h3>
            <textarea
              value={profile.custom_personality}
              onChange={e => saveProfile({ ...profile, custom_personality: e.target.value })}
              placeholder="Additional instructions for how your mentor should behave, speak, or what to focus on..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] placeholder-[#444] focus:outline-none focus:border-[#242424] resize-none"
            />
          </div>

          {/* Tone */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#5a5a5a] font-medium mb-2">Communication Tone</h3>
            <div className="flex gap-2">
              {TONES.map(t => (
                <button
                  key={t}
                  onClick={() => saveProfile({ ...profile, tone: t })}
                  className={`px-4 py-2 rounded-none-none text-xs font-medium capitalize transition-none ${
                    profile.tone === t
                      ? 'bg-[#0d0d0d] text-[#f4f4f4] border border-[#242424]'
                      : 'bg-[#0a0a0a] text-[#909090] border border-[#1a1a1a] hover:text-[#f4f4f4]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#5a5a5a] font-medium mb-2">Your Schedule</h3>
            <div className="flex gap-4">
              <div>
                <label className="text-[10px] text-[#5a5a5a] uppercase tracking-wider">Wake time</label>
                <input
                  type="time"
                  value={profile.wake_time}
                  onChange={e => saveProfile({ ...profile, wake_time: e.target.value })}
                  className="block mt-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#5a5a5a] uppercase tracking-wider">Sleep time</label>
                <input
                  type="time"
                  value={profile.sleep_time}
                  onChange={e => saveProfile({ ...profile, sleep_time: e.target.value })}
                  className="block mt-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Mentor identity */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#5a5a5a] font-medium mb-3">Mentor Identity</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={() => mentorPhotoRef.current?.click()}
                className="w-16 h-16 rounded-none-full overflow-hidden bg-[#0d0d0d] flex items-center justify-center text-[#909090] hover:brightness-110 transition-none flex-shrink-0 relative group"
              >
                {profile.mentor_photo ? (
                  <img src={profile.mentor_photo} alt="Mentor" className="w-full h-full object-cover" />
                ) : (
                  <Brain size={24} />
                )}
                <div className="absolute inset-0 bg-black/50 rounded-none-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={14} className="text-white" />
                </div>
              </button>
              <input ref={mentorPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleMentorPhotoUpload} />
              <div className="flex-1">
                <label className="text-[10px] text-[#5a5a5a] uppercase tracking-wider">Name</label>
                <input
                  value={profile.mentor_name}
                  onChange={e => saveProfile({ ...profile, mentor_name: e.target.value })}
                  className="block mt-1 w-48 bg-[#0a0a0a] border border-[#1a1a1a] rounded-none-none px-3 py-2 text-sm text-[#f4f4f4] focus:outline-none focus:border-[#242424]"
                />
                <p className="text-[10px] text-[#3a3a3a] mt-1">Click the circle to upload a photo for your mentor.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorManager;
