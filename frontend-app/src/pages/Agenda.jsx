import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Appointments, Services, Barbershops } from '../utils/api';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const EMPTY_FORM = {
  clientName: '',
  service: '',
  barber: '',
  date: '',
  time: '',
  status: 'agendado',
  notes: '',
};

function toLocalDatetimeStr(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AppointmentCard({ appt, onEdit, onDelete, isAdmin }) {
  const date = new Date(appt.date);
  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{appt.clientName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{appt.service?.name || '—'}</p>
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
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(appt)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          >
            <Edit2 size={13} />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(appt)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Agenda() {
  const { user, isAdmin } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [services,     setServices]     = useState([]);
  const [barbers,      setBarbers]      = useState([]);
  const [loading,      setLoading]      = useState(true);

  // filters
  const [search,     setSearch]     = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // modal
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (filterDate)   params.date   = filterDate;
    if (filterStatus) params.status = filterStatus;

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
  }, [filterDate, filterStatus, isAdmin, user]);

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
      clientName: appt.clientName || '',
      service:    appt.service?._id || appt.service || '',
      barber:     appt.barber?._id  || appt.barber  || '',
      date:       dt.split('T')[0]  || '',
      time:       dt.split('T')[1]  || '',
      status:     appt.status       || 'agendado',
      notes:      appt.notes        || '',
    });
    setFormErr('');
    setModal(true);
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

    const r = editing
      ? await Appointments.update(editing._id, payload)
      : await Appointments.create(payload);

    setSaving(false);
    if (r.ok) {
      toast(editing ? 'Agendamento atualizado!' : 'Agendamento criado!');
      setModal(false);
      load();
    } else {
      setFormErr(r.data?.message || 'Erro ao salvar.');
    }
  };

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

  // client-side search filter
  const filtered = appointments.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.clientName?.toLowerCase().includes(q) ||
      a.service?.name?.toLowerCase().includes(q) ||
      a.barber?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agenda</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} agendamento{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" /> Novo agendamento
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cliente, serviço..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
        >
          <option value="">Todos os status</option>
          <option value="agendado">Agendado</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
        {(filterDate || filterStatus) && (
          <button
            onClick={() => { setFilterDate(''); setFilterStatus(''); }}
            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum agendamento encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(appt => (
            <AppointmentCard
              key={appt._id}
              appt={appt}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar agendamento' : 'Novo agendamento'}
      >
        <div className="space-y-4">
          <Input
            label="Nome do cliente *"
            placeholder="João da Silva"
            value={form.clientName}
            onChange={set('clientName')}
          />

          <Select label="Serviço *" value={form.service} onChange={set('service')}>
            <option value="">Selecionar serviço</option>
            {services.map(s => (
              <option key={s._id} value={s._id}>{s.name} — R$ {s.price?.toFixed(2)}</option>
            ))}
          </Select>

          {isAdmin && (
            <Select label="Barbeiro *" value={form.barber} onChange={set('barber')}>
              <option value="">Selecionar barbeiro</option>
              {barbers.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Data *" type="date" value={form.date} onChange={set('date')} />
            <Input label="Horário *" type="time" value={form.time} onChange={set('time')} />
          </div>

          {editing && (
            <Select label="Status" value={form.status} onChange={set('status')}>
              <option value="agendado">Agendado</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          )}

          <Input
            label="Observações"
            placeholder="Observações opcionais..."
            value={form.notes}
            onChange={set('notes')}
          />

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

      {/* Delete Confirm Modal */}
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
    </div>
  );
}
