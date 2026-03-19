import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Loader2, Store, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import JubaOSLogo from '../components/ui/JubaOSLogo';
import { useTheme } from '../context/ThemeContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { cn } from '../utils/cn';

const ESTABLISHMENT_TYPES = [
  { value: 'barbearia',   label: 'Barbearia' },
  { value: 'salao',       label: 'Salão de Beleza' },
  { value: 'manicure',    label: 'Manicure' },
  { value: 'sobrancelha', label: 'Sobrancelha' },
  { value: 'cilios',      label: 'Cílios' },
  { value: 'outros',      label: 'Outros' },
];

function checkStrength(pwd) {
  return {
    length:    pwd.length >= 8,
    lowercase: /[a-z]/.test(pwd),
    uppercase: /[A-Z]/.test(pwd),
    number:    /\d/.test(pwd),
  };
}

async function fetchCep(cep) {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const d = await r.json();
    return d.erro ? null : d;
  } catch {
    return null;
  }
}

function maskDocument(v) {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join('.') + (e ? '-' + e : '')
    );
  }
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, dd, e) =>
    [a, b, c, dd].filter(Boolean).join('.').replace(/\.(\d{4})/, '/$1') + (e ? '-' + e : '')
  );
}

const STEPS = ['Conta', 'Estabelecimento', 'Segurança'];

export default function Register() {
  const { register } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [role, setRole] = useState(null); // null = choosing, 'profissional' = show form
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', email: '',
    barbershopName: '', establishmentType: 'barbearia',
    phone: '', document: '',
    zipCode: '', street: '', neighborhood: '', number: '', complement: '', city: '', state: '',
    noNumber: false, noComplement: false,
    password: '', confirm: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [showPwd,    setShowPwd]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);

  const set    = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggle_ = (k) =>      setForm(f => ({ ...f, [k]: !f[k] }));

  const handleDocChange = (e) => setForm(f => ({ ...f, document: maskDocument(e.target.value) }));

  const handleCepBlur = async () => {
    const clean = form.zipCode.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    const data = await fetchCep(clean);
    setCepLoading(false);
    if (data) {
      setForm(f => ({
        ...f,
        street:       data.logradouro || f.street,
        neighborhood: data.bairro     || f.neighborhood,
        city:         data.localidade || f.city,
        state:        data.uf         || f.state,
      }));
    }
  };

  const strength = checkStrength(form.password);
  const allMet   = Object.values(strength).every(Boolean);

  const pwdRules = [
    { key: 'length',    label: 'Mínimo 8 caracteres' },
    { key: 'uppercase', label: 'Letra maiúscula' },
    { key: 'lowercase', label: 'Letra minúscula' },
    { key: 'number',    label: 'Número' },
  ];

  const nextStep = () => {
    setError('');
    if (step === 0) {
      if (!form.name || !form.email) return setError('Preencha nome e e-mail.');
    }
    if (step === 1) {
      if (!form.barbershopName)               return setError('Informe o nome do estabelecimento.');
      if (!form.phone)                        return setError('Informe o telefone.');
      if (!form.document)                     return setError('Informe o CPF ou CNPJ.');
      if (!form.zipCode || !form.street)      return setError('Informe o CEP e aguarde o preenchimento do endereço.');
      if (!form.city)                         return setError('Informe a cidade.');
      if (!form.noNumber && !form.number)     return setError('Informe o número ou marque "Sem Número".');
    }
    setStep(s => s + 1);
  };

  // Build composed address string for saving
  const buildAddress = () => {
    const parts = [form.street];
    parts.push(form.noNumber ? 'S/N' : form.number);
    if (!form.noComplement && form.complement) parts.push(form.complement);
    return parts.filter(Boolean).join(', ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!allMet)                        return setError('A senha não atende aos requisitos mínimos.');
    if (form.password !== form.confirm) return setError('As senhas não coincidem.');

    setLoading(true);
    const r = await register(form.name, form.email, form.password, 'admin', form.barbershopName, undefined, {
      establishmentType: form.establishmentType,
      phone:    form.phone,
      document: form.document,
      address:      buildAddress(),
      neighborhood: form.neighborhood,
      zipCode:      form.zipCode.replace(/\D/g, ''),
      city:         form.city,
      state:        form.state,
    });
    setLoading(false);

    if (r.ok) setSuccess(true);
    else setError(r.data?.message || 'Erro ao criar conta.');
  };

  // Role selection screen
  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <button
          onClick={toggle}
          className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm"
        >
          {dark ? '☀️' : '🌙'}
        </button>

        <div className="w-full max-w-sm animate-fade-up">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
              <JubaOSLogo size={56} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span style={{background:'linear-gradient(135deg,#5eead4 0%,#a78bfa 50%,#7c3aed 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>JubaOS</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Como deseja se cadastrar?</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setRole('profissional')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                <Store size={22} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sou Profissional</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Quero cadastrar meu estabelecimento</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/client/register')}
              className="w-full flex items-center gap-4 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                <User size={22} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sou Cliente</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Quero agendar serviços</p>
              </div>
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <button
        onClick={toggle}
        className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shadow-sm"
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
            <JubaOSLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span style={{background:'linear-gradient(135deg,#5eead4 0%,#a78bfa 50%,#7c3aed 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>JubaOS</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Comece gratuitamente por 30 dias</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
          {success ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={22} className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Verifique seu e-mail</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enviamos um link de confirmação para <strong>{form.email}</strong>.<br />
                Clique no link para ativar sua conta.
              </p>
              <Link to="/login" className="inline-block mt-2 text-sm text-violet-600 dark:text-violet-400 font-medium hover:underline">
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center mb-5">
                {STEPS.map((label, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                        i <= step ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                      )}>
                        {i < step ? <CheckCircle2 size={12} /> : i + 1}
                      </div>
                      <span className={cn('text-xs', i === step ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-500')}>
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={cn('h-px flex-1 mx-2', i < step ? 'bg-violet-300 dark:bg-violet-700' : 'bg-gray-100 dark:bg-gray-800')} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step 0 — Conta */}
              {step === 0 && (
                <div className="space-y-4">
                  <Input label="Nome completo" placeholder="João da Silva" value={form.name} onChange={set('name')} autoComplete="name" />
                  <Input label="E-mail" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} autoComplete="email" />
                  {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
                  <Button type="button" className="w-full" onClick={nextStep}>Continuar</Button>
                </div>
              )}

              {/* Step 1 — Estabelecimento */}
              {step === 1 && (
                <div className="space-y-3">
                  {/* Tipo */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de estabelecimento</label>
                    <select
                      value={form.establishmentType}
                      onChange={set('establishmentType')}
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                    >
                      {ESTABLISHMENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <Input label="Nome do estabelecimento" placeholder="Ex: Barbearia do João" value={form.barbershopName} onChange={set('barbershopName')} />

                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Telefone" placeholder="(11) 99999-9999" value={form.phone} onChange={set('phone')} />
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CPF / CNPJ</label>
                      <input
                        type="text"
                        value={form.document}
                        onChange={handleDocChange}
                        placeholder="000.000.000-00"
                        maxLength={18}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* CEP */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      CEP
                      {cepLoading && <Loader2 size={12} className="animate-spin text-violet-500" />}
                    </label>
                    <input
                      type="text"
                      value={form.zipCode}
                      onChange={set('zipCode')}
                      onBlur={handleCepBlur}
                      placeholder="00000-000"
                      maxLength={9}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors"
                    />
                  </div>

                  {/* Rua + Bairro auto-filled */}
                  <Input
                    label="Rua"
                    placeholder="Preenchido automaticamente pelo CEP"
                    value={form.street}
                    onChange={set('street')}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Bairro"
                      placeholder="Preenchido automaticamente"
                      value={form.neighborhood}
                      onChange={set('neighborhood')}
                    />
                    <Input
                      label="Cidade"
                      placeholder="Preenchido automaticamente"
                      value={form.city}
                      onChange={set('city')}
                    />
                  </div>

                  {/* Número */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número</label>
                    <input
                      type="text"
                      value={form.number}
                      onChange={set('number')}
                      disabled={form.noNumber}
                      placeholder={form.noNumber ? 'Sem número' : 'Ex: 123'}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors',
                        form.noNumber && 'opacity-50 cursor-not-allowed'
                      )}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.noNumber}
                        onChange={() => toggle_('noNumber')}
                        className="w-3.5 h-3.5 accent-violet-600"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Sem Número</span>
                    </label>
                  </div>

                  {/* Complemento */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Complemento</label>
                    <input
                      type="text"
                      value={form.complement}
                      onChange={set('complement')}
                      disabled={form.noComplement}
                      placeholder={form.noComplement ? 'Sem complemento' : 'Ex: Sala 2, Apto 10'}
                      className={cn(
                        'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-colors',
                        form.noComplement && 'opacity-50 cursor-not-allowed'
                      )}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.noComplement}
                        onChange={() => toggle_('noComplement')}
                        className="w-3.5 h-3.5 accent-violet-600"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Sem Complemento</span>
                    </label>
                  </div>

                  {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => { setStep(0); setError(''); }}>Voltar</Button>
                    <Button type="button" className="flex-1" onClick={nextStep}>Continuar</Button>
                  </div>
                </div>
              )}

              {/* Step 2 — Segurança */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <Input
                      label="Senha"
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      value={form.password}
                      onChange={set('password')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 bottom-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {pwdRules.map(r => (
                        <div key={r.key} className={cn('flex items-center gap-1.5 text-xs', strength[r.key] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500')}>
                          <CheckCircle2 size={12} className={strength[r.key] ? 'opacity-100' : 'opacity-30'} />
                          {r.label}
                        </div>
                      ))}
                    </div>
                  )}
                  <Input label="Confirmar senha" type="password" placeholder="Repita a senha" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                  {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => { setStep(1); setError(''); }}>Voltar</Button>
                    <Button type="submit" className="flex-1" loading={loading}>Criar conta</Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        <button
          onClick={() => { setRole(null); setStep(0); setError(''); }}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-4 mx-auto"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
