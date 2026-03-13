import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import { toast } from '../components/ui/Toast';

export default function Register() {
  const { register } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '', role: 'admin', barbershopName: '', barbershopId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password)         return setError('Preencha todos os campos.');
    if (form.password !== form.confirm)                       return setError('As senhas não coincidem.');
    if (form.password.length < 6)                             return setError('Senha mínima: 6 caracteres.');
    if (form.role === 'admin'    && !form.barbershopName)     return setError('Informe o nome da barbearia.');
    if (form.role === 'barbeiro' && !form.barbershopId)       return setError('Informe o código da barbearia.');

    setLoading(true);
    const r = await register(
      form.name, form.email, form.password, form.role,
      form.role === 'admin'    ? form.barbershopName : undefined,
      form.role === 'barbeiro' ? form.barbershopId   : undefined,
    );
    setLoading(false);

    if (r.ok) {
      toast('Conta criada! Faça login para continuar.');
      navigate('/login');
    } else {
      setError(r.data?.message || 'Erro ao criar conta.');
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
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center mb-4 shadow-lg shadow-brand-500/25">
            <Scissors size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Criar conta</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Comece gratuitamente</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nome completo" placeholder="João da Silva" value={form.name} onChange={set('name')} />
            <Input label="E-mail" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} />

            <Select label="Tipo de conta" value={form.role} onChange={set('role')}>
              <option value="admin">Administrador — criar nova barbearia</option>
              <option value="barbeiro">Barbeiro — entrar em barbearia existente</option>
            </Select>

            {form.role === 'admin' && (
              <Input
                label="Nome da Barbearia"
                placeholder="Ex: Barbearia do João"
                value={form.barbershopName}
                onChange={set('barbershopName')}
              />
            )}

            {form.role === 'barbeiro' && (
              <Input
                label="Código da Barbearia"
                placeholder="ID fornecido pelo administrador"
                value={form.barbershopId}
                onChange={set('barbershopId')}
              />
            )}

            <Input label="Senha" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} autoComplete="new-password" />
            <Input label="Confirmar senha" type="password" placeholder="Repita a senha" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Criar conta
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
