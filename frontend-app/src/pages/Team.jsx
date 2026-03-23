import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Briefcase, Plus, KeyRound, Shield, Trash2, Save, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Barbershops, Roles } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const TABS = [
  { id: 'team',  label: 'Equipe',  icon: Users     },
  { id: 'roles', label: 'Funções', icon: Briefcase },
];

const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard'          },
  { key: 'agenda',    label: 'Agenda'             },
  { key: 'services',  label: 'Serviços'           },
  { key: 'clients',   label: 'Clientes'           },
  { key: 'sales',     label: 'Vendas'             },
  { key: 'stock',     label: 'Estoque'            },
  { key: 'reports',   label: 'Relatórios'         },
  { key: 'business',  label: 'Desempenho'         },
  { key: 'reception', label: 'Recepção Virtual'   },
];

const PERM_LABELS = {
  view:                'Visualizar',
  edit:                'Editar',
  receiveAppointments: 'Receber agendamentos',
};

const DEFAULT_PERMISSIONS = () =>
  Object.fromEntries(SECTIONS.map(s => [
    s.key,
    { view: false, edit: false, ...(s.key === 'agenda' ? { receiveAppointments: false } : {}) },
  ]));

// ── Helpers ────────────────────────────────────────────────────────────────────
function RoleBadge({ role, customRole }) {
  if (customRole) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
        style={{ backgroundColor: customRole.color || '#6b7280' }}
      >
        {customRole.name}
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
        <Crown size={10} /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
      Funcionário
    </span>
  );
}

// ── EmployeeModal ──────────────────────────────────────────────────────────────
function EmployeeModal({ open, onClose, shopId, roles, onCreated }) {
  const [form,    setForm]    = useState({ name: '', email: '', password: '', customRole: '' });
  const [saving,  setSaving]  = useState(false);

  useEffect(() => { if (open) setForm({ name: '', email: '', password: '', customRole: '' }); }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) return toast('Preencha todos os campos.', 'error');
    if (form.password.length < 6) return toast('Senha mínima: 6 caracteres.', 'error');
    setSaving(true);
    const r = await Barbershops.createEmployee(shopId, {
      name:       form.name,
      email:      form.email,
      password:   form.password,
      customRole: form.customRole || undefined,
    });
    setSaving(false);
    if (r.ok) { toast('Funcionário criado!'); onCreated(r.data.data); onClose(); }
    else      toast(r.data?.message || 'Erro ao criar funcionário.', 'error');
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo funcionário" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}><Save size={14} className="mr-1.5" />Criar</Button>
      </>}
    >
      <div className="space-y-4">
        <Input label="Nome completo" required value={form.name}     onChange={set('name')}     placeholder="Ex: Carlos Silva" />
        <Input label="E-mail"        required value={form.email}    onChange={set('email')}    placeholder="carlos@estabelecimento.com" type="email" />
        <Input label="Senha"         required value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" type="password" autoComplete="new-password" />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função</label>
          <select
            value={form.customRole}
            onChange={set('customRole')}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          >
            <option value="">— Sem função —</option>
            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ── ResetPasswordModal ─────────────────────────────────────────────────────────
function ResetPasswordModal({ open, onClose, employee, shopId }) {
  const [password, setPassword] = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { if (open) setPassword(''); }, [open]);

  const handleSave = async () => {
    if (!password || password.length < 6) return toast('Senha mínima: 6 caracteres.', 'error');
    setSaving(true);
    const r = await Barbershops.resetEmployeePassword(shopId, employee._id, password);
    setSaving(false);
    if (r.ok) { toast('Senha redefinida!'); onClose(); }
    else      toast(r.data?.message || 'Erro ao redefinir senha.', 'error');
  };

  return (
    <Modal open={open} onClose={onClose} title={`Redefinir senha — ${employee?.name || ''}`} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}><KeyRound size={14} className="mr-1.5" />Salvar</Button>
      </>}
    >
      <Input label="Nova senha" type="password" value={password} onChange={e => setPassword(e.target.value)}
        placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
    </Modal>
  );
}

// ── EditRoleModal ──────────────────────────────────────────────────────────────
function EditEmployeeModal({ open, onClose, employee, shopId, roles, onUpdated }) {
  const [roleId,    setRoleId]    = useState('');
  const [sysRole,   setSysRole]   = useState('barbeiro');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (open && employee) {
      setRoleId(employee.customRole?._id || employee.customRole || '');
      setSysRole(employee.role || 'barbeiro');
    }
  }, [open, employee]);

  const handleSave = async () => {
    setSaving(true);
    const r = await Barbershops.updateEmployeeRole(shopId, employee._id, {
      role:       sysRole,
      customRole: roleId || null,
    });
    setSaving(false);
    if (r.ok) { toast('Perfil atualizado!'); onUpdated(r.data.data); onClose(); }
    else      toast(r.data?.message || 'Erro ao atualizar.', 'error');
  };

  return (
    <Modal open={open} onClose={onClose} title={`Editar perfil — ${employee?.name || ''}`} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}><Save size={14} className="mr-1.5" />Salvar</Button>
      </>}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível de acesso</label>
          <select
            value={sysRole}
            onChange={e => setSysRole(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          >
            <option value="barbeiro">Funcionário</option>
            <option value="admin">Administrador</option>
          </select>
          {sysRole === 'admin' && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              Administradores têm acesso total ao sistema.
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Função</label>
          <select
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
          >
            <option value="">— Sem função —</option>
            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

// ── RoleFormModal ──────────────────────────────────────────────────────────────
function RoleFormModal({ open, onClose, existing, onSaved }) {
  const empty = { name: '', color: '#6b7280', permissions: DEFAULT_PERMISSIONS() };
  const [form,   setForm]   = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existing) {
        setForm({
          name:        existing.name,
          color:       existing.color || '#6b7280',
          permissions: existing.permissions
            ? JSON.parse(JSON.stringify(existing.permissions))
            : DEFAULT_PERMISSIONS(),
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, existing]);

  const togglePerm = (section, perm) =>
    setForm(f => ({
      ...f,
      permissions: {
        ...f.permissions,
        [section]: { ...f.permissions[section], [perm]: !f.permissions[section]?.[perm] },
      },
    }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast('Nome da função é obrigatório.', 'error');
    setSaving(true);
    const r = existing
      ? await Roles.update(existing._id, form)
      : await Roles.create(form);
    setSaving(false);
    if (r.ok) { toast(existing ? 'Função atualizada!' : 'Função criada!'); onSaved(r.data.data); onClose(); }
    else      toast(r.data?.message || 'Erro ao salvar.', 'error');
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Editar função' : 'Nova função'} size="xl"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}><Save size={14} className="mr-1.5" />Salvar</Button>
      </>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome da função" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Recepcionista" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-10 h-9 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer p-0.5 bg-white dark:bg-gray-900" />
              <span className="text-sm text-gray-500 dark:text-gray-400">{form.color}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: form.color }}>
                {form.name || 'Prévia'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Permissões</p>
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Seção</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-20 text-center">Visualizar</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-16 text-center">Editar</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-28 text-center">Agendamentos</span>
            </div>
            {SECTIONS.map((s, i) => {
              const perms = form.permissions?.[s.key] || {};
              return (
                <div key={s.key} className={cn(
                  'grid grid-cols-[1fr_auto_auto_auto] items-center gap-0 px-4 py-3',
                  i !== SECTIONS.length - 1 && 'border-b border-gray-50 dark:border-gray-800/60',
                )}>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{s.label}</span>
                  <div className="w-20 flex justify-center">
                    <Checkbox checked={!!perms.view} onChange={() => togglePerm(s.key, 'view')} />
                  </div>
                  <div className="w-16 flex justify-center">
                    <Checkbox checked={!!perms.edit} onChange={() => togglePerm(s.key, 'edit')} />
                  </div>
                  <div className="w-28 flex justify-center">
                    {s.key === 'agenda'
                      ? <Checkbox checked={!!perms.receiveAppointments} onChange={() => togglePerm(s.key, 'receiveAppointments')} />
                      : <span className="text-gray-200 dark:text-gray-700">—</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors',
        checked
          ? 'bg-brand-500 border-brand-500 text-white'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900',
      )}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// ── TeamTab ────────────────────────────────────────────────────────────────────
function TeamTab({ shop, roles }) {
  const [employees,      setEmployees]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [resetTarget,    setResetTarget]    = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [removingId,     setRemovingId]     = useState(null);

  useEffect(() => {
    if (!shop?._id) return;
    Barbershops.getEmployees(shop._id).then(r => {
      if (r.ok) setEmployees(r.data.data || []);
      setLoading(false);
    });
  }, [shop?._id]);

  const handleCreated = (emp) => setEmployees(prev => [...prev, emp]);

  const handleUpdated = (emp) =>
    setEmployees(prev => prev.map(e => e._id === emp._id ? emp : e));

  const handleRemove = async (emp) => {
    if (!window.confirm(`Remover ${emp.name} da equipe?`)) return;
    setRemovingId(emp._id);
    const r = await Barbershops.removeEmployee(shop._id, emp._id);
    setRemovingId(null);
    if (r.ok) { toast('Funcionário removido.'); setEmployees(prev => prev.filter(e => e._id !== emp._id)); }
    else      toast(r.data?.message || 'Erro ao remover.', 'error');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{employees.length} funcionário{employees.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} className="mr-1.5" /> Novo funcionário
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
          <Users size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum funcionário cadastrado.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {employees.map((emp, i) => (
            <div key={emp._id} className={cn(
              'flex items-center gap-3 px-4 py-3',
              i !== employees.length - 1 && 'border-b border-gray-50 dark:border-gray-800/60',
            )}>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold shrink-0 overflow-hidden">
                {emp.profileImage
                  ? <img src={emp.profileImage} alt="" className="w-full h-full object-cover" />
                  : emp.name?.slice(0, 2).toUpperCase()
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{emp.name}</span>
                  <RoleBadge role={emp.role} customRole={emp.customRole} />
                </div>
                <p className="text-xs text-gray-400 truncate">{emp.email}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditTarget(emp)}
                  title="Editar perfil / promover"
                  aria-label={`Editar perfil de ${emp.name}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                >
                  <Shield size={14} />
                </button>
                <button
                  onClick={() => setResetTarget(emp)}
                  title="Redefinir senha"
                  aria-label={`Redefinir senha de ${emp.name}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <KeyRound size={14} />
                </button>
                <button
                  onClick={() => handleRemove(emp)}
                  disabled={removingId === emp._id}
                  title="Remover funcionário"
                  aria-label={`Remover ${emp.name}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                >
                  {removingId === emp._id
                    ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 size={14} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmployeeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        shopId={shop?._id}
        roles={roles}
        onCreated={handleCreated}
      />
      <ResetPasswordModal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        employee={resetTarget}
        shopId={shop?._id}
      />
      <EditEmployeeModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        employee={editTarget}
        shopId={shop?._id}
        roles={roles}
        onUpdated={handleUpdated}
      />
    </>
  );
}

// ── RolesTab ───────────────────────────────────────────────────────────────────
function RolesTab() {
  const [roles,       setRoles]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [removingId,  setRemovingId]  = useState(null);

  useEffect(() => {
    Roles.getAll().then(r => {
      if (r.ok) setRoles(r.data.data || []);
      setLoading(false);
    });
  }, []);

  const handleSaved = (role) => {
    setRoles(prev => {
      const idx = prev.findIndex(r => r._id === role._id);
      if (idx >= 0) { const next = [...prev]; next[idx] = role; return next; }
      return [...prev, role];
    });
  };

  const handleRemove = async (role) => {
    if (!window.confirm(`Remover a função "${role.name}"?`)) return;
    setRemovingId(role._id);
    const r = await Roles.delete(role._id);
    setRemovingId(null);
    if (r.ok) { toast('Função removida.'); setRoles(prev => prev.filter(r => r._id !== role._id)); }
    else      toast(r.data?.message || 'Erro ao remover.', 'error');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{roles.length} função{roles.length !== 1 ? 'ções' : ''}</p>
        <Button size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
          <Plus size={14} className="mr-1.5" /> Nova função
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
          <Briefcase size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma função criada.</p>
          <p className="text-xs mt-1">Crie funções como Recepcionista, Manicure, etc.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {roles.map((role, i) => {
            const perms = role.permissions || {};
            const activeSections = SECTIONS.filter(s => perms[s.key]?.view || perms[s.key]?.edit || perms[s.key]?.receiveAppointments);
            return (
              <div key={role._id} className={cn(
                'flex items-center gap-3 px-4 py-3',
                i !== roles.length - 1 && 'border-b border-gray-50 dark:border-gray-800/60',
              )}>
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: role.color || '#6b7280' }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-white" style={{ backgroundColor: role.color || '#6b7280' }}>
                      {role.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeSections.length > 0
                      ? activeSections.map(s => s.label).join(', ')
                      : 'Sem permissões definidas'
                    }
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditTarget(role); setFormOpen(true); }}
                    title="Editar função"
                    aria-label={`Editar função ${role.name}`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                  >
                    <Shield size={14} />
                  </button>
                  <button
                    onClick={() => handleRemove(role)}
                    disabled={removingId === role._id}
                    title="Remover função"
                    aria-label={`Remover função ${role.name}`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {removingId === role._id
                      ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RoleFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        existing={editTarget}
        onSaved={handleSaved}
      />
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Team() {
  const { isAdmin, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab    = searchParams.get('tab') || 'team';
  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });

  const [shop,    setShop]    = useState(null);
  const [roles,   setRoles]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      Barbershops.getMine(),
      Roles.getAll(),
    ]).then(([shopRes, rolesRes]) => {
      if (shopRes.ok)  setShop(shopRes.data.data);
      if (rolesRes.ok) setRoles(rolesRes.data.data || []);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Equipe</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie funcionários e funções do estabelecimento</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : (
          <>
            {tab === 'team'  && <TeamTab  shop={shop} roles={roles} />}
            {tab === 'roles' && <RolesTab />}
          </>
        )}
      </div>
    </div>
  );
}
