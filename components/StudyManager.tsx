import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Plus, Search, ChevronLeft, X, Check, Trash2, Play, RefreshCcw, Sparkles, Layers,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// ── Types ─────────────────────────────────────────────────────────
type Mastery = 'new' | 'learning' | 'mastered';

interface Card {
  id: string;
  q: string;
  a: string;
  mastery: Mastery;
  lastSeen: number | null;
}
interface Deck {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  cards: Card[];
}

// ── Seed (used when localStorage is empty) ─────────────────────────
const SEED_DECKS: Deck[] = [
  {
    id: 'd_marketing', name: 'Direct Response Copy', color: 'mono', createdAt: Date.now() - 86400000 * 4,
    cards: [
      { id: 'c1', q: 'What is the AIDA copywriting framework?', a: 'Attention, Interest, Desire, Action — a four-stage structure for moving a reader from awareness to conversion.', mastery: 'learning', lastSeen: null },
      { id: 'c2', q: 'Why does specificity beat superlatives in copy?', a: 'Specific numbers and details feel earned and verifiable; superlatives ("best", "amazing") read as marketing puffery and trigger skepticism.', mastery: 'mastered', lastSeen: Date.now() - 3600000 },
      { id: 'c3', q: 'What is a "lead" in long-form sales copy?', a: 'The opening 100–500 words whose only job is to get the reader to keep reading — usually via story, big promise, or contrarian hook.', mastery: 'new', lastSeen: null },
    ],
  },
  {
    id: 'd_finance', name: 'Personal Finance Basics', color: 'mono', createdAt: Date.now() - 86400000 * 10,
    cards: [
      { id: 'c4', q: 'What does the 50/30/20 rule allocate?', a: '50% needs, 30% wants, 20% savings & debt repayment of after-tax income.', mastery: 'mastered', lastSeen: Date.now() - 86400000 },
      { id: 'c5', q: 'Define compound interest in one sentence.', a: 'Interest earned on both the original principal and on previously-accumulated interest, so growth accelerates over time.', mastery: 'learning', lastSeen: Date.now() - 86400000 * 2 },
    ],
  },
  {
    id: 'd_negotiation', name: 'Sales & Negotiation', color: 'mono', createdAt: Date.now() - 86400000 * 2,
    cards: [
      { id: 'c6', q: 'What is BATNA?', a: 'Best Alternative To a Negotiated Agreement — your fallback if the deal fails. The stronger your BATNA, the more leverage you hold.', mastery: 'new', lastSeen: null },
    ],
  },
];

// ── Persistence ────────────────────────────────────────────────────
const STORAGE_KEY = 'aureum_study_v1';

function loadDecks(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return SEED_DECKS;
}
function saveDecks(decks: Deck[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(decks)); } catch {}
}

// ── AI generation via Gemini ───────────────────────────────────────
async function generateCardsFromText(rawText: string, count: number): Promise<Card[]> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.API_KEY || '';
  if (!apiKey) throw new Error('No Gemini API key configured. Set VITE_GEMINI_API_KEY in Vercel env.');

  const prompt = `You are a study-card generator. Read the source material below and produce exactly ${count} high-quality flashcards as a JSON array.

Each flashcard object must have:
- "q": a clear, specific question (10-22 words). Avoid yes/no questions.
- "a": a concise, correct answer (1-3 sentences). Include the key terms a grader would look for.

Rules:
- Cover the most important concepts; avoid trivial details.
- Vary the question types: definitions, comparisons, "why" questions, applications.
- Do NOT number the questions or include any prose outside the JSON.
- Output ONLY a valid JSON array, nothing else.

SOURCE MATERIAL:
"""
${rawText.slice(0, 8000)}
"""

JSON:`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
  });

  const text = response.text || '';
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('AI returned an unexpected format. Try again.');

  let arr: any;
  try { arr = JSON.parse(match[0]); } catch { throw new Error('AI returned malformed JSON. Try again.'); }
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('No cards were generated. Try a longer or more detailed input.');

  return arr
    .filter((c: any) => c && typeof c.q === 'string' && typeof c.a === 'string')
    .map((c: any, i: number): Card => ({
      id: `c_${Date.now()}_${i}`,
      q: c.q.trim(),
      a: c.a.trim(),
      mastery: 'new',
      lastSeen: null,
    }));
}

// ── Shared style fragments ─────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10.5, color: 'var(--au-text-3)', letterSpacing: '0.22em', textTransform: 'uppercase',
};
const label: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 10, color: 'var(--au-text-3)', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 500,
};
const btnPrimary: React.CSSProperties = {
  padding: '10px 16px', background: 'var(--au-text)', color: '#000',
  border: '1px solid var(--au-text)', borderRadius: 0,
  fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
  fontFamily: 'JetBrains Mono, monospace', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  padding: '8px 14px', background: 'transparent', color: 'var(--au-text-2)',
  border: '1px solid var(--au-line-2)', borderRadius: 0,
  fontSize: 10.5, fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
  fontFamily: 'JetBrains Mono, monospace', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
};
const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  background: '#0a0a0a', color: 'var(--au-text)',
  border: '1px solid var(--au-line-2)',
  borderRadius: 0, fontSize: 13, outline: 'none',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
};

// ── Stat card ──────────────────────────────────────────────────────
const Stat: React.FC<{ label: string; value: string; hint: string }> = ({ label: lab, value, hint }) => (
  <div style={{ padding: '18px 20px', borderRight: '1px solid var(--au-line)' }}>
    <div style={label}>— {lab}</div>
    <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.025em', lineHeight: 1, marginTop: 10, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    <div style={{ fontSize: 11.5, color: 'var(--au-text-3)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>{hint}</div>
  </div>
);

// ── DeckCard ───────────────────────────────────────────────────────
const DeckCard: React.FC<{
  deck: Deck; idx: number;
  onOpen: () => void; onStudy: () => void; onDelete: () => void;
}> = ({ deck, idx, onOpen, onStudy, onDelete }) => {
  const [hover, setHover] = useState(false);
  const total = deck.cards.length;
  const mastered = deck.cards.filter(c => c.mastery === 'mastered').length;
  const learning = deck.cards.filter(c => c.mastery === 'learning').length;
  const newCount = total - mastered - learning;
  const pct = total === 0 ? 0 : Math.round((mastered / total) * 100);

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? '#080808' : 'transparent',
        borderRight: '1px solid var(--au-line)',
        borderBottom: '1px solid var(--au-line)',
        padding: '22px 22px 18px',
        cursor: 'pointer',
        minHeight: 200,
        display: 'flex', flexDirection: 'column',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ ...eyebrow, fontSize: 10.5, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>FILE / {String(idx + 1).padStart(3, '0')}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--au-line)' }} />
        <span>{String(total).padStart(2, '0')} CARDS</span>
      </div>
      <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.015em', marginBottom: 6, lineHeight: 1.2 }}>{deck.name}</div>
      <div style={{ fontSize: 12, color: 'var(--au-text-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
        {newCount} new · {learning} learning · {mastered} mastered
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 16, opacity: hover ? 1 : 0, pointerEvents: hover ? 'auto' : 'none', transition: 'opacity 0.15s' }}>
        <button
          onClick={e => { e.stopPropagation(); onStudy(); }}
          style={{ ...btnPrimary, padding: '6px 12px', fontSize: 10.5 }}
        >
          <Play size={10} /> Study
        </button>
        <button
          onClick={e => { e.stopPropagation(); if (confirm(`Delete "${deck.name}" and all ${total} cards?`)) onDelete(); }}
          style={{ marginLeft: 'auto', padding: '6px 8px', background: 'transparent', color: 'var(--au-text-3)', border: '1px solid var(--au-line-2)', borderRadius: 0, display: 'inline-flex', cursor: 'pointer' }}
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 18 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--au-line-2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: pct + '%', background: 'var(--au-text)', transition: 'width 0.4s' }} />
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--au-text-2)', minWidth: 32, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.05em' }}>
          {String(pct).padStart(2, '0')}%
        </span>
      </div>
    </div>
  );
};

// ── DeckList ───────────────────────────────────────────────────────
const DeckListView: React.FC<{
  decks: Deck[];
  totals: { decks: number; cards: number; mastered: number; newCards: number; streak: number };
  onCreate: () => void;
  onOpenDeck: (id: string) => void;
  onStudyDeck: (id: string) => void;
  onDeleteDeck: (id: string) => void;
}> = ({ decks, totals, onCreate, onOpenDeck, onStudyDeck, onDeleteDeck }) => (
  <div style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 1280, margin: '0 auto' }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 32, paddingBottom: 22, borderBottom: '1px solid var(--au-line)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ ...eyebrow, marginBottom: 10 }}>— Index · 012 · Subject · Study</div>
        <h1 style={{ margin: 0, fontSize: 38, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--au-text)', lineHeight: 1 }}>The library.</h1>
        <p style={{ margin: '10px 0 0', fontSize: 13.5, color: 'var(--au-text-2)', maxWidth: 460 }}>Paste anything worth remembering. Flip the card. See what stuck.</p>
      </div>
      <button style={btnGhost}><Search size={12} /> Search</button>
      <button style={btnPrimary} onClick={onCreate}><Plus size={12} /> Paste knowledge</button>
    </div>

    {/* Stats */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', border: '1px solid var(--au-line)', borderRight: 'none', marginBottom: 36 }}>
      <Stat label="Decks" value={String(totals.decks).padStart(2, '0')} hint="COLLECTIONS" />
      <Stat label="Cards" value={String(totals.cards).padStart(3, '0')} hint={`${totals.newCards} NEW`} />
      <Stat label="Mastered" value={`${totals.cards === 0 ? 0 : Math.round((totals.mastered / totals.cards) * 100)}%`} hint={`${totals.mastered} CARDS`} />
      <Stat label="Streak" value={`${String(totals.streak).padStart(2, '0')} D`} hint="KEEP IT GOING" />
    </div>

    {/* Section label */}
    <div style={{ ...label, display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
      <span>— Your decks</span>
      <span style={{ flex: 1, height: 1, background: 'var(--au-line)' }} />
      <span>{String(decks.length).padStart(2, '0')} / ∞</span>
    </div>

    {decks.length === 0 ? (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--au-text-3)', border: '1px solid var(--au-line)' }}>
        <div style={{ marginBottom: 10, display: 'inline-flex' }}><Layers size={24} /></div>
        <div style={{ fontSize: 13, color: 'var(--au-text-2)', marginBottom: 4 }}>No decks yet</div>
        <div style={{ fontSize: 12, marginBottom: 18 }}>Paste any text to generate your first set of flashcards.</div>
        <button style={btnPrimary} onClick={onCreate}><Plus size={12} /> Paste knowledge</button>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', border: '1px solid var(--au-line)', borderRight: 'none', borderBottom: 'none' }}>
        {decks.map((d, i) => (
          <DeckCard key={d.id} deck={d} idx={i} onOpen={() => onOpenDeck(d.id)} onStudy={() => onStudyDeck(d.id)} onDelete={() => onDeleteDeck(d.id)} />
        ))}
        {/* New deck tile */}
        <div
          onClick={onCreate}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--au-text)'; e.currentTarget.style.background = '#080808'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--au-text-3)'; e.currentTarget.style.background = 'transparent'; }}
          style={{
            background: 'transparent',
            borderRight: '1px solid var(--au-line)',
            borderBottom: '1px solid var(--au-line)',
            padding: 22, minHeight: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: 'pointer', color: 'var(--au-text-3)',
          }}
        >
          <Plus size={20} />
          <div style={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase' }}>New deck</div>
        </div>
      </div>
    )}
  </div>
);

// ── Deck Detail (table of cards) ───────────────────────────────────
const DeckDetailView: React.FC<{
  deck: Deck;
  onBack: () => void;
  onStudy: () => void;
  onAddCards: () => void;
  onDeleteCard: (cardId: string) => void;
}> = ({ deck, onBack, onStudy, onAddCards, onDeleteCard }) => (
  <div style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 1180, margin: '0 auto' }}>
    <button onClick={onBack} style={{ ...btnGhost, marginBottom: 14 }}>
      <ChevronLeft size={12} /> All decks
    </button>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 24, paddingBottom: 22, borderBottom: '1px solid var(--au-line)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ ...eyebrow, marginBottom: 8 }}>— Deck · File / {deck.id.slice(-3).toUpperCase()}</div>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--au-text)', lineHeight: 1.05 }}>{deck.name}</h1>
        <div style={{ fontSize: 12, color: 'var(--au-text-3)', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
          {String(deck.cards.length).padStart(2, '0')} CARDS · CREATED {new Date(deck.createdAt).toLocaleDateString().toUpperCase()}
        </div>
      </div>
      <button style={btnGhost} onClick={onAddCards}><Plus size={11} /> Add cards</button>
      <button style={btnPrimary} onClick={onStudy}><Play size={11} /> Start studying</button>
    </div>

    <div style={{ border: '1px solid var(--au-line)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 60px', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--au-line)', background: '#060606', fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 500, color: 'var(--au-text-3)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
        <div>Status</div><div>Question</div><div>Answer</div><div></div>
      </div>
      {deck.cards.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--au-text-3)', fontSize: 13 }}>No cards yet. Add some.</div>
      ) : deck.cards.map(c => {
        const fg = c.mastery === 'mastered' ? 'var(--au-good)' : c.mastery === 'learning' ? 'var(--au-text)' : 'var(--au-text-2)';
        return (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 60px', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--au-line)', alignItems: 'flex-start', fontSize: 13.5 }}>
            <div>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: fg, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                {c.mastery}
              </span>
            </div>
            <div style={{ color: 'var(--au-text)', lineHeight: 1.5 }}>{c.q}</div>
            <div style={{ color: 'var(--au-text-2)', lineHeight: 1.5 }}>{c.a}</div>
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => onDeleteCard(c.id)} style={{ background: 'transparent', color: 'var(--au-text-3)', border: '1px solid var(--au-line-2)', padding: '5px 7px', borderRadius: 0, display: 'inline-flex', cursor: 'pointer' }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── Study Mode (flip cards + self-grade) ───────────────────────────
const StudyMode: React.FC<{
  deck: Deck;
  onExit: () => void;
  onUpdateCard: (cardId: string, patch: Partial<Card>) => void;
}> = ({ deck, onExit, onUpdateCard }) => {
  const [order] = useState(() => {
    const cards = [...deck.cards];
    cards.sort((a, b) => {
      const rank = (m: Mastery) => ({ new: 0, learning: 1, mastered: 2 } as const)[m] ?? 0;
      return rank(a.mastery) - rank(b.mastery);
    });
    return cards;
  });
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });

  const card = order[idx];

  const record = useCallback((wasCorrect: boolean) => {
    onUpdateCard(card.id, { mastery: wasCorrect ? 'mastered' : 'learning', lastSeen: Date.now() });
    setStats(s => wasCorrect ? { ...s, correct: s.correct + 1 } : { ...s, incorrect: s.incorrect + 1 });
    if (idx + 1 >= order.length) setDone(true);
    else { setIdx(idx + 1); setFlipped(false); }
  }, [card, idx, order.length, onUpdateCard]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f); }
      else if (flipped && (e.key === '1' || e.key.toLowerCase() === 'j')) record(false);
      else if (flipped && (e.key === '2' || e.key.toLowerCase() === 'k')) record(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, flipped, record]);

  if (order.length === 0) {
    return (
      <div style={{ paddingTop: 36, paddingBottom: 80, maxWidth: 880, margin: '0 auto' }}>
        <button style={btnGhost} onClick={onExit}><ChevronLeft size={11} /> Back</button>
        <div style={{ marginTop: 20, border: '1px solid var(--au-line-2)', padding: '60px 40px', textAlign: 'center', color: 'var(--au-text-2)' }}>This deck has no cards yet.</div>
      </div>
    );
  }

  if (done) {
    const total = stats.correct + stats.incorrect;
    const pct = total === 0 ? 0 : Math.round((stats.correct / total) * 100);
    return (
      <div style={{ paddingTop: 32, paddingBottom: 60, maxWidth: 880, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid var(--au-line)' }}>
          <button style={btnGhost} onClick={onExit}><ChevronLeft size={11} /> All decks</button>
        </div>
        <div style={{ border: '1px solid var(--au-line-2)', padding: '60px 40px', textAlign: 'center' }}>
          <div style={eyebrow}>— Session · Complete</div>
          <div style={{ fontSize: 36, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.025em', marginTop: 14 }}>{pct}% recall</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 36, margin: '24px 0 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--au-good)', letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace' }}>{stats.correct}</div>
              <div style={{ ...label, marginTop: 6 }}>Got it</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--au-bad)', letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace' }}>{stats.incorrect}</div>
              <div style={{ ...label, marginTop: 6 }}>Review</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.02em', fontFamily: 'JetBrains Mono, monospace' }}>{total}</div>
              <div style={{ ...label, marginTop: 6 }}>Total</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={btnGhost} onClick={onExit}>Back to decks</button>
            <button style={btnPrimary} onClick={() => { setIdx(0); setStats({ correct: 0, incorrect: 0 }); setFlipped(false); setDone(false); }}>
              <RefreshCcw size={11} /> Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((idx + (flipped ? 0.5 : 0)) / order.length) * 100;

  return (
    <div style={{ paddingTop: 32, paddingBottom: 60, maxWidth: 880, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, paddingBottom: 18, borderBottom: '1px solid var(--au-line)' }}>
        <button style={btnGhost} onClick={onExit}><ChevronLeft size={11} /> Back</button>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.01em' }}>{deck.name}</div>
        <div style={{ flex: 1, height: 1, background: 'var(--au-line-2)', margin: '0 12px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: progress + '%', background: 'var(--au-text)', transition: 'width 0.3s' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--au-text-2)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
          {String(idx + 1).padStart(2, '0')} / {String(order.length).padStart(2, '0')}
        </div>
      </div>

      {/* Flip card */}
      <div onClick={() => setFlipped(f => !f)} style={{ perspective: 2000, width: '100%', height: 460, cursor: 'pointer', marginBottom: 24 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transition: 'transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          {/* Front */}
          <div style={{ position: 'absolute', inset: 0, background: 'var(--au-panel)', border: '1px solid var(--au-line-2)', padding: '40px 44px 32px', display: 'flex', flexDirection: 'column', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
            <div style={{ ...eyebrow, fontSize: 10, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
              <span>— Card · {String(idx + 1).padStart(3, '0')}</span>
              <span style={{ flex: 1, height: 1, background: 'var(--au-line)' }} />
              <span>Question</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 'auto' }}>{card.q}</div>
            <div style={{ ...eyebrow, fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24, borderTop: '1px solid var(--au-line)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', border: '1px solid var(--au-line-2)', color: 'var(--au-text-2)', fontSize: 10, minWidth: 18, justifyContent: 'center' }}>Space</span>
              <span>or click to flip</span>
            </div>
          </div>
          {/* Back */}
          <div style={{ position: 'absolute', inset: 0, background: 'var(--au-panel-2)', border: '1px solid var(--au-line-2)', padding: '40px 44px 32px', display: 'flex', flexDirection: 'column', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <div style={{ ...eyebrow, fontSize: 10, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
              <span>— Card · {String(idx + 1).padStart(3, '0')}</span>
              <span style={{ flex: 1, height: 1, background: 'var(--au-line)' }} />
              <span>Answer</span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 400, color: 'var(--au-text)', letterSpacing: '-0.005em', lineHeight: 1.5, marginBottom: 'auto' }}>{card.a}</div>
            <div style={{ ...eyebrow, fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24, borderTop: '1px solid var(--au-line)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', border: '1px solid var(--au-line-2)', color: 'var(--au-text-2)', fontSize: 10, minWidth: 18, justifyContent: 'center' }}>Space</span>
              <span>flip back</span>
              <span style={{ flex: 1 }} />
              <span>How did you do?</span>
            </div>
          </div>
        </div>
      </div>

      {/* Self-grade */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={(e) => { e.stopPropagation(); if (!flipped) { setFlipped(true); return; } record(false); }}
          style={{ padding: '16px 18px', background: 'transparent', color: 'var(--au-bad)', border: '1px solid rgba(212,109,109,0.35)', borderRadius: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}
        >
          <X size={12} /> Didn't know
          <span style={{ marginLeft: 6, padding: '2px 7px', border: '1px solid var(--au-line-2)', color: 'var(--au-text-3)', fontSize: 10 }}>1</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (!flipped) { setFlipped(true); return; } record(true); }}
          style={{ padding: '16px 18px', background: 'transparent', color: 'var(--au-good)', border: '1px solid rgba(109,212,154,0.35)', borderRadius: 0, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer' }}
        >
          <Check size={12} /> Got it
          <span style={{ marginLeft: 6, padding: '2px 7px', border: '1px solid var(--au-line-2)', color: 'var(--au-text-3)', fontSize: 10 }}>2</span>
        </button>
      </div>
      {!flipped && (
        <div style={{ ...eyebrow, fontSize: 10.5, textAlign: 'center', marginTop: 14 }}>
          — Flip the card before grading yourself
        </div>
      )}
    </div>
  );
};

// ── Paste Modal (with AI generation) ───────────────────────────────
const PasteModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { targetDeckId: string | null; name: string; color: string; cards: Card[] }) => void;
  existingDecks: Deck[];
}> = ({ open, onClose, onCreate, existingDecks }) => {
  const [step, setStep] = useState<'paste' | 'generating' | 'review'>('paste');
  const [name, setName] = useState('');
  const [count, setCount] = useState(6);
  const [text, setText] = useState('');
  const [targetDeckId, setTargetDeckId] = useState<string>('__new__');
  const [previewCards, setPreviewCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('paste'); setName(''); setCount(6); setText('');
      setTargetDeckId('__new__'); setPreviewCards([]); setError(null);
    }
  }, [open]);

  if (!open) return null;

  const canGenerate = text.trim().length > 40 && (targetDeckId !== '__new__' || name.trim().length > 0);

  async function handleGenerate() {
    setError(null); setStep('generating');
    try {
      const cards = await generateCardsFromText(text, count);
      setPreviewCards(cards); setStep('review');
    } catch (err: any) {
      setError(err.message || 'Generation failed.');
      setStep('paste');
    }
  }

  function handleSave() {
    onCreate({
      targetDeckId: targetDeckId === '__new__' ? null : targetDeckId,
      name: name.trim() || 'Untitled Deck',
      color: 'mono',
      cards: previewCards,
    });
    onClose();
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 720, maxWidth: '94vw', maxHeight: '90vh',
          background: '#000', border: '1px solid var(--au-line-2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--au-line)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...eyebrow, fontSize: 9.5, marginBottom: 6 }}>
              {step === 'review' ? '— Step 02 · Review' : '— Step 01 · Source'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--au-text)', letterSpacing: '-0.015em' }}>
              {step === 'review' ? 'Review generated cards' : 'Paste knowledge → flashcards'}
            </div>
          </div>
          <button style={{ ...btnGhost, padding: 8 }} onClick={onClose}><X size={13} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, overflowY: 'auto' }}>
          {step === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div>
                <div style={{ ...label, marginBottom: 10 }}>— Deck</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={targetDeckId}
                    onChange={e => setTargetDeckId(e.target.value)}
                    style={{ ...inputBase, width: 220, cursor: 'pointer' }}
                  >
                    <option value="__new__">+ Create new deck</option>
                    {existingDecks.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.cards.length})</option>
                    ))}
                  </select>
                  {targetDeckId === '__new__' && (
                    <input
                      style={{ ...inputBase, flex: 1 }}
                      placeholder="Deck name — e.g. Stoic Philosophy"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div>
                <div style={{ ...label, marginBottom: 10 }}>— Source material</div>
                <textarea
                  style={{ ...inputBase, minHeight: 220, resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="Paste a transcript, article, book chapter, or your own notes. Minimum 40 characters."
                  value={text}
                  onChange={e => setText(e.target.value)}
                />
              </div>

              <div>
                <div style={{ ...label, marginBottom: 10 }}>— How many cards</div>
                <div style={{ display: 'flex', border: '1px solid var(--au-line-2)', width: 'fit-content' }}>
                  {[3, 5, 8, 12].map((n, i) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      style={{
                        padding: '8px 18px',
                        background: count === n ? 'var(--au-text)' : 'transparent',
                        color: count === n ? '#000' : 'var(--au-text-2)',
                        border: 'none',
                        borderLeft: i === 0 ? 'none' : '1px solid var(--au-line-2)',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 11, fontWeight: 600, letterSpacing: '0.1em',
                        cursor: 'pointer',
                      }}
                    >{String(n).padStart(2, '0')}</button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 12px', border: '1px solid rgba(212,109,109,0.3)', color: 'var(--au-bad)', fontSize: 12.5 }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'generating' && (
            <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Sparkles size={28} />
              <div style={{ fontSize: 14, color: 'var(--au-text)', fontWeight: 500 }}>Generating {count} flashcards…</div>
              <div style={{ fontSize: 12, color: 'var(--au-text-3)', maxWidth: 360, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em' }}>
                Reading source · identifying concepts · writing Q/A pairs
              </div>
            </div>
          )}

          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {previewCards.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--au-text-3)', fontSize: 13 }}>All cards removed. Go back to regenerate.</div>
              ) : previewCards.map((c, i) => (
                <div key={c.id} style={{ padding: '14px 16px', border: '1px solid var(--au-line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ ...label, fontSize: 9.5, color: 'var(--au-text-2)' }}>— Q{String(i + 1).padStart(2, '0')}</span>
                    <button
                      onClick={() => setPreviewCards(cs => cs.filter(x => x.id !== c.id))}
                      style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--au-text-3)', padding: 2, display: 'inline-flex', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <textarea
                    value={c.q}
                    onChange={e => setPreviewCards(cs => cs.map(x => x.id === c.id ? { ...x, q: e.target.value } : x))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--au-text)', fontWeight: 500, fontSize: 13.5, lineHeight: 1.55, padding: '4px 0', resize: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                  <div style={{ ...label, marginTop: 10 }}>— Answer</div>
                  <textarea
                    value={c.a}
                    onChange={e => setPreviewCards(cs => cs.map(x => x.id === c.id ? { ...x, a: e.target.value } : x))}
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--au-text-2)', fontSize: 13.5, lineHeight: 1.55, padding: '4px 0', resize: 'none', fontFamily: 'Inter, sans-serif' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--au-line)', display: 'flex', alignItems: 'center', gap: 10, background: '#000' }}>
          {step === 'paste' && (
            <>
              <span style={{ fontSize: 10.5, color: 'var(--au-text-3)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
                {String(text.trim().length).padStart(4, '0')} CHARS
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button style={btnGhost} onClick={onClose}>Cancel</button>
                <button
                  style={canGenerate ? btnPrimary : { ...btnPrimary, background: '#0a0a0a', color: 'var(--au-text-3)', border: '1px solid var(--au-line-2)', cursor: 'not-allowed' }}
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                >
                  <Sparkles size={11} /> Generate · {count}
                </button>
              </div>
            </>
          )}
          {step === 'review' && (
            <>
              <span style={{ fontSize: 10.5, color: 'var(--au-text-2)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
                {String(previewCards.length).padStart(2, '0')} CARDS
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button style={btnGhost} onClick={() => setStep('paste')}>← Back</button>
                <button
                  style={previewCards.length > 0 ? btnPrimary : { ...btnPrimary, background: '#0a0a0a', color: 'var(--au-text-3)', border: '1px solid var(--au-line-2)', cursor: 'not-allowed' }}
                  disabled={previewCards.length === 0}
                  onClick={handleSave}
                >
                  <Check size={11} /> Save deck
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Top-level controller ───────────────────────────────────────────
type View =
  | { name: 'list' }
  | { name: 'detail'; deckId: string }
  | { name: 'study'; deckId: string };

const StudyManager: React.FC = () => {
  const [decks, setDecks] = useState<Deck[]>(loadDecks);
  const [view, setView] = useState<View>({ name: 'list' });
  const [pasteOpen, setPasteOpen] = useState(false);

  useEffect(() => { saveDecks(decks); }, [decks]);

  const totals = useMemo(() => {
    const cards = decks.flatMap(d => d.cards);
    const mastered = cards.filter(c => c.mastery === 'mastered').length;
    const newCards = cards.filter(c => c.mastery === 'new').length;
    return { decks: decks.length, cards: cards.length, mastered, newCards, streak: 4 };
  }, [decks]);

  function handleCreateOrAppend({ targetDeckId, name, color, cards }: { targetDeckId: string | null; name: string; color: string; cards: Card[] }) {
    if (targetDeckId) {
      setDecks(ds => ds.map(d => d.id === targetDeckId ? { ...d, cards: [...d.cards, ...cards] } : d));
    } else {
      const newDeck: Deck = { id: 'd_' + Date.now(), name, color, createdAt: Date.now(), cards };
      setDecks(ds => [newDeck, ...ds]);
    }
  }

  function deleteDeck(id: string) {
    setDecks(ds => ds.filter(d => d.id !== id));
    if (view.name !== 'list' && view.deckId === id) setView({ name: 'list' });
  }
  function updateCard(deckId: string, cardId: string, patch: Partial<Card>) {
    setDecks(ds => ds.map(d => d.id !== deckId ? d : { ...d, cards: d.cards.map(c => c.id === cardId ? { ...c, ...patch } : c) }));
  }
  function deleteCard(deckId: string, cardId: string) {
    setDecks(ds => ds.map(d => d.id !== deckId ? d : { ...d, cards: d.cards.filter(c => c.id !== cardId) }));
  }

  if (view.name === 'list') {
    return (
      <>
        <DeckListView
          decks={decks} totals={totals}
          onCreate={() => setPasteOpen(true)}
          onOpenDeck={id => setView({ name: 'detail', deckId: id })}
          onStudyDeck={id => setView({ name: 'study', deckId: id })}
          onDeleteDeck={deleteDeck}
        />
        <PasteModal open={pasteOpen} onClose={() => setPasteOpen(false)} onCreate={handleCreateOrAppend} existingDecks={decks} />
      </>
    );
  }

  if (view.name === 'study') {
    const deck = decks.find(d => d.id === view.deckId);
    if (!deck) { setView({ name: 'list' }); return null; }
    return (
      <StudyMode
        deck={deck}
        onExit={() => setView({ name: 'list' })}
        onUpdateCard={(cardId, patch) => updateCard(deck.id, cardId, patch)}
      />
    );
  }

  // detail
  const deck = decks.find(d => d.id === view.deckId);
  if (!deck) { setView({ name: 'list' }); return null; }
  return (
    <>
      <DeckDetailView
        deck={deck}
        onBack={() => setView({ name: 'list' })}
        onStudy={() => setView({ name: 'study', deckId: deck.id })}
        onAddCards={() => setPasteOpen(true)}
        onDeleteCard={(cardId) => deleteCard(deck.id, cardId)}
      />
      <PasteModal
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onCreate={(payload) => handleCreateOrAppend({ ...payload, targetDeckId: payload.targetDeckId || deck.id })}
        existingDecks={decks}
      />
    </>
  );
};

export default StudyManager;
