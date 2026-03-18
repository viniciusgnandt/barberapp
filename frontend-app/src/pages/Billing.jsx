import { useState, useEffect } from 'react';
import { CreditCard, Zap, Crown, XCircle, Package, ChevronDown } from 'lucide-react';
import { Billing as BillingAPI } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtCurrency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Normalise plan keys to display names
const PLAN_NAME = { free: 'Free', pro: 'Pro', premium: 'Premium', trial: 'Período de Teste', basic: 'Básico' };
const planName = (plan) => PLAN_NAME[plan] || plan || 'Free';

// ── Inline card form ──────────────────────────────────────────────────────────

function CardInputForm({ onSubmit, loading, submitLabel }) {
  const [form, setForm] = useState({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });

  const fmt = (field, value) => {
    if (field === 'cardNumber') value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    if (field === 'cardExpiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (field === 'cardCvv') value = value.replace(/\D/g, '').slice(0, 4);
    return value;
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: fmt(field, value) }));

  const handleSubmit = () => {
    if (form.cardNumber.replace(/\s/g, '').length < 13) return toast('Número do cartão inválido.', 'error');
    if (!form.cardName.trim()) return toast('Informe o nome no cartão.', 'error');
    if (form.cardExpiry.length < 5) return toast('Validade inválida.', 'error');
    if (form.cardCvv.length < 3) return toast('CVV inválido.', 'error');
    onSubmit(form);
  };

  return (
    <div className="space-y-3 pt-4">
      <Input label="Número do cartão" placeholder="0000 0000 0000 0000"
        value={form.cardNumber} onChange={e => set('cardNumber', e.target.value)} />
      <Input label="Nome no cartão" placeholder="NOME SOBRENOME"
        value={form.cardName} onChange={e => setForm(f => ({ ...f, cardName: e.target.value.toUpperCase() }))} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Validade" placeholder="MM/AA"
          value={form.cardExpiry} onChange={e => set('cardExpiry', e.target.value)} />
        <Input label="CVV" placeholder="123"
          value={form.cardCvv} onChange={e => set('cardCvv', e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button onClick={handleSubmit} loading={loading}>
          <CreditCard size={14} className="mr-1.5" /> {submitLabel}
        </Button>
      </div>
    </div>
  );
}

// ── Plan icon ─────────────────────────────────────────────────────────────────

function PlanIcon({ plan }) {
  const isPremium = plan === 'premium';
  const isFree    = plan === 'free' || plan === 'trial';
  return (
    <div className={cn(
      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
      isPremium ? 'bg-violet-100 dark:bg-violet-900/30' :
      isFree    ? 'bg-gray-100 dark:bg-gray-800' :
                  'bg-amber-100 dark:bg-amber-900/30',
    )}>
      {isPremium
        ? <Crown size={18} className="text-violet-600 dark:text-violet-400" />
        : isFree
          ? <Zap size={18} className="text-gray-400 dark:text-gray-500" />
          : <Zap size={18} className="text-amber-600 dark:text-amber-400" />
      }
    </div>
  );
}

// ── Invoice status badge ──────────────────────────────────────────────────────

function InvStatus({ status }) {
  const map = {
    paid:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const label = { paid: 'Pago', pending: 'Pendente', failed: 'Falhou' };
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium', map[status] || map.pending)}>
      {label[status] || status}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const [billing,         setBilling]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [editingCard,     setEditingCard]     = useState(false);
  const [savedCard,       setSavedCard]       = useState(null);
  const [paying,          setPaying]          = useState(false);
  const [cancelling,      setCancelling]      = useState(false);
  const [confirmCancel,   setConfirmCancel]   = useState(false);
  const [showInvoices,    setShowInvoices]    = useState(true);
  const [showPackages,    setShowPackages]    = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await BillingAPI.get();
    setLoading(false);
    if (r.ok) {
      setBilling(r.data.data);
      const lastCard = r.data.data?.invoices
        ?.slice().sort((a, b) => new Date(b.paidAt || b.createdAt) - new Date(a.paidAt || a.createdAt))
        .find(inv => inv.card);
      if (lastCard && !savedCard) setSavedCard({ last4: lastCard.card });
    } else {
      toast(r.data?.message || 'Erro ao carregar cobrança.', 'error');
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePay = async (form) => {
    setPaying(true);
    const r = await BillingAPI.pay(form);
    setPaying(false);
    if (r.ok) {
      toast(r.data.message || 'Pagamento realizado!');
      setSavedCard({ last4: form.cardNumber.replace(/\s/g, '').slice(-4) });
      setEditingCard(false);
      load();
    } else {
      toast(r.data?.message || 'Erro ao processar pagamento.', 'error');
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

  const plan        = billing?.plan;
  const isCancelled = billing?.planStatus === 'cancelled';
  const isFree      = !plan || plan === 'free';
  const isTrial     = plan === 'trial';

  const periodLabel = isFree ? 'Gratuito' : isTrial ? 'Período de Teste' : 'Mensal';

  const renewalText = (() => {
    if (isCancelled) return 'Sua assinatura foi cancelada.';
    if (billing?.planExpiresAt) {
      const d = fmtDate(billing.planExpiresAt);
      if (isTrial) return `Período de teste termina em ${d}.`;
      if (!isFree) return `Sua assinatura será renovada automaticamente em ${d}.`;
    }
    return 'Faça upgrade para acessar mais funcionalidades.';
  })();

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
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie seu plano e faturas</p>
      </div>

      <div className="space-y-4">

        {/* ── Plan ────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PlanIcon plan={plan} />
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                Plano {planName(plan)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{renewalText}</p>
            </div>
          </div>
          {!isCancelled && (
            <Button variant={isFree ? 'primary' : 'outline'} className="shrink-0">
              {isFree ? 'Fazer upgrade' : 'Ajustar plano'}
            </Button>
          )}
        </div>

        {/* ── Pagamento ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Pagamento</p>

          {!editingCard ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CreditCard size={15} className="text-gray-400 dark:text-gray-500 shrink-0" />
                {savedCard
                  ? <span>•••• {savedCard.last4}</span>
                  : <span className="text-gray-400 dark:text-gray-500">Nenhum cartão cadastrado</span>
                }
              </div>
              {!isCancelled && (
                <button
                  onClick={() => setEditingCard(true)}
                  className="shrink-0 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {savedCard ? 'Atualizar' : 'Adicionar'}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <CreditCard size={15} className="text-gray-400 shrink-0" />
                  <span>Novo cartão</span>
                </div>
                <button onClick={() => setEditingCard(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  Cancelar
                </button>
              </div>
              <CardInputForm
                onSubmit={handlePay}
                loading={paying}
                submitLabel={savedCard ? 'Salvar e pagar' : 'Adicionar e pagar'}
              />
            </>
          )}
        </div>

        {/* ── Faturas ─────────────────────────────────────────────────────── */}
        {billing?.invoices?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
            <button
              onClick={() => setShowInvoices(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
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
                    <tr key={i}>
                      <td className="py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {fmtDate(inv.paidAt || inv.createdAt)}
                        {inv.card && (
                          <span className="block text-xs text-gray-400 dark:text-gray-600">•••• {inv.card}</span>
                        )}
                      </td>
                      <td className="py-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {inv.amount > 0 ? fmtCurrency(inv.amount) : 'Grátis'}
                      </td>
                      <td className="py-3">
                        <InvStatus status={inv.status} />
                      </td>
                      <td className="py-3 text-right text-xs text-gray-400 dark:text-gray-500 max-w-[160px] truncate">
                        {inv.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Pacotes de mensagens ────────────────────────────────────────── */}
        {billing?.messagePackages?.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
            <button
              onClick={() => setShowPackages(v => !v)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Package size={15} className="text-emerald-500 dark:text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pacotes de mensagens ativos</p>
              </div>
              <ChevronDown size={15} className={cn('text-gray-400 transition-transform', showPackages && 'rotate-180')} />
            </button>

            {showPackages && (
              <div className="space-y-3 mt-4">
                {billing.messagePackages.map((p, i) => (
                  <div key={p._id || i} className="flex items-center justify-between text-sm gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {p.remaining.toLocaleString('pt-BR')} restantes
                      </span>
                      {p.recurring && (
                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">Recorrente</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      Expira {fmtDate(p.expiresAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Cancelamento ────────────────────────────────────────────────── */}
        {!isCancelled && !isFree && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 px-6 py-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Cancelamento</p>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cancelar plano</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Ao cancelar, seu plano ficará vigente até{' '}
                  <strong className="text-gray-600 dark:text-gray-300">{fmtDate(billing?.planExpiresAt)}</strong>.
                  Após essa data o acesso será restrito ao plano gratuito.
                </p>
              </div>
              {!confirmCancel ? (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Cancelar
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-500">Confirmar?</span>
                  <button onClick={() => setConfirmCancel(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
