import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PlannerTask } from '../types';
import useLocalStorage from '../hooks/useLocalStorage';

interface PlannerManagerProps {
  storagePrefix: string;
}

const PlannerManager: React.FC<PlannerManagerProps> = ({ storagePrefix }) => {
  const [tasks, setTasks] = useLocalStorage<PlannerTask[]>(`${storagePrefix}_planner`, []);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

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

  const toggleTask = (id: string) => {
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
              {tasks.length > 0 ? `${Math.round((completedCount / tasks.length) * 100)}% done` : 'no tasks yet'}
            </span>
          </div>
        </div>

        <div className="bg-[#2f2f2f] border border-[#3a3a3a] p-6 rounded-xl">
          <p className="text-[#9B9B9B] text-sm font-medium mb-2">Remaining</p>
          <h3 className="text-3xl font-bold text-[#ECECEC] mb-1">{tasks.length - completedCount}</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#666666]">tasks left</span>
          </div>
        </div>
      </div>

      {/* Task list */}
      <section>
        <div className="bg-[#2f2f2f] border border-[#3a3a3a] rounded-xl overflow-hidden">
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
                  className="flex items-center gap-3 px-5 py-3.5 border-b border-[#3a3a3a] last:border-b-0 group hover:bg-[rgba(255,255,255,0.02)] transition-none"
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-none ${
                      task.completed
                        ? 'bg-[#ECECEC] border-[#ECECEC]'
                        : 'border-[#4a4a4a] hover:border-[#9B9B9B]'
                    }`}
                  >
                    {task.completed && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.5 7.5L8 2.5" stroke="#212121" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                          ? 'line-through text-[#666666]'
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
    </div>
  );
};

export default PlannerManager;
