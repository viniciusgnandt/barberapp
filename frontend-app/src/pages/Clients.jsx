import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, FileText, Cake, X } from 'lucide-react';
import { Clients as ClientsAPI } from '../utils/api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const EMPTY_FORM = {
  name: '', phone: '', email: '', birthdate: '', address: '', notes: '',
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtPhone(p) {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return p;
}

function initials(name) {
  return name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

function ClientCard({ client, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 hover:border-brand-200 dark:hover:border-brand-800 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-sm font-bold shrink-0">
          {initials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
            <Phone size={11} className="shrink-0" />
            {fmtPhone(client.phone)}
          </p>
          {client.email && (
            <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1 mt-0.5 truncate">
              <Mail size={10} className="shrink-0" />
              {client.email}
            </p>
          )}
          {client.birthdate && (
            <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1 mt-0.5">
              <Cake size={10} className="shrink-0" />
              {fmtDate(client.birthdate)}
            </p>
          )}
          {client.address && (
            <p className="text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1 mt-0.5 truncate">
              <MapPin size={10} className="shrink-0" />
              {client.address}
            </p>
          )}
        </div>
      </div>

      {client.notes && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-600 flex items-start gap-1 border-t border-gray-50 dark:border-gray-800 pt-2">
          <FileText size={10} className="shrink-0 mt-0.5" />
          {client.notes}
        </p>
      )}

      <div className="flex gap-1 mt-3 justify-end">
        <button
          onClick={() => onEdit(client)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
          title="Editar cliente"
          aria-label={`Editar ${client.name}`}
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() => onDelete(client)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Remover cliente"
          aria-label={`Remover ${client.name}`}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients,  setClients]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async (q = '') => {
    setLoading(true);
    const r = await ClientsAPI.getAll(q ? { search: q } : {});
    if (r.ok) setClients(r.data?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setModal(true);
  };

  const openEdit = client => {
    setEditing(client);
    setForm({
      name:      client.name      || '',
      phone:     client.phone     || '',
      email:     client.email     || '',
      birthdate: client.birthdate ? client.birthdate.slice(0, 10) : '',
      address:   client.address   || '',
      notes:     client.notes     || '',
    });
    setFormErr('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      return setFormErr('Nome e telefone são obrigatórios.');
    }
    setFormErr('');
    setSaving(true);
    const r = editing
      ? await ClientsAPI.update(editing._id, form)
      : await ClientsAPI.create(form);
    setSaving(false);
    if (r.ok) {
      toast(editing ? 'Cliente atualizado!' : 'Cliente cadastrado!');
      setModal(false);
      load(search);
    } else {
      setFormErr(r.data?.message || 'Erro ao salvar.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await ClientsAPI.delete(deleteTarget._id);
    setDeleting(false);
    if (r.ok) {
      toast('Cliente removido.');
      setDeleteTarget(null);
      load(search);
    } else {
      toast(r.data?.message || 'Erro ao remover.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-1.5" /> Novo cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome, telefone ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
          aria-label="Buscar clientes"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {search ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado ainda.'}
          </p>
          {!search && (
            <button onClick={openCreate} className="mt-3 text-sm text-brand-600 dark:text-brand-400 hover:underline">
              Cadastrar primeiro cliente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map(c => (
            <ClientCard key={c._id} client={c} onEdit={openEdit} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar cliente' : 'Novo cliente'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="Nome"
                required
                placeholder="João da Silva"
                value={form.name}
                onChange={set('name')}
              />
            </div>
            <Input
              label="Telefone"
              required
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={set('phone')}
            />
            <Input
              label="E-mail"
              type="email"
              placeholder="joao@email.com"
              value={form.email}
              onChange={set('email')}
            />
            <Input
              label="Data de nascimento"
              type="date"
              value={form.birthdate}
              onChange={set('birthdate')}
            />
            <Input
              label="Endereço"
              placeholder="Rua, nº, bairro..."
              value={form.address}
              onChange={set('address')}
            />
          </div>
          <Input
            label="Observações"
            placeholder="Preferências, alergias, histórico..."
            value={form.notes}
            onChange={set('notes')}
          />

          {formErr && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formErr}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remover cliente">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deseja remover <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.name}</strong>? Os agendamentos existentes não serão afetados.
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
