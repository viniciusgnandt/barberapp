import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Zap, Star, Crown, Check, Shield, MessageSquare, Sparkles, Users, BarChart3, Headphones } from 'lucide-react';
import { Billing as BillingAPI } from '../utils/api';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

// ── Plan config ─────────────────────────────────────────────────────────────

const PLANS = [
  {
    key:      'free',
    name:     'Free',
    price:    '0',
    period:   '',
    subtitle: 'Para conhecer a plataforma',
    color:    'gray',
    icon:     Zap,
    badge:    null,
    aiMsgs:   null,
    barbers:  '1 profissional',
    features: ['Agendamento online', 'Portal do cliente', 'Gestao basica'],
  },
  {
    key:      'starter',
    name:     'Starter',
    price:    '97',
    period:   '/mes',
    subtitle: 'Para quem esta comecando',
    color:    'amber',
    icon:     Zap,
    badge:    null,
    aiMsgs:   '500',
    barbers:  'Ate 3 profissionais',
    features: ['Agendamentos ilimitados', 'Relatorios basicos', 'Suporte por email', '500 msgs IA/mes'],
  },
  {
    key:      'professional',
    name:     'Professional',
    price:    '197',
    period:   '/mes',
    subtitle: 'O mais escolhido',
    color:    'brand',
    icon:     Star,
    badge:    'Recomendado',
    aiMsgs:   '2.000',
    barbers:  'Ate 10 profissionais',
    features: ['IA Recepcionista WhatsApp', 'Relatorios completos', 'Financeiro + Comandas', 'Notificacoes automaticas', '2.000 msgs IA/mes'],
  },
  {
    key:      'business',
    name:     'Business',
    price:    '397',
    period:   '/mes',
    subtitle: 'Para redes e grandes operacoes',
    color:    'violet',
    icon:     Crown,
    badge:    'Completo',
    aiMsgs:   '5.000',
    barbers:  'Profissionais ilimitados',
    features: ['Tudo do Professional', 'Suporte prioritario 24h', 'Multi-unidades (em breve)', '5.000 msgs IA/mes'],
  },
];

const colorMap = {
  gray:   {
    bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-400', badge: '', ring: '',
    btn: 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-default',
    gradient: 'from-gray-50 to-white dark:from-gray-900 dark:to-gray-900',
    border: 'border-gray-200 dark:border-gray-800',
    aiBar: 'bg-gray-200 dark:bg-gray-700',
  },
  amber: {
    bg: 'bg-amber-100 dark:bg-amber-900/30', icon: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    ring: 'ring-amber-400/50 dark:ring-amber-500/30',
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25',
    gradient: 'from-amber-50/50 to-white dark:from-amber-950/20 dark:to-gray-900',
    border: 'border-amber-200/70 dark:border-amber-800/40',
    aiBar: 'bg-amber-400 dark:bg-amber-500',
  },
  brand: {
    bg: 'bg-brand-100 dark:bg-brand-900/40', icon: 'text-brand-500',
    badge: 'bg-brand-500 text-white shadow-lg shadow-brand-500/30',
    ring: 'ring-2 ring-brand-500/50 dark:ring-brand-400/40',
    btn: 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white shadow-lg shadow-brand-500/30',
    gradient: 'from-brand-50/60 to-white dark:from-brand-950/30 dark:to-gray-900',
    border: 'border-brand-300/70 dark:border-brand-700/50',
    aiBar: 'bg-brand-500 dark:bg-brand-400',
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-900/30', icon: 'text-violet-500',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    ring: 'ring-violet-400/40 dark:ring-violet-500/30',
    btn: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25',
    gradient: 'from-violet-50/50 to-white dark:from-violet-950/20 dark:to-gray-900',
    border: 'border-violet-200/70 dark:border-violet-800/40',
    aiBar: 'bg-violet-500 dark:bg-violet-400',
  },
};

// ── Plan Card ───────────────────────────────────────────────────────────────

function PlanCard({ plan, currentPlan, paying, onSelect, hasCard, isPopular }) {
  const c        = colorMap[plan.color];
  const isActive = currentPlan === plan.key;
  const isFree   = plan.key === 'free';
  const Icon     = plan.icon;

  return (
    <div className={cn(
      'relative flex flex-col rounded-3xl border bg-gradient-to-b p-0 overflow-hidden transition-all duration-300',
      c.gradient, c.border,
      isPopular && c.ring,
      isPopular && 'scale-[1.02] lg:scale-105 z-10',
      !isPopular && 'hover:scale-[1.01]',
    )}>
      {/* Badge */}
      {plan.badge && (
        <div className="flex justify-center pt-4 -mb-1">
          <span className={cn('px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1.5', c.badge)}>
            {isPopular && <Sparkles size={11} />}
            {plan.badge}
          </span>
        </div>
      )}

      <div className="p-6 pb-0 flex flex-col gap-4">
        {/* Icon + Name */}
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', c.bg)}>
            <Icon size={22} className={c.icon} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{plan.subtitle}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-sm text-gray-400 dark:text-gray-500">R$</span>
          <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">{plan.price}</span>
          {plan.period && <span className="text-sm text-gray-400 dark:text-gray-500">{plan.period}</span>}
        </div>

        {/* AI Messages bar */}
        {plan.aiMsgs && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60">
            <MessageSquare size={16} className={c.icon} />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Mensagens IA</span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{plan.aiMsgs}/mes</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', c.aiBar)}
                  style={{ width: plan.key === 'starter' ? '25%' : plan.key === 'professional' ? '55%' : '100%' }} />
              </div>
            </div>
          </div>
        )}

        {/* Barbers */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Users size={14} className="shrink-0" />
          <span>{plan.barbers}</span>
        </div>
      </div>

      {/* Features */}
      <div className="p-6 pt-3 flex-1">
        <ul className="space-y-2.5">
          {plan.features.map(f => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={10} className="text-green-600 dark:text-green-400" strokeWidth={3} />
              </div>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="px-6 pb-6">
        {isActive ? (
          <div className="py-3 text-center text-sm font-medium text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            Plano atual
          </div>
        ) : isFree ? (
          <div className="py-3 text-center text-sm text-gray-400 dark:text-gray-500">
            Plano gratuito
          </div>
        ) : (
          <button
            onClick={() => onSelect(plan.key)}
            disabled={paying || !hasCard}
            className={cn(
              'w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 disabled:shadow-none',
              c.btn,
            )}
          >
            {!hasCard ? 'Cadastre um cartao' : paying ? 'Processando...' : `Assinar ${plan.name}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PlanSelection() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [paying, setPaying] = useState(false);
  const currentPlan = location.state?.currentPlan || null;
  const hasCard     = location.state?.hasCard ?? true;

  const handleSelect = async (planKey) => {
    setPaying(true);
    const r = await BillingAPI.subscribe(planKey);
    setPaying(false);

    if (r.ok) {
      if (r.data.clientSecret) {
        toast('Pagamento requer confirmacao adicional no seu banco.', 'info');
      } else {
        toast(r.data.message || `Plano ${planKey} ativado!`);
        navigate('/settings/billing');
      }
    } else {
      toast(r.data?.message || 'Erro ao assinar plano.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <span className="text-gray-200 dark:text-gray-700">|</span>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Escolher plano</p>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 text-xs font-medium mb-4">
            <Sparkles size={12} /> Potencialize sua barbearia
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
            Escolha o plano ideal
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto">
            Cobranca recorrente mensal. Cancele a qualquer momento. Sem fidelidade.
          </p>
        </div>

        {!hasCard && (
          <div className="mb-8 max-w-lg mx-auto p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-center">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Cadastre um cartao na pagina de{' '}
              <button onClick={() => navigate('/settings/billing')} className="underline font-semibold hover:text-amber-800 dark:hover:text-amber-300 transition-colors">
                cobranca
              </button>{' '}
              antes de assinar.
            </p>
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {PLANS.map(plan => (
            <PlanCard
              key={plan.key}
              plan={plan}
              currentPlan={currentPlan}
              paying={paying}
              onSelect={handleSelect}
              hasCard={hasCard}
              isPopular={plan.key === 'professional'}
            />
          ))}
        </div>

        {/* Trust bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 pb-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <Shield size={15} className="text-green-500" />
            Pagamentos seguros via Stripe
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <BarChart3 size={15} className="text-brand-500" />
            IA com Gemini Flash-Lite
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <Headphones size={15} className="text-violet-500" />
            Suporte em portugues
          </div>
        </div>
      </div>
    </div>
  );
}
