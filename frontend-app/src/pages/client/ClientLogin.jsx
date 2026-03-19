import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useClientAuth } from '../../context/ClientAuthContext';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import JubaOSLogo from '../../components/ui/JubaOSLogo';

export default function ClientLogin() {
  const { login }    = useClientAuth();
  const { dark, toggle } = useTheme();
  const navigate     = useNavigate();

  const [form, setForm]       = useState({ phone: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.password) { setError('Preencha todos os campos.'); return; }
    setError('');
    setLoading(true);
    const r = await login(form.phone, form.password);
    setLoading(false);
    if (r.ok) navigate('/client');
    else setError(r.data?.message || 'Credenciais inválidas.');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <button onClick={toggle} className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm">
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mb-4">
            <JubaOSLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{background:'linear-gradient(135deg,#5eead4 0%,#a78bfa 50%,#7c3aed 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>JubaOS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Entre para agendar serviços</p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <Link to="/login" className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors', 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600')}>
            Sou Profissional
          </Link>
          <Link to="/client/login" className={cn('flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-colors', 'bg-violet-600 text-white')}>
            Sou Cliente
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={set('phone')} autoComplete="tel" />

            <div className="relative">
              <Input
                label="Senha"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

            <div className="flex justify-end">
              <Link to="/client/forgot-password" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" className="w-full" loading={loading}>Entrar</Button>
          </form>
        </div>

      </div>
    </div>
  );
}
