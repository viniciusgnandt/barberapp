import { useState, useEffect, useCallback } from 'react';
import {
  Store, Clock, Users, Copy, Check, Trash2,
  Save, UserX, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Barbershops } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const TABS = [
  { id: 'info',       label: 'Estabelecimento', icon: Store },
  { id: 'hours',      label: 'Horários',        icon: Clock },
  { id: 'employees',  label: 'Equipe',          icon: Users },
];

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

// ── Tab: Informações do estabelecimento ────────────────────────────────────────
function InfoTab({ shop, onSaved }) {
  const [form,   setForm]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (shop) setForm({
      name:        shop.name        || '',
      email:       shop.email       || '',
      phone:       shop.phone       || '',
      address:     shop.address     || '',
      city:        shop.city        || '',
      state:       shop.state       || '',
      zipCode:     shop.zipCode     || '',
      description: shop.description || '',
    });
  }, [shop]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCopyId = () => {
    navigator.clipboard.writeText(shop._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await Barbershops.update(shop._id, form);
    setSaving(false);
    if (r.ok) { toast('Estabelecimento atualizado!'); onSaved(r.data.data); }
    else      toast(r.data?.message || 'Erro ao salvar.', 'error');
  };

  if (!form) return null;

  return (
    <div className="space-y-6">
      {/* ID da barbearia */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ID da Barbearia</p>
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{shop._id}</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Compartilhe com barbeiros para que entrem na sua barbearia</p>
        </div>
        <button
          onClick={handleCopyId}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 transition-colors shrink-0"
        >
          {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          {copied ? 'Copiado!' : 'Copiar ID'}
        </button>
      </div>

      {/* Campos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome da barbearia *" value={form.name}    onChange={set('name')}    placeholder="Ex: Barbearia do João" />
        <Input label="E-mail *"            value={form.email}   onChange={set('email')}   placeholder="contato@barbearia.com" type="email" />
        <Input label="Telefone"            value={form.phone}   onChange={set('phone')}   placeholder="(11) 99999-9999" />
        <Input label="CEP"                 value={form.zipCode} onChange={set('zipCode')} placeholder="00000-000" />
        <Input label="Endereço"            value={form.address} onChange={set('address')} placeholder="Rua, número" className="sm:col-span-2" />
        <Input label="Cidade"              value={form.city}    onChange={set('city')}    placeholder="São Paulo" />
        <Input label="Estado"              value={form.state}   onChange={set('state')}   placeholder="SP" />
        <Input label="Descrição"           value={form.description} onChange={set('description')} placeholder="Sobre o estabelecimento..." className="sm:col-span-2" />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} className="mr-1.5" /> Salvar alterações
        </Button>
      </div>
    </div>
  );
}

// ── Tab: Horário de funcionamento ──────────────────────────────────────────────
function HoursTab({ shop, onSaved }) {
  const defaultHours = [
    { day: 0, open: false, from: '09:00', to: '18:00' },
    { day: 1, open: true,  from: '09:00', to: '18:00' },
    { day: 2, open: true,  from: '09:00', to: '18:00' },
    { day: 3, open: true,  from: '09:00', to: '18:00' },
    { day: 4, open: true,  from: '09:00', to: '18:00' },
    { day: 5, open: true,  from: '09:00', to: '18:00' },
    { day: 6, open: true,  from: '09:00', to: '13:00' },
  ];

  const [hours,  setHours]  = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    const src = shop.openingHours?.length === 7
      ? [...shop.openingHours].sort((a, b) => a.day - b.day)
      : defaultHours;
    setHours(src.map(h => ({ ...h })));
  }, [shop]);

  const update = (day, field, value) => {
    setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await Barbershops.update(shop._id, { openingHours: hours });
    setSaving(false);
    if (r.ok) { toast('Horários salvos!'); onSaved(r.data.data); }
    else      toast(r.data?.message || 'Erro ao salvar.', 'error');
  };

  if (!hours) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Configure os horários de atendimento do seu estabelecimento.
      </p>

      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {hours.map((h, i) => (
          <div
            key={h.day}
            className={cn(
              'flex items-center gap-4 px-4 py-3',
              i !== hours.length - 1 && 'border-b border-gray-50 dark:border-gray-800/60',
              !h.open && 'opacity-50',
            )}
          >
            {/* Toggle */}
            <button
              onClick={() => update(h.day, 'open', !h.open)}
              className={cn(
                'relative w-9 h-5 rounded-full transition-colors shrink-0',
                h.open ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                h.open && 'translate-x-4',
              )} />
            </button>

            {/* Day name */}
            <span className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
              {DAYS[h.day]}
            </span>

            {h.open ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={h.from}
                  onChange={e => update(h.day, 'from', e.target.value)}
                  className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                <span className="text-gray-400 text-sm">até</span>
                <input
                  type="time"
                  value={h.to}
                  onChange={e => update(h.day, 'to', e.target.value)}
                  className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-600 flex-1">Fechado</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} className="mr-1.5" /> Salvar horários
        </Button>
      </div>
    </div>
  );
}

// ── Tab: Funcionários ──────────────────────────────────────────────────────────
function EmployeesTab({ shop }) {
  const { user } = useAuth();
  const [employees,    setEmployees]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing,     setRemoving]     = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const r = await Barbershops.getEmployees(shop._id);
    if (r.ok) setEmployees(r.data?.data || []);
    setLoading(false);
  }, [shop]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async () => {
    setRemoving(true);
    const r = await Barbershops.removeEmployee(shop._id, removeTarget._id);
    setRemoving(false);
    if (r.ok) { toast('Funcionário removido.'); setRemoveTarget(null); load(); }
    else      toast(r.data?.message || 'Erro ao remover.', 'error');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">{employees.length} funcionário{employees.length !== 1 ? 's' : ''}</p>
        <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {employees.map((emp, i) => {
            const initials = emp.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
            const isSelf   = String(emp._id) === String(user?._id);
            return (
              <div
                key={emp._id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  i !== employees.length - 1 && 'border-b border-gray-50 dark:border-gray-800/60',
                )}
              >
                <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                  {emp.profileImage
                    ? <img src={emp.profileImage} alt="" className="w-full h-full object-cover" />
                    : initials
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {emp.name} {isSelf && <span className="text-xs text-gray-400">(você)</span>}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 truncate">{emp.email}</p>
                </div>
                <Badge variant={emp.role} />
                {!isSelf && (
                  <button
                    onClick={() => setRemoveTarget(emp)}
                    title="Remover funcionário"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <UserX size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm remove modal */}
      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remover funcionário">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deseja remover <strong className="text-gray-900 dark:text-gray-100">{removeTarget?.name}</strong> da equipe? O perfil deste funcionário nesta barbearia será excluído.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleRemove} loading={removing}>Remover</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Establishment() {
  const { isAdmin } = useAuth();
  const [tab,  setTab]  = useState('info');
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Barbershops.getMine().then(r => {
      if (r.ok) setShop(r.data.data);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Store size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Estabelecimento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie as informações da sua barbearia</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : !shop ? (
          <p className="text-sm text-gray-400">Nenhum estabelecimento encontrado.</p>
        ) : (
          <>
            {tab === 'info'      && <InfoTab      shop={shop} onSaved={setShop} />}
            {tab === 'hours'     && <HoursTab     shop={shop} onSaved={setShop} />}
            {tab === 'employees' && <EmployeesTab shop={shop} />}
          </>
        )}
      </div>
    </div>
  );
}
