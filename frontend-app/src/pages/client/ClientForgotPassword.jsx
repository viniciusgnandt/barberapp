import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scissors, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Portal } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ClientForgotPassword() {
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [step,     setStep]    = useState(1); // 1 = phone, 2 = code + new password
  const [phone,    setPhone]   = useState('');
  const [code,     setCode]    = useState('');
  const [pwd,      setPwd]     = useState('');
  const [confirm,  setConfirm] = useState('');
  const [showPwd,  setShowPwd] = useState(false);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [success,  setSuccess] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phone.trim()) { setError('Informe o seu telefone.'); return; }
    setError('');
    setLoading(true);
    await Portal.Auth.forgotPassword(phone);
    setLoading(false);
    // Sempre avança para não revelar se o número existe
    setStep(2);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!code.trim())  { setError('Informe o código recebido.'); return; }
    if (!pwd)          { setError('Informe a nova senha.'); return; }
    if (pwd.length < 6){ setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (pwd !== confirm){ setError('As senhas não coincidem.'); return; }
    setError('');
    setLoading(true);
    const r = await Portal.Auth.resetPassword(phone, code, pwd);
    setLoading(false);
    if (r.ok) {
      setSuccess(true);
      setTimeout(() => navigate('/client/login'), 2500);
    } else {
      setError(r.data?.message || 'Código inválido ou expirado.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <button onClick={toggle} className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm">
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center mb-4">
            <Scissors size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recuperar senha</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
            {step === 1 ? 'Informe seu telefone cadastrado' : 'Insira o código e defina uma nova senha'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          {success ? (
            <div className="text-center py-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Senha redefinida!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Redirecionando para o login...</p>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <Input
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Você receberá um código de 6 dígitos para redefinir sua senha.
              </p>
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>Enviar código</Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                label="Código de verificação"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
              <div className="relative">
                <Input
                  label="Nova senha"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                />
                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwd && (
                <Input
                  type="password"
                  placeholder="Confirmar nova senha"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              )}
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>Redefinir senha</Button>
              <button type="button" onClick={() => { setStep(1); setError(''); setCode(''); }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1.5">
                <ArrowLeft size={14} /> Tentar com outro telefone
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          <Link to="/client/login" className="text-violet-600 dark:text-violet-400 font-medium hover:underline flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
