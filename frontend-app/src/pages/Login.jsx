import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronLeft, CheckCircle2, Mail } from 'lucide-react';
import JubaOSLogo from '../components/ui/JubaOSLogo';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';
import { Auth } from '../utils/api';

function ProfileCard({ profile, onSelect, loading }) {
  const initials = profile.name
    ?.split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <button
      onClick={() => onSelect(profile.id)}
      disabled={loading}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-all text-left disabled:opacity-50"
    >
      <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
        {profile.profileImage
          ? <img src={profile.profileImage} alt={profile.name} className="w-full h-full object-cover" />
          : initials
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{profile.barbershopName}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant={profile.role} />
        </div>
      </div>
      {profile.barbershopLogo && (
        <img src={profile.barbershopLogo} alt="logo" className="w-6 h-6 rounded object-cover shrink-0 opacity-70" />
      )}
    </button>
  );
}

export default function Login() {
  const { login, selectProfile, cancelSelection, pendingSelection } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(null); // profileId being selected
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Preencha todos os campos.'); return; }
    setError('');
    setLoading(true);
    const r = await login(form.email, form.password);
    setLoading(false);
    if (r.ok && !r.needsSelection) {
      toast('Login realizado com sucesso!');
      navigate('/dashboard');
    } else if (!r.ok) {
      if (r.data?.needsEmailVerification) {
        setNeedsVerification(true);
      }
      setError(r.data?.message || 'Credenciais inválidas.');
    }
    // Se needsSelection, o AuthContext seta pendingSelection e a tela muda
  };

  const handleSelectProfile = async (profileId) => {
    setSelecting(profileId);
    const r = await selectProfile(profileId);
    setSelecting(null);
    if (r.ok) {
      toast('Login realizado com sucesso!');
      navigate('/dashboard');
    } else {
      setError(r.data?.message || 'Erro ao selecionar perfil.');
    }
  };

  const handleBack = () => {
    cancelSelection();
    setError('');
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    await Auth.resendVerification(form.email);
    setResendLoading(false);
    setResendSent(true);
  };

  // ── Tela de seleção de perfil ──────────────────────────────────────────────
  if (pendingSelection) {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Escolha um perfil</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {pendingSelection.profiles.length} perfis encontrados para <strong>{pendingSelection.email}</strong>
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm space-y-2">
            {pendingSelection.profiles.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                onSelect={handleSelectProfile}
                loading={!!selecting}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mt-3">{error}</p>
          )}

          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-4 mx-auto"
          >
            <ChevronLeft size={14} /> Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  // ── Tela de login ──────────────────────────────────────────────────────────
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
          <h1 className="text-2xl font-bold tracking-tight" style={{background:'linear-gradient(135deg,#5eead4 0%,#a78bfa 50%,#7c3aed 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>JubaOS</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Entre na sua conta</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
            />

            <div className="relative">
              <Input
                label="Senha"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
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

            {error && (
              <div className="space-y-2">
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
                {needsVerification && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                    <Mail size={13} className="shrink-0" />
                    {resendSent
                      ? <span className="text-green-600 dark:text-green-400">E-mail de confirmação reenviado!</span>
                      : (
                        <span>
                          Não recebeu?{' '}
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendLoading}
                            className="text-violet-600 dark:text-violet-400 font-medium hover:underline disabled:opacity-50"
                          >
                            {resendLoading ? 'Enviando...' : 'Reenviar e-mail'}
                          </button>
                        </span>
                      )
                    }
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Entrar
            </Button>

            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                Esqueci minha senha
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Não tem conta?{' '}
          <Link to="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
