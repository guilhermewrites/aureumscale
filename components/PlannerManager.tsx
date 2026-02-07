import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';
import { PlannerTask } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

interface PlannerManagerProps {
  storagePrefix: string;
}

// --- Firework animation (canvas-based, spawns at checkbox position) ---

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const FIREWORK_COLORS = ['#4ade80', '#22d3ee', '#facc15', '#f472b6', '#a78bfa', '#fb923c', '#34d399'];

function spawnFirework(
  canvas: HTMLCanvasElement,
  originX: number,
  originY: number,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles: Particle[] = [];
  const count = 28;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 2.5 + Math.random() * 3.5;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.6 + Math.random() * 0.4,
      color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
      size: 2 + Math.random() * 2.5,
    });
  }

  let animId: number;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // gravity
      p.life -= 0.02 / p.maxLife;
      if (p.life <= 0) continue;
      alive = true;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (alive) {
      animId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  animId = requestAnimationFrame(animate);

  // Safety cleanup
  setTimeout(() => cancelAnimationFrame(animId), 2000);
}

// --- Sao Paulo countdown hook ---

function useSaoPauloCountdown() {
  const getTimeLeft = useCallback(() => {
    const now = new Date();
    // Get current time in Sao Paulo (America/Sao_Paulo)
    const spNowStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour12: false });
    const spNow = new Date(spNowStr);
    const hours = spNow.getHours();
    const minutes = spNow.getMinutes();
    const seconds = spNow.getSeconds();

    const totalSecondsInDay = 24 * 60 * 60;
    const elapsed = hours * 3600 + minutes * 60 + seconds;
    const remaining = totalSecondsInDay - elapsed;

    const hoursLeft = Math.floor(remaining / 3600);
    const minutesLeft = Math.floor((remaining % 3600) / 60);
    const fraction = remaining / totalSecondsInDay; // 1.0 at midnight -> 0.0 at end of day

    return {
      hoursLeft,
      minutesLeft,
      fraction,
      displayTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  }, []);

  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft()), 15000); // update every 15s
    return () => clearInterval(interval);
  }, [getTimeLeft]);

  return time;
}

// --- Motivational GIFs keyed by progress tier ---

const MOTIVATION_GIFS: { threshold: number; url: string; caption: string }[] = [
  { threshold: 0,   url: 'https://media.giphy.com/media/3oEjHB1EKuujDjYFWw/giphy.gif', caption: "Time to grind." },
  { threshold: 0.25, url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif', caption: "You're warming up." },
  { threshold: 0.5,  url: 'https://media.giphy.com/media/DhstvI3zZ598Nb1rFf/giphy.gif', caption: "Halfway there. Keep pushing." },
  { threshold: 0.75, url: 'https://media.giphy.com/media/l49JXTYPlm0ABKYzS/giphy.gif', caption: "Almost there. Finish strong." },
  { threshold: 1,    url: 'https://media.giphy.com/media/gdwJdym3VuXQr5OfAc/giphy.gif', caption: "All tasks done. You're a machine." },
];

function getMotivationForProgress(ratio: number) {
  let best = MOTIVATION_GIFS[0];
  for (const g of MOTIVATION_GIFS) {
    if (ratio >= g.threshold) best = g;
  }
  return best;
}

// ===================== COMPONENT =====================

const PlannerManager: React.FC<PlannerManagerProps> = ({ storagePrefix }) => {
  const [tasks, setTasks] = useLocalStorage<PlannerTask[]>(`${storagePrefix}_planner`, []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Track which task IDs just got completed (for firework)
  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const spTime = useSaoPauloCountdown();

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Resize canvas to overlay the task list
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const list = listRef.current;
      if (!canvas || !list) return;
      const rect = list.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [tasks.length]);

  const addTask = () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    const task: PlannerTask = {
      id: Date.now().toString(),
      title: trimmed,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [...prev, task]);
    setNewTaskTitle('');
    newTaskInputRef.current?.focus();
  };

  const toggleTask = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // If task is being completed (not unchecked), fire the firework
    if (!task.completed) {
      const canvas = canvasRef.current;
      const list = listRef.current;
      if (canvas && list) {
        const listRect = list.getBoundingClientRect();
        const btnRect = e.currentTarget.getBoundingClientRect();
        const ox = btnRect.left - listRect.left + btnRect.width / 2;
        const oy = btnRect.top - listRect.top + btnRect.height / 2;
        spawnFirework(canvas, ox, oy);
      }
      setJustCompleted(prev => new Set(prev).add(id));
      setTimeout(() => setJustCompleted(prev => { const next = new Set(prev); next.delete(id); return next; }), 600);
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const startEditing = (task: PlannerTask) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  const commitEdit = () => {
    if (editingId) {
      const trimmed = editingTitle.trim();
      if (trimmed) {
        setTasks(prev => prev.map(t => t.id === editingId ? { ...t, title: trimmed } : t));
      }
      setEditingId(null);
      setEditingTitle('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? completedCount / tasks.length : 0;
  const motivation = getMotivationForProgress(progress);
  const allDone = tasks.length > 0 && completedCount === tasks.length;

  // Color for the countdown bar: green when lots of time, amber mid, red when low
  const barColor = spTime.fraction > 0.5 ? '#4ade80' : spTime.fraction > 0.2 ? '#facc15' : '#ef4444';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl">
          <p className="text-[#9B9B9B] text-sm font-medium mb-2">Total Tasks</p>
          <h3 className="text-3xl font-bold text-[#ECECEC] mb-1">{tasks.length}</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666666]">for today</span>
          </div>
        </div>

        <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl">
          <p className="text-[#9B9B9B] text-sm font-medium mb-2">Completed</p>
          <h3 className="text-3xl font-bold text-[#ECECEC] mb-1">{completedCount}</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666666]">
              {tasks.length > 0 ? `${Math.round(progress * 100)}% done` : 'no tasks yet'}
            </span>
          </div>
        </div>

        {/* Time left in day (SP) */}
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[#9B9B9B] text-sm font-medium">Time Left Today</p>
            <Clock size={14} className="text-[#666666]" />
          </div>
          <h3 className="text-3xl font-bold text-[#ECECEC] mb-2">
            {spTime.hoursLeft}h {spTime.minutesLeft}m
          </h3>
          {/* Progress bar (draining) */}
          <div className="w-full h-2 rounded-full bg-[#212121] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(spTime.fraction * 100, 0.5)}%`,
                backgroundColor: barColor,
                transition: 'width 1s linear, background-color 1s ease',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[#666666]">
            <span>Sao Paulo {spTime.displayTime}</span>
            <span>{spTime.fraction <= 0.01 ? "Day's over!" : ''}</span>
          </div>
        </div>
      </div>

      {/* Task list with firework canvas overlay */}
      <section>
        <div ref={listRef} className="relative bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl overflow-hidden">
          {/* Canvas for fireworks — absolutely positioned over the list, pointer-events none */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none"
          />

          {/* Add task row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#3a3a3a]">
            <button
              onClick={addTask}
              className="w-5 h-5 rounded border border-[#4a4a4a] flex items-center justify-center text-[#666666] hover:border-[#9B9B9B] hover:text-[#9B9B9B] transition-none flex-shrink-0"
            >
              <Plus size={12} />
            </button>
            <input
              ref={newTaskInputRef}
              type="text"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
              placeholder="Add a new task..."
              className="flex-1 bg-transparent text-sm text-[#ECECEC] placeholder-[#666666] focus:outline-none"
            />
            {newTaskTitle.trim() && (
              <button
                onClick={addTask}
                className="px-3 py-1.5 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-xs font-medium transition-none"
              >
                Add
              </button>
            )}
          </div>

          {/* Task items */}
          {tasks.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[#666666] text-sm">No tasks yet. Add one above to get started.</p>
            </div>
          ) : (
            <div>
              {tasks.map(task => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#3a3a3a] last:border-b-0 group hover:bg-[rgba(255,255,255,0.02)] transition-none ${
                    justCompleted.has(task.id) ? 'bg-[rgba(74,222,128,0.06)]' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={(e) => toggleTask(task.id, e)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-none ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-[#4a4a4a] hover:border-[#9B9B9B]'
                    }`}
                  >
                    {task.completed && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.5 7.5L8 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Title (click to edit) */}
                  {editingId === task.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={commitEdit}
                      className="flex-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded-lg px-3 py-1.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555555]"
                    />
                  ) : (
                    <span
                      onClick={() => startEditing(task)}
                      className={`flex-1 text-sm cursor-pointer ${
                        task.completed
                          ? 'line-through text-emerald-500/60'
                          : 'text-[#ECECEC] hover:text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#666666] hover:text-rose-400 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-none flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Motivational GIF banner */}
      <section>
        <div className={`bg-[#2f2f2f] border rounded-xl overflow-hidden flex items-center gap-6 p-5 ${
          allDone ? 'border-emerald-500/30' : 'border-[#3a3a3a]'
        }`}>
          <div className="w-28 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-[#212121]">
            <img
              src={motivation.url}
              alt="Motivation"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold mb-1 ${allDone ? 'text-emerald-400' : 'text-[#ECECEC]'}`}>
              {motivation.caption}
            </p>
            <div className="w-full h-1.5 rounded-full bg-[#212121] overflow-hidden mt-3">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  backgroundColor: allDone ? '#4ade80' : '#ECECEC',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <p className="text-[10px] text-[#666666] mt-1.5">{completedCount} of {tasks.length} tasks complete</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PlannerManager;
