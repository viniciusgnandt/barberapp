import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements, useStripe, useElements,
  CardNumberElement, CardExpiryElement, CardCvcElement,
} from '@stripe/react-stripe-js';
import { getPublicConfig } from '../utils/api';
import {
  Zap, Crown, XCircle, Package, ChevronDown,
  CheckCircle, MessageSquare, Star, Sparkles,
  CreditCard, Plus, Trash2, Shield,
} from 'lucide-react';
import { Billing as BillingAPI } from '../utils/api';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

// ── Stripe init (chave carregada do backend) ─────────────────────────────────
// Usamos uma Promise que resolve quando a chave estiver disponível
const stripePromise = getPublicConfig().then(cfg => {
  const key = cfg?.stripePublishableKey;
  return key && key.startsWith('pk_') ? loadStripe(key) : null;
});

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtCurrency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PLAN_LABELS = { free: 'Free', starter: 'Starter', professional: 'Professional', business: 'Business', trial: 'Free', basic: 'Starter', pro: 'Professional', premium: 'Business' };

const PACKAGE_TIERS = [
  { messages: 1000, price: 49, label: '1.000', sublabel: 'mensagens', highlight: false, badge: null, color: 'emerald', pricePerMsg: 'R$ 0,049/msg' },
  { messages: 3000, price: 139, label: '3.000', sublabel: 'mensagens', highlight: true, badge: 'Mais escolhido', color: 'brand', pricePerMsg: 'R$ 0,046/msg' },
  { messages: 5000, price: 229, label: '5.000', sublabel: 'mensagens', highlight: false, badge: 'Melhor custo', color: 'violet', pricePerMsg: 'R$ 0,046/msg' },
];

const PLAN_ICON = {
  free:         { bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-400 dark:text-gray-500',    el: <Zap size={18} /> },
  trial:        { bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-400 dark:text-gray-500',    el: <Zap size={18} /> },
  starter:      { bg: 'bg-amber-100 dark:bg-amber-900/30',   text: 'text-amber-600 dark:text-amber-400',  el: <Zap size={18} /> },
  professional: { bg: 'bg-brand-100 dark:bg-brand-900/30',   text: 'text-brand-600 dark:text-brand-400',  el: <Star size={18} /> },
  business:     { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', el: <Crown size={18} /> },
};

// ── Stripe Element Styles ────────────────────────────────────────────────────
function buildStripeStyle() {
  const dark = document.documentElement.classList.contains('dark');
  return {
    style: {
      base: {
        fontSize: '15px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        color: dark ? '#f3f4f6' : '#111827',
        '::placeholder': { color: dark ? '#6b7280' : '#9ca3af' },
        iconColor: dark ? '#9ca3af' : '#6b7280',
      },
      invalid: { color: '#ef4444', iconColor: '#ef4444' },
    },
  };
}

// ── Invoice Status ──────────────────────────────────────────────────────────
function InvStatus({ status }) {
  const map   = { paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
  const label = { paid: 'Pago', pending: 'Pendente', failed: 'Falhou' };
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', map[status] || map.pending)}>
      {label[status] || status}
    </span>
  );
}

// ── Card Brand Badge ────────────────────────────────────────────────────────
function CardBrandBadge({ brand }) {
  const map = {
    visa:       { label: 'Visa',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    mastercard: { label: 'MC',    cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    amex:       { label: 'Amex',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    elo:        { label: 'Elo',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    hipercard:  { label: 'Hiper', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  };
  const info = map[brand] || { label: brand?.charAt(0).toUpperCase() + brand?.slice(1), cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
  return <span className={cn('text-xs font-bold px-2 py-1 rounded-lg min-w-[40px] text-center', info.cls)}>{info.label}</span>;
}

// ── Package colors ──────────────────────────────────────────────────────────
const PKG_COLORS = {
  emerald: { card: 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-100 dark:border-emerald-800/40', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', price: 'text-emerald-700 dark:text-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  brand:   { card: 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-700/50 ring-2 ring-brand-400 dark:ring-brand-600', icon: 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400', badge: 'bg-brand-500 text-white', price: 'text-brand-700 dark:text-brand-400', btn: 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-200 dark:shadow-brand-900/50' },
  violet:  { card: 'bg-violet-50 dark:bg-violet-900/15 border-violet-100 dark:border-violet-800/40', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', price: 'text-violet-700 dark:text-violet-400', btn: 'bg-violet-600 hover:bg-violet-700 text-white' },
};

function PackageCard({ tier, onBuy, loading, hasCard }) {
  const c = PKG_COLORS[tier.color];
  return (
    <div className={cn('relative rounded-2xl border p-5 flex flex-col gap-4 transition-all', c.card)}>
      {tier.badge && (
        <span className={cn('absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1', c.badge)}>
          {tier.highlight && <Sparkles size={10} />}
          {tier.badge}
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', c.icon)}>
          <MessageSquare size={18} />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-none">{tier.label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tier.sublabel}</p>
        </div>
      </div>
      <div>
        <p className={cn('text-xl font-bold', c.price)}>{fmtCurrency(tier.price)}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{tier.pricePerMsg} · valido por 30 dias</p>
      </div>
      <button onClick={() => onBuy(tier.messages)} disabled={loading || !hasCard}
        className={cn('w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50', c.btn)}>
        {!hasCard ? 'Adicione um cartão' : loading ? 'Aguarde...' : 'Comprar'}
      </button>
    </div>
  );
}

// ── Field wrapper com label e foco ──────────────────────────────────────────
function StripeField({ label, children, focused }) {
  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 transition-all duration-200',
      focused
        ? 'bg-white dark:bg-gray-800 border-brand-400 dark:border-brand-500 shadow-sm shadow-brand-200/40 dark:shadow-brand-900/20'
        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700',
    )}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

// ── Add Card Form (Stripe Elements, in-app) ─────────────────────────────────
function AddCardForm({ onSuccess, onCancel }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [focused,    setFocused]    = useState(null);
  const [stripeOpts, setStripeOpts] = useState(() => buildStripeStyle());

  useEffect(() => { setStripeOpts(buildStripeStyle()); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');

    const r = await BillingAPI.createSetupIntent();
    if (!r.ok) { setError(r.data?.message || 'Erro ao iniciar configuração.'); setSaving(false); return; }

    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(r.data.clientSecret, {
      payment_method: { card: elements.getElement(CardNumberElement) },
    });

    if (stripeError) { setError(stripeError.message); setSaving(false); return; }

    const attach = await BillingAPI.attachPaymentMethod(setupIntent.payment_method);
    setSaving(false);

    if (attach.ok) { toast('Cartão adicionado com sucesso!'); onSuccess(); }
    else setError(attach.data?.message || 'Erro ao salvar cartão.');
  };

  if (!stripe) {
    return (
      <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
        <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
          Configure <code className="font-mono font-bold">STRIPE_PUBLISHABLE_KEY</code> no .env do backend para habilitar o formulário de cartão.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-3">

      {/* Número do cartão — linha inteira */}
      <StripeField label="Número do cartão" focused={focused === 'number'}>
        <CardNumberElement
          options={{ ...stripeOpts, showIcon: true }}
          onFocus={() => setFocused('number')}
          onBlur={() => setFocused(null)}
        />
      </StripeField>

      {/* Validade + CVV — lado a lado */}
      <div className="grid grid-cols-2 gap-3">
        <StripeField label="Validade" focused={focused === 'expiry'}>
          <CardExpiryElement
            options={stripeOpts}
            onFocus={() => setFocused('expiry')}
            onBlur={() => setFocused(null)}
          />
        </StripeField>

        <StripeField label="CVV" focused={focused === 'cvc'}>
          <CardCvcElement
            options={stripeOpts}
            onFocus={() => setFocused('cvc')}
            onBlur={() => setFocused(null)}
          />
        </StripeField>
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40">
          <XCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Segurança */}
      <div className="flex items-center gap-2 py-1">
        <Shield size={12} className="text-green-500 shrink-0" />
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Dados criptografados e processados com segurança pela <span className="font-medium text-gray-500 dark:text-gray-400">Stripe</span>.
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={saving} disabled={!stripe}>
          <CreditCard size={14} className="mr-1.5" /> Salvar cartão
        </Button>
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
function BillingContent() {
  const navigate = useNavigate();
  const stripe   = useStripe();

  const [billing,        setBilling]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [buyingPkg,      setBuyingPkg]      = useState(false);
  const [cancelling,     setCancelling]     = useState(false);
  const [confirmCancel,  setConfirmCancel]  = useState(false);
  const [showInvoices,   setShowInvoices]   = useState(true);
  const [showPackages,   setShowPackages]   = useState(true);
  const [showBuyPkg,     setShowBuyPkg]     = useState(false);
  const [confirmPkg,     setConfirmPkg]     = useState(null); // tier to confirm

  // Cards
  const [cards, setCards]                = useState([]);
  const [defaultCardId, setDefaultCardId]= useState(null);
  const [loadingCards, setLoadingCards]   = useState(true);
  const [showAddCard, setShowAddCard]    = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await BillingAPI.get();
    setLoading(false);
    if (r.ok) setBilling(r.data.data);
    else toast(r.data?.message || 'Erro ao carregar cobrança.', 'error');
  };

  const loadCards = async () => {
    setLoadingCards(true);
    const r = await BillingAPI.getCards();
    setLoadingCards(false);
    if (r.ok) {
      setCards(r.data.data.cards);
      setDefaultCardId(r.data.data.defaultId);
    }
  };

  useEffect(() => { load(); loadCards(); }, []); // eslint-disable-line

  // Abre modal de confirmação antes de comprar
  const handleBuyPackage = (messages) => {
    const tier = PACKAGE_TIERS.find(t => t.messages === messages);
    if (tier) setConfirmPkg(tier);
  };

  const handleConfirmPkg = async () => {
    if (!confirmPkg) return;
    setBuyingPkg(true);
    try {
      const r = await BillingAPI.buyPackage(confirmPkg.messages, 1);
      if (!r.ok) {
        toast(r.data?.message || 'Erro ao comprar pacote.', 'error');
        return;
      }

      if (!r.data.requiresAction) {
        toast(`Pacote de ${confirmPkg.label} mensagens adquirido com sucesso!`, 'success');
        setConfirmPkg(null);
        load();
        return;
      }

      // 3DS
      if (!stripe) { toast('Erro interno: Stripe não inicializado.', 'error'); return; }
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(r.data.clientSecret);
      if (stripeError) { toast(stripeError.message || 'Pagamento não confirmado.', 'error'); return; }
      if (paymentIntent?.status === 'succeeded') {
        const conf = await BillingAPI.confirmPackage(paymentIntent.id);
        if (conf.ok) { toast('Pacote ativado!', 'success'); setConfirmPkg(null); load(); }
        else toast(conf.data?.message || 'Erro ao ativar pacote.', 'error');
      } else {
        toast('Pagamento não confirmado.', 'error');
      }
    } finally {
      setBuyingPkg(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    const r = await BillingAPI.cancel();
    setCancelling(false);
    setConfirmCancel(false);
    if (r.ok) { toast('Plano cancelado.'); load(); }
    else toast(r.data?.message || 'Erro ao cancelar.', 'error');
  };

  const handleDeleteCard = async (pmId) => {
    if (!confirm('Remover este cartão?')) return;
    const r = await BillingAPI.deleteCard(pmId);
    if (r.ok) { toast('Cartão removido.'); loadCards(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const handleSetDefault = async (pmId) => {
    const r = await BillingAPI.setDefaultCard(pmId);
    if (r.ok) { toast('Cartão padrão atualizado.'); loadCards(); }
    else toast(r.data?.message || 'Erro.', 'error');
  };

  const plan        = billing?.plan;
  const isCancelled = billing?.planStatus === 'cancelled';
  const isExpired   = billing?.planStatus === 'expired';
  const planIcon    = PLAN_ICON[plan] || PLAN_ICON.free;
  const hasCard     = cards.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl animate-fade-up">

      {/* ── Modal confirmação de pacote ──────────────────────────────── */}
      {confirmPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <p className="font-bold text-gray-900 dark:text-gray-100">Confirmar compra</p>
              <button onClick={() => !buyingPkg && setConfirmPkg(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <XCircle size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <MessageSquare size={18} className="text-brand-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{confirmPkg.label} mensagens</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{fmtCurrency(confirmPkg.price)} · válido por 30 dias</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-green-500 shrink-0" /> Ativado imediatamente</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-green-500 shrink-0" /> Cobrado no cartão padrão</li>
                <li className="flex items-center gap-2.5"><CheckCircle size={14} className="text-green-500 shrink-0" /> {confirmPkg.pricePerMsg} por mensagem</li>
              </ul>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setConfirmPkg(null)} disabled={buyingPkg}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={handleConfirmPkg} disabled={buyingPkg}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {buyingPkg
                    ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processando...</>
                    : 'Confirmar compra'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meu Plano</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie sua assinatura, cartões e faturas</p>
      </div>

      <div className="space-y-4">

        {/* ── Plano atual ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', planIcon.bg, planIcon.text)}>
                {planIcon.el}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">Plano {PLAN_LABELS[plan] || plan}</p>
                  {isCancelled && (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-full">CANCELADO</span>
                  )}
                  {isExpired && !isCancelled && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded-full">EXPIRADO</span>
                  )}
                  {!isCancelled && !isExpired && plan && !['free','trial'].includes(plan) && (
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">ATIVO</span>
                  )}
                </div>

                {/* Data de renovação — logo abaixo do nome */}
                {billing?.planExpiresAt && !isCancelled && !isExpired && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Renova em{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{fmtDate(billing.planExpiresAt)}</span>
                    {billing.daysLeft != null && (
                      <span className="ml-1.5 text-brand-600 dark:text-brand-400 font-medium">· {billing.daysLeft} dias</span>
                    )}
                  </p>
                )}
                {billing?.planExpiresAt && isCancelled && (
                  <p className="text-xs text-red-500 dark:text-red-400">
                    Acesso até{' '}
                    <span className="font-semibold">{fmtDate(billing.planExpiresAt)}</span>
                    {billing.daysLeft != null && billing.daysLeft > 0 && (
                      <span className="ml-1.5">· {billing.daysLeft} dias restantes</span>
                    )}
                  </p>
                )}
                {billing?.planExpiresAt && isExpired && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Expirou em <span className="font-semibold">{fmtDate(billing.planExpiresAt)}</span>
                  </p>
                )}
              </div>
            </div>
            {!isCancelled && (
              <Button variant="outline" className="shrink-0 mt-0.5"
                onClick={() => navigate('/settings/billing/plans', { state: { currentPlan: plan, hasCard } })}>
                Ajustar Plano
              </Button>
            )}
          </div>
        </div>

        {/* ── Cartões salvos (in-app) ────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard size={15} className="text-brand-500 shrink-0" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cartões</p>
            </div>
            {!showAddCard && (
              <button onClick={() => setShowAddCard(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors">
                <Plus size={13} /> Adicionar cartão
              </button>
            )}
          </div>

          {showAddCard && (
            <AddCardForm
              onSuccess={() => { setShowAddCard(false); loadCards(); }}
              onCancel={() => setShowAddCard(false)}
            />
          )}

          {loadingCards ? (
            <div className="h-8 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : cards.length === 0 && !showAddCard ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-2">
              Nenhum cartão salvo. Adicione um para assinar ou comprar pacotes.
            </p>
          ) : (
            <div className="space-y-3 mt-3">
              {cards.map(card => (
                <div key={card.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-3">
                    <CardBrandBadge brand={card.brand} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        •••• {card.last4}
                        {card.id === defaultCardId && (
                          <span className="ml-2 text-xs bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 px-1.5 py-0.5 rounded-full">Padrão</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Expira {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {card.id !== defaultCardId && (
                      <button onClick={() => handleSetDefault(card.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        Definir padrão
                      </button>
                    )}
                    <button onClick={() => handleDeleteCard(card.id)}
                      className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Pacotes de mensagens ────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
          <button onClick={() => setShowBuyPkg(v => !v)} className="flex items-center justify-between w-full text-left">
            <div className="flex items-center gap-2">
              <Package size={15} className="text-brand-500 shrink-0" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comprar pacote de mensagens</p>
            </div>
            <ChevronDown size={15} className={cn('text-gray-400 transition-transform', showBuyPkg && 'rotate-180')} />
          </button>
          {showBuyPkg && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {PACKAGE_TIERS.map(tier => (
                <PackageCard key={tier.messages} tier={tier} onBuy={handleBuyPackage} loading={buyingPkg} hasCard={hasCard} />
              ))}
            </div>
          )}
        </div>

        {/* ── Pacotes ativos ──────────────────────────────────────────── */}
        {billing?.messagePackages?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
            <button onClick={() => setShowPackages(v => !v)} className="flex items-center justify-between w-full text-left">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-emerald-500 shrink-0" />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pacotes ativos</p>
              </div>
              <ChevronDown size={15} className={cn('text-gray-400 transition-transform', showPackages && 'rotate-180')} />
            </button>
            {showPackages && (
              <div className="space-y-3 mt-4">
                {billing.messagePackages.map((p, i) => (
                  <div key={p._id || i} className="flex items-center justify-between text-sm gap-4">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {p.remaining.toLocaleString('pt-BR')} restantes
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">Expira {fmtDate(p.expiresAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Faturas ─────────────────────────────────────────────────── */}
        {billing?.invoices?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
            <button onClick={() => setShowInvoices(v => !v)} className="flex items-center justify-between w-full text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Faturas</p>
              <ChevronDown size={15} className={cn('text-gray-400 transition-transform', showInvoices && 'rotate-180')} />
            </button>
            {showInvoices && (
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-gray-500 text-left">
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {billing.invoices.map((inv, i) => (
                    <tr key={inv.stripeSessionId || i}>
                      <td className="py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {fmtDate(inv.paidAt || inv.createdAt)}
                        {inv.stripeSessionId && <CheckCircle size={11} className="inline ml-1.5 text-green-500" title="Confirmado via Stripe" />}
                      </td>
                      <td className="py-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {inv.amount > 0 ? fmtCurrency(inv.amount) : 'Grátis'}
                      </td>
                      <td className="py-3"><InvStatus status={inv.status} /></td>
                      <td className="py-3 text-right text-xs text-gray-400 dark:text-gray-500 max-w-[160px] truncate">{inv.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Cancelamento ────────────────────────────────────────────── */}
        {!isCancelled && plan && !['free', 'trial'].includes(plan) && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 px-6 py-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Cancelamento</p>
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Ao cancelar, o plano ficará vigente até{' '}
                <strong className="text-gray-600 dark:text-gray-300">{fmtDate(billing?.planExpiresAt)}</strong>.
                Após essa data o acesso será restrito ao plano Free.
              </p>
              {!confirmCancel ? (
                <button onClick={() => setConfirmCancel(true)}
                  className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors">
                  Cancelar
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">Confirmar?</span>
                  <button onClick={() => setConfirmCancel(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                    Não
                  </button>
                  <Button onClick={handleCancel} loading={cancelling}
                    className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white border-red-600">
                    Sim, cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500">
            <XCircle size={14} className="shrink-0" />
            Assinatura cancelada. Entre em contato com o suporte para reativar.
          </div>
        )}

      </div>
    </div>
  );
}

// ── Wrap with Stripe Elements Provider ──────────────────────────────────────
export default function Billing() {
  return (
    <Elements stripe={stripePromise}>
      <BillingContent />
    </Elements>
  );
}
