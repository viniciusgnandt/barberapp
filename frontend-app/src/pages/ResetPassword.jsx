import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import JubaOSLogo from '../components/ui/JubaOSLogo';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { Auth } from '../utils/api';
import { cn } from '../utils/cn';

// Password strength checker
function checkStrength(pwd) {
  return {
    length:    pwd.length >= 8,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    number:    /\d/.test(pwd),
  };
}

export default function ResetPassword() {
  const { dark, toggle } = useTheme();
  const navigate         = useNavigate();
  const [params]         = useSearchParams();
  const token            = params.get('token');

  const [form,    setForm]    = useState({ password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const strength = checkStrength(form.password);
  const allMet   = Object.values(strength).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!allMet)            { setError('A senha não atende aos requisitos.'); return; }
    if (form.password !== form.confirm) { setError('As senhas não coincidem.'); return; }
    if (!token)             { setError('Token não encontrado na URL.'); return; }

    setLoading(true);
    const r = await Auth.resetPassword(token, form.password);
    setLoading(false);

    if (r.ok) {
      toast('Senha redefinida com sucesso!');
      navigate('/login');
    } else {
      setError(r.data?.message || 'Erro ao redefinir senha.');
    }
  };

  const rules = [
    { key: 'length',    label: 'Mínimo 8 caracteres' },
    { key: 'uppercase', label: 'Letra maiúscula' },
    { key: 'lowercase', label: 'Letra minúscula' },
    { key: 'number',    label: 'Número' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm"
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
            <JubaOSLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Nova senha</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crie uma senha forte para sua conta</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="Nova senha"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
              />
              <button
                type="button"
                onClick={() => setShowPwd(s => !s)}
                className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password rules */}
            {form.password && (
              <div className="grid grid-cols-2 gap-1.5">
                {rules.map(r => (
                  <div key={r.key} className={cn('flex items-center gap-1.5 text-xs', strength[r.key] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500')}>
                    <CheckCircle2 size={12} className={strength[r.key] ? 'opacity-100' : 'opacity-30'} />
                    {r.label}
                  </div>
                ))}
              </div>
            )}

            <Input
              label="Confirmar senha"
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              value={form.confirm}
              onChange={set('confirm')}
            />

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Redefinir senha
            </Button>
          </form>
        </div>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-4"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
