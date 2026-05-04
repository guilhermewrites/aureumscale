import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Save, FileText } from 'lucide-react';
import { PlannerTask, PlannerSubtask } from '../types';
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
      p.vy += 0.08;
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
  setTimeout(() => cancelAnimationFrame(animId), 2000);
}

// --- Sao Paulo countdown hook ---

function useSaoPauloCountdown() {
  const getTimeLeft = useCallback(() => {
    const now = new Date();
    const spNowStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour12: false });
    const spNow = new Date(spNowStr);
    const hours = spNow.getHours();
    const minutes = spNow.getMinutes();
    const seconds = spNow.getSeconds();

    const totalSecondsInDay = 24 * 60 * 60;
    const elapsed = hours * 3600 + minutes * 60 + seconds;
    const remaining = totalSecondsInDay - elapsed;

    return {
      hoursLeft: Math.floor(remaining / 3600),
      minutesLeft: Math.floor((remaining % 3600) / 60),
      totalMinutesLeft: Math.floor(remaining / 60),
      secondsLeft: remaining % 60,
      fraction: remaining / totalSecondsInDay,
      displayTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  }, []);

  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [getTimeLeft]);

  return time;
}

// --- Motivational GIFs ---

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

// ===================== TASK DETAIL MODAL =====================

interface TaskDetailModalProps {
  task: PlannerTask;
  onClose: () => void;
  onSave: (updated: PlannerTask) => void;
  onDelete: (id: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [subtasks, setSubtasks] = useState<PlannerSubtask[]>(task.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave({
      ...task,
      title: title.trim() || task.title,
      notes: notes.trim() || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
  };

  const addSubtask = () => {
    const trimmed = newSubtask.trim();
    if (!trimmed) return;
    setSubtasks(prev => [...prev, { id: Date.now().toString(), title: trimmed, completed: false }]);
    setNewSubtask('');
    subtaskInputRef.current?.focus();
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const deleteSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== id));
  };

  const completedSubs = subtasks.filter(s => s.completed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0d0d0d] border border-[#242424] rounded-none-none w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#242424]">
          <h2 className="text-xl font-bold text-[#f4f4f4]">Edit Task</h2>
          <button onClick={onClose} className="text-[#909090] hover:text-[#f4f4f4] transition-none">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Title */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#909090] font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full mt-1 bg-[#000] border border-[#242424] rounded-none-none px-4 py-3 text-[#f4f4f4] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666]"
              placeholder="Task title..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#909090] font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={5}
              className="w-full mt-1 bg-[#000] border border-[#242424] rounded-none-none px-4 py-3 text-[#f4f4f4] focus:outline-none focus:ring-2 focus:ring-[#555555] transition-none placeholder-[#666666] resize-none"
              placeholder="Add notes, context, links..."
            />
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider text-[#909090] font-medium">Subtasks</label>
              {subtasks.length > 0 && (
                <span className="text-[10px] text-[#666666]">{completedSubs}/{subtasks.length}</span>
              )}
            </div>

            <div className="bg-[#000] border border-[#242424] rounded-none-none overflow-hidden">
              {/* Add subtask input */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#242424]">
                <Plus size={12} className="text-[#666666] flex-shrink-0" />
                <input
                  ref={subtaskInputRef}
                  type="text"
                  value={newSubtask}
                  onChange={e => setNewSubtask(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                  placeholder="Add subtask..."
                  className="flex-1 bg-transparent text-sm text-[#f4f4f4] placeholder-[#666666] focus:outline-none"
                />
              </div>

              {/* Subtask items */}
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 px-3 py-2 border-b border-[#242424] last:border-b-0 group">
                  <button
                    onClick={() => toggleSubtask(sub.id)}
                    className={`w-4 h-4 rounded-none border flex items-center justify-center flex-shrink-0 transition-none ${
                      sub.completed ? 'bg-emerald-500 border-emerald-500' : 'border-[#4a4a4a] hover:border-[#9B9B9B]'
                    }`}
                  >
                    {sub.completed && (
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.5 7.5L8 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${sub.completed ? 'line-through text-[#6dd49a]/60' : 'text-[#f4f4f4]'}`}>
                    {sub.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask(sub.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#666666] hover:text-rose-400 transition-none"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {subtasks.length === 0 && (
                <div className="px-3 py-3 text-center">
                  <p className="text-[#666666] text-xs">No subtasks yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#242424] flex items-center justify-between bg-[rgba(255,255,255,0.03)]">
          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center gap-2 text-sm text-rose-500 hover:text-rose-400 transition-none"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[#909090] hover:text-[#f4f4f4] text-sm font-medium transition-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-none-none text-sm font-semibold transition-none flex items-center gap-2"
            >
              <Save size={16} />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================== MAIN COMPONENT =====================

const PlannerManager: React.FC<PlannerManagerProps> = ({ storagePrefix }) => {
  const [tasks, setTasks] = useLocalStorage<PlannerTask[]>(`${storagePrefix}_planner`, []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [detailTask, setDetailTask] = useState<PlannerTask | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set());

  const spTime = useSaoPauloCountdown();

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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
    setDetailTask(null);
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

  const handleSaveDetail = (updated: PlannerTask) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setDetailTask(null);
  };

  const openDetail = (task: PlannerTask) => {
    setDetailTask(task);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? completedCount / tasks.length : 0;
  const motivation = getMotivationForProgress(progress);
  const allDone = tasks.length > 0 && completedCount === tasks.length;

  // Purple mid-range instead of yellow
  const barColor = spTime.fraction > 0.5 ? '#4ade80' : spTime.fraction > 0.2 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Countdown Timer */}
      <div className="bg-[#0d0d0d] border border-[#242424] rounded-none-none px-6 py-10 flex flex-col items-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#666666] font-medium mb-8">
          Time remaining today
        </p>
        <div className="flex items-end gap-4">
          <div className="flex flex-col items-center">
            <span className="text-7xl md:text-8xl font-black text-[#f4f4f4] leading-none tabular-nums">
              {String(spTime.totalMinutesLeft).padStart(3, '0')}
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#666666] font-medium mt-3">min</span>
          </div>
          <span className="text-5xl md:text-6xl font-black text-[#3a3a3a] leading-none mb-8">:</span>
          <div className="flex flex-col items-center">
            <span className="text-7xl md:text-8xl font-black text-[#f4f4f4] leading-none tabular-nums">
              {String(spTime.secondsLeft).padStart(2, '0')}
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-[#666666] font-medium mt-3">sec</span>
          </div>
        </div>
        <div className="w-full max-w-sm mt-10">
          <div className="w-full h-1.5 rounded-none-full bg-[#000] overflow-hidden">
            <div
              className="h-full rounded-none-full"
              style={{
                width: `${Math.max(spTime.fraction * 100, 0.5)}%`,
                backgroundColor: barColor,
                transition: 'width 1s linear, background-color 1s ease',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-[#666666]">
            <span>Passo Fundo · {spTime.displayTime}</span>
            <span>{spTime.fraction <= 0.01 ? "Day's over!" : `${Math.round(spTime.fraction * 100)}% left`}</span>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0d0d0d] border border-[#242424] p-6 rounded-none-none">
          <p className="text-[#909090] text-sm font-medium mb-2">Total Tasks</p>
          <h3 className="text-3xl font-bold text-[#f4f4f4] mb-1">{tasks.length}</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666666]">for today</span>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#242424] p-6 rounded-none-none">
          <p className="text-[#909090] text-sm font-medium mb-2">Completed</p>
          <h3 className="text-3xl font-bold text-[#f4f4f4] mb-1">{completedCount}</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666666]">
              {tasks.length > 0 ? `${Math.round(progress * 100)}% done` : 'no tasks yet'}
            </span>
          </div>
        </div>

      </div>

      {/* Task list */}
      <section>
        <div ref={listRef} className="relative bg-[#0d0d0d] border border-[#242424] rounded-none-none overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 pointer-events-none"
          />

          {/* Add task row */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-[#242424]">
            <button
              onClick={addTask}
              className="w-5 h-5 rounded-none border border-[#4a4a4a] flex items-center justify-center text-[#666666] hover:border-[#9B9B9B] hover:text-[#909090] transition-none flex-shrink-0"
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
              className="flex-1 bg-transparent text-sm text-[#f4f4f4] placeholder-[#666666] focus:outline-none"
            />
            {newTaskTitle.trim() && (
              <button
                onClick={addTask}
                className="px-3 py-1.5 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-none-none text-xs font-medium transition-none"
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
              {tasks.map(task => {
                const subCount = task.subtasks?.length || 0;
                const subDone = task.subtasks?.filter(s => s.completed).length || 0;
                const hasDetails = !!(task.notes || subCount > 0);

                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#242424] last:border-b-0 group hover:bg-[rgba(255,255,255,0.02)] transition-none ${
                      justCompleted.has(task.id) ? 'bg-[rgba(74,222,128,0.06)]' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => toggleTask(task.id, e)}
                      className={`w-5 h-5 rounded-none border flex items-center justify-center flex-shrink-0 transition-none ${
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

                    {/* Title (click to edit inline) */}
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
                        className="flex-1 bg-[#3a3a3a] border border-[#4a4a4a] rounded-none-none px-3 py-1.5 text-sm text-[#f4f4f4] focus:outline-none focus:ring-1 focus:ring-[#555555]"
                      />
                    ) : (
                      <span
                        onClick={() => startEditing(task)}
                        className={`flex-1 text-sm cursor-pointer ${
                          task.completed
                            ? 'line-through text-[#6dd49a]/60'
                            : 'text-[#f4f4f4] hover:text-white'
                        }`}
                      >
                        {task.title}
                      </span>
                    )}

                    {/* Subtask count indicator */}
                    {subCount > 0 && (
                      <span className="text-[10px] text-[#666666] flex-shrink-0">{subDone}/{subCount}</span>
                    )}

                    {/* Notes/detail indicator + open modal */}
                    <button
                      onClick={() => openDetail(task)}
                      className={`p-1.5 rounded-none-none transition-none flex-shrink-0 ${
                        hasDetails
                          ? 'text-[#909090] hover:text-[#f4f4f4] hover:bg-[rgba(255,255,255,0.05)]'
                          : 'opacity-0 group-hover:opacity-100 text-[#666666] hover:text-[#f4f4f4] hover:bg-[rgba(255,255,255,0.05)]'
                      }`}
                      title="Edit details"
                    >
                      <FileText size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-[#666666] hover:text-rose-400 rounded-none-none hover:bg-[rgba(255,255,255,0.05)] transition-none flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Motivational GIF banner */}
      <section>
        <div className={`bg-[#0d0d0d] border rounded-none-none overflow-hidden flex items-center gap-6 p-5 ${
          allDone ? 'border-emerald-500/30' : 'border-[#242424]'
        }`}>
          <div className="w-28 h-28 rounded-none-none overflow-hidden flex-shrink-0 bg-[#000]">
            <img
              src={motivation.url}
              alt="Motivation"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold mb-1 ${allDone ? 'text-[#6dd49a]' : 'text-[#f4f4f4]'}`}>
              {motivation.caption}
            </p>
            <div className="w-full h-1.5 rounded-none-full bg-[#000] overflow-hidden mt-3">
              <div
                className="h-full rounded-none-full"
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

      {/* Task Detail Modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onSave={handleSaveDetail}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
};

export default PlannerManager;
