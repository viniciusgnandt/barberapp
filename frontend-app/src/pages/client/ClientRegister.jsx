import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Scissors } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ClientRegister() {
  const { register }     = useClientAuth();
  const { dark, toggle } = useTheme();
  const navigate         = useNavigate();

  const [form, setForm]       = useState({ name: '', phone: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password) { setError('Preencha todos os campos.'); return; }
    if (form.password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return; }
    setError('');
    setLoading(true);
    const r = await register(form.name, form.phone, form.password);
    setLoading(false);
    if (r.ok) navigate('/client');
    else setError(r.data?.message || 'Erro ao criar conta.');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <button onClick={toggle} className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 transition-colors shadow-sm">
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center mb-4">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Criar conta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cadastre-se para agendar serviços</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nome completo" placeholder="João da Silva" value={form.name} onChange={set('name')} autoComplete="name" />
            <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={set('phone')} autoComplete="tel" />

            <div className="relative">
              <Input
                label="Senha"
                type={showPwd ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Input label="Confirmar senha" type="password" placeholder="Repita a senha" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

            <Button type="submit" className="w-full" loading={loading}>Criar conta</Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Já tem conta?{' '}
          <Link to="/client/login" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
