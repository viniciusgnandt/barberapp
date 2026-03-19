import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Zap, Star, Crown, Check, ExternalLink } from 'lucide-react';
import { Billing as BillingAPI } from '../utils/api';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

// ── Plan config ───────────────────────────────────────────────────────────────

const PLANS = [
  {
    key:      'free',
    name:     'Free',
    price:    'Grátis',
    period:   '',
    color:    'gray',
    icon:     <Zap size={22} />,
    badge:    null,
    features: ['1 profissional', 'Agendamento online básico', 'Portal do cliente'],
  },
  {
    key:      'basic',
    name:     'Basic',
    price:    'R$ 49',
    period:   '/mês',
    color:    'amber',
    icon:     <Zap size={22} />,
    badge:    null,
    features: ['Até 3 profissionais', 'Agendamentos ilimitados', 'Relatórios básicos', 'Suporte por email'],
  },
  {
    key:      'pro',
    name:     'Pro',
    price:    'R$ 99',
    period:   '/mês',
    color:    'brand',
    icon:     <Star size={22} />,
    badge:    'Popular',
    features: ['Até 10 profissionais', 'IA receptionist (WhatsApp)', 'Relatórios completos', 'Notificações automáticas'],
  },
  {
    key:      'premium',
    name:     'Premium',
    price:    'R$ 199',
    period:   '/mês',
    color:    'violet',
    icon:     <Crown size={22} />,
    badge:    'Completo',
    features: ['Profissionais ilimitados', 'Tudo do Pro', 'Suporte prioritário 24h', 'Pacotes de mensagens inclusos'],
  },
];

const colorMap = {
  gray:   { bg: 'bg-gray-100 dark:bg-gray-800',        icon: 'text-gray-400 dark:text-gray-500',    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',       ring: 'ring-gray-300 dark:ring-gray-600',    btn: 'bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white' },
  amber:  { bg: 'bg-amber-100 dark:bg-amber-900/30',   icon: 'text-amber-600 dark:text-amber-400',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', ring: 'ring-amber-400 dark:ring-amber-500',  btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
  brand:  { bg: 'bg-brand-100 dark:bg-brand-900/30',   icon: 'text-brand-600 dark:text-brand-400',  badge: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400', ring: 'ring-brand-500 dark:ring-brand-400',  btn: 'bg-brand-600 hover:bg-brand-700 text-white' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', icon: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', ring: 'ring-violet-500 dark:ring-violet-400', btn: 'bg-violet-600 hover:bg-violet-700 text-white' },
};

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, currentPlan, paying, onSelect }) {
  const colors   = colorMap[plan.color];
  const isActive = currentPlan === plan.key;
  const isFree   = plan.price === 'Grátis';

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl border bg-white dark:bg-gray-900 p-6 gap-5 transition-all',
      isActive
        ? `ring-2 ${colors.ring} border-transparent shadow-md`
        : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700',
    )}>
      {/* Badge */}
      {plan.badge && (
        <span className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap',
          colors.badge,
        )}>
          {plan.badge}
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', colors.bg, colors.icon)}>
          {plan.icon}
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.price}</span>
            {plan.period}
          </p>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Check size={15} className="shrink-0 mt-0.5 text-green-500" />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isActive ? (
        <div className="py-2.5 text-center text-sm text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-800 rounded-xl">
          Plano atual
        </div>
      ) : !isFree ? (
        <button
          onClick={() => onSelect(plan.key)}
          disabled={paying}
          className={cn(
            'w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50',
            colors.btn,
          )}
        >
          {paying ? 'Aguarde...' : `Assinar ${plan.name}`}
        </button>
      ) : null}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanSelection() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [paying,    setPaying]    = useState(false);
  const currentPlan = location.state?.currentPlan || null;

  const handleSelect = async (planKey) => {
    setPaying(true);
    const r = await BillingAPI.createCheckoutSession(planKey);
    setPaying(false);
    if (r.ok && r.data.url) {
      window.location.href = r.data.url;
    } else {
      toast(r.data?.message || 'Erro ao iniciar pagamento.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <span className="text-gray-200 dark:text-gray-700">|</span>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ajustar plano</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Escolha seu plano</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Cancele a qualquer momento. Sem fidelidade.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => (
            <PlanCard
              key={plan.key}
              plan={plan}
              currentPlan={currentPlan}
              paying={paying}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Stripe badge */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <svg className="h-4 w-4 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Pagamentos processados com segurança via{' '}
            <span className="font-medium text-gray-600 dark:text-gray-300">Stripe</span>
          </p>
          <ExternalLink size={11} className="text-gray-300 dark:text-gray-600" />
        </div>
      </div>
    </div>
  );
}
