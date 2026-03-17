import { useState } from 'react';
import { User, Palette, Eye, EyeOff } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Portal } from '../../utils/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const TABS = [
  { id: 'account',    label: 'Conta',      icon: User },
  { id: 'appearance', label: 'Aparência',  icon: Palette },
];

function AccountTab({ client, updateClient }) {
  const [name,    setName]    = useState(client?.name || '');
  const [pwd,     setPwd]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    if (pwd && pwd !== confirm) { toast('As senhas não coincidem.', 'error'); return; }
    if (pwd && pwd.length < 6)  { toast('A senha deve ter no mínimo 6 caracteres.', 'error'); return; }
    setSaving(true);
    const body = { name };
    if (pwd) body.password = pwd;
    const r = await Portal.Auth.updateProfile(body);
    setSaving(false);
    if (r.ok) {
      updateClient({ name: r.data.user.name });
      setPwd(''); setConfirm('');
      toast('Perfil atualizado!');
    } else {
      toast(r.data?.message || 'Erro ao salvar.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
        <input disabled value={client?.phone || ''} className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed" />
        <p className="text-xs text-gray-400 mt-1">O telefone não pode ser alterado.</p>
      </div>

      <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />

      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Alterar senha</p>
        <div className="relative">
          <Input
            type={showPwd ? 'text' : 'password'}
            placeholder="Nova senha (mínimo 6 caracteres)"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
          />
          <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {pwd && <Input type="password" placeholder="Confirmar nova senha" value={confirm} onChange={e => setConfirm(e.target.value)} />}
      </div>

      <Button onClick={handleSave} loading={saving}>Salvar alterações</Button>
    </div>
  );
}

function AppearanceTab() {
  const { mode, setMode } = useTheme();
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</p>
      <div className="flex gap-3">
        {[
          { label: 'Automático', value: 'auto'  },
          { label: 'Claro',      value: 'light' },
          { label: 'Escuro',     value: 'dark'  },
        ].map(opt => (
          <button type="button" key={opt.value} onClick={() => setMode(opt.value)}
            className={cn('flex-1 py-3 rounded-xl border text-sm font-medium transition-colors',
              mode === opt.value
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300')}>
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        {mode === 'auto' ? 'Seguindo a preferência do sistema.' : mode === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.'}
      </p>
    </div>
  );
}

export default function ClientSettings() {
  const { client, updateClient } = useClientAuth();
  const [tab, setTab] = useState('account');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie sua conta</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button type="button" key={id} onClick={() => setTab(id)}
            className={cn('flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        {tab === 'account'    && <AccountTab    client={client} updateClient={updateClient} />}
        {tab === 'appearance' && <AppearanceTab />}
      </div>
    </div>
  );
}
