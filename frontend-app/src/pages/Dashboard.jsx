import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Plus, Lock, Columns2, LayoutList,
  RefreshCw, Calendar, Copy, Check, ExternalLink, X,
  Clock, DollarSign, CalendarDays, CheckCircle2,
  Edit2, Trash2, UserX, Banknote, CreditCard, Wallet, Smartphone, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Appointments, Barbershops, Services, Financial, Clients as ClientsAPI } from '../utils/api';
import { cn } from '../utils/cn';
import { toast } from '../components/ui/Toast';

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_START = 0;   // midnight
const HOUR_END   = 24;  // end of day
const TOTAL_HOURS = HOUR_END - HOUR_START;
const SLOT_HEIGHT = 60; // px per hour
const TOTAL_HEIGHT = TOTAL_HOURS * SLOT_HEIGHT;

// Generates a unique color per barber index using evenly-spaced hues (HSL).
// Uses golden-angle stepping (137.5°) so adjacent indices are always visually distinct.
function barberColor(idx) {
  const hue = (idx * 137.5) % 360;
  return {
    hex:        `hsl(${hue}, 65%, 50%)`,
    hexDark:    `hsl(${hue}, 55%, 65%)`,
    hexBorder:  `hsl(${hue}, 65%, 40%)`,
    hexLight:   `hsl(${hue}, 65%, 96%)`,
    hexLightDk: `hsl(${hue}, 40%, 20%)`,
  };
}

const STATUS_OPACITY = {
  agendado:   'opacity-100',
  'concluído':'opacity-80',
  concluido:  'opacity-80',
  cancelado:  'opacity-40 line-through',
  ausente:    'opacity-40',
  bloqueado:  'opacity-30',
};

const STATUS_BADGE = {
  agendado:   { label: 'Agendado',  cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  'concluído':{ label: 'Concluído', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  concluido:  { label: 'Concluído', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  cancelado:  { label: 'Cancelado', cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  ausente:    { label: 'Ausente',   cls: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  bloqueado:  { label: 'Bloqueado', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d) {
  const x = new Date(d); const dow = x.getDay();
  x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1)); x.setHours(0,0,0,0); return x;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function getMonthGrid(cursor) {
  const cells = []; let d = startOfWeek(startOfMonth(cursor));
  for (let i = 0; i < 42; i++) { cells.push(new Date(d)); d = addDays(d, 1); } return cells;
}
function fmtTime(dateStr) {
  if (!dateStr) return ''; return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function minuteToY(totalMinutes) {
  // totalMinutes from midnight
  return ((totalMinutes - HOUR_START * 60) / 60) * SLOT_HEIGHT;
}
function apptTop(appt) {
  const d = new Date(appt.date);
  return minuteToY(d.getHours() * 60 + d.getMinutes());
}
function apptHeight(appt) {
  let dur;
  if (appt.endDate) {
    dur = (new Date(appt.endDate) - new Date(appt.date)) / 60000;
  } else {
    dur = appt.service?.duration || 30;
  }
  return Math.max(22, (dur / 60) * SLOT_HEIGHT);
}

const MONTHS_PT   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTHS_SHORT= ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DAYS_SHORT  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ── Mini Calendar (sidebar) ───────────────────────────────────────────────────
function MiniCalendar({ cursor, selected, onSelect, onMonthChange, dotDates }) {
  const grid = getMonthGrid(cursor); const today = new Date();
  return (
    <div className="select-none px-1">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onMonthChange(-1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ChevronLeft size={14} />
        </button>
        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
          {MONTHS_PT[cursor.getMonth()].slice(0,3)} {cursor.getFullYear()}
        </span>
        <button onClick={() => onMonthChange(1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['S','T','Q','Q','S','S','D'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold text-gray-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {grid.map((d, i) => {
          const cur = d.getMonth() === cursor.getMonth();
          const isT = isSameDay(d, today); const isSel = selected && isSameDay(d, selected);
          const hasDot = dotDates?.some(x => isSameDay(new Date(x), d));
          return (
            <button key={i} onClick={() => onSelect(d)}
              className={cn('relative w-6 h-6 mx-auto flex items-center justify-center rounded-full text-[10px] font-medium transition-colors',
                !cur && 'text-gray-300 dark:text-gray-700',
                cur && !isT && !isSel && 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                isT && !isSel && 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold',
                isSel && 'bg-blue-600 text-white font-bold',
              )}>
              {d.getDate()}
              {hasDot && !isSel && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Overlap layout ─────────────────────────────────────────────────────────────
// Returns [{ appt, left (0–1), width (0–1) }] for a list of appts in one column.
function layoutAppts(appts) {
  if (!appts.length) return [];
  const items = appts.map(a => ({
    appt:  a,
    start: new Date(a.date).getTime(),
    end:   a.endDate ? new Date(a.endDate).getTime() : new Date(a.date).getTime() + (a.service?.duration || 30) * 60000,
    col:   0,
    numCols: 1,
  }));
  // Assign a column slot to each item greedily
  const colEnds = [];
  for (const item of items) {
    let placed = false;
    for (let c = 0; c < colEnds.length; c++) {
      if (colEnds[c] <= item.start) { item.col = c; colEnds[c] = item.end; placed = true; break; }
    }
    if (!placed) { item.col = colEnds.length; colEnds.push(item.end); }
  }
  // For each item, numCols = max col index among overlapping items + 1
  for (const item of items) {
    const maxCol = items
      .filter(o => o.start < item.end && o.end > item.start)
      .reduce((m, o) => Math.max(m, o.col), 0);
    item.numCols = maxCol + 1;
  }
  return items.map(({ appt, col, numCols }) => ({
    appt,
    left:  col / numCols,
    width: 1 / numCols,
  }));
}

// ── Appointment Block ─────────────────────────────────────────────────────────
function yToTime(y) {
  const totalMinutes = HOUR_START * 60 + (y / SLOT_HEIGHT) * 60;
  const rounded = Math.round(totalMinutes / 30) * 30;
  const h = Math.min(23, Math.max(0, Math.floor(rounded / 60)));
  const m = rounded % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function ApptBlock({ appt, colorIdx, onClick, left = 0, width = 1, showStatus = false }) {
  const color = barberColor(colorIdx);
  const top    = apptTop(appt);
  const height = apptHeight(appt);
  const isBlocked   = appt.status === 'bloqueado' || appt.type === 'block';
  const isCancelled = appt.status === 'cancelado' || appt.status === 'ausente';
  const wrap = height >= 50; // allow text wrap for longer slots

  const blockStyle = isBlocked || isCancelled
    ? {}
    : { backgroundColor: color.hex, borderColor: color.hexBorder };

  return (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn(
        'absolute rounded-lg px-2 py-1 text-left overflow-hidden shadow-sm',
        'hover:brightness-95 hover:shadow-md active:scale-95 transition-all duration-100 z-10',
        isBlocked   ? 'bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 border-dashed'
        : isCancelled ? 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        : 'border',
      )}
      style={{
        top:      `${top}px`,
        height:   `${height}px`,
        minHeight:'22px',
        left:     `calc(${left * 100}% + 2px)`,
        width:    `calc(${width * 100}% - 4px)`,
        ...blockStyle,
      }}
    >
      {/* Status badge — top right */}
      {showStatus && !isBlocked && appt.status && appt.status !== 'agendado' && (
        <span className={cn(
          'absolute top-1 right-1 text-[8px] font-bold px-1 py-px rounded-full leading-tight',
          STATUS_BADGE[appt.status]?.cls || 'bg-gray-100 text-gray-600',
        )}>
          {STATUS_BADGE[appt.status]?.label || appt.status}
        </span>
      )}
      {isBlocked ? (
        <p className={cn('text-[10px] font-medium leading-tight', wrap ? 'break-words' : 'truncate', 'text-gray-500 dark:text-gray-400')}>
          <span className="font-bold">{fmtTime(appt.date)}{appt.endDate ? ` — ${fmtTime(appt.endDate)}` : ''}</span>
          <span className="opacity-70"> · 🔒 Bloqueado</span>
          {appt.clientName && <span className="opacity-60"> · {appt.clientName}</span>}
        </p>
      ) : (
        <p className={cn(
          'text-[11px] font-medium leading-tight',
          wrap ? 'break-words' : 'truncate',
          isCancelled ? 'text-gray-400 line-through' : 'text-white',
        )}>
          <span className="font-bold">{fmtTime(appt.date)}</span>
          <span className="opacity-80"> · {appt.client?.name || appt.clientName || 'Cliente'}</span>
          {appt.service?.name && <span className="opacity-70"> · {appt.service.name}</span>}
          {appt.service?.price && <span className="opacity-60"> · R${appt.service.price.toFixed(0)}</span>}
        </p>
      )}
    </button>
  );
}

// ── Day View (Google Calendar style — one column per barber) ──────────────────
function DayView({ date, allAppointments, barbers, activeBarbers, splitByBarber, onApptClick, onSlotClick, nowRef }) {
  const today   = new Date();
  const isToday = isSameDay(date, today);
  const nowMin  = isToday ? today.getHours() * 60 + today.getMinutes() : null;
  const nowY    = nowMin ? minuteToY(nowMin) : null;
  const hours   = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

  const visibleBarbers = barbers.filter(b => activeBarbers.has(String(b._id)));
  const mergedAppts = allAppointments.filter(a =>
    isSameDay(new Date(a.date), date) &&
    (a.allBarbers || activeBarbers.has(String(a.barber?._id || a.barber)))
  );

  // Shared time grid renderer
  const TimeGrid = ({ cols }) => (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950" ref={nowRef}>
      <div className="relative flex" style={{ height: `${TOTAL_HEIGHT}px` }}>
        <div className="w-14 shrink-0 relative">
          {hours.map(h => (
            <div key={h} className="absolute right-2 text-[10px] text-gray-400 dark:text-gray-600 select-none"
              style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT - 7}px` }}>
              {h < 10 ? `0${h}` : h}:00
            </div>
          ))}
        </div>
        <div className="flex-1 relative">
          {hours.map(h => (
            <div key={h} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
              style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT}px` }} />
          ))}
          {hours.map(h => (
            <div key={`${h}h`} className="absolute left-0 right-0 border-t border-gray-50 dark:border-gray-800/50"
              style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT + SLOT_HEIGHT / 2}px` }} />
          ))}
          {nowY !== null && nowY >= 0 && nowY <= TOTAL_HEIGHT && (
            <div className="absolute left-0 right-0 z-30 pointer-events-none flex items-center" style={{ top: `${nowY}px` }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5 shadow-sm" />
              <div className="flex-1 border-t-2 border-red-500" />
            </div>
          )}
          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
            {cols}
          </div>
        </div>
      </div>
    </div>
  );

  const dateHeader = (
    <div className="border-r border-gray-200 dark:border-gray-800 flex flex-col items-center justify-end pb-2 pt-3">
      <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">{DAYS_SHORT[date.getDay()]}</span>
      <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xl font-light mt-0.5',
        isToday ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200')}>
        {date.getDate()}
      </div>
    </div>
  );

  if (!splitByBarber) {
    // ── Merged: single column
    return (
      <div className="flex flex-col h-full min-w-0">
        <div className="grid border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0"
          style={{ gridTemplateColumns: '56px 1fr' }}>
          {dateHeader}
          <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
            {visibleBarbers.map((b, i) => {
              const color = barberColor(barbers.findIndex(x => String(x._id) === String(b._id)));
              return (
                <span key={b._id} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: color.hex }}>
                  {b.name}
                </span>
              );
            })}
          </div>
        </div>
        <TimeGrid cols={[
          <div key="merged" className="relative h-full cursor-pointer"
            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onSlotClick(date, yToTime(e.clientY - rect.top), null); }}>
            {layoutAppts(mergedAppts).map(({ appt, left, width }) => {
              const idx = barbers.findIndex(b => String(b._id) === String(appt.barber?._id || appt.barber));
              return <ApptBlock key={appt._id} appt={appt} colorIdx={idx < 0 ? 0 : idx} left={left} width={width} showStatus onClick={() => onApptClick(appt)} />;
            })}
          </div>
        ]} />
      </div>
    );
  }

  // ── Split: one column per barber
  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="grid border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0"
        style={{ gridTemplateColumns: `56px repeat(${visibleBarbers.length}, 1fr)` }}>
        {dateHeader}
        {visibleBarbers.map((b) => {
          const globalIdx = barbers.findIndex(x => String(x._id) === String(b._id));
          const color     = barberColor(globalIdx);
          const cnt = allAppointments.filter(a =>
            String(a.barber?._id || a.barber) === String(b._id) &&
            isSameDay(new Date(a.date), date) &&
            a.status !== 'cancelado' && a.status !== 'ausente' && a.type !== 'block'
          ).length;
          return (
            <div key={b._id} className="border-r border-gray-200 dark:border-gray-800 last:border-r-0 px-2 py-2 flex flex-col items-center">
              {b.profileImage
                ? <img src={b.profileImage} alt={b.name} className="w-9 h-9 rounded-full object-cover mb-1 shadow-sm" style={{ outline: `2px solid ${color.hex}`, outlineOffset: '1px' }} />
                : <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white mb-1 shadow-sm"
                    style={{ backgroundColor: color.hex }}>
                    {b.name?.charAt(0)?.toUpperCase()}
                  </div>
              }
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-full text-center">{b.name}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{cnt} agend.</span>
            </div>
          );
        })}
      </div>
      <TimeGrid cols={visibleBarbers.map((b) => {
        const globalIdx = barbers.findIndex(x => String(x._id) === String(b._id));
        const dayAppts  = allAppointments.filter(a =>
          isSameDay(new Date(a.date), date) &&
          (a.allBarbers || String(a.barber?._id || a.barber) === String(b._id))
        );
        return (
          <div key={b._id} className="relative border-r border-gray-100 dark:border-gray-800 last:border-r-0 h-full cursor-pointer"
            onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onSlotClick(date, yToTime(e.clientY - rect.top), b._id); }}>
            {layoutAppts(dayAppts).map(({ appt, left, width }) => (
              <ApptBlock key={appt._id} appt={appt} colorIdx={globalIdx} left={left} width={width} showStatus onClick={() => onApptClick(appt)} />
            ))}
          </div>
        );
      })} />
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ cursor, appointments, activeBarbers, barbers, splitByBarber, onDayClick, onApptClick, onSlotClick, loading }) {
  const today    = new Date();
  const week     = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
  const hours    = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);
  const scrollRef = useRef(null);
  const visibleBarbers = barbers.filter(b => activeBarbers.has(String(b._id)));

  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const weekAppts = appointments.filter(a =>
        week.some(d => isSameDay(new Date(a.date), d)) &&
        (!activeBarbers || activeBarbers.has(String(a.barber?._id || a.barber)))
      );
      let anchorMin;
      if (weekAppts.length > 0) {
        const minutes = weekAppts.map(a => { const d = new Date(a.date); return d.getHours() * 60 + d.getMinutes(); });
        anchorMin = Math.min(...minutes);
      } else {
        anchorMin = today.getHours() * 60 + today.getMinutes();
      }
      scrollRef.current.scrollTop = Math.max(0, minuteToY(anchorMin) - 40);
    });
    return () => cancelAnimationFrame(raf);
  }, [cursor, splitByBarber, loading, appointments, activeBarbers]); // eslint-disable-line react-hooks/exhaustive-deps

  const N = splitByBarber ? (visibleBarbers.length || 1) : 1;

  if (splitByBarber) {
    // ── Split week: barber header row + day sub-columns per barber ─────────────
    // Layout: [gutter] [barber1×7 days] [barber2×7 days] ...
    // Row 1: barber name spanning 7 cols each
    // Row 2: Mon–Sun repeated per barber
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-950 overflow-hidden">
        {/* Barber header row */}
        <div className="grid border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0"
          style={{ gridTemplateColumns: `56px repeat(${7 * N}, 1fr)` }}>
          <div className="border-r border-gray-200 dark:border-gray-800" />
          {visibleBarbers.map((b, bi) => {
            const globalIdx = barbers.findIndex(x => String(x._id) === String(b._id));
            const color = barberColor(globalIdx);
            return (
              <div key={b._id} className="border-r border-gray-200 dark:border-gray-800 last:border-r-0 py-2 flex items-center justify-center gap-1.5"
                style={{ gridColumn: `span 7` }}>
                {b.profileImage
                  ? <img src={b.profileImage} alt={b.name} className="w-5 h-5 rounded-full object-cover shrink-0" style={{ outline: `2px solid ${color.hex}`, outlineOffset: '1px' }} />
                  : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: color.hex }}>
                      {b.name?.charAt(0)?.toUpperCase()}
                    </div>
                }
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{b.name}</span>
              </div>
            );
          })}
        </div>

        {/* Day names row (repeated per barber) */}
        <div className="grid border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0"
          style={{ gridTemplateColumns: `56px repeat(${7 * N}, 1fr)` }}>
          <div className="border-r border-gray-200 dark:border-gray-800" />
          {visibleBarbers.map((b, bi) =>
            week.map(d => {
              const isT = isSameDay(d, today);
              const bCnt = appointments.filter(a => isSameDay(new Date(a.date), d) && String(a.barber?._id || a.barber) === String(b._id) && a.type !== 'block').length;
              return (
                <button key={`${b._id}-${d.toISOString()}`} onClick={() => onDayClick(d)}
                  className={cn('border-r border-gray-200 dark:border-gray-800 last:border-r-0 py-1.5 flex flex-col items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                    bi === 0 && d === week[0] && 'border-l-2 border-l-gray-300 dark:border-l-gray-600')}>
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-semibold">{DAYS_SHORT[d.getDay()]}</span>
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                    isT ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200')}>
                    {d.getDate()}
                  </div>
                  {bCnt > 0 && <span className="text-[8px] text-blue-500 dark:text-blue-400 font-medium">{bCnt}</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="relative flex" style={{ height: `${TOTAL_HEIGHT}px` }}>
            <div className="w-14 shrink-0 relative">
              {hours.map(h => (
                <div key={h} className="absolute right-2 text-[10px] text-gray-400 dark:text-gray-600 select-none"
                  style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT - 7}px` }}>
                  {h < 10 ? `0${h}` : h}:00
                </div>
              ))}
            </div>
            <div className="flex-1 relative">
              {hours.map(h => (
                <div key={h} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                  style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT}px` }} />
              ))}
              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${7 * N}, 1fr)` }}>
                {visibleBarbers.map((b, bi) => {
                  const globalIdx = barbers.findIndex(x => String(x._id) === String(b._id));
                  return week.map(d => {
                    const isT = isSameDay(d, today);
                    const bAppts = appointments.filter(a =>
                      isSameDay(new Date(a.date), d) &&
                      (a.allBarbers || String(a.barber?._id || a.barber) === String(b._id))
                    );
                    return (
                      <div key={`${b._id}-${d.toISOString()}`}
                        className={cn('relative border-r border-gray-100 dark:border-gray-800 h-full cursor-pointer',
                          bi > 0 && d === week[0] && 'border-l border-l-gray-300/60 dark:border-l-gray-700',
                          isT && 'bg-blue-50/10 dark:bg-blue-900/5')}
                        onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onSlotClick(d, yToTime(e.clientY - rect.top), b._id); }}>
                        {layoutAppts(bAppts).map(({ appt, left, width }) => (
                          <ApptBlock key={appt._id} appt={appt} colorIdx={globalIdx} left={left} width={width} onClick={() => onApptClick(appt)} />
                        ))}
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Unified week (original layout) ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="border-r border-gray-200 dark:border-gray-800" />
        {week.map(d => {
          const isT = isSameDay(d, today);
          const cnt = appointments.filter(a => isSameDay(new Date(a.date), d) && a.type !== 'block' && activeBarbers.has(String(a.barber?._id || a.barber))).length;
          return (
            <button key={d.toISOString()} onClick={() => onDayClick(d)}
              className="border-r border-gray-200 dark:border-gray-800 last:border-r-0 py-2 flex flex-col items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-semibold">{DAYS_SHORT[d.getDay()]}</span>
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mt-0.5',
                isT ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700')}>
                {d.getDate()}
              </div>
              {cnt > 0 && <span className="text-[9px] text-blue-500 dark:text-blue-400 font-medium mt-0.5">{cnt}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="relative flex" style={{ height: `${TOTAL_HEIGHT}px` }}>
          <div className="w-14 shrink-0 relative">
            {hours.map(h => (
              <div key={h} className="absolute right-2 text-[10px] text-gray-400 dark:text-gray-600 select-none"
                style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT - 7}px` }}>
                {h < 10 ? `0${h}` : h}:00
              </div>
            ))}
          </div>
          <div className="flex-1 relative">
            {hours.map(h => (
              <div key={h} className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                style={{ top: `${(h - HOUR_START) * SLOT_HEIGHT}px` }} />
            ))}
            <div className="absolute inset-0 grid grid-cols-7">
              {week.map(d => {
                const isT = isSameDay(d, today);
                const dayAppts = appointments.filter(a =>
                  isSameDay(new Date(a.date), d) &&
                  (a.allBarbers || activeBarbers.has(String(a.barber?._id || a.barber)))
                );
                return (
                  <div key={d.toISOString()}
                    className={cn('relative border-r border-gray-100 dark:border-gray-800 last:border-r-0 h-full cursor-pointer', isT && 'bg-blue-50/20 dark:bg-blue-900/5')}
                    onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onSlotClick(d, yToTime(e.clientY - rect.top), null); }}>
                    {layoutAppts(dayAppts).map(({ appt, left, width }) => {
                      const idx = barbers.findIndex(b => String(b._id) === String(appt.barber?._id || appt.barber));
                      return <ApptBlock key={appt._id} appt={appt} colorIdx={idx < 0 ? 0 : idx} left={left} width={width} onClick={() => onApptClick(appt)} />;
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ cursor, appointments, activeBarbers, barbers, splitByBarber, onDayClick, onApptClick }) {
  const today = new Date();
  const grid  = getMonthGrid(cursor);
  const visibleBarbers = barbers.filter(b => activeBarbers.has(String(b._id)));

  // ── Unified (merged) layout ─────────────────────────────────────────────────
  if (!splitByBarber || visibleBarbers.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-950">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 shrink-0">
          {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase">{d}</div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-7 auto-rows-fr">
          {grid.map((d, i) => {
            const cur      = d.getMonth() === cursor.getMonth();
            const isT      = isSameDay(d, today);
            const filtered = appointments.filter(a =>
              isSameDay(new Date(a.date), d) &&
              (a.allBarbers || activeBarbers.has(String(a.barber?._id || a.barber)))
            );
            const appts = filtered.slice(0, 4);
            const more  = filtered.length - 4;
            return (
              <div key={i} onClick={() => onDayClick(d)}
                className={cn('p-1 border-r border-b border-gray-100 dark:border-gray-800 min-h-[80px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors',
                  !cur && 'bg-gray-50/70 dark:bg-gray-900/70')}>
                <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-0.5',
                  isT ? 'bg-blue-600 text-white' : !cur ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300')}>
                  {d.getDate()}
                </div>
                {appts.map(a => {
                  const bIdx = barbers.findIndex(b => String(b._id) === String(a.barber?._id || a.barber));
                  const color = barberColor(bIdx < 0 ? 0 : bIdx);
                  return (
                    <button key={a._id} onClick={e => { e.stopPropagation(); onApptClick(a); }}
                      className="w-full text-left text-[9px] font-medium text-white px-1 py-0.5 rounded mb-0.5 truncate"
                      style={{ backgroundColor: color.hex }}>
                      {fmtTime(a.date)} {a.client?.name || a.clientName || 'Cliente'}
                    </button>
                  );
                })}
                {more > 0 && <p className="text-[9px] text-gray-400 pl-1">+{more}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Split layout: one group of 7 columns per barber ─────────────────────────
  const N = visibleBarbers.length;
  const totalCols = 7 * N;
  const DAY_NAMES = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 overflow-hidden">
      {/* Row 1: barber names, each spanning 7 cols */}
      <div className="grid border-b border-gray-200 dark:border-gray-800 shrink-0"
        style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
        {visibleBarbers.map((b, bi) => {
          const globalIdx = barbers.findIndex(x => String(x._id) === String(b._id));
          const color = barberColor(globalIdx < 0 ? bi : globalIdx);
          return (
            <div key={b._id} className="flex items-center justify-center gap-1.5 py-2 border-r border-gray-200 dark:border-gray-800 last:border-r-0"
              style={{ gridColumn: `span 7` }}>
              {b.profileImage
                ? <img src={b.profileImage} alt={b.name} className="w-5 h-5 rounded-full object-cover shrink-0" style={{ outline: `2px solid ${color.hex}`, outlineOffset: '1px' }} />
                : <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: color.hex }}>
                    {b.name.charAt(0).toUpperCase()}
                  </div>}
              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 truncate">{b.name.split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Row 2: day names repeated per barber */}
      <div className="grid border-b border-gray-200 dark:border-gray-800 shrink-0"
        style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
        {visibleBarbers.map((b, bi) =>
          DAY_NAMES.map(d => (
            <div key={`${b._id}-${d}`} className={cn('py-1.5 text-center text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase',
              bi < N - 1 && d === 'Dom' ? 'border-r-2 border-gray-300 dark:border-gray-700' : 'border-r border-gray-100 dark:border-gray-800 last:border-r-0')}>
              {d}
            </div>
          ))
        )}
      </div>

      {/* Calendar grid: 6 rows × (7×N) cols */}
      <div className="flex-1 overflow-y-auto grid auto-rows-fr"
        style={{ gridTemplateColumns: `repeat(${totalCols}, minmax(0, 1fr))` }}>
        {Array.from({ length: 6 }, (_, row) =>
          visibleBarbers.map((b, bi) => {
            const globalIdx = barbers.findIndex(x => String(x._id) === String(b._id));
            const color = barberColor(globalIdx < 0 ? bi : globalIdx);
            return DAY_NAMES.map((_, di) => {
              const d   = grid[row * 7 + di];
              const cur = d.getMonth() === cursor.getMonth();
              const isT = isSameDay(d, today);
              const filtered = appointments.filter(a =>
                isSameDay(new Date(a.date), d) &&
                String(a.barber?._id || a.barber) === String(b._id)
              );
              const appts = filtered.slice(0, 3);
              const more  = filtered.length - 3;
              const isLastBarberCol = bi < N - 1 && di === 6;
              return (
                <div key={`${b._id}-${row}-${di}`} onClick={() => onDayClick(d)}
                  className={cn('p-1 border-b border-gray-100 dark:border-gray-800 min-h-[70px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors',
                    isLastBarberCol ? 'border-r-2 border-gray-300 dark:border-gray-700' : 'border-r border-gray-100 dark:border-gray-800',
                    !cur && 'bg-gray-50/70 dark:bg-gray-900/70')}>
                  <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium mb-0.5',
                    isT ? 'bg-blue-600 text-white' : !cur ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300')}>
                    {d.getDate()}
                  </div>
                  {appts.map(a => (
                    <button key={a._id} onClick={e => { e.stopPropagation(); onApptClick(a); }}
                      className="w-full text-left text-[8px] font-medium text-white px-1 py-0.5 rounded mb-0.5 truncate"
                      style={{ backgroundColor: color.hex }}>
                      {fmtTime(a.date)} {a.client?.name || a.clientName || ''}
                    </button>
                  ))}
                  {more > 0 && <p className="text-[8px] text-gray-400 pl-1">+{more}</p>}
                </div>
              );
            });
          })
        )}
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListApptRow({ appt, barbers, hideName = false }) {
  const isBlock = appt.type === 'block';
  const bIdx    = barbers.findIndex(b => String(b._id) === String(appt.barber?._id || appt.barber));
  const color   = barberColor(bIdx < 0 ? 0 : bIdx);
  const badge   = STATUS_BADGE[appt.status] || { label: appt.status, cls: 'bg-gray-100 text-gray-600' };
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left',
      isBlock
        ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 border-dashed'
        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800',
    )}>
      <div className="w-1 self-stretch rounded-full shrink-0"
        style={{ backgroundColor: isBlock ? '#9ca3af' : color.hex }} />
      <div className="w-10 shrink-0 text-center">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmtTime(appt.date)}</p>
        {appt.endDate && <p className="text-[9px] text-gray-400 dark:text-gray-500">{fmtTime(appt.endDate)}</p>}
      </div>
      <div className="flex-1 min-w-0">
        {isBlock ? (
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">🔒 {appt.clientName || 'Bloqueado'}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {appt.client?.name || appt.clientName || 'Cliente'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {appt.service?.name || ''}
              {appt.service?.price ? ` · R$${appt.service.price.toFixed(0)}` : ''}
              {!hideName && appt.barber?.name ? ` · ${appt.barber.name}` : ''}
            </p>
          </>
        )}
      </div>
      {!isBlock && (
        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', badge.cls)}>
          {badge.label}
        </span>
      )}
    </div>
  );
}

function ListDaySection({ day, appts, view, onApptClick, children }) {
  const today   = new Date();
  const isToday = isSameDay(day, today);
  const isPast  = day < today && !isToday;
  if (view === 'month' && appts.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-3 mb-2 sticky top-0 z-10 py-1 bg-white dark:bg-gray-950">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
          isToday  ? 'bg-blue-600 text-white'
          : isPast ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                   : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
        )}>
          {day.getDate()}
        </div>
        <div>
          <p className={cn('text-sm font-semibold capitalize', isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200')}>
            {day.toLocaleDateString('pt-BR', { weekday: 'long' })}
            {isToday && <span className="ml-2 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase">Hoje</span>}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {day.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
          {appts.length > 0 ? `${appts.length} agend.` : ''}
        </span>
      </div>
      {appts.length === 0 ? (
        <div className="ml-12 py-3 text-sm text-gray-300 dark:text-gray-600 italic">Nenhum agendamento</div>
      ) : (
        <div className="ml-12 space-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

function ListView({ view, cursor, selected, appointments, activeBarbers, barbers, splitByBarber, onApptClick }) {
  const visibleBarbers = barbers.filter(b => activeBarbers.has(String(b._id)));

  let days;
  if (view === 'day') {
    days = [selected];
  } else if (view === 'week') {
    days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
  } else {
    const first = startOfMonth(cursor);
    const last  = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    days = Array.from({ length: last.getDate() }, (_, i) => addDays(first, i));
  }

  const baseFilter = a =>
    a.status !== 'cancelado' &&
    (a.allBarbers || activeBarbers.has(String(a.barber?._id || a.barber)));

  if (!splitByBarber) {
    // ── Merged: all barbers together, grouped by day
    const filteredAppts = appointments.filter(baseFilter);
    return (
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950 h-full">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
          {days.map(day => {
            const dayAppts = filteredAppts
              .filter(a => isSameDay(new Date(a.date), day))
              .sort((a, b) => new Date(a.date) - new Date(b.date));
            return (
              <ListDaySection key={day.toISOString()} day={day} appts={dayAppts} view={view} onApptClick={onApptClick}>
                {dayAppts.map(appt => (
                  <button key={appt._id} className="w-full" onClick={() => onApptClick(appt)}>
                    <ListApptRow appt={appt} barbers={barbers} />
                  </button>
                ))}
              </ListDaySection>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Split: one column per barber
  return (
    <div className="flex-1 overflow-hidden bg-white dark:bg-gray-950 h-full flex">
      {visibleBarbers.map((b, bi) => {
        const globalIdx = barbers.findIndex(x => String(x._id) === String(b._id));
        const color     = barberColor(globalIdx < 0 ? bi : globalIdx);
        const barberAppts = appointments.filter(a =>
          a.status !== 'cancelado' &&
          (a.allBarbers || String(a.barber?._id || a.barber) === String(b._id))
        );

        return (
          <div key={b._id} className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-800 last:border-r-0 min-w-0">
            {/* Barber header */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
              {b.profileImage
                ? <img src={b.profileImage} alt={b.name} className="w-7 h-7 rounded-full object-cover shrink-0" style={{ outline: `2px solid ${color.hex}`, outlineOffset: '1px' }} />
                : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: color.hex }}>
                    {b.name?.charAt(0).toUpperCase()}
                  </div>
              }
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{b.name}</span>
              <span className="ml-auto text-[10px] text-gray-400 shrink-0">
                {barberAppts.filter(a => a.type !== 'block').length} agend.
              </span>
            </div>

            {/* Days */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-2 py-3 space-y-4">
                {days.map(day => {
                  const dayAppts = barberAppts
                    .filter(a => isSameDay(new Date(a.date), day))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                  if (view === 'month' && dayAppts.length === 0) return null;
                  const today   = new Date();
                  const isToday = isSameDay(day, today);
                  const isPast  = day < today && !isToday;
                  return (
                    <div key={day.toISOString()}>
                      {/* Compact day header */}
                      <div className="flex items-center gap-1.5 mb-1.5 sticky top-0 bg-white dark:bg-gray-950 py-0.5">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                          isToday  ? 'bg-blue-600 text-white'
                          : isPast ? 'text-gray-400 dark:text-gray-600'
                                   : 'text-gray-600 dark:text-gray-400',
                        )}>
                          {day.getDate()}
                        </div>
                        <span className={cn('text-[10px] font-semibold capitalize truncate',
                          isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400')}>
                          {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </span>
                      </div>
                      {dayAppts.length === 0 ? (
                        <p className="text-[10px] text-gray-300 dark:text-gray-700 italic pl-1 pb-1">Vazio</p>
                      ) : (
                        <div className="space-y-1">
                          {dayAppts.map(appt => (
                            <button key={appt._id} className="w-full" onClick={() => onApptClick(appt)}>
                              <ListApptRow appt={appt} barbers={barbers} hideName />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Appointment Action Modal ──────────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  { id: 'dinheiro',       label: 'Dinheiro', icon: Banknote    },
  { id: 'pix',            label: 'PIX',      icon: Smartphone  },
  { id: 'cartao_debito',  label: 'Débito',   icon: CreditCard  },
  { id: 'cartao_credito', label: 'Crédito',  icon: Wallet      },
];

function ApptActionModal({ appt, onClose, onStatusChange, onEdit, onDelete, onEditBlock }) {
  const [step,    setStep]    = useState('detail'); // 'detail' | 'concluir' | 'ausente' | 'deletar'
  const [payment, setPayment] = useState('pix');
  const [working, setWorking] = useState(false);

  if (!appt) return null;
  const isBlock = appt.type === 'block';
  const d       = new Date(appt.date);
  const badge   = STATUS_BADGE[appt.status] || { label: appt.status, cls: 'bg-gray-100 text-gray-600' };

  const handleConfirm = async () => {
    setWorking(true);
    if (step === 'deletar') {
      await onDelete(appt);
    } else {
      const newStatus = step === 'concluir' ? 'concluído' : 'ausente';
      await onStatusChange(appt, newStatus, step === 'concluir' ? payment : undefined);
    }
    setWorking(false);
    onClose();
  };

  const stepTitles = { concluir: 'Concluir serviço', ausente: 'Marcar como ausente', deletar: 'Remover agendamento' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-80 p-5 animate-fade-up" onClick={e => e.stopPropagation()}>

        {/* close */}
        <button onClick={onClose} className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={16} />
        </button>

        {/* ── detail step ── */}
        {step === 'detail' && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide', badge.cls)}>
                {badge.label}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{appt.service?.name || 'Serviço'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{appt.client?.name || appt.clientName || 'Cliente'}</p>
            <div className="space-y-2 text-sm mb-4">
              {[
                { icon: CalendarDays, text: d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                { icon: Clock,        text: isBlock && appt.endDate ? `${fmtTime(appt.date)} — ${fmtTime(appt.endDate)}` : `${fmtTime(appt.date)}${appt.service?.duration ? ` — ${appt.service.duration} min` : ''}` },
                appt.barber?.name && { icon: CheckCircle2, text: `Profissional: ${appt.barber.name}` },
                appt.service?.price && { icon: DollarSign, text: `R$ ${appt.service.price.toFixed(2)}` },
              ].filter(Boolean).map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
                  <Icon size={14} className="shrink-0 text-gray-400" />
                  <span className="capitalize">{text}</span>
                </div>
              ))}
            </div>
            {appt.notes && (
              <p className="mb-4 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 pt-2.5 italic">{appt.notes}</p>
            )}

            {/* action buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
              {!isBlock && (<>
                <button onClick={() => { setPayment('pix'); setStep('concluir'); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                  <CheckCircle2 size={13} /> Concluir
                </button>
                <button onClick={() => setStep('ausente')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                  <UserX size={13} /> Ausente
                </button>
              </>)}
              <div className="flex gap-1 ml-auto">
                <button onClick={() => isBlock ? onEditBlock(appt) : onEdit(appt)} title="Editar"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => setStep('deletar')} title="Remover"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── confirm steps ── */}
        {step !== 'detail' && (
          <>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{stepTitles[step]}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {step === 'concluir'  && <>Confirmar conclusão do serviço de <strong className="text-gray-900 dark:text-gray-100">{appt.clientName}</strong>?</>}
              {step === 'ausente'   && <>Marcar <strong className="text-gray-900 dark:text-gray-100">{appt.clientName}</strong> como ausente (no-show)?</>}
              {step === 'deletar'   && <>Remover o agendamento de <strong className="text-gray-900 dark:text-gray-100">{appt.clientName}</strong>? Esta ação não pode ser desfeita.</>}
            </p>

            {step === 'concluir' && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PAYMENT_OPTIONS.map(pm => (
                  <button key={pm.id} onClick={() => setPayment(pm.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                      payment === pm.id
                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-300',
                    )}>
                    <pm.icon size={15} className={payment === pm.id ? 'text-brand-500' : 'text-gray-400'} />
                    {pm.label}
                  </button>
                ))}
              </div>
            )}

            {step === 'deletar' && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-800/50">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">Esta ação não pode ser desfeita.</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep('detail')}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Voltar
              </button>
              <button onClick={handleConfirm} disabled={working}
                className={cn(
                  'px-4 py-1.5 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-60',
                  step === 'deletar' ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600',
                )}>
                {working
                  ? <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Aguarde...</span>
                  : step === 'concluir' ? 'Confirmar e concluir'
                  : step === 'ausente'  ? 'Marcar ausente'
                  : 'Remover'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Google Calendar Sync Modal ────────────────────────────────────────────────
function SyncModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [feedUrl, setFeedUrl] = useState('');
  const [copied,  setCopied]  = useState(false);
  useEffect(() => {
    Appointments.getIcalToken().then(r => { setLoading(false); if (r.ok) setFeedUrl(r.data.data.feedUrl); });
  }, []);
  const copy = () => {
    navigator.clipboard.writeText(feedUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast('Link copiado!'); });
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md p-6 animate-fade-up" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-blue-500 rounded-xl"><Calendar size={18} className="text-white" /></div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Sincronizar com Google Agenda</h2>
            <p className="text-xs text-gray-400">Feed iCal — atualiza automaticamente</p>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input readOnly value={feedUrl} onClick={e => e.target.select()}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 focus:outline-none" />
              <button onClick={copy}
                className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                  copied ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}>
                {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <button onClick={() => window.open(`https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(feedUrl)}`, '_blank')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors">
              <ExternalLink size={15} /> Abrir no Google Agenda
            </button>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-800/50">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1.5">Como adicionar:</p>
              <ol className="text-xs text-blue-600 dark:text-blue-400/80 space-y-1 list-decimal list-inside">
                <li>Copie o link acima</li>
                <li>Google Agenda → Outros calendários → <strong>+</strong></li>
                <li>Escolha <strong>"A partir do URL"</strong> e cole o link</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit Block Modal ──────────────────────────────────────────────────────────
function EditBlockModal({ block, barbers, isAdmin, onClose, onSaved }) {
  const toLocalDate = iso => { if (!iso) return ''; const d = new Date(iso); const p = n => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
  const toLocalTime = iso => { if (!iso) return ''; const d = new Date(iso); const p = n => String(n).padStart(2,'0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; };

  const startT = toLocalTime(block.date);
  const endT   = block.endDate ? toLocalTime(block.endDate) : '';
  const allDay = startT === '00:00' && (!endT || endT === '23:59');

  const [form, setForm] = useState({
    reason:     block.clientName || '',
    date:       toLocalDate(block.date),
    startTime:  allDay ? '' : startT,
    endTime:    allDay ? '' : endT,
    allDay,
    allBarbers: block.allBarbers || false,
    barber:     String(block.barber?._id || block.barber || ''),
    notes:      block.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.reason || !form.date) return setErr('Preencha motivo e data.');
    if (!form.allDay && !form.startTime) return setErr('Informe o horário ou marque "Dia todo".');
    setSaving(true); setErr('');
    const startTime = form.allDay ? '00:00' : form.startTime;
    const endTime   = form.allDay ? '23:59' : form.endTime;
    const r = await Appointments.update(block._id, {
      clientName: form.reason,
      barber:     form.allBarbers ? undefined : form.barber || undefined,
      allBarbers: form.allBarbers,
      date:       new Date(`${form.date}T${startTime}`).toISOString(),
      endDate:    endTime ? new Date(`${form.date}T${endTime}`).toISOString() : undefined,
      notes:      form.notes,
    });
    setSaving(false);
    if (r.ok) { toast('Bloqueio atualizado!'); onSaved(); onClose(); }
    else setErr(r.data?.message || 'Erro ao atualizar.');
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-5 animate-fade-up" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"><Lock size={15} className="text-orange-500" /> Editar bloqueio</h3>
        <div className="space-y-3">
          <div><label className={labelCls}>Motivo *</label><input className={inputCls} value={form.reason} onChange={set('reason')} placeholder="Ex: Feriado, Reunião..." /></div>
          {isAdmin && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.allBarbers} onChange={e => setForm(f => ({ ...f, allBarbers: e.target.checked, barber: '' }))} className="w-4 h-4 rounded border-gray-300 text-brand-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Todos os profissionais</span>
            </label>
          )}
          {isAdmin && !form.allBarbers && (
            <div><label className={labelCls}>Profissional</label>
              <select className={inputCls} value={form.barber} onChange={set('barber')}>
                <option value="">Selecionar</option>
                {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div><label className={labelCls}>Data *</label><input type="date" className={inputCls} value={form.date} onChange={set('date')} /></div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.allDay} onChange={e => setForm(f => ({ ...f, allDay: e.target.checked, startTime: '', endTime: '' }))} className="w-4 h-4 rounded border-gray-300 text-brand-600" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Dia todo</span>
          </label>
          {!form.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Início</label><input type="time" className={inputCls} value={form.startTime} onChange={set('startTime')} /></div>
              <div><label className={labelCls}>Fim</label><input type="time" className={inputCls} value={form.endTime} onChange={set('endTime')} /></div>
            </div>
          )}
          <div><label className={labelCls}>Observações</label><input className={inputCls} value={form.notes} onChange={set('notes')} placeholder="Detalhes..." /></div>
          {err && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60 flex items-center gap-2">
              {saving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Client search dropdown (Dashboard) ───────────────────────────────────────
function DashClientSearch({ value, clientId, onChange, onSelect, onClear }) {
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async q => {
    if (!q || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const r = await ClientsAPI.getAll({ search: q });
    setLoading(false);
    if (r.ok) setResults(r.data?.data || []);
  }, []);

  const handleChange = e => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 250);
    setOpen(true);
  };

  const showDropdown = open && value?.length >= 2;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do cliente *</label>
      <div className="relative">
        <input
          type="text"
          placeholder="Digite para buscar ou escreva um novo nome..."
          value={value}
          onChange={handleChange}
          onFocus={() => value?.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          className={cn(
            'w-full px-3 py-2 text-sm border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors pr-8',
            showDropdown ? 'rounded-t-lg rounded-b-none border-brand-500' : 'rounded-lg border-gray-200 dark:border-gray-700',
          )}
        />
        {(clientId || value) && (
          <button type="button" onClick={onClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>
      {clientId && (
        <p className="text-[10px] text-brand-600 dark:text-brand-400 mt-0.5 flex items-center gap-1">
          <CheckCircle2 size={10} /> Cliente vinculado à base
        </p>
      )}
      {showDropdown && (
        <div className="rounded-b-xl border border-t-0 border-brand-500 bg-white dark:bg-gray-900 max-h-40 overflow-y-auto">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Buscando...</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2.5">
              <p className="text-xs text-gray-400 mb-0.5">Nenhum cliente encontrado.</p>
              <span className="text-xs text-brand-600 dark:text-brand-400">O nome digitado será usado como novo cliente.</span>
            </div>
          )}
          {!loading && results.map(c => (
            <button key={c._id} type="button" onMouseDown={() => { onSelect(c); setOpen(false); setResults([]); }}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
              <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 text-xs font-bold shrink-0">
                {c.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quick New Appointment Modal ───────────────────────────────────────────────
function NewApptModal({ prefill, services, barbers, isAdmin, userId, onClose, onSaved }) {
  const [form, setForm] = useState({
    clientName:  '',
    clientId:    '',
    service:     '',
    barber:      prefill.barber || (isAdmin ? '' : String(userId || '')),
    date:        prefill.date   || '',
    time:        prefill.time   || '',
    notes:       '',
    forceCreate: false,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.clientName || !form.service || !form.barber || !form.date || !form.time)
      return setErr('Preencha todos os campos obrigatórios.');
    setSaving(true); setErr('');
    const r = await Appointments.create({
      clientName: form.clientName,
      client:     form.clientId || undefined,
      service:    form.service,
      barber:     form.barber,
      date:       new Date(`${form.date}T${form.time}`).toISOString(),
      notes:      form.notes,
      status:     'agendado',
      ...(form.forceCreate ? { forceCreate: true } : {}),
    });
    setSaving(false);
    if (r.ok) { toast('Agendamento criado!'); onSaved(); onClose(); }
    else setErr(r.data?.message || 'Erro ao criar agendamento.');
  };

  const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-5 animate-fade-up" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3.5 right-3.5 text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Novo agendamento</h3>

        <div className="space-y-3">
          <DashClientSearch
            value={form.clientName}
            clientId={form.clientId}
            onChange={v => setForm(f => ({ ...f, clientName: v, clientId: '' }))}
            onSelect={c => setForm(f => ({ ...f, clientName: c.name, clientId: c._id }))}
            onClear={() => setForm(f => ({ ...f, clientName: '', clientId: '' }))}
          />

          <div>
            <label className={labelCls}>Serviço *</label>
            <select className={inputCls} value={form.service} onChange={set('service')}>
              <option value="">Selecionar serviço</option>
              {services.map(s => <option key={s._id} value={s._id}>{s.name}{s.price ? ` — R$${s.price.toFixed(0)}` : ''}</option>)}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className={labelCls}>Profissional *</label>
              <select className={inputCls} value={form.barber} onChange={set('barber')}>
                <option value="">Selecionar profissional</option>
                {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data *</label>
              <input type="date" className={inputCls} value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label className={labelCls}>Horário *</label>
              <input type="time" className={inputCls} value={form.time} onChange={set('time')} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Observações</label>
            <input className={inputCls} placeholder="Opcional..." value={form.notes} onChange={set('notes')} />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/15">
            <input type="checkbox" checked={form.forceCreate} onChange={e => setForm(f => ({ ...f, forceCreate: e.target.checked }))}
              className="w-4 h-4 mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Forçar encaixe</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">Ignora conflitos de horário.</p>
            </div>
          </label>

          {err && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{err}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-sm rounded-lg font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-60 flex items-center gap-2">
              {saving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              Criar agendamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isAdmin   = user?.role === 'admin';
  const today     = new Date();

  const [view,         setView]         = useState('day');
  const [displayMode,  setDisplayMode]  = useState('calendar'); // 'calendar' | 'list'
  const [splitByBarber,setSplitByBarber]= useState(true);
  const [cursor,       setCursor]       = useState(new Date());
  const [selected,     setSelected]     = useState(new Date());
  const [miniCursor,   setMiniCursor]   = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [barbers,      setBarbers]      = useState([]);
  const [activeBarbers,setActiveBarbers]= useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_activeBarbers');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [loading,      setLoading]      = useState(false);
  const [services,     setServices]     = useState([]);
  const [selAppt,      setSelAppt]      = useState(null);
  const [showSync,     setShowSync]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newApptModal, setNewApptModal] = useState(null); // { date, time, barber }
  const [editBlock,    setEditBlock]    = useState(null);
  const [stats,        setStats]        = useState({ today: 0, done: 0, pending: 0, revenue: 0 });
  const nowRef = useRef(null);

  // Scroll to first appointment (day view) — runs after paint so ref is always ready
  useEffect(() => {
    if (view !== 'day' || loading) return;
    const raf = requestAnimationFrame(() => {
      if (!nowRef.current) return;
      const dayAppts = appointments.filter(a => isSameDay(new Date(a.date), selected));
      let targetY;
      if (dayAppts.length > 0) {
        const earliest = Math.min(...dayAppts.map(a => { const d = new Date(a.date); return d.getHours() * 60 + d.getMinutes(); }));
        targetY = minuteToY(earliest);
      } else {
        targetY = minuteToY(today.getHours() * 60 + today.getMinutes());
      }
      nowRef.current.scrollTop = Math.max(0, targetY - 40);
    });
    return () => cancelAnimationFrame(raf);
  }, [view, selected, appointments, splitByBarber, loading, activeBarbers]); // eslint-disable-line react-hooks/exhaustive-deps

  const dateRange = useCallback(() => {
    if (view === 'day') {
      // Use 'date' param so backend applies BRT-offset single-day filter
      return { date: `${selected.getFullYear()}-${String(selected.getMonth()+1).padStart(2,'0')}-${String(selected.getDate()).padStart(2,'0')}` };
    }
    const fmtD = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (view === 'week') {
      const s = startOfWeek(cursor); const e = addDays(s, 6);
      return { startDate: fmtD(s), endDate: fmtD(addDays(e, 1)) };
    }
    const s = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const e = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return { startDate: fmtD(s), endDate: fmtD(addDays(e, 1)) };
  }, [view, cursor, selected]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const params = dateRange();
    const [apptRes, empRes, svcRes] = await Promise.all([
      Appointments.getAll(params),
      isAdmin ? Barbershops.getEmployees(user.barbershop) : Promise.resolve(null),
      Services.getAll(),
    ]);
    if (svcRes?.ok) setServices(svcRes.data?.data || []);
    const appts = apptRes.ok ? (apptRes.data?.data || []) : [];
    setAppointments(appts);

    let barberList;
    if (isAdmin && empRes?.ok) {
      barberList = empRes.data?.data || [];
    } else {
      barberList = [{ _id: user._id, name: user.name }];
    }
    setBarbers(barberList);
    setActiveBarbers(prev => {
      const hasSaved = prev.size > 0;
      if (hasSaved) {
        // Keep existing selection, just ensure at least 1 is active
        const valid = new Set([...prev].filter(id => barberList.some(b => String(b._id) === id)));
        if (valid.size === 0) barberList.forEach(b => valid.add(String(b._id)));
        return valid;
      }
      // First load: activate all
      const next = new Set();
      barberList.forEach(b => next.add(String(b._id)));
      return next;
    });

    // Stats
    const _now = new Date();
    const todayStr = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,'0')}-${String(_now.getDate()).padStart(2,'0')}`;
    let todayAppts = appts.filter(a => isSameDay(new Date(a.date), today));
    if (view !== 'day' || !isSameDay(selected, today)) {
      const tr = await Appointments.getAll({ date: todayStr });
      todayAppts = tr.ok ? (tr.data?.data || []) : [];
    }
    const done    = todayAppts.filter(a => a.status === 'concluído' || a.status === 'concluido');
    const pending = todayAppts.filter(a => a.status === 'agendado');
    const revenue = done.reduce((s, a) => s + (a.service?.price || 0), 0);
    setStats({ today: todayAppts.length, done: done.length, pending: pending.length, revenue });
    setLoading(false);
  }, [dateRange, isAdmin, user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    try { localStorage.setItem('dashboard_activeBarbers', JSON.stringify([...activeBarbers])); } catch {}
  }, [activeBarbers]);

  const handleApptStatusChange = async (appt, newStatus, paymentMethod) => {
    if (newStatus === 'concluído') {
      const cashRes = await Financial.getCash();
      if (!cashRes.ok || !cashRes.data?.data) {
        setSelAppt(null);
        toast('O caixa precisa estar aberto para concluir um serviço.', 'error');
        return;
      }
    }
    const payload = { status: newStatus };
    if (paymentMethod) payload.paymentMethod = paymentMethod;
    const r = await Appointments.update(appt._id, payload);
    if (r.ok) {
      const msgs = { 'concluído': 'Serviço concluído!', ausente: 'Cliente marcado como ausente.' };
      toast(msgs[newStatus] || 'Status atualizado.');
      loadData();
    } else {
      toast(r.data?.message || 'Erro ao atualizar status.', 'error');
    }
  };

  const handleApptDelete = async (appt) => {
    const r = await Appointments.delete(appt._id);
    if (r.ok) {
      toast('Agendamento removido.');
      loadData();
    } else {
      toast(r.data?.message || 'Erro ao remover.', 'error');
    }
  };

  const handleApptEdit = (appt) => {
    navigate('/agenda', { state: { editAppt: appt } });
  };

  const handleEditBlock = (block) => { setSelAppt(null); setEditBlock(block); };

  const handleSlotClick = (date, time, barberId) => {
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    setNewApptModal({ date: dateStr, time, barber: barberId || (isAdmin ? '' : String(user?._id || '')) });
  };

  useEffect(() => {
    try { localStorage.setItem('dashboard_split', JSON.stringify(splitByBarber)); } catch {}
  }, [splitByBarber]);

  const navPrev = () => {
    if (view === 'day')   { const n = addDays(selected, -1); setSelected(n); setCursor(n); }
    if (view === 'week')  setCursor(d => addDays(d, -7));
    if (view === 'month') { const n = addMonths(cursor, -1); setCursor(n); setMiniCursor(new Date(n)); }
  };
  const navNext = () => {
    if (view === 'day')   { const n = addDays(selected, 1); setSelected(n); setCursor(n); }
    if (view === 'week')  setCursor(d => addDays(d, 7));
    if (view === 'month') { const n = addMonths(cursor, 1); setCursor(n); setMiniCursor(new Date(n)); }
  };
  const goToday = () => { const n = new Date(); setCursor(n); setSelected(n); setMiniCursor(n); };
  const handleDayClick = (d) => { setSelected(new Date(d)); setCursor(new Date(d)); setView('day'); };

  const toggleBarber = (id) => {
    const sid = String(id);
    setActiveBarbers(prev => {
      const next = new Set(prev);
      if (next.has(sid)) { if (next.size > 1) next.delete(sid); } // keep at least 1
      else next.add(sid);
      return next;
    });
  };

  const headerTitle = () => {
    if (view === 'day') return selected.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const s = startOfWeek(cursor); const e = addDays(s, 6);
      if (s.getMonth() === e.getMonth()) return `${MONTHS_PT[s.getMonth()]} ${s.getFullYear()}`;
      return `${MONTHS_SHORT[s.getMonth()]} – ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
    }
    return `${MONTHS_PT[cursor.getMonth()]} ${cursor.getFullYear()}`;
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -mt-6 -mx-4 sm:-mx-6 lg:-mx-8 overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col overflow-hidden">
        {/* New appointment button */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
          <button
            onClick={() => setNewApptModal({ date: '', time: '', barber: isAdmin ? '' : String(user?._id || '') })}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md text-sm font-medium text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Plus size={18} className="text-gray-400 dark:text-gray-500" />
            Novo agendamento
          </button>
          {/* Display mode toggle */}
          <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setDisplayMode('calendar')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors',
                displayMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <CalendarDays size={12} /> Calendário
            </button>
            <button
              onClick={() => setDisplayMode('list')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors',
                displayMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              <LayoutList size={12} /> Lista
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Mini calendar */}
          <div className="py-3">
            <MiniCalendar
              cursor={miniCursor}
              selected={selected}
              onSelect={handleDayClick}
              onMonthChange={n => setMiniCursor(c => addMonths(c, n))}
              dotDates={appointments.map(a => a.date)}
            />
          </div>

          {/* Stats today */}
          <div className="mx-3 mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
            <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Hoje</p>
            {[
              { label: 'Agendamentos', value: stats.today,   color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Concluídos',   value: stats.done,    color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Pendentes',    value: stats.pending, color: 'text-amber-600 dark:text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
                <span className={cn('text-[11px] font-bold', color)}>{value}</span>
              </div>
            ))}
          </div>

          {/* Barbers with checkboxes */}
          {barbers.length > 0 && (
            <div className="px-3 mb-3">
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                {isAdmin ? 'Profissionais' : 'Minha agenda'}
              </p>
              <div className="space-y-0.5">
                {barbers.map((b, i) => {
                  const color    = barberColor(i);
                  const isActive = activeBarbers.has(String(b._id));
                  const cnt = appointments.filter(a =>
                    String(a.barber?._id || a.barber) === String(b._id) && isSameDay(new Date(a.date), selected)
                  ).length;
                  return (
                    <button
                      key={b._id}
                      onClick={() => toggleBarber(b._id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left group',
                        isActive ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      )}
                      style={isActive ? { backgroundColor: `${color.hex}18` } : {}}
                    >
                      {/* Checkbox */}
                      <div
                        className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={isActive
                          ? { backgroundColor: color.hex, borderColor: color.hex }
                          : { borderColor: '#d1d5db' }}
                      >
                        {isActive && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-none stroke-white stroke-2">
                            <polyline points="1.5,6 4.5,9 10.5,3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className={cn('text-xs font-medium truncate flex-1', isActive ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600')}>
                        {b.name}
                      </span>
                      {cnt > 0 && (
                        <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 shrink-0">{cnt}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sync button */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setShowSync(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-gray-200 dark:border-gray-700 hover:border-blue-200"
          >
            <Calendar size={12} />
            Sincronizar Google Agenda
            <ExternalLink size={10} className="ml-auto opacity-50" />
          </button>
        </div>
      </aside>

      {/* ── Main Calendar ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
          <button onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Hoje
          </button>
          <div className="flex items-center">
            <button onClick={navPrev} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
              <ChevronLeft size={16} />
            </button>
            <button onClick={navNext} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
              <ChevronRight size={16} />
            </button>
          </div>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize flex-1 truncate">
            {headerTitle()}
          </h2>
          <button onClick={loadData} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => navigate('/agenda', { state: { openBlock: true } })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Lock size={11} /> Bloquear
          </button>
          {/* Split toggle */}
          <button
            onClick={() => setSplitByBarber(v => !v)}
            title={splitByBarber ? 'Modo unificado' : 'Dividir por profissional'}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              splitByBarber
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}
          >
            {splitByBarber ? <Columns2 size={13} /> : <LayoutList size={13} />}
            {splitByBarber ? 'Dividido' : 'Dividir'}
          </button>
          {/* View switcher */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {[{ id: 'day', l: 'Dia' }, { id: 'week', l: 'Semana' }, { id: 'month', l: 'Mês' }].map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={cn('px-3 py-1.5 text-xs font-medium transition-colors',
                  view === v.id ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}>
                {v.l}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar content */}
        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute top-3 right-3 z-20">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {displayMode === 'calendar' && view === 'day' && (
            <DayView
              date={selected}
              allAppointments={appointments}
              barbers={barbers}
              activeBarbers={activeBarbers}
              splitByBarber={splitByBarber}
              onApptClick={setSelAppt}
              onSlotClick={handleSlotClick}
              nowRef={nowRef}
            />
          )}
          {displayMode === 'calendar' && view === 'week' && (
            <WeekView cursor={cursor} appointments={appointments} activeBarbers={activeBarbers} barbers={barbers} splitByBarber={splitByBarber} onDayClick={handleDayClick} onApptClick={setSelAppt} onSlotClick={handleSlotClick} loading={loading} />
          )}
          {displayMode === 'calendar' && view === 'month' && (
            <MonthView cursor={cursor} appointments={appointments} activeBarbers={activeBarbers} barbers={barbers} splitByBarber={splitByBarber} onDayClick={handleDayClick} onApptClick={setSelAppt} />
          )}
          {displayMode === 'list' && (
            <ListView view={view} cursor={cursor} selected={selected} appointments={appointments} activeBarbers={activeBarbers} barbers={barbers} splitByBarber={splitByBarber} onApptClick={setSelAppt} />
          )}
        </div>
      </div>

      {/* Modals */}
      {selAppt && (
        <ApptActionModal
          appt={selAppt}
          onClose={() => setSelAppt(null)}
          onStatusChange={handleApptStatusChange}
          onEdit={handleApptEdit}
          onDelete={handleApptDelete}
          onEditBlock={handleEditBlock}
        />
      )}
      {editBlock && (
        <EditBlockModal
          block={editBlock}
          barbers={barbers}
          isAdmin={isAdmin}
          onClose={() => setEditBlock(null)}
          onSaved={loadData}
        />
      )}
      {showSync && <SyncModal onClose={() => setShowSync(false)} />}
      {newApptModal && (
        <NewApptModal
          prefill={newApptModal}
          services={services}
          barbers={barbers}
          isAdmin={isAdmin}
          userId={user?._id}
          onClose={() => setNewApptModal(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
