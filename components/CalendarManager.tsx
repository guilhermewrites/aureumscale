import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Trash2,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

// ── Types ──
interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  description?: string;
}

// Neutral style matching the app design system
const EVT = {
  bg: 'bg-[rgba(255,255,255,0.06)]',
  border: 'border-[#3a3a3a]',
  text: 'text-[#ECECEC]',
  sub: 'text-[#888]',
  hoverBg: 'hover:bg-[rgba(255,255,255,0.09)]',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM
const HOUR_HEIGHT = 64;

const formatTime12 = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const minutesToTime = (totalMinutes: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const snapTo15 = (minutes: number) => Math.round(minutes / 15) * 15;

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type DragMode = 'create' | 'move' | 'resize-top' | 'resize-bottom';

interface CalendarManagerProps {
  storagePrefix: string;
}

const CalendarManager: React.FC<CalendarManagerProps> = ({ storagePrefix }) => {
  const [events, setEventsState] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formDesc, setFormDesc] = useState('');

  // ── Supabase helpers ──
  const toDbRow = (ev: CalendarEvent) => ({
    id: ev.id,
    user_id: storagePrefix,
    title: ev.title,
    date: ev.date,
    start_time: ev.startTime,
    end_time: ev.endTime,
    description: ev.description || null,
  });

  const fromDbRow = (row: any): CalendarEvent => ({
    id: row.id,
    title: row.title || '',
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    description: row.description || undefined,
  });

  // Load from Supabase on mount
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', storagePrefix);
      if (!error && data) {
        setEventsState(data.map(fromDbRow));
      }
    })();
  }, [storagePrefix]);

  // Wrap setEvents to also persist to Supabase
  const setEvents = useCallback((updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
    setEventsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Determine what changed and sync to Supabase
      if (supabase) {
        const prevIds = new Set(prev.map(e => e.id));
        const nextIds = new Set(next.map(e => e.id));

        // Deleted events
        const deleted = prev.filter(e => !nextIds.has(e.id));
        for (const ev of deleted) {
          supabase.from('calendar_events').delete().eq('id', ev.id).eq('user_id', storagePrefix).then(() => {});
        }

        // Upserted events (new or changed)
        const toUpsert = next.filter(ev => {
          const old = prev.find(e => e.id === ev.id);
          if (!old) return true; // new
          return old.title !== ev.title || old.date !== ev.date || old.startTime !== ev.startTime || old.endTime !== ev.endTime || old.description !== ev.description;
        });
        if (toUpsert.length > 0) {
          supabase.from('calendar_events').upsert(toUpsert.map(toDbRow), { onConflict: 'id' }).then(() => {});
        }
      }
      return next;
    });
  }, [storagePrefix]);

  // Drag state (unified for create, move, resize)
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [dragEventId, setDragEventId] = useState<string | null>(null);
  const [dragDate, setDragDate] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0); // mouse Y at drag start
  const [dragOrigStart, setDragOrigStart] = useState<number>(0); // original event start minutes
  const [dragOrigEnd, setDragOrigEnd] = useState<number>(0); // original event end minutes
  const [dragPreviewStart, setDragPreviewStart] = useState<number | null>(null);
  const [dragPreviewEnd, setDragPreviewEnd] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Inline edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Scroll to current time on mount
  useEffect(() => {
    if (scheduleRef.current) {
      const now = new Date();
      scheduleRef.current.scrollTop = Math.max(0, (now.getHours() - 7) * HOUR_HEIGHT);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (inlineEditId && inlineInputRef.current) {
      inlineInputRef.current.focus();
    }
  }, [inlineEditId]);

  // ── Calendar logic ──
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = startDow - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = month === 0 ? 12 : month;
      const y2 = month === 0 ? year - 1 : year;
      days.push({ date: `${y2}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y2 = month + 2 > 12 ? year + 1 : year;
      days.push({ date: `${y2}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  const weekDays = useMemo(() => {
    const sel = new Date(selectedDate + 'T12:00:00');
    let dow = sel.getDay() - 1;
    if (dow < 0) dow = 6;
    const monday = new Date(sel);
    monday.setDate(sel.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        day: d.getDate(),
        dayName: DAYS[i],
      };
    });
  }, [selectedDate]);

  const eventsForDate = (date: string) => events.filter(e => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const today = getToday();
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(getToday()); };

  // ── Pixel <-> Minutes helpers ──
  const yToMinutes = useCallback((clientY: number, refEl: HTMLElement | null) => {
    if (!refEl) return 6 * 60;
    const rect = refEl.getBoundingClientRect();
    const scrollParent = refEl.closest('.custom-scrollbar') || refEl.parentElement;
    const scrollTop = scrollParent?.scrollTop || 0;
    const y = clientY - rect.top + scrollTop;
    return snapTo15(Math.max(6 * 60, Math.min(24 * 60, (y / HOUR_HEIGHT) * 60 + 6 * 60)));
  }, []);

  // ── Drag: Create ──
  const handleTimelineMouseDown = useCallback((e: React.MouseEvent, date: string, refEl: HTMLElement | null) => {
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    e.preventDefault();
    const mins = yToMinutes(e.clientY, refEl);
    setDragMode('create');
    setDragDate(date);
    setDragStartY(e.clientY);
    setDragOrigStart(mins);
    setDragOrigEnd(mins + 30);
    setDragPreviewStart(mins);
    setDragPreviewEnd(mins + 30);
  }, [yToMinutes]);

  // Track whether a drag actually moved (to distinguish click vs drag)
  const didDragMove = useRef(false);

  // ── Drag: Move or Resize existing event ──
  const handleEventDragStart = useCallback((e: React.MouseEvent, ev: CalendarEvent, mode: DragMode) => {
    e.preventDefault();
    e.stopPropagation();
    didDragMove.current = false;
    setDragMode(mode);
    setDragEventId(ev.id);
    setDragDate(ev.date);
    setDragStartY(e.clientY);
    setDragOrigStart(timeToMinutes(ev.startTime));
    setDragOrigEnd(timeToMinutes(ev.endTime));
    setDragPreviewStart(timeToMinutes(ev.startTime));
    setDragPreviewEnd(timeToMinutes(ev.endTime));
  }, []);

  // ── Global mouse move/up ──
  useEffect(() => {
    if (!dragMode) return;

    const handleMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY;
      if (Math.abs(deltaY) > 3) didDragMove.current = true;
      const deltaMin = snapTo15(Math.round((deltaY / HOUR_HEIGHT) * 60));

      if (dragMode === 'create') {
        const end = snapTo15(dragOrigStart + deltaMin + 30);
        const actualEnd = Math.max(dragOrigStart + 15, end);
        setDragPreviewStart(dragOrigStart);
        setDragPreviewEnd(Math.min(24 * 60, actualEnd));
      } else if (dragMode === 'move') {
        const duration = dragOrigEnd - dragOrigStart;
        let newStart = snapTo15(dragOrigStart + deltaMin);
        newStart = Math.max(6 * 60, Math.min(24 * 60 - duration, newStart));
        setDragPreviewStart(newStart);
        setDragPreviewEnd(newStart + duration);
      } else if (dragMode === 'resize-top') {
        let newStart = snapTo15(dragOrigStart + deltaMin);
        newStart = Math.max(6 * 60, Math.min(dragOrigEnd - 15, newStart));
        setDragPreviewStart(newStart);
        setDragPreviewEnd(dragOrigEnd);
      } else if (dragMode === 'resize-bottom') {
        let newEnd = snapTo15(dragOrigEnd + deltaMin);
        newEnd = Math.max(dragOrigStart + 15, Math.min(24 * 60, newEnd));
        setDragPreviewStart(dragOrigStart);
        setDragPreviewEnd(newEnd);
      }
    };

    const handleUp = () => {
      if (dragPreviewStart === null || dragPreviewEnd === null) {
        resetDrag();
        return;
      }

      const startMin = Math.min(dragPreviewStart, dragPreviewEnd);
      const endMin = Math.max(dragPreviewStart, dragPreviewEnd);

      if (dragMode === 'create' && dragDate) {
        if (endMin - startMin >= 15) {
          const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const newEv: CalendarEvent = {
            id: newId,
            title: '',
            date: dragDate,
            startTime: minutesToTime(startMin),
            endTime: minutesToTime(endMin),
            description: undefined,
          };
          setEvents(prev => [...prev, newEv]);
          setInlineEditId(newId);
          setInlineTitle('');
        }
      } else if (dragEventId && (dragMode === 'move' || dragMode === 'resize-top' || dragMode === 'resize-bottom')) {
        setEvents(prev => prev.map(e => e.id === dragEventId ? {
          ...e,
          startTime: minutesToTime(startMin),
          endTime: minutesToTime(endMin),
        } : e));
      }
      resetDrag();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragMode, dragStartY, dragOrigStart, dragOrigEnd, dragEventId, dragDate, dragPreviewStart, dragPreviewEnd, setEvents]);

  const resetDrag = () => {
    setDragMode(null);
    setDragEventId(null);
    setDragDate(null);
    setDragPreviewStart(null);
    setDragPreviewEnd(null);
  };

  const saveInlineTitle = useCallback(() => {
    if (!inlineEditId) return;
    if (inlineTitle.trim()) {
      setEvents(prev => prev.map(e => e.id === inlineEditId ? { ...e, title: inlineTitle.trim() } : e));
    } else {
      setEvents(prev => prev.filter(e => e.id !== inlineEditId));
    }
    setInlineEditId(null);
    setInlineTitle('');
  }, [inlineEditId, inlineTitle, setEvents]);

  // ── Modal CRUD ──
  const openNewEvent = (date?: string) => {
    setEditingEvent(null);
    setFormTitle(''); setFormDate(date || selectedDate);
    setFormStart('09:00'); setFormEnd('10:00'); setFormDesc('');
    setModalOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    if (inlineEditId === ev.id) return;
    setEditingEvent(ev);
    setFormTitle(ev.title); setFormDate(ev.date);
    setFormStart(ev.startTime); setFormEnd(ev.endTime);
    setFormDesc(ev.description || '');
    setModalOpen(true);
  };

  const saveEvent = () => {
    if (!formTitle.trim()) return;
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? {
        ...e, title: formTitle.trim(), date: formDate, startTime: formStart, endTime: formEnd, description: formDesc.trim()
      } : e));
    } else {
      setEvents(prev => [...prev, {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: formTitle.trim(), date: formDate, startTime: formStart, endTime: formEnd,
        description: formDesc.trim() || undefined,
      }]);
    }
    setModalOpen(false);
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalOpen(false);
  };

  // ── Position helpers ──
  const getEventPosition = (ev: CalendarEvent) => {
    const startMin = timeToMinutes(ev.startTime) - 6 * 60;
    const endMin = timeToMinutes(ev.endTime) - 6 * 60;
    return { top: (startMin / 60) * HOUR_HEIGHT, height: Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24) };
  };

  const selectedDayEvents = eventsForDate(selectedDate);

  // ── Render timeline ──
  const renderTimeline = (date: string, isPanel: boolean) => {
    const dayEvents = eventsForDate(date);
    const tlRef = useRef<HTMLDivElement>(null);

    // Drag preview for this date
    const showPreview = dragMode === 'create' && dragDate === date && dragPreviewStart !== null && dragPreviewEnd !== null;
    const previewTop = showPreview ? ((Math.min(dragPreviewStart!, dragPreviewEnd!) - 6 * 60) / 60) * HOUR_HEIGHT : 0;
    const previewH = showPreview ? Math.max(((Math.abs(dragPreviewEnd! - dragPreviewStart!) / 60)) * HOUR_HEIGHT, 16) : 0;

    return (
      <div
        ref={tlRef}
        className="relative select-none"
        style={{ height: HOURS.length * HOUR_HEIGHT, cursor: dragMode ? (dragMode === 'move' ? 'grabbing' : 'ns-resize') : 'crosshair' }}
        onMouseDown={(e) => { setConfirmDeleteId(null); handleTimelineMouseDown(e, date, tlRef.current); }}
      >
        {/* Hour lines */}
        {isPanel && HOURS.map(h => (
          <div key={h} className="absolute w-full flex items-start" style={{ top: (h - 6) * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
            <span className="text-[10px] text-[#444] font-medium w-12 text-right pr-2 pt-0.5 flex-shrink-0">
              {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
            </span>
            <div className="flex-1 border-t border-[#2a2a2a] h-full" />
          </div>
        ))}
        {!isPanel && HOURS.map(h => (
          <div key={h} className="border-b border-[#2a2a2a]" style={{ height: HOUR_HEIGHT }} />
        ))}

        {/* Drag-create preview */}
        {showPreview && (
          <div
            className={`absolute ${isPanel ? 'left-14 right-3' : 'left-1 right-1'} rounded-lg bg-[rgba(255,255,255,0.08)] border border-[#555] border-dashed px-3 py-1 z-20 pointer-events-none`}
            style={{ top: previewTop, height: previewH }}
          >
            <span className="text-[10px] text-[#9B9B9B] font-medium">
              {formatTime12(minutesToTime(Math.min(dragPreviewStart!, dragPreviewEnd!)))} - {formatTime12(minutesToTime(Math.max(dragPreviewStart!, dragPreviewEnd!)))}
            </span>
          </div>
        )}

        {/* Events */}
        {dayEvents.map(ev => {
          const isDraggingThis = dragEventId === ev.id && (dragMode === 'move' || dragMode === 'resize-top' || dragMode === 'resize-bottom');
          const pos = isDraggingThis && dragPreviewStart !== null && dragPreviewEnd !== null
            ? { top: ((Math.min(dragPreviewStart, dragPreviewEnd) - 6 * 60) / 60) * HOUR_HEIGHT, height: Math.max(((Math.abs(dragPreviewEnd - dragPreviewStart)) / 60) * HOUR_HEIGHT, 24) }
            : getEventPosition(ev);
          const isInlineEditing = inlineEditId === ev.id;

          const isConfirmingDelete = confirmDeleteId === ev.id;

          return (
            <div
              key={ev.id}
              data-event
              className={`absolute ${isPanel ? 'left-14 right-3' : 'left-1 right-1'} rounded-lg ${EVT.bg} border ${EVT.border} text-left z-10 group ${
                isDraggingThis ? 'opacity-80 shadow-lg' : ''
              } ${isInlineEditing ? '' : `cursor-grab ${EVT.hoverBg}`}`}
              style={{ top: pos.top, height: pos.height }}
              onMouseDown={(e) => {
                if (isInlineEditing || isConfirmingDelete) return;
                handleEventDragStart(e, ev, 'move');
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!isInlineEditing && !isConfirmingDelete) openEditEvent(ev);
              }}
            >
              {/* Resize handle: top — invisible, just changes cursor */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 cursor-n-resize z-30"
                onMouseDown={(e) => { e.stopPropagation(); handleEventDragStart(e, ev, 'resize-top'); }}
              />

              {/* Delete X button — top right corner */}
              {!isInlineEditing && !isDraggingThis && isPanel && !isConfirmingDelete && (
                <button
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#2a2a2a] border border-[#3a3a3a] flex items-center justify-center text-[#666] hover:text-[#ECECEC] hover:bg-[#333] opacity-0 group-hover:opacity-100 transition-opacity z-40"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(ev.id);
                  }}
                >
                  <X size={10} />
                </button>
              )}

              {/* Delete confirmation — replaces content */}
              {isConfirmingDelete && (
                <div className="absolute inset-0 rounded-lg bg-[#1e1e1e] z-40 flex items-center justify-center gap-3"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="text-[11px] text-[#9B9B9B]">Delete this event?</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEvents(prev => prev.filter(ev2 => ev2.id !== ev.id)); setConfirmDeleteId(null); }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-none"
                  >
                    Delete
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[rgba(255,255,255,0.08)] text-[#9B9B9B] hover:bg-[rgba(255,255,255,0.12)] transition-none"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="px-3 py-1.5 h-full overflow-hidden">
                {isInlineEditing ? (
                  <input
                    ref={inlineInputRef}
                    value={inlineTitle}
                    onChange={e => setInlineTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveInlineTitle();
                      if (e.key === 'Escape') {
                        setEvents(prev => prev.filter(ev2 => ev2.id !== inlineEditId));
                        setInlineEditId(null);
                      }
                    }}
                    onBlur={saveInlineTitle}
                    placeholder="Event name..."
                    className={`w-full bg-transparent ${EVT.text} text-xs font-semibold placeholder-[#666] focus:outline-none`}
                  />
                ) : (
                  <>
                    <div className={`text-xs font-semibold ${EVT.text} truncate pr-4`}>
                      {ev.title || 'Untitled'}
                    </div>
                    {pos.height > 36 && (
                      <div className={`text-[10px] ${EVT.sub} mt-0.5`}>
                        {formatTime12(ev.startTime)} - {formatTime12(ev.endTime)}
                      </div>
                    )}
                    {pos.height > 56 && ev.description && (
                      <div className="text-[10px] text-[#666] mt-0.5 truncate">{ev.description}</div>
                    )}
                  </>
                )}
              </div>

              {/* Resize handle: bottom — invisible, just changes cursor */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1.5 cursor-n-resize z-30"
                onMouseDown={(e) => { e.stopPropagation(); handleEventDragStart(e, ev, 'resize-bottom'); }}
              />
            </div>
          );
        })}

        {/* Current time indicator */}
        {date === today && (() => {
          const now = new Date();
          const minutesSince6 = (now.getHours() - 6) * 60 + now.getMinutes();
          if (minutesSince6 < 0 || minutesSince6 > HOURS.length * 60) return null;
          const top = (minutesSince6 / 60) * HOUR_HEIGHT;
          return (
            <div className={`absolute ${isPanel ? 'left-12' : 'left-0'} right-0 flex items-center z-20 pointer-events-none`} style={{ top }}>
              <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
              <div className="flex-1 h-[1.5px] bg-rose-500" />
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-[#ECECEC]">{monthName}</h1>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-[#666] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-none"><ChevronLeft size={16} /></button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-[#666] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-none"><ChevronRight size={16} /></button>
          </div>
          <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-[#9B9B9B] hover:text-[#ECECEC] bg-[#2a2a2a] hover:bg-[#333] rounded-lg transition-none">Today</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1c1c1c] rounded-lg p-0.5 border border-[#2a2a2a]">
            {(['month', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-none ${view === v ? 'bg-[#2a2a2a] text-[#ECECEC]' : 'text-[#555] hover:text-[#888]'}`}>
                {v === 'month' ? 'Month' : 'Week'}
              </button>
            ))}
          </div>
          <button onClick={() => openNewEvent()} className="flex items-center gap-2 px-3 py-1.5 bg-white text-[#212121] hover:bg-[#e5e5e5] rounded-lg text-xs font-medium transition-none">
            <Plus size={14} /> New Event
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Calendar Grid */}
        <div className="flex-1 flex flex-col min-h-0">
          {view === 'month' ? (
            <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
                {DAYS.map(d => (
                  <div key={d} className="px-2 py-2.5 text-center text-[10px] uppercase tracking-wider text-[#555] font-medium">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {calendarDays.map((cd, i) => {
                  const dayEvents = eventsForDate(cd.date);
                  const isToday = cd.date === today;
                  const isSelected = cd.date === selectedDate;
                  return (
                    <button key={i} onClick={() => setSelectedDate(cd.date)}
                      className={`relative border-b border-r border-[#2a2a2a] p-1.5 text-left transition-none hover:bg-[rgba(255,255,255,0.03)] flex flex-col ${!cd.isCurrentMonth ? 'opacity-30' : ''} ${isSelected ? 'bg-[rgba(255,255,255,0.05)]' : ''}`}>
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-white text-[#212121]' : 'text-[#9B9B9B]'}`}>{cd.day}</span>
                      <div className="mt-0.5 space-y-0.5 overflow-hidden flex-1">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div key={ev.id} className="text-[9px] leading-tight truncate px-1 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#ECECEC] font-medium">
                            {ev.title || 'Untitled'}
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[9px] text-[#555] px-1">+{dayEvents.length - 3} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#2a2a2a]">
                <div />
                {weekDays.map(wd => {
                  const isToday2 = wd.date === today;
                  const isSel = wd.date === selectedDate;
                  return (
                    <button key={wd.date} onClick={() => setSelectedDate(wd.date)} className={`py-2.5 text-center transition-none ${isSel ? 'bg-[rgba(255,255,255,0.05)]' : ''}`}>
                      <div className="text-[10px] uppercase tracking-wider text-[#555] font-medium">{wd.dayName}</div>
                      <div className={`text-sm font-semibold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${isToday2 ? 'bg-white text-[#212121]' : 'text-[#ECECEC]'}`}>{wd.day}</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
                  {HOURS.map(h => (
                    <div key={h} className="col-start-1 border-b border-[#2a2a2a] flex items-start justify-end pr-2 pt-1" style={{ gridRow: `${h - 5}`, height: HOUR_HEIGHT }}>
                      <span className="text-[10px] text-[#555] font-medium">{h > 12 ? h - 12 : h}{h >= 12 ? 'PM' : 'AM'}</span>
                    </div>
                  ))}
                  {weekDays.map((wd, di) => (
                    <div key={wd.date} className="relative border-l border-[#2a2a2a]" style={{ gridColumn: di + 2, gridRow: '1 / -1' }}>
                      {renderTimeline(wd.date, false)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Daily Schedule Panel */}
        <div className="w-80 flex-shrink-0 flex flex-col min-h-0">
          <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#ECECEC]">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h2>
                <p className="text-[10px] text-[#555] mt-0.5">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} · drag to create</p>
              </div>
              <button onClick={() => openNewEvent(selectedDate)} className="p-1.5 rounded-lg text-[#666] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-none" title="Add event">
                <Plus size={16} />
              </button>
            </div>
            <div ref={scheduleRef} className="flex-1 overflow-y-auto custom-scrollbar relative" style={{ minHeight: 0 }}>
              {renderTimeline(selectedDate, true)}
            </div>
          </div>
          {selectedDayEvents.length === 0 && !dragMode && (
            <div className="mt-3 bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-6 flex flex-col items-center justify-center text-center">
              <Clock size={24} className="text-[#444] mb-2" />
              <p className="text-xs text-[#555]">No events scheduled</p>
              <p className="text-[10px] text-[#444] mt-1">Click and drag on the timeline</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Event Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setModalOpen(false)}>
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#ECECEC]">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-[#666] hover:text-[#ECECEC] transition-none"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Event name</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Client call, Team standup..."
                  className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#555]" autoFocus />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Date</label>
                <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
                  className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] [color-scheme:dark]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Start</label>
                  <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)}
                    className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">End</label>
                  <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)}
                    className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] [color-scheme:dark]" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Notes (optional)</label>
                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Add details..." rows={3}
                  className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#555] resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-[#2a2a2a]">
              <div>
                {editingEvent && (
                  <button onClick={() => deleteEvent(editingEvent.id)} className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-none">
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] rounded-lg text-sm font-medium transition-none">Cancel</button>
                <button onClick={saveEvent} disabled={!formTitle.trim()}
                  className="px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none disabled:opacity-40 disabled:cursor-not-allowed">
                  {editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarManager;
