import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, CheckCircle2, XCircle, Lock, RefreshCw, UserPlus, X, ChevronDown, LayoutGrid, List, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Appointments, Services, Barbershops, Clients as ClientsAPI } from '../utils/api';
import { ServiceIcon } from '../utils/serviceIcons';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const EMPTY_FORM = {
  clientName: '',
  clientId:   '',
  service: '',
  barber: '',
  date: '',
  time: '',
  status: 'agendado',
  notes: '',
  recurrence:  'none',
  occurrences: 4,
};

const EMPTY_BLOCK = {
  reason: '',
  barber: '',
  allBarbers: false,
  allDay: false,
  date: '',
  startTime: '',
  endTime: '',
  notes: '',
};

const RECURRENCE_LABELS = {
  none:     'Sem recorrência',
  weekly:   'Semanal',
  biweekly: 'Quinzenal',
  monthly:  'Mensal',
};

function toLocalDatetimeStr(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Client search dropdown ────────────────────────────────────────────────────
function ClientSearch({ value, clientId, onChange, onSelect, onClear }) {
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback(async (q) => {
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

  const handleSelect = client => {
    onSelect(client);
    setOpen(false);
    setResults([]);
  };

  const showDropdown = open && value?.length >= 2;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Nome do cliente *
      </label>
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
          <button type="button" onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
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
        <div className="rounded-b-xl border border-t-0 border-brand-500 bg-white dark:bg-gray-900 max-h-48 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-300 border-t-brand-500 rounded-full animate-spin" />
              Buscando...
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2.5">
              <p className="text-xs text-gray-400 mb-1">Nenhum cliente encontrado.</p>
              <span className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400">
                <UserPlus size={11} /> O nome digitado será usado como novo cliente.
              </span>
            </div>
          )}
          {!loading && results.map(c => (
            <button
              key={c._id}
              type="button"
              onMouseDown={() => handleSelect(c)}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0">
                {c.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.phone}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rich Select: Service ─────────────────────────────────────────────────────
function ServiceRichSelect({ services, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = services.find(s => s._id === value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serviço *</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors text-left',
          open ? 'border-brand-500 ring-2 ring-brand-500/20 rounded-b-none' : 'border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-900',
        )}
      >
        {selected ? (
          <>
            <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400 overflow-hidden">
              <ServiceIcon icon={selected.icon} size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{selected.name}</p>
              <p className="text-xs text-gray-400">
                R$ {selected.price?.toFixed(2)}{selected.duration ? ` · ${selected.duration} min` : ''}
              </p>
            </div>
          </>
        ) : (
          <span className="text-gray-400 flex-1">Selecionar serviço</span>
        )}
        <ChevronDown size={14} className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="rounded-b-xl border border-t-0 border-brand-500 bg-white dark:bg-gray-900 max-h-48 overflow-y-auto">
          {services.map(s => (
            <button
              key={s._id}
              type="button"
              onMouseDown={() => { onChange(s._id); setOpen(false); }}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left',
                value === s._id && 'bg-brand-50 dark:bg-brand-900/20',
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 text-brand-600 dark:text-brand-400 overflow-hidden">
                <ServiceIcon icon={s.icon} size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                <p className="text-xs text-gray-400">
                  R$ {s.price?.toFixed(2)}{s.duration ? ` · ${s.duration} min` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rich Select: Barber ───────────────────────────────────────────────────────
function BarberAvatar({ barber, sz = 'w-7 h-7' }) {
  if (barber?.profileImage) {
    return <img src={barber.profileImage} alt={barber.name} className={cn(sz, 'rounded-full object-cover shrink-0')} />;
  }
  return (
    <div className={cn(sz, 'rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center font-bold text-xs text-brand-600 dark:text-brand-400 shrink-0')}>
      {barber?.name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

function BarberRichSelect({ barbers, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = barbers.find(b => b._id === value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barbeiro *</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors text-left',
          open ? 'border-brand-500 ring-2 ring-brand-500/20 rounded-b-none' : 'border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-gray-900',
        )}
      >
        {selected ? (
          <>
            <BarberAvatar barber={selected} />
            <span className="flex-1 font-medium text-gray-900 dark:text-gray-100 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-400 flex-1">Selecionar barbeiro</span>
        )}
        <ChevronDown size={14} className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="rounded-b-xl border border-t-0 border-brand-500 bg-white dark:bg-gray-900 max-h-48 overflow-y-auto">
          {barbers.map(b => (
            <button
              key={b._id}
              type="button"
              onMouseDown={() => { onChange(b._id); setOpen(false); }}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left',
                value === b._id && 'bg-brand-50 dark:bg-brand-900/20',
              )}
            >
              <BarberAvatar barber={b} sz="w-8 h-8" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Appointment Card ──────────────────────────────────────────────────────────
function AppointmentCard({ appt, onEdit, onDelete, onStatusChange, isAdmin, changingStatus }) {
  const date     = new Date(appt.date);
  const dateStr  = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const timeStr  = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isPending = appt.status === 'agendado';
  const isBlock   = appt.type   === 'block';
  const isChanging = changingStatus === appt._id;

  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-xl border p-4 transition-colors',
      isBlock
        ? 'border-orange-200 dark:border-orange-800/60 bg-orange-50/40 dark:bg-orange-900/10'
        : 'border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isBlock && <Lock size={12} className="text-orange-500 shrink-0" />}
            {appt.recurrenceGroupId && !isBlock && (
              <RefreshCw size={11} className="text-brand-400 shrink-0" title="Recorrente" />
            )}
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{appt.clientName}</p>
          </div>
          {!isBlock && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{appt.service?.name || '—'}</p>
          )}
          {isBlock && appt.notes && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">{appt.notes}</p>
          )}
          {isAdmin && (
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Barbeiro: {appt.barber?.name || '—'}</p>
          )}
        </div>
        <Badge variant={appt.status} />
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1">
          <Calendar size={12} />
          {dateStr} às {timeStr}
          {isBlock && appt.endDate && (
            <span> — {new Date(appt.endDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </span>
        {appt.service?.price && !isBlock && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            R$ {appt.service.price.toFixed(2)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        {!isBlock && isPending && (
          <>
            <button
              onClick={() => onStatusChange(appt, 'concluído')}
              disabled={isChanging}
              title="Marcar como concluído"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
            >
              {isChanging
                ? <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 size={13} />
              }
              Concluir
            </button>
            <button
              onClick={() => onStatusChange(appt, 'cancelado')}
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
          {!isBlock && (
            <button onClick={() => onEdit(appt)} title="Editar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
              <Edit2 size={13} />
            </button>
          )}
          <button onClick={() => onDelete(appt)} title="Remover"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Appointment Row (list view) ───────────────────────────────────────────────
function AppointmentRow({ appt, onEdit, onDelete, onStatusChange, isAdmin, changingStatus }) {
  const date      = new Date(appt.date);
  const dateStr   = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const timeStr   = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const isPending  = appt.status === 'agendado';
  const isBlock    = appt.type   === 'block';
  const isChanging = changingStatus === appt._id;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors',
      isBlock
        ? 'border-orange-200 dark:border-orange-800/60 bg-orange-50/40 dark:bg-orange-900/10'
        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800',
    )}>
      {/* date/time */}
      <div className="w-20 shrink-0 text-center">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{dateStr}</p>
        <p className="text-xs text-gray-400 dark:text-gray-600">{timeStr}</p>
      </div>

      {/* client + service */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isBlock && <Lock size={11} className="text-orange-500 shrink-0" />}
          {appt.recurrenceGroupId && !isBlock && <RefreshCw size={10} className="text-brand-400 shrink-0" title="Recorrente" />}
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{appt.clientName}</p>
        </div>
        {!isBlock && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{appt.service?.name || '—'}</p>
        )}
        {isBlock && appt.notes && (
          <p className="text-xs text-orange-600 dark:text-orange-400 truncate">{appt.notes}</p>
        )}
      </div>

      {/* barber */}
      {appt.barber && (
        <div className="hidden sm:flex items-center gap-2 w-32 shrink-0">
          <BarberAvatar barber={appt.barber} sz="w-6 h-6" />
          {isAdmin && (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{appt.barber.name}</span>
          )}
        </div>
      )}

      {/* price */}
      {!isBlock && appt.service?.price && (
        <span className="hidden md:block text-xs font-medium text-gray-500 dark:text-gray-400 w-16 shrink-0 text-right">
          R$ {appt.service.price.toFixed(2)}
        </span>
      )}

      {/* status */}
      <div className="shrink-0">
        <Badge variant={appt.status} />
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!isBlock && isPending && (
          <>
            <button
              onClick={() => onStatusChange(appt, 'concluído')}
              disabled={isChanging}
              title="Concluir"
              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
            >
              {isChanging
                ? <div className="w-3.5 h-3.5 border border-green-600 border-t-transparent rounded-full animate-spin" />
                : <CheckCircle2 size={14} />
              }
            </button>
            <button
              onClick={() => onStatusChange(appt, 'cancelado')}
              disabled={isChanging}
              title="Cancelar"
              className="p-1.5 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
            >
              <XCircle size={14} />
            </button>
          </>
        )}
        {!isBlock && (
          <button onClick={() => onEdit(appt)} title="Editar"
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
            <Edit2 size={13} />
          </button>
        )}
        <button onClick={() => onDelete(appt)} title="Remover"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Agenda() {
  const { user, isAdmin } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [services,     setServices]     = useState([]);
  const [barbers,      setBarbers]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  const [search,        setSearch]        = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterBarber,  setFilterBarber]  = useState('');

  const [period,  setPeriod]  = useState('day');
  const [navDate, setNavDate] = useState(() => new Date().toLocaleDateString('sv'));

  const [viewMode, setViewMode] = useState('grid');
  const [sortBy,   setSortBy]   = useState('date-asc');

  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');

  const [blockModal,  setBlockModal]  = useState(false);
  const [blockForm,   setBlockForm]   = useState(EMPTY_BLOCK);
  const [blockSaving, setBlockSaving] = useState(false);
  const [blockErr,    setBlockErr]    = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [changingStatus, setChangingStatus] = useState(null);

  const set      = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setBlock = k => e => setBlockForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (period === 'day') params.date = navDate;
    if (filterStatus) params.status = filterStatus;
    if (filterBarber) params.barber = filterBarber;

    const [apptRes, svcRes] = await Promise.all([
      Appointments.getAll(params),
      Services.getAll(),
    ]);

    if (apptRes.ok) setAppointments(apptRes.data?.data || []);
    if (svcRes.ok)  setServices(svcRes.data?.data || []);

    if (isAdmin && user?.barbershop) {
      const empRes = await Barbershops.getEmployees(user.barbershop);
      if (empRes.ok) setBarbers(empRes.data?.data || []);
    } else {
      setBarbers([{ _id: user?._id, name: user?.name }]);
    }

    setLoading(false);
  }, [period, navDate, filterStatus, filterBarber, isAdmin, user]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, barber: isAdmin ? '' : (user?._id || '') });
    setFormErr('');
    setModal(true);
  };

  const openEdit = appt => {
    setEditing(appt);
    const dt = toLocalDatetimeStr(appt.date);
    setForm({
      clientName:  appt.clientName   || '',
      clientId:    appt.client?._id  || appt.client || '',
      service:     appt.service?._id || appt.service || '',
      barber:      appt.barber?._id  || appt.barber  || '',
      date:        dt.split('T')[0]  || '',
      time:        dt.split('T')[1]  || '',
      status:      appt.status       || 'agendado',
      notes:       appt.notes        || '',
      recurrence:  'none',
      occurrences: 4,
    });
    setFormErr('');
    setModal(true);
  };

  const openBlock = () => {
    setBlockForm({ ...EMPTY_BLOCK, barber: isAdmin ? '' : (user?._id || '') });
    setBlockErr('');
    setBlockModal(true);
  };

  const handleSave = async () => {
    if (!form.clientName || !form.service || !form.barber || !form.date || !form.time)
      return setFormErr('Preencha todos os campos obrigatórios.');

    setFormErr('');
    setSaving(true);

    const payload = {
      clientName:  form.clientName,
      client:      form.clientId || undefined,
      service:     form.service,
      barber:      form.barber,
      date:        new Date(`${form.date}T${form.time}`).toISOString(),
      status:      form.status,
      notes:       form.notes,
      recurrence:  form.recurrence,
      occurrences: parseInt(form.occurrences) || 1,
    };

    const r = editing
      ? await Appointments.update(editing._id, payload)
      : await Appointments.create(payload);

    setSaving(false);
    if (r.ok) {
      const count = r.data?.recurrenceCount;
      toast(editing
        ? 'Agendamento atualizado!'
        : count > 1
          ? `${count} agendamentos criados (${RECURRENCE_LABELS[form.recurrence]})!`
          : 'Agendamento criado!'
      );
      setModal(false);
      load();
    } else {
      setFormErr(r.data?.message || 'Erro ao salvar.');
    }
  };

  const handleSaveBlock = async () => {
    if (!blockForm.reason || !blockForm.date)
      return setBlockErr('Preencha motivo e data.');
    if (!blockForm.allDay && !blockForm.startTime)
      return setBlockErr('Informe o horário de início ou marque "Dia todo".');
    if (!blockForm.allBarbers && !blockForm.barber && isAdmin)
      return setBlockErr('Selecione um profissional ou marque "Todos os profissionais".');

    setBlockErr('');
    setBlockSaving(true);

    const startTime = blockForm.allDay ? '00:00' : blockForm.startTime;
    const endTime   = blockForm.allDay ? '23:59' : blockForm.endTime;

    const payload = {
      type:       'block',
      clientName: blockForm.reason,
      barber:     blockForm.allBarbers ? undefined : (isAdmin ? blockForm.barber : user?._id),
      allBarbers: isAdmin ? blockForm.allBarbers : false,
      date:       new Date(`${blockForm.date}T${startTime}`).toISOString(),
      endDate:    endTime ? new Date(`${blockForm.date}T${endTime}`).toISOString() : undefined,
      notes:      blockForm.notes,
    };

    const r = await Appointments.create(payload);
    setBlockSaving(false);
    if (r.ok) {
      toast(blockForm.allBarbers ? 'Agenda de todos bloqueada!' : 'Bloqueio criado!');
      setBlockModal(false);
      load();
    } else {
      setBlockErr(r.data?.message || 'Erro ao criar bloqueio.');
    }
  };

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await Appointments.delete(deleteTarget._id);
    setDeleting(false);
    if (r.ok) {
      toast(deleteTarget.type === 'block' ? 'Bloqueio removido.' : 'Agendamento removido.');
      setDeleteTarget(null);
      load();
    } else {
      toast(r.data?.message || 'Erro ao remover.', 'error');
    }
  };

  const todayStr = new Date().toLocaleDateString('sv');
  const isToday  = navDate === todayStr;

  function getPeriodRange() {
    const d = new Date(navDate + 'T12:00:00');
    if (period === 'day') {
      return { start: new Date(navDate + 'T00:00:00'), end: new Date(navDate + 'T23:59:59') };
    } else if (period === 'week') {
      const dow = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - ((dow + 6) % 7)); mon.setHours(0, 0, 0);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59);
      return { start: mon, end: sun };
    } else {
      return {
        start: new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0),
        end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
      };
    }
  }

  function getPeriodLabel() {
    const d = new Date(navDate + 'T12:00:00');
    if (period === 'day') {
      if (isToday) return 'Hoje';
      return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (period === 'week') {
      const dow = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - ((dow + 6) % 7));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const fmt = dt => dt.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
      return `${fmt(mon)} – ${fmt(sun)}`;
    } else {
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
  }

  function navigate(dir) {
    const d = new Date(navDate + 'T12:00:00');
    if (period === 'day')        d.setDate(d.getDate() + dir);
    else if (period === 'week')  d.setDate(d.getDate() + dir * 7);
    else                         d.setMonth(d.getMonth() + dir);
    const p = n => String(n).padStart(2, '0');
    setNavDate(`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`);
  }

  const periodRange = getPeriodRange();

  const filtered = appointments
    .filter(a => {
      // period range filter (day view is handled by API; week/month filtered here)
      if (period !== 'day') {
        const apptDate = new Date(a.date);
        if (apptDate < periodRange.start || apptDate > periodRange.end) return false;
      }
      if (filterService && a.type !== 'block' && (a.service?._id || a.service) !== filterService) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.clientName?.toLowerCase().includes(q) &&
          !a.service?.name?.toLowerCase().includes(q) &&
          !a.barber?.name?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':  return new Date(a.date) - new Date(b.date);
        case 'date-desc': return new Date(b.date) - new Date(a.date);
        case 'client':    return (a.clientName || '').localeCompare(b.clientName || '', 'pt-BR');
        case 'status':    return (a.status || '').localeCompare(b.status || '', 'pt-BR');
        case 'service':   return (a.service?.name || '').localeCompare(b.service?.name || '', 'pt-BR');
        default:          return 0;
      }
    });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agenda</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openBlock}>
            <Lock size={15} className="mr-1.5" /> Bloquear
          </Button>
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" /> Novo agendamento
          </Button>
        </div>
      </div>

      {/* Period navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Period tabs */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          {[['day','Dia'], ['week','Semana'], ['month','Mês']].map(([p, label]) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn('px-4 py-2 transition-colors font-medium', period === p
                ? 'bg-brand-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
                p !== 'day' && 'border-l border-gray-200 dark:border-gray-700'
              )}>
              {label}
            </button>
          ))}
        </div>

        {/* Prev / label / Next */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="px-2 text-sm font-medium text-gray-800 dark:text-gray-200 min-w-36 text-center capitalize">
            {getPeriodLabel()}
          </span>
          <button onClick={() => navigate(1)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Today shortcut */}
        {!isToday && (
          <button onClick={() => setNavDate(todayStr)}
            className="px-3 py-1.5 text-xs rounded-lg border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors font-medium">
            Hoje
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors">
          <option value="">Todos os status</option>
          <option value="agendado">Agendado</option>
          <option value="concluído">Concluído</option>
          <option value="cancelado">Cancelado</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <select value={filterService} onChange={e => setFilterService(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors">
          <option value="">Todos os serviços</option>
          {services.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {isAdmin && barbers.length > 1 && (
          <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors">
            <option value="">Todos os profissionais</option>
            {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        )}
        {(filterStatus || filterService || filterBarber) && (
          <button onClick={() => { setFilterStatus(''); setFilterService(''); setFilterBarber(''); }}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
            Limpar filtros
          </button>
        )}

        {/* Sort + View toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="relative flex items-center">
            <ArrowUpDown size={13} className="absolute left-2.5 text-gray-400 pointer-events-none" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="pl-7 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors">
              <option value="date-asc">Data (mais antigo)</option>
              <option value="date-desc">Data (mais recente)</option>
              <option value="client">Cliente (A→Z)</option>
              <option value="status">Status</option>
              <option value="service">Serviço</option>
            </select>
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              title="Visualização em grade"
              className={cn('px-2.5 py-2 transition-colors', viewMode === 'grid'
                ? 'bg-brand-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}>
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
              className={cn('px-2.5 py-2 transition-colors border-l border-gray-200 dark:border-gray-700', viewMode === 'list'
                ? 'bg-brand-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}>
              <List size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Appointments */}
      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum agendamento encontrado.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(appt => (
            <AppointmentCard key={appt._id} appt={appt} onEdit={openEdit} onDelete={setDeleteTarget}
              onStatusChange={handleStatusChange} isAdmin={isAdmin} changingStatus={changingStatus} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(appt => (
            <AppointmentRow key={appt._id} appt={appt} onEdit={openEdit} onDelete={setDeleteTarget}
              onStatusChange={handleStatusChange} isAdmin={isAdmin} changingStatus={changingStatus} />
          ))}
        </div>
      )}

      {/* Create/Edit Appointment Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar agendamento' : 'Novo agendamento'} size="full">
        <div className="space-y-4">
          <ClientSearch
            value={form.clientName}
            clientId={form.clientId}
            onChange={v => setForm(f => ({ ...f, clientName: v, clientId: '' }))}
            onSelect={c => setForm(f => ({ ...f, clientName: c.name, clientId: c._id }))}
            onClear={() => setForm(f => ({ ...f, clientName: '', clientId: '' }))}
          />

          <ServiceRichSelect
            services={services}
            value={form.service}
            onChange={v => setForm(f => ({ ...f, service: v }))}
          />

          {isAdmin && (
            <BarberRichSelect
              barbers={barbers}
              value={form.barber}
              onChange={v => setForm(f => ({ ...f, barber: v }))}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={form.date} onChange={set('date')} />
            <Input label="Horário *" type="time" value={form.time} onChange={set('time')} />
          </div>

          {editing && (
            <Select label="Status" value={form.status} onChange={set('status')}>
              <option value="agendado">Agendado</option>
              <option value="concluído">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          )}

          {/* Recurrence - only on creation */}
          {!editing && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={13} className="text-brand-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recorrência</span>
              </div>
              <Select label="" value={form.recurrence} onChange={set('recurrence')}>
                {Object.entries(RECURRENCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
              {form.recurrence !== 'none' && (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input label="Nº de ocorrências" type="number" min={2} max={52}
                      value={form.occurrences} onChange={set('occurrences')} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-600 pb-2.5 shrink-0">
                    {form.recurrence === 'weekly'   && `≈ ${form.occurrences} semanas`}
                    {form.recurrence === 'biweekly' && `≈ ${form.occurrences * 2} semanas`}
                    {form.recurrence === 'monthly'  && `≈ ${form.occurrences} meses`}
                  </p>
                </div>
              )}
            </div>
          )}

          <Input label="Observações" placeholder="Observações opcionais..." value={form.notes} onChange={set('notes')} />

          {formErr && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formErr}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Salvar alterações' : 'Criar agendamento'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block Modal */}
      <Modal open={blockModal} onClose={() => setBlockModal(false)} title="Bloquear Horário na Agenda" size="full">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Bloqueios impedem novos agendamentos no horário indicado.</p>

          <Input label="Motivo *" placeholder="Ex: Feriado, Reunião, Férias..." value={blockForm.reason} onChange={setBlock('reason')} />

          {isAdmin ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={blockForm.allBarbers}
                  onChange={e => setBlockForm(f => ({ ...f, allBarbers: e.target.checked, barber: '' }))}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Todos os profissionais
                  <span className="ml-1.5 text-xs text-gray-400 font-normal">(feriado ou evento geral)</span>
                </span>
              </label>
              {!blockForm.allBarbers && (
                <Select label="Profissional *" value={blockForm.barber} onChange={setBlock('barber')}>
                  <option value="">Selecionar profissional</option>
                  {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </Select>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">O bloqueio será aplicado à sua agenda.</p>
          )}

          <Input label="Data *" type="date" value={blockForm.date} onChange={setBlock('date')} />

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={blockForm.allDay}
              onChange={e => setBlockForm(f => ({ ...f, allDay: e.target.checked, startTime: '', endTime: '' }))}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bloquear o dia todo</span>
          </label>

          {!blockForm.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Horário início *" type="time" value={blockForm.startTime} onChange={setBlock('startTime')} />
              <Input label="Horário fim" type="time" value={blockForm.endTime} onChange={setBlock('endTime')} />
            </div>
          )}

          <Input label="Observações" placeholder="Detalhes adicionais..." value={blockForm.notes} onChange={setBlock('notes')} />

          {blockErr && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{blockErr}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setBlockModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveBlock} loading={blockSaving}>
              <Lock size={14} className="mr-1.5" /> Criar bloqueio
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={deleteTarget?.type === 'block' ? 'Remover bloqueio' : 'Remover agendamento'}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deleteTarget?.type === 'block'
              ? <>Deseja remover o bloqueio <strong className="text-gray-900 dark:text-gray-100">"{deleteTarget?.clientName}"</strong>?</>
              : <>Deseja remover o agendamento de <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.clientName}</strong>? Esta ação não pode ser desfeita.</>
            }
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Remover</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
