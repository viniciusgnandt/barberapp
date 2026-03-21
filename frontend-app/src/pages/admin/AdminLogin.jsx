import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformAdmin } from '../../utils/api';
import { Lock, Mail, Shield, KeyRound, ArrowLeft } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [step, setStep]       = useState('login'); // login | 2fa | forgot | reset
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]       = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    const r = await PlatformAdmin.login(email, password);
    setLoading(false);
    if (r.ok && r.data?.needsTwoFactor) {
      setStep('2fa');
    } else {
      setError(r.data?.message || 'Erro ao fazer login.');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const r = await PlatformAdmin.verify2FA(email, code);
    setLoading(false);
    if (r.ok && r.data?.token) {
      localStorage.setItem('adminToken', r.data.token);
      localStorage.setItem('adminUser', JSON.stringify(r.data.admin));
      navigate('/painel-administrativo');
    } else {
      setError(r.data?.message || 'Código inválido.');
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    const r = await PlatformAdmin.forgotPassword(email);
    setLoading(false);
    if (r.ok) {
      setSuccess('Código enviado para seu email.');
      setStep('reset');
    } else {
      setError(r.data?.message || 'Erro.');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (newPassword.length < 8) { setError('Senha deve ter no mínimo 8 caracteres.'); return; }
    setLoading(true);
    const r = await PlatformAdmin.resetPassword2(email, code, newPassword);
    setLoading(false);
    if (r.ok) {
      setSuccess('Senha redefinida! Faça login.');
      setStep('login');
      setCode(''); setNewPassword(''); setPassword('');
    } else {
      setError(r.data?.message || 'Erro.');
    }
  };

  const goBack = () => { setStep('login'); setError(''); setSuccess(''); setCode(''); setNewPassword(''); };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel Administrativo</h1>
          <p className="text-sm text-gray-400 mt-1">Acesso restrito</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 text-sm text-center">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-sm text-center">{success}</div>
        )}

        {/* LOGIN */}
        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                  placeholder="admin@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
                  placeholder="••••••••" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => { setStep('forgot'); setError(''); setSuccess(''); }}
              className="w-full text-sm text-gray-500 hover:text-violet-400 transition-colors">
              Esqueci minha senha
            </button>
          </form>
        )}

        {/* 2FA VERIFY */}
        {step === '2fa' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="text-center mb-2">
              <KeyRound size={24} className="mx-auto text-violet-400 mb-2" />
              <p className="text-sm text-gray-300">
                Código de verificação enviado para <strong className="text-white">{email}</strong>
              </p>
            </div>
            <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required maxLength={6} autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none"
              placeholder="000000" />
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
            <button type="button" onClick={goBack} className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Voltar ao login
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {step === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="text-center mb-2">
              <Lock size={24} className="mx-auto text-violet-400 mb-2" />
              <p className="text-sm text-gray-300">Digite seu email para receber o código de reset</p>
            </div>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:border-violet-500 outline-none"
                placeholder="admin@email.com" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
            <button type="button" onClick={goBack}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft size={14} /> Voltar ao login
            </button>
          </form>
        )}

        {/* RESET PASSWORD */}
        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="text-center mb-2">
              <KeyRound size={24} className="mx-auto text-violet-400 mb-2" />
              <p className="text-sm text-gray-300">
                Código enviado para <strong className="text-white">{email}</strong>
              </p>
            </div>
            <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required maxLength={6} autoFocus
              className="w-full text-center text-2xl tracking-[0.5em] py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:border-violet-500 outline-none"
              placeholder="000000" />
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-600 focus:border-violet-500 outline-none"
                placeholder="Nova senha (min. 8 caracteres)" />
            </div>
            <button type="submit" disabled={loading || code.length !== 6}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
            </button>
            <button type="button" onClick={goBack}
              className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              <ArrowLeft size={14} /> Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
