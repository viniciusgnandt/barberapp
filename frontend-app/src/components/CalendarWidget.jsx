import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CalendarDays, X, CheckCircle2, XCircle, Edit2, Trash2 } from 'lucide-react';
import { Appointments, Services, Barbershops } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Badge from './ui/Badge';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input, { Select } from './ui/Input';
import { toast } from './ui/Toast';
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
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
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
  for (let i = 0; i < 42; i++) { cells.push(new Date(d)); d = addDays(d, 1); }
  return cells;
}
function getWeekDays(cursor) {
  const s = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(s, i));
}

function toLocalDatetimeStr(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const EMPTY_FORM = {
  clientName: '', service: '', barber: '', date: '', time: '', status: 'agendado', notes: '',
};

// ── Status dot colors ──────────────────────────────────────────────────────────
const DOT = {
  agendado:  'bg-blue-500',
  'concluído': 'bg-emerald-500',
  'concluído':'bg-emerald-500',
  cancelado: 'bg-red-400',
};
const CARD_BORDER = {
  agendado:  'border-l-blue-500',
  'concluído': 'border-l-emerald-500',
  'concluído':'border-l-emerald-500',
  cancelado: 'border-l-red-400',
};

// ── Appointment detail popover ─────────────────────────────────────────────────
function ApptPopover({ appt, anchorRect, onClose, onStatusChange, onEdit, onDelete, isAdmin, changingStatus }) {
  const date = new Date(appt.date);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const day  = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const isPending  = appt.status === 'agendado';
  const isChanging = changingStatus === appt._id;

  const W = 272, MARGIN = 8;
  const vw   = window.innerWidth;
  let left   = anchorRect.left + anchorRect.width / 2 - W / 2;
  left       = Math.max(MARGIN, Math.min(left, vw - W - MARGIN));

  const spaceBelow = window.innerHeight - anchorRect.bottom - MARGIN;
  const top = spaceBelow >= 220
    ? anchorRect.bottom + MARGIN
    : anchorRect.top - MARGIN - 220;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[48]" onClick={onClose} />

      <div
        className="fixed z-[49] bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-4 animate-scale-in"
        style={{ top, left, width: W }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 pr-2">{appt.clientName}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X size={13} />
          </button>
        </div>

        {/* Details */}
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

        <div className="mt-2.5">
          <Badge variant={appt.status} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {isPending && (
            <>
              <button
                onClick={() => { onStatusChange(appt, 'concluído'); onClose(); }}
                disabled={isChanging}
                title="Marcar como concluído"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
              >
                {isChanging ? (
                  <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                Concluir
              </button>
              <button
                onClick={() => { onStatusChange(appt, 'cancelado'); onClose(); }}
                disabled={isChanging}
                title="Marcar como cancelado"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
              >
                <XCircle size={13} />
                Cancelar
              </button>
            </>
          )}

          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => { onEdit(appt); onClose(); }}
              title="Editar agendamento"
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
            >
              <Edit2 size={13} />
            </button>
            {isAdmin && (
              <button
                onClick={() => { onDelete(appt); onClose(); }}
                title="Remover agendamento"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
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
function MonthView({ cursor, appointments, onDayClick, actions }) {
  const cells       = useMemo(() => getMonthGrid(cursor), [cursor]);
  const [pop, setPop] = useState(null);

  function apptsByDay(day) {
    return appointments.filter(a => isSameDay(new Date(a.date), day));
  }

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {WEEKDAYS.map(w => (
          <div key={w} className="py-2 text-center text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wide">
            {w}
          </div>
        ))}
      </div>

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

      {pop && (
        <ApptPopover
          appt={pop.appt}
          anchorRect={pop.rect}
          onClose={() => setPop(null)}
          {...actions}
        />
      )}
    </div>
  );
}

// ── Week View ──────────────────────────────────────────────────────────────────
function WeekView({ cursor, appointments, actions }) {
  const days      = useMemo(() => getWeekDays(cursor), [cursor]);
  const [pop, setPop] = useState(null);

  return (
    <div>
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

      {pop && (
        <ApptPopover
          appt={pop.appt}
          anchorRect={pop.rect}
          onClose={() => setPop(null)}
          {...actions}
        />
      )}
    </div>
  );
}

// ── Day View ───────────────────────────────────────────────────────────────────
function DayView({ cursor, appointments, actions }) {
  const appts = appointments
    .filter(a => isSameDay(new Date(a.date), cursor))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const [pop, setPop] = useState(null);

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

      {pop && (
        <ApptPopover
          appt={pop.appt}
          anchorRect={pop.rect}
          onClose={() => setPop(null)}
          {...actions}
        />
      )}
    </div>
  );
}

// ── Main Calendar Widget ───────────────────────────────────────────────────────
export default function CalendarWidget() {
  const { user, isAdmin } = useAuth();

  const [view,   setView]   = useState('month');
  const [cursor, setCursor] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Services + barbers for edit modal and filters
  const [services, setServices] = useState([]);
  const [barbers,  setBarbers]  = useState([]);

  // Filters
  const [filterService, setFilterService] = useState('');
  const [filterBarber,  setFilterBarber]  = useState('');

  // Quick status change
  const [changingStatus, setChangingStatus] = useState(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');

  const setField = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Compute the date range to fetch
  const { rangeStart, rangeEnd, title } = useMemo(() => {
    if (view === 'month') {
      const rs = startOfWeek(startOfMonth(cursor));
      const re = endOfWeek(endOfMonth(cursor));
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
    const params = { startDate: s.toISOString(), endDate: e.toISOString() };
    if (filterBarber) params.barber = filterBarber;
    const r = await Appointments.getAll(params);
    if (r.ok) setAppointments(r.data?.data || []);
    setLoading(false);
  }, [rangeStart, rangeEnd, filterBarber]);

  useEffect(() => { load(); }, [load]);

  // Fetch services + barbers once
  useEffect(() => {
    Services.getAll().then(r => r.ok && setServices(r.data?.data || []));
    if (isAdmin && user?.barbershop) {
      Barbershops.getEmployees(user.barbershop).then(r => r.ok && setBarbers(r.data?.data || []));
    } else if (user) {
      setBarbers([{ _id: user._id, name: user.name }]);
    }
  }, [isAdmin, user]);

  function navigate(dir) {
    if (view === 'month') setCursor(c => addMonths(c, dir));
    else if (view === 'week') setCursor(c => addDays(c, dir * 7));
    else setCursor(c => addDays(c, dir));
  }

  function goToday() { setCursor(new Date()); }

  function handleDayClick(day) {
    setCursor(day);
    setView('day');
  }

  // ── Quick status change ────────────────────────────────────────────────────
  const handleStatusChange = async (appt, newStatus) => {
    setChangingStatus(appt._id);
    const r = await Appointments.update(appt._id, { status: newStatus });
    setChangingStatus(null);
    if (r.ok) {
      toast(newStatus === 'concluído' ? 'Serviço concluído!' : 'Agendamento cancelado.');
      load();
    } else {
      toast(r.data?.message || 'Erro ao atualizar status.', 'error');
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = appt => {
    setEditing(appt);
    const dt = toLocalDatetimeStr(appt.date);
    setForm({
      clientName: appt.clientName || '',
      service:    appt.service?._id || appt.service || '',
      barber:     appt.barber?._id  || appt.barber  || '',
      date:       dt.split('T')[0]  || '',
      time:       dt.split('T')[1]  || '',
      status:     appt.status       || 'agendado',
      notes:      appt.notes        || '',
    });
    setFormErr('');
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.clientName || !form.service || !form.barber || !form.date || !form.time) {
      return setFormErr('Preencha todos os campos obrigatórios.');
    }
    setFormErr('');
    setSaving(true);
    const payload = {
      clientName: form.clientName,
      service:    form.service,
      barber:     form.barber,
      date:       new Date(`${form.date}T${form.time}`).toISOString(),
      status:     form.status,
      notes:      form.notes,
    };
    const r = await Appointments.update(editing._id, payload);
    setSaving(false);
    if (r.ok) {
      toast('Agendamento atualizado!');
      setEditModal(false);
      load();
    } else {
      setFormErr(r.data?.message || 'Erro ao salvar.');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await Appointments.delete(deleteTarget._id);
    setDeleting(false);
    if (r.ok) {
      toast('Agendamento removido.');
      setDeleteTarget(null);
      load();
    } else {
      toast(r.data?.message || 'Erro ao remover.', 'error');
    }
  };

  const actions = {
    onStatusChange: handleStatusChange,
    onEdit:         openEdit,
    onDelete:       setDeleteTarget,
    isAdmin,
    changingStatus,
  };

  const visibleAppointments = filterService
    ? appointments.filter(a => (a.service?._id || a.service) === filterService)
    : appointments;

  const hasFilters = filterService || filterBarber;

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
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

          {/* ── Filter row ── */}
          <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
            <select
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
            >
              <option value="">Todos os serviços</option>
              {services.map(s => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            {isAdmin && barbers.length > 1 && (
              <select
                value={filterBarber}
                onChange={e => setFilterBarber(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
              >
                <option value="">Todos os profissionais</option>
                {barbers.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            )}

            {hasFilters && (
              <button
                onClick={() => { setFilterService(''); setFilterBarber(''); }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Limpar
              </button>
            )}

            <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">
              {visibleAppointments.length} agendamento{visibleAppointments.length !== 1 ? 's' : ''}
            </span>
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
                appointments={visibleAppointments}
                onDayClick={handleDayClick}
                actions={actions}
              />
            )}
            {view === 'week' && (
              <WeekView cursor={cursor} appointments={visibleAppointments} actions={actions} />
            )}
            {view === 'day' && (
              <DayView cursor={cursor} appointments={visibleAppointments} actions={actions} />
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
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar agendamento">
        <div className="space-y-4">
          <Input
            label="Nome do cliente" required
            placeholder="João da Silva"
            value={form.clientName}
            onChange={setField('clientName')}
          />

          <Select label="Serviço" required value={form.service} onChange={setField('service')}>
            <option value="">Selecionar serviço</option>
            {services.map(s => (
              <option key={s._id} value={s._id}>{s.name} — R$ {s.price?.toFixed(2)}</option>
            ))}
          </Select>

          {isAdmin && (
            <Select label="Barbeiro" required value={form.barber} onChange={setField('barber')}>
              <option value="">Selecionar barbeiro</option>
              {barbers.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" required type="date" value={form.date} onChange={setField('date')} />
            <Input label="Horário" required type="time" value={form.time} onChange={setField('time')} />
          </div>

          <Select label="Status" value={form.status} onChange={setField('status')}>
            <option value="agendado">Agendado</option>
            <option value="concluído">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </Select>

          <Input
            label="Observações"
            placeholder="Observações opcionais..."
            value={form.notes}
            onChange={setField('notes')}
          />

          {formErr && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formErr}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Salvar alterações</Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remover agendamento">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deseja remover o agendamento de <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.clientName}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Remover</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
