import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  Zap, Crown, XCircle, Package, ChevronDown,
  CheckCircle, MessageSquare, Star, Sparkles,
  CreditCard, Plus, Trash2, X,
} from 'lucide-react';
import { Billing as BillingAPI } from '../utils/api';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

// ── Stripe init ─────────────────────────────────────────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

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

// ── Card Element Styles ─────────────────────────────────────────────────────
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#e5e7eb',
      '::placeholder': { color: '#6b7280' },
    },
    invalid: { color: '#ef4444' },
  },
};

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

// ── Add Card Form (Stripe Elements, in-app) ─────────────────────────────────
function AddCardForm({ onSuccess, onCancel }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');

    // 1. Get setup intent from backend
    const r = await BillingAPI.createSetupIntent();
    if (!r.ok) { setError(r.data?.message || 'Erro.'); setSaving(false); return; }

    // 2. Confirm setup with card element
    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(r.data.clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (stripeError) {
      setError(stripeError.message);
      setSaving(false);
      return;
    }

    // 3. Attach PM to customer via our backend
    const attach = await BillingAPI.attachPaymentMethod(setupIntent.payment_method);
    setSaving(false);

    if (attach.ok) {
      toast('Cartão adicionado!');
      onSuccess();
    } else {
      setError(attach.data?.message || 'Erro ao salvar cartão.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={saving} disabled={!stripe}>
          Salvar cartão
        </Button>
        <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
function BillingContent() {
  const navigate = useNavigate();

  const [billing,       setBilling]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [buyingPkg,     setBuyingPkg]     = useState(false);
  const [cancelling,    setCancelling]    = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showInvoices,  setShowInvoices]  = useState(true);
  const [showPackages,  setShowPackages]  = useState(true);
  const [showBuyPkg,    setShowBuyPkg]    = useState(false);

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

  const handleBuyPackage = async (messages) => {
    setBuyingPkg(true);
    const r = await BillingAPI.buyPackage(messages, 1);
    setBuyingPkg(false);
    if (r.ok && !r.data.requiresAction) {
      toast('Pacote adquirido!');
      load();
    } else if (r.data?.requiresAction) {
      toast('Pagamento requer confirmação...', 'info');
      // 3DS would need stripe.confirmCardPayment but for simplicity, retry
    } else {
      toast(r.data?.message || 'Erro ao comprar pacote.', 'error');
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meu Plano</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie sua assinatura, cartões e faturas</p>
      </div>

      <div className="space-y-4">

        {/* ── Plano atual ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', planIcon.bg, planIcon.text)}>
                {planIcon.el}
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">Plano {PLAN_LABELS[plan] || plan}</p>
                {billing?.planExpiresAt && !isCancelled && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {isExpired ? 'Expirado em' : 'Renova em'} {fmtDate(billing.planExpiresAt)}
                    {!isExpired && billing.daysLeft != null && ` · ${billing.daysLeft} dias`}
                  </p>
                )}
                {isCancelled && <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Cancelado</p>}
              </div>
            </div>
            {!isCancelled && (
              <Button variant="outline" className="shrink-0"
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
