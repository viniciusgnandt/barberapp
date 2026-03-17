import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Mail } from 'lucide-react';
import JubaOSLogo from '../components/ui/JubaOSLogo';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Auth } from '../utils/api';

export default function ForgotPassword() {
  const { dark, toggle } = useTheme();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Informe seu e-mail.'); return; }
    setError('');
    setLoading(true);
    const r = await Auth.forgotPassword(email);
    setLoading(false);
    if (r.ok) {
      setSent(true);
    } else {
      setError(r.data?.message || 'Erro ao enviar e-mail.');
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Esqueci minha senha</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <Mail size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Se este e-mail estiver cadastrado, você receberá as instruções em breve.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Verifique também sua pasta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              {error && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Button type="submit" className="w-full" loading={loading}>
                Enviar link de redefinição
              </Button>
            </form>
          )}
        </div>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-4"
        >
          <ChevronLeft size={14} /> Voltar ao login
        </Link>
      </div>
    </div>
  );
}
