import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { Appointments } from '../utils/api';
import Badge from './ui/Badge';
import { cn } from '../utils/cn';

// ── Date helpers ───────────────────────────────────────────────────────────────
const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const WEEKDAYS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

function addDays(date, n)   { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function addMonths(date, n) { const d = new Date(date); d.setMonth(d.getMonth() + n); return d; }

function startOfWeek(date) {
  const d   = new Date(date);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1)); // Monday-first
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfWeek(date)   { return addDays(startOfWeek(date), 6); }
function startOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)     { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}
function isToday(d) { return isSameDay(d, new Date()); }

function getMonthGrid(cursor) {
  const cells = [];
  let d = startOfWeek(startOfMonth(cursor));
  // Always render 6 weeks (42 cells)
  for (let i = 0; i < 42; i++) { cells.push(new Date(d)); d = addDays(d, 1); }
  return cells;
}
function getWeekDays(cursor) {
  const s = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

// ── Status dot colors ──────────────────────────────────────────────────────────
const DOT = {
  agendado:  'bg-blue-500',
  concluido: 'bg-emerald-500',
  'concluído':'bg-emerald-500',
  cancelado: 'bg-red-400',
};
const CARD_BORDER = {
  agendado:  'border-l-blue-500',
  concluido: 'border-l-emerald-500',
  'concluído':'border-l-emerald-500',
  cancelado: 'border-l-red-400',
};

// ── Appointment detail popover (portal — nunca cortado por overflow) ───────────
function ApptPopover({ appt, anchorRect, onClose }) {
  const date = new Date(appt.date);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day  = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const W = 256, MARGIN = 8;

  // Horizontal: centralizado no anchor, clamped para não sair da viewport
  const vw   = window.innerWidth;
  let left   = anchorRect.left + anchorRect.width / 2 - W / 2;
  left       = Math.max(MARGIN, Math.min(left, vw - W - MARGIN));

  // Vertical: preferencialmente abaixo; se não couber, acima
  const spaceBelow = window.innerHeight - anchorRect.bottom - MARGIN;
  const top = spaceBelow >= 180
    ? anchorRect.bottom + MARGIN
    : anchorRect.top - MARGIN - 180; // altura estimada

  return createPortal(
    <>
      {/* Backdrop invisível para fechar ao clicar fora */}
      <div className="fixed inset-0 z-[48]" onClick={onClose} />

      <div
        className="fixed z-[49] w-64 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-4 animate-scale-in"
        style={{ top, left }}
      >
        <div className="flex items-start justify-between mb-3">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 pr-2">{appt.clientName}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={13} />
          </button>
        </div>
        <div className="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
          {appt.service?.name && (
            <p><span className="font-medium text-gray-700 dark:text-gray-300">Serviço: </span>{appt.service.name}</p>
          )}
          {appt.barber?.name && (
            <p><span className="font-medium text-gray-700 dark:text-gray-300">Barbeiro: </span>{appt.barber.name}</p>
          )}
          <p><span className="font-medium text-gray-700 dark:text-gray-300">Horário: </span>{time} · {day}</p>
          {appt.service?.price != null && (
            <p><span className="font-medium text-gray-700 dark:text-gray-300">Valor: </span>R$ {appt.service.price.toFixed(2)}</p>
          )}
        </div>
        <div className="mt-3">
          <Badge variant={appt.status} />
        </div>
      </div>
    </>,
    document.body,
  );
}

// Helper: captura o rect do elemento clicado e alterna o pop
function togglePop(e, appt, pop, setPop) {
  e.stopPropagation();
  if (pop?.id === appt._id) { setPop(null); return; }
  const rect = e.currentTarget.getBoundingClientRect();
  setPop({ id: appt._id, appt, rect });
}

// ── Month View ─────────────────────────────────────────────────────────────────
function MonthView({ cursor, appointments, onDayClick }) {
  const cells       = useMemo(() => getMonthGrid(cursor), [cursor]);
  const [pop, setPop] = useState(null); // { id, appt, rect }

  function apptsByDay(day) {
    return appointments.filter(a => isSameDay(new Date(a.date), day));
  }

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wide">
            {w}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const appts    = apptsByDay(day);
          const inMonth  = day.getMonth() === cursor.getMonth();
          const today    = isToday(day);
          const visible  = appts.slice(0, 3);
          const overflow = appts.length - visible.length;

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[88px] p-1.5 border-b border-r border-gray-50 dark:border-gray-800/60 cursor-pointer',
                'hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors',
                !inMonth && 'opacity-35',
                (idx + 1) % 7 === 0 && 'border-r-0',
              )}
            >
              <div className="flex justify-end mb-1">
                <span className={cn(
                  'w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium',
                  today ? 'bg-brand-500 text-white font-semibold' : 'text-gray-600 dark:text-gray-400',
                )}>
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-0.5">
                {visible.map(appt => {
                  const time = new Date(appt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={appt._id}
                      onClick={e => togglePop(e, appt, pop, setPop)}
                      className={cn(
                        'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] cursor-pointer',
                        'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                        'hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
                        `border-l-2 ${CARD_BORDER[appt.status] || 'border-l-gray-400'}`,
                      )}
                    >
                      <span className="font-semibold shrink-0">{time}</span>
                      <span className="truncate text-gray-500 dark:text-gray-400">{appt.clientName}</span>
                    </div>
                  );
                })}
                {overflow > 0 && (
                  <div className="text-[10px] text-gray-400 dark:text-gray-600 pl-1">+{overflow} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pop && <ApptPopover appt={pop.appt} anchorRect={pop.rect} onClose={() => setPop(null)} />}
    </div>
  );
}

// ── Week View ──────────────────────────────────────────────────────────────────
function WeekView({ cursor, appointments }) {
  const days      = useMemo(() => getWeekDays(cursor), [cursor]);
  const [pop, setPop] = useState(null); // { id, appt, rect }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {days.map((day, i) => (
          <div key={i} className="py-3 px-2 text-center border-r border-gray-50 dark:border-gray-800/60 last:border-r-0">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase">{WEEKDAYS[i]}</p>
            <span className={cn(
              'inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold mt-1',
              isToday(day) ? 'bg-brand-500 text-white' : 'text-gray-700 dark:text-gray-300',
            )}>
              {day.getDate()}
            </span>
          </div>
        ))}
      </div>

      {/* Appointment columns */}
      <div className="grid grid-cols-7 min-h-[280px]">
        {days.map((day, i) => {
          const appts = appointments
            .filter(a => isSameDay(new Date(a.date), day))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

          return (
            <div key={i} className={cn(
              'p-1.5 border-r border-gray-50 dark:border-gray-800/60 last:border-r-0 space-y-1',
              isToday(day) && 'bg-brand-50/30 dark:bg-brand-900/5',
            )}>
              {appts.length === 0 ? (
                <div className="h-full flex items-start justify-center pt-6">
                  <div className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 mt-1" />
                </div>
              ) : (
                appts.map(appt => {
                  const time = new Date(appt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={appt._id}
                      onClick={e => togglePop(e, appt, pop, setPop)}
                      className={cn(
                        'rounded-lg p-1.5 cursor-pointer text-[10px]',
                        'border-l-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700',
                        `border-l-2 ${CARD_BORDER[appt.status] || 'border-l-gray-400'}`,
                        'hover:shadow-sm transition-shadow',
                      )}
                    >
                      <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">{appt.clientName}</p>
                      <p className="text-gray-400 dark:text-gray-600">{time}</p>
                      {appt.service?.name && (
                        <p className="text-gray-400 dark:text-gray-600 truncate">{appt.service.name}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {pop && <ApptPopover appt={pop.appt} anchorRect={pop.rect} onClose={() => setPop(null)} />}
    </div>
  );
}

// ── Day View ───────────────────────────────────────────────────────────────────
function DayView({ cursor, appointments }) {
  const appts = appointments
    .filter(a => isSameDay(new Date(a.date), cursor))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const [pop, setPop] = useState(null); // { id, appt, rect }

  if (appts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays size={32} className="text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-400 dark:text-gray-600">Nenhum agendamento para este dia.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50 dark:divide-gray-800">
      {appts.map(appt => {
        const time = new Date(appt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return (
          <div
            key={appt._id}
            onClick={e => togglePop(e, appt, pop, setPop)}
            className={cn(
              'flex items-center gap-4 px-4 py-3.5 cursor-pointer',
              'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
              pop?.id === appt._id && 'bg-gray-50 dark:bg-gray-800/50',
            )}
          >
            <div className="w-14 shrink-0 text-right">
              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{time}</span>
            </div>
            <div className={cn('w-1 self-stretch rounded-full shrink-0', DOT[appt.status] || 'bg-gray-300')} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{appt.clientName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {[appt.service?.name, appt.barber?.name].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {appt.service?.price != null && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  R$ {appt.service.price.toFixed(2)}
                </span>
              )}
              <Badge variant={appt.status} />
            </div>
          </div>
        );
      })}

      {pop && <ApptPopover appt={pop.appt} anchorRect={pop.rect} onClose={() => setPop(null)} />}
    </div>
  );
}

// ── Main Calendar Widget ───────────────────────────────────────────────────────
export default function CalendarWidget() {
  const [view,   setView]   = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Compute the date range to fetch
  const { rangeStart, rangeEnd, title } = useMemo(() => {
    if (view === 'month') {
      const rs = startOfWeek(startOfMonth(cursor));
      const re = endOfWeek(endOfMonth(cursor));
      // Ensure 6 weeks always included
      const adjustedEnd = re < addDays(rs, 41) ? addDays(rs, 41) : re;
      return {
        rangeStart: rs,
        rangeEnd:   adjustedEnd,
        title:      `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`,
      };
    } else if (view === 'week') {
      const rs = startOfWeek(cursor);
      const re = endOfWeek(cursor);
      const start = rs.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      const end   = re.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
      return { rangeStart: rs, rangeEnd: re, title: `${start} – ${end}` };
    } else {
      return {
        rangeStart: cursor,
        rangeEnd:   cursor,
        title: cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      };
    }
  }, [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    const s = new Date(rangeStart); s.setHours(0,  0,  0,   0);
    const e = new Date(rangeEnd);   e.setHours(23, 59, 59, 999);
    const r = await Appointments.getAll({
      startDate: s.toISOString(),
      endDate:   e.toISOString(),
    });
    if (r.ok) setAppointments(r.data?.data || []);
    setLoading(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => { load(); }, [load]);

  function navigate(dir) {
    if (view === 'month') setCursor(c => addMonths(c, dir));
    else if (view === 'week') setCursor(c => addDays(c, dir * 7));
    else setCursor(c => addDays(c, dir));
  }

  function goToday() { setCursor(new Date()); }

  // Month view: clicking a day switches to day view
  function handleDayClick(day) {
    setCursor(day);
    setView('day');
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 gap-3 flex-wrap">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <h2 className="ml-1 text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize min-w-0">
            {title}
          </h2>
        </div>

        {/* View selector */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
          {['month', 'week', 'day'].map((v) => {
            const labels = { month: 'Mês', week: 'Semana', day: 'Dia' };
            return (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  view === v
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                )}
              >
                {labels[v]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading overlay ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── View content ── */}
      {!loading && (
        <>
          {view === 'month' && (
            <MonthView
              cursor={cursor}
              appointments={appointments}
              onDayClick={handleDayClick}
            />
          )}
          {view === 'week' && (
            <WeekView cursor={cursor} appointments={appointments} />
          )}
          {view === 'day' && (
            <DayView cursor={cursor} appointments={appointments} />
          )}
        </>
      )}

      {/* ── Legend ── */}
      {!loading && (
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-50 dark:border-gray-800">
          {[
            { label: 'Agendado',  color: 'bg-blue-500'    },
            { label: 'Concluído', color: 'bg-emerald-500' },
            { label: 'Cancelado', color: 'bg-red-400'     },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', color)} />
              <span className="text-xs text-gray-400 dark:text-gray-600">{label}</span>
            </div>
          ))}
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">
            {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
