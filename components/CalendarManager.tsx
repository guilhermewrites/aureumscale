import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Trash2,
  Edit3,
  GripVertical,
} from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';

// ── Types ──
interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: string;
  description?: string;
}

const EVENT_COLORS = [
  { value: 'emerald', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  { value: 'blue', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  { value: 'purple', bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400', dot: 'bg-purple-400' },
  { value: 'amber', bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
  { value: 'rose', bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-400' },
  { value: 'cyan', bg: 'bg-cyan-500/15', border: 'border-cyan-500/30', text: 'text-cyan-400', dot: 'bg-cyan-400' },
];

const getColorClasses = (color: string) => EVENT_COLORS.find(c => c.value === color) || EVENT_COLORS[0];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

const formatTime12 = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isSameDay = (a: string, b: string) => a === b;

interface CalendarManagerProps {
  storagePrefix: string;
}

const CalendarManager: React.FC<CalendarManagerProps> = ({ storagePrefix }) => {
  const [events, setEvents] = useLocalStorage<CalendarEvent[]>(`${storagePrefix}_calendar_events`, []);
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
  const [formColor, setFormColor] = useState('emerald');
  const [formDesc, setFormDesc] = useState('');

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scheduleRef.current) {
      scheduleRef.current.scrollTop = 2 * 64; // 2 rows down (6,7 -> 8AM visible)
    }
  }, [selectedDate]);

  // ── Month calendar logic ──
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    let startDow = firstDay.getDay() - 1; // Mon=0
    if (startDow < 0) startDow = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month fill
    for (let i = startDow - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: true });
    }

    // Next month fill
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      days.push({ date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d, isCurrentMonth: false });
    }

    return days;
  }, [year, month]);

  // ── Week logic ──
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

  const eventsForDate = (date: string) => events.filter(e => isSameDay(e.date, date)).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const today = getToday();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(getToday());
  };

  // ── Event CRUD ──
  const openNewEvent = (date?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDate(date || selectedDate);
    setFormStart('09:00');
    setFormEnd('10:00');
    setFormColor('emerald');
    setFormDesc('');
    setModalOpen(true);
  };

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormDate(ev.date);
    setFormStart(ev.startTime);
    setFormEnd(ev.endTime);
    setFormColor(ev.color);
    setFormDesc(ev.description || '');
    setModalOpen(true);
  };

  const saveEvent = () => {
    if (!formTitle.trim()) return;
    if (editingEvent) {
      setEvents(prev => prev.map(e => e.id === editingEvent.id ? {
        ...e, title: formTitle.trim(), date: formDate, startTime: formStart, endTime: formEnd, color: formColor, description: formDesc.trim()
      } : e));
    } else {
      const newEv: CalendarEvent = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: formTitle.trim(),
        date: formDate,
        startTime: formStart,
        endTime: formEnd,
        color: formColor,
        description: formDesc.trim() || undefined,
      };
      setEvents(prev => [...prev, newEv]);
    }
    setModalOpen(false);
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    setModalOpen(false);
  };

  // ── Daily schedule events positioned by time ──
  const getEventPosition = (ev: CalendarEvent) => {
    const [sh, sm] = ev.startTime.split(':').map(Number);
    const [eh, em] = ev.endTime.split(':').map(Number);
    const startMin = (sh - 6) * 60 + sm;
    const endMin = (eh - 6) * 60 + em;
    const top = (startMin / 60) * 64;
    const height = Math.max(((endMin - startMin) / 60) * 64, 24);
    return { top, height };
  };

  const selectedDayEvents = eventsForDate(selectedDate);

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-[#ECECEC]">{monthName}</h1>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-[#666] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-none">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-[#666] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-none">
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-[#9B9B9B] hover:text-[#ECECEC] bg-[#2a2a2a] hover:bg-[#333] rounded-lg transition-none">
            Today
          </button>
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
            <Plus size={14} />
            New Event
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* ── Left: Calendar Grid ── */}
        <div className="flex-1 flex flex-col min-h-0">
          {view === 'month' ? (
            <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] flex-1 flex flex-col overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-[#2a2a2a]">
                {DAYS.map(d => (
                  <div key={d} className="px-2 py-2.5 text-center text-[10px] uppercase tracking-wider text-[#555] font-medium">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {calendarDays.map((cd, i) => {
                  const dayEvents = eventsForDate(cd.date);
                  const isToday = cd.date === today;
                  const isSelected = cd.date === selectedDate;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(cd.date)}
                      className={`relative border-b border-r border-[#2a2a2a] p-1.5 text-left transition-none hover:bg-[rgba(255,255,255,0.03)] flex flex-col ${
                        !cd.isCurrentMonth ? 'opacity-30' : ''
                      } ${isSelected ? 'bg-[rgba(255,255,255,0.05)]' : ''}`}
                    >
                      <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-white text-[#212121]' : 'text-[#9B9B9B]'
                      }`}>
                        {cd.day}
                      </span>
                      <div className="mt-0.5 space-y-0.5 overflow-hidden flex-1">
                        {dayEvents.slice(0, 3).map(ev => {
                          const cc = getColorClasses(ev.color);
                          return (
                            <div key={ev.id} className={`text-[9px] leading-tight truncate px-1 py-0.5 rounded ${cc.bg} ${cc.text} font-medium`}>
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] text-[#555] px-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Week View ── */
            <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] flex-1 flex flex-col overflow-hidden">
              {/* Week day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#2a2a2a]">
                <div />
                {weekDays.map(wd => {
                  const isToday2 = wd.date === today;
                  const isSel = wd.date === selectedDate;
                  return (
                    <button
                      key={wd.date}
                      onClick={() => setSelectedDate(wd.date)}
                      className={`py-2.5 text-center transition-none ${isSel ? 'bg-[rgba(255,255,255,0.05)]' : ''}`}
                    >
                      <div className="text-[10px] uppercase tracking-wider text-[#555] font-medium">{wd.dayName}</div>
                      <div className={`text-sm font-semibold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full ${
                        isToday2 ? 'bg-white text-[#212121]' : 'text-[#ECECEC]'
                      }`}>
                        {wd.day}
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Time grid */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: HOURS.length * 64 }}>
                  {/* Hour labels */}
                  {HOURS.map(h => (
                    <div key={h} className="col-start-1 border-b border-[#2a2a2a] flex items-start justify-end pr-2 pt-1" style={{ gridRow: `${h - 5}`, height: 64 }}>
                      <span className="text-[10px] text-[#555] font-medium">{h > 12 ? h - 12 : h}{h >= 12 ? 'PM' : 'AM'}</span>
                    </div>
                  ))}
                  {/* Day columns */}
                  {weekDays.map((wd, di) => (
                    <div key={wd.date} className="relative border-l border-[#2a2a2a]" style={{ gridColumn: di + 2, gridRow: '1 / -1' }}>
                      {HOURS.map(h => (
                        <div key={h} className="border-b border-[#2a2a2a]" style={{ height: 64 }} />
                      ))}
                      {/* Events */}
                      {eventsForDate(wd.date).map(ev => {
                        const pos = getEventPosition(ev);
                        const cc = getColorClasses(ev.color);
                        return (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                            className={`absolute left-1 right-1 rounded-lg px-2 py-1 ${cc.bg} border ${cc.border} ${cc.text} text-left overflow-hidden transition-none hover:brightness-110`}
                            style={{ top: pos.top, height: pos.height }}
                          >
                            <div className="text-[10px] font-semibold truncate">{ev.title}</div>
                            {pos.height > 32 && <div className="text-[9px] opacity-70">{formatTime12(ev.startTime)}</div>}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Daily Schedule ── */}
        <div className="w-80 flex-shrink-0 flex flex-col min-h-0">
          <div className="bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] flex-1 flex flex-col overflow-hidden">
            {/* Day header */}
            <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#ECECEC]">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h2>
                <p className="text-[10px] text-[#555] mt-0.5">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => openNewEvent(selectedDate)}
                className="p-1.5 rounded-lg text-[#666] hover:text-[#ECECEC] hover:bg-[rgba(255,255,255,0.05)] transition-none"
                title="Add event"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Timeline */}
            <div ref={scheduleRef} className="flex-1 overflow-y-auto custom-scrollbar relative" style={{ minHeight: 0 }}>
              <div className="relative" style={{ height: HOURS.length * 64 }}>
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} className="absolute w-full flex items-start" style={{ top: (h - 6) * 64, height: 64 }}>
                    <span className="text-[10px] text-[#444] font-medium w-12 text-right pr-2 pt-0.5 flex-shrink-0">
                      {h > 12 ? h - 12 : h}{h >= 12 ? 'p' : 'a'}
                    </span>
                    <div className="flex-1 border-t border-[#2a2a2a] h-full" />
                  </div>
                ))}

                {/* Events positioned on timeline */}
                {selectedDayEvents.map(ev => {
                  const pos = getEventPosition(ev);
                  const cc = getColorClasses(ev.color);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => openEditEvent(ev)}
                      className={`absolute left-14 right-3 rounded-lg px-3 py-2 ${cc.bg} border ${cc.border} text-left transition-none hover:brightness-110 z-10`}
                      style={{ top: pos.top, height: pos.height }}
                    >
                      <div className={`text-xs font-semibold ${cc.text} truncate`}>{ev.title}</div>
                      {pos.height > 36 && (
                        <div className="text-[10px] text-[#9B9B9B] mt-0.5">
                          {formatTime12(ev.startTime)} - {formatTime12(ev.endTime)}
                        </div>
                      )}
                      {pos.height > 56 && ev.description && (
                        <div className="text-[10px] text-[#666] mt-0.5 truncate">{ev.description}</div>
                      )}
                    </button>
                  );
                })}

                {/* Current time indicator */}
                {selectedDate === today && (() => {
                  const now = new Date();
                  const minutesSince6 = (now.getHours() - 6) * 60 + now.getMinutes();
                  if (minutesSince6 < 0 || minutesSince6 > HOURS.length * 60) return null;
                  const top = (minutesSince6 / 60) * 64;
                  return (
                    <div className="absolute left-12 right-0 flex items-center z-20 pointer-events-none" style={{ top }}>
                      <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-rose-500" />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Upcoming events list */}
          {selectedDayEvents.length === 0 && (
            <div className="mt-3 bg-[#1c1c1c] rounded-2xl border border-[#2a2a2a] p-6 flex flex-col items-center justify-center text-center">
              <Clock size={24} className="text-[#444] mb-2" />
              <p className="text-xs text-[#555]">No events scheduled</p>
              <button
                onClick={() => openNewEvent(selectedDate)}
                className="mt-3 text-xs font-medium text-[#ECECEC] hover:text-white transition-none"
              >
                + Add an event
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Event Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setModalOpen(false)}>
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#ECECEC]">
                {editingEvent ? 'Edit Event' : 'New Event'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-[#666] hover:text-[#ECECEC] transition-none">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Event name</label>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Client call, Team standup..."
                  className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#555]"
                  autoFocus
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] [color-scheme:dark]"
                />
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Start</label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={e => setFormStart(e.target.value)}
                    className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">End</label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={e => setFormEnd(e.target.value)}
                    className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] focus:outline-none focus:ring-1 focus:ring-[#555] [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Color</label>
                <div className="flex gap-2 mt-2">
                  {EVENT_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setFormColor(c.value)}
                      className={`w-7 h-7 rounded-full ${c.dot} transition-none ${formColor === c.value ? 'ring-2 ring-offset-2 ring-offset-[#1e1e1e] ring-white/50' : 'opacity-50 hover:opacity-80'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#555] font-medium">Notes (optional)</label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Add details..."
                  rows={3}
                  className="w-full mt-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2.5 text-sm text-[#ECECEC] placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#555] resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-[#2a2a2a]">
              <div>
                {editingEvent && (
                  <button
                    onClick={() => deleteEvent(editingEvent.id)}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-none"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-[#ECECEC] rounded-lg text-sm font-medium transition-none">
                  Cancel
                </button>
                <button
                  onClick={saveEvent}
                  disabled={!formTitle.trim()}
                  className="px-4 py-2 bg-white hover:bg-[#e5e5e5] text-[#212121] rounded-lg text-sm font-medium transition-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
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
