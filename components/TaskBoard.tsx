import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, GripVertical, DollarSign, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface BoardTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  client_id: string;
  client_name: string;
  status: string;
  estimated_revenue: number;
  order_num: number;
}

interface TaskBoardProps {
  storagePrefix: string;
  clients: { id: string; name: string }[];
}

const COLUMNS = ['To Do', 'In Progress', 'Done'];

const COLUMN_COLORS: Record<string, string> = {
  'To Do': '#d4d4d8',
  'In Progress': '#fde68a',
  'Done': '#86efac',
};

// Legacy statuses (from the old 6-column pipeline) mapped to the new 3 columns
const LEGACY_STATUS_MAP: Record<string, string> = {
  'Lead': 'To Do',
  'Proposal': 'To Do',
  'Onboarding': 'To Do',
  'Review': 'Done',
  'Complete': 'Done',
};

function normalizeStatus(s: string): string {
  if (COLUMNS.includes(s)) return s;
  return LEGACY_STATUS_MAP[s] ?? 'To Do';
}

function newTask(userId: string, status: string, orderNum: number): BoardTask {
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    title: '',
    description: '',
    client_id: '',
    client_name: '',
    status,
    estimated_revenue: 0,
    order_num: orderNum,
  };
}

const TaskBoard: React.FC<TaskBoardProps> = ({ storagePrefix, clients }) => {
  const [tasks, setTasks] = useState<BoardTask[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Load tasks from Supabase — migrate legacy statuses into the new 3-column scheme on read
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from('board_tasks')
        .select('*')
        .eq('user_id', storagePrefix)
        .order('order_num', { ascending: true });
      if (data) {
        const migrated = (data as BoardTask[]).map(t => ({ ...t, status: normalizeStatus(t.status) }));
        setTasks(migrated);
        // Persist any migrations that happened
        const needsUpdate = migrated.filter((t, i) => t.status !== (data[i] as BoardTask).status);
        if (needsUpdate.length > 0) {
          await supabase.from('board_tasks').upsert(needsUpdate, { onConflict: 'id' });
        }
      }
    })();
  }, [storagePrefix]);

  const saveTasks = useCallback(async (updated: BoardTask[]) => {
    setTasks(updated);
    if (!supabase) return;
    // Upsert all changed tasks
    const rows = updated.map(t => ({
      id: t.id,
      user_id: t.user_id,
      title: t.title,
      description: t.description,
      client_id: t.client_id,
      client_name: t.client_name,
      status: t.status,
      estimated_revenue: t.estimated_revenue,
      order_num: t.order_num,
    }));
    await supabase.from('board_tasks').upsert(rows, { onConflict: 'id' });
  }, []);

  const addTask = useCallback((status: string) => {
    const colTasks = tasks.filter(t => t.status === status);
    const task = newTask(storagePrefix, status, colTasks.length);
    const updated = [...tasks, task];
    saveTasks(updated);
    setEditingId(task.id);
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [tasks, storagePrefix, saveTasks]);

  const updateTask = useCallback((id: string, patch: Partial<BoardTask>) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...patch } : t);
    saveTasks(updated);
  }, [tasks, saveTasks]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (supabase) await supabase.from('board_tasks').delete().eq('id', id);
    if (editingId === id) setEditingId(null);
  }, [editingId]);

  // Drag and drop — supports reordering within a column + moving between columns
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleColDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
  };

  const handleCardDragOver = (e: React.DragEvent, cardId: string, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(col);
    setDragOverCardId(cardId);
  };

  const handleDragLeave = () => {
    setDragOverCol(null);
    setDragOverCardId(null);
  };

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const hoveredCard = dragOverCardId;
    setDragOverCardId(null);
    if (!dragId) return;

    const draggedTask = tasks.find(t => t.id === dragId);
    if (!draggedTask) { setDragId(null); return; }

    // Get tasks in target column (excluding the dragged one)
    const colTasks = tasks
      .filter(t => t.status === targetCol && t.id !== dragId)
      .sort((a, b) => a.order_num - b.order_num);

    // Determine insertion index
    let insertIdx = colTasks.length; // default: end of list
    if (hoveredCard && hoveredCard !== dragId) {
      const hoverIdx = colTasks.findIndex(t => t.id === hoveredCard);
      if (hoverIdx >= 0) insertIdx = hoverIdx;
    }

    // Insert the dragged task at the right position
    colTasks.splice(insertIdx, 0, { ...draggedTask, status: targetCol });

    // Reassign order_num for the whole column
    const reordered = colTasks.map((t, i) => ({ ...t, order_num: i }));

    // Merge back into full task list
    const otherTasks = tasks.filter(t => t.status !== targetCol && t.id !== dragId);
    saveTasks([...otherTasks, ...reordered]);
    setDragId(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverCol(null);
    setDragOverCardId(null);
  };

  // Revenue totals
  const totalRevenue = tasks.reduce((sum, t) => sum + (t.estimated_revenue || 0), 0);
  const colRevenue = (col: string) =>
    tasks.filter(t => t.status === col).reduce((sum, t) => sum + (t.estimated_revenue || 0), 0);

  const formatMoney = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 group"
        >
          <ChevronDown
            size={14}
            className="transition-transform"
            style={{ color: '#909090', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
          />
          <h2 className="text-sm font-semibold" style={{ color: '#f4f4f4' }}>
            Task Board
          </h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-none-full" style={{ background: '#0d0d0d', color: '#909090' }}>
            {tasks.length} tasks
          </span>
          {totalRevenue > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-none-full" style={{ background: '#1a2e1a', color: '#6dd49a' }}>
              {formatMoney(totalRevenue)} total value
            </span>
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ minHeight: 160 }}>
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col).sort((a, b) => a.order_num - b.order_num);
            const isDragOver = dragOverCol === col;
            const rev = colRevenue(col);
            return (
              <div
                key={col}
                className="flex-shrink-0 rounded-none-none flex flex-col backdrop-blur-sm"
                style={{
                  width: 320,
                  background: isDragOver
                    ? 'linear-gradient(135deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.03) 100%)'
                    : 'linear-gradient(135deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.015) 100%)',
                  border: isDragOver ? '1px dashed rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 60px rgba(255,255,255,0.025), 0 2px 20px rgba(0,0,0,0.25)',
                  transition: 'background 0.15s, border 0.15s, box-shadow 0.2s',
                }}
                onDragOver={e => handleColDragOver(e, col)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, col)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between px-3 pt-3 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-none-full" style={{ background: COLUMN_COLORS[col] }} />
                    <span className="text-xs font-semibold" style={{ color: '#f4f4f4' }}>{col}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-none-full" style={{ background: '#0d0d0d', color: '#777' }}>
                      {colTasks.length}
                    </span>
                  </div>
                  {rev > 0 && (
                    <span className="text-[10px] font-medium" style={{ color: '#6dd49a' }}>
                      {formatMoney(rev)}
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto" style={{ maxHeight: 400 }}>
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isEditing={editingId === task.id}
                      isDragging={dragId === task.id}
                      isDragOver={dragOverCardId === task.id && dragId !== task.id}
                      clients={clients}
                      titleRef={editingId === task.id ? titleRef : undefined}
                      onEdit={() => setEditingId(task.id)}
                      onUpdate={(patch) => updateTask(task.id, patch)}
                      onDelete={() => deleteTask(task.id)}
                      onClose={() => setEditingId(null)}
                      onDragStart={e => handleDragStart(e, task.id)}
                      onCardDragOver={e => handleCardDragOver(e, task.id, col)}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>

                {/* Add button */}
                <button
                  onClick={() => addTask(col)}
                  className="flex items-center gap-1 px-3 py-2 text-[11px] font-medium rounded-none-none transition-colors"
                  style={{ color: '#5a5a5a' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#999')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#666')}
                >
                  <Plus size={12} /> Add task
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Task Card ────────────────────────────────────────────────────────────
interface TaskCardProps {
  task: BoardTask;
  isEditing: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  clients: { id: string; name: string }[];
  titleRef?: React.RefObject<HTMLInputElement | null>;
  onEdit: () => void;
  onUpdate: (patch: Partial<BoardTask>) => void;
  onDelete: () => void;
  onClose: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onCardDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task, isEditing, isDragging, isDragOver, clients, titleRef,
  onEdit, onUpdate, onDelete, onClose, onDragStart, onCardDragOver, onDragEnd,
}) => {
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isEditing) {
    return (
      <div
        className="rounded-none p-3 space-y-2"
        style={{ background: '#232323', border: '1px solid #242424' }}
      >
        {/* Title */}
        <input
          ref={titleRef}
          value={task.title}
          onChange={e => onUpdate({ title: e.target.value })}
          placeholder="Task title..."
          className="w-full bg-transparent text-xs font-semibold outline-none"
          style={{ color: '#f4f4f4' }}
          onKeyDown={e => { if (e.key === 'Enter') onClose(); }}
        />

        {/* Description */}
        <textarea
          value={task.description}
          onChange={e => onUpdate({ description: e.target.value })}
          placeholder="Description..."
          rows={2}
          className="w-full bg-transparent text-[11px] outline-none resize-none"
          style={{ color: '#aaa' }}
        />

        {/* Client picker */}
        <div className="relative">
          <button
            onClick={() => setShowClientPicker(!showClientPicker)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-none-none transition-colors"
            style={{ background: '#0d0d0d', color: task.client_name ? '#ECECEC' : '#666' }}
          >
            {task.client_name || 'Assign client'}
            <ChevronDown size={10} />
          </button>
          {showClientPicker && (
            <div
              className="absolute left-0 top-full mt-1 z-50 rounded-none-none py-1 shadow-xl overflow-y-auto"
              style={{ background: '#0d0d0d', border: '1px solid #242424', maxHeight: 160, minWidth: 160 }}
            >
              <button
                onClick={() => { onUpdate({ client_id: '', client_name: '' }); setShowClientPicker(false); }}
                className="w-full text-left px-3 py-1.5 text-[11px] transition-colors"
                style={{ color: '#909090' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                None
              </button>
              {clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => { onUpdate({ client_id: c.id, client_name: c.name }); setShowClientPicker(false); }}
                  className="w-full text-left px-3 py-1.5 text-[11px] transition-colors"
                  style={{ color: '#f4f4f4' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#333')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Revenue */}
        <div className="flex items-center gap-1">
          <DollarSign size={11} style={{ color: '#6dd49a' }} />
          <input
            type="number"
            value={task.estimated_revenue || ''}
            onChange={e => onUpdate({ estimated_revenue: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="w-20 bg-transparent text-[11px] outline-none"
            style={{ color: '#6dd49a' }}
          />
        </div>

        {/* Status switcher */}
        <div className="flex flex-wrap gap-1">
          {COLUMNS.map(col => (
            <button
              key={col}
              onClick={() => onUpdate({ status: col })}
              className="text-[9px] px-1.5 py-0.5 rounded-none-none font-medium transition-all"
              style={{
                background: task.status === col ? COLUMN_COLORS[col] + '33' : '#2a2a2a',
                color: task.status === col ? COLUMN_COLORS[col] : '#666',
                border: task.status === col ? `1px solid ${COLUMN_COLORS[col]}55` : '1px solid transparent',
              }}
            >
              {col}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[10px] px-2 py-1 rounded-none-none transition-colors"
              style={{ color: '#d46d6d' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a1a1a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Delete
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={onDelete}
                className="text-[10px] px-2 py-1 rounded-none-none"
                style={{ background: '#3a1a1a', color: '#d46d6d' }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[10px] px-2 py-1 rounded-none-none"
                style={{ color: '#909090' }}
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="text-[10px] px-2 py-1 rounded-none-none transition-colors"
            style={{ background: '#0d0d0d', color: '#f4f4f4' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Collapsed card view
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onCardDragOver}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className="rounded-none p-2.5 cursor-grab active:cursor-grabbing group transition-all"
      style={{
        background: '#232323',
        border: isDragOver ? '1px solid #555' : '1px solid #2a2a2a',
        borderTop: isDragOver ? '2px solid #888' : undefined,
        opacity: isDragging ? 0.4 : 1,
        marginTop: isDragOver ? -1 : undefined,
      }}
      onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.borderColor = '#3a3a3a'; }}
      onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.borderColor = '#1a1a1a'; }}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical size={12} className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" style={{ color: '#909090' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium truncate" style={{ color: task.title ? '#ECECEC' : '#666' }}>
            {task.title || 'Untitled task'}
          </p>
          {task.client_name && (
            <p className="text-[10px] mt-0.5 truncate" style={{ color: '#909090' }}>
              {task.client_name}
            </p>
          )}
          {task.estimated_revenue > 0 && (
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#6dd49a' }}>
              ${task.estimated_revenue.toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        >
          <X size={12} style={{ color: '#909090' }} />
        </button>
      </div>
    </div>
  );
};

export default TaskBoard;
