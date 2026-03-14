import { useState, useEffect } from 'react';
import {
  CreditCard, Calendar, CheckCircle, XCircle, Clock,
  Tag, AlertTriangle, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Billing as BillingAPI } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const fmtCurrency = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_LABEL = { active: 'Ativo', expired: 'Vencido', cancelled: 'Cancelado', trial: 'Trial' };
const PLAN_LABEL   = { trial: 'Período Gratuito (30 dias)', basic: 'Plano Básico' };

function PlanBadge({ status }) {
  const map = {
    active:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    expired:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.expired}`}>
      {status === 'active'    && <CheckCircle size={11} />}
      {status === 'expired'   && <XCircle size={11} />}
      {status === 'cancelled' && <XCircle size={11} />}
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function InvoiceStatusBadge({ status }) {
  const map = {
    paid:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    failed:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const label = { paid: 'Pago', pending: 'Pendente', failed: 'Falhou' };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.pending}`}>
      {label[status] || status}
    </span>
  );
}

// ── Credit card form ──────────────────────────────────────────────────────────

function CardForm({ onPaid, disabled }) {
  const [form, setForm] = useState({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
  const [paying, setPaying] = useState(false);
  const [open, setOpen] = useState(false);

  const fmt = (field, value) => {
    if (field === 'cardNumber') {
      value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
    }
    if (field === 'cardExpiry') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    }
    if (field === 'cardCvv') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }
    return value;
  };

  const set = (field, value) => setForm(f => ({ ...f, [field]: fmt(field, value) }));

  const handlePay = async () => {
    const raw = form.cardNumber.replace(/\s/g, '');
    if (raw.length < 13) return toast('Número do cartão inválido.', 'error');
    if (!form.cardName.trim()) return toast('Informe o nome no cartão.', 'error');
    if (form.cardExpiry.length < 5) return toast('Validade inválida.', 'error');
    if (form.cardCvv.length < 3) return toast('CVV inválido.', 'error');

    setPaying(true);
    const r = await BillingAPI.pay({
      cardNumber: form.cardNumber,
      cardName:   form.cardName,
      cardExpiry: form.cardExpiry,
      cardCvv:    form.cardCvv,
    });
    setPaying(false);

    if (r.ok) {
      toast(r.data.message || 'Pagamento realizado!');
      setForm({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
      setOpen(false);
      onPaid?.();
    } else {
      toast(r.data?.message || 'Erro ao processar pagamento.', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
            <CreditCard size={16} className="text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pagamento via Cartão</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Renove por 30 dias — R$ 49,90</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Input
            label="Número do cartão"
            placeholder="0000 0000 0000 0000"
            value={form.cardNumber}
            onChange={e => set('cardNumber', e.target.value)}
          />
          <Input
            label="Nome no cartão"
            placeholder="NOME SOBRENOME"
            value={form.cardName}
            onChange={e => setForm(f => ({ ...f, cardName: e.target.value.toUpperCase() }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Validade"
              placeholder="MM/AA"
              value={form.cardExpiry}
              onChange={e => set('cardExpiry', e.target.value)}
            />
            <Input
              label="CVV"
              placeholder="123"
              value={form.cardCvv}
              onChange={e => set('cardCvv', e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={handlePay} loading={paying}>
              <CreditCard size={14} className="mr-1.5" /> Pagar R$ 49,90
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Billing() {
  const [billing, setBilling]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [coupon,  setCoupon]      = useState('');
  const [applying, setApplying]   = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await BillingAPI.get();
    setLoading(false);
    if (r.ok) setBilling(r.data.data);
    else toast(r.data?.message || 'Erro ao carregar cobrança.', 'error');
  };

  useEffect(() => { load(); }, []);

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return toast('Informe o código do cupom.', 'error');
    setApplying(true);
    const r = await BillingAPI.applyCoupon(coupon.trim());
    setApplying(false);
    if (r.ok) {
      toast(r.data.message || 'Cupom aplicado!');
      setCoupon('');
      load();
    } else {
      toast(r.data?.message || 'Cupom inválido.', 'error');
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

  const isCancelled = billing?.planStatus === 'cancelled';
  const isExpired   = billing?.planStatus === 'expired';
  const canPay      = !isCancelled;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cobrança</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie seu plano e faturas</p>
      </div>

      {/* Plan card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
              <Calendar size={20} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {PLAN_LABEL[billing?.plan] || billing?.plan}
              </p>
              <PlanBadge status={billing?.planStatus} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isCancelled ? 'Cancelado em' : 'Vence em'}
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {fmtDate(billing?.planExpiresAt)}
            </p>
          </div>
        </div>

        {!isCancelled && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            {billing?.daysLeft > 0 ? (
              <div className="flex items-center gap-2">
                <Clock size={14} className={billing.daysLeft <= 7 ? 'text-red-500' : 'text-green-500'} />
                <span className={`text-sm font-medium ${billing.daysLeft <= 7 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {billing.daysLeft} {billing.daysLeft === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500">
                <XCircle size={14} />
                <span className="text-sm font-medium">Plano vencido</span>
              </div>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
            <AlertTriangle size={14} className="shrink-0" />
            Plano cancelado. Entre em contato com o suporte para reativar.
          </div>
        )}

        {(isExpired || (billing?.daysLeft <= 7 && billing?.daysLeft > 0)) && !isCancelled && (
          <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm ${isExpired ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'}`}>
            <AlertTriangle size={14} className="shrink-0" />
            {isExpired
              ? 'Seu plano expirou. Renove para continuar usando o sistema.'
              : `Seu plano vence em ${billing.daysLeft} dias. Renove para não perder o acesso.`
            }
          </div>
        )}
      </div>

      {/* Payment */}
      <CardForm onPaid={load} disabled={!canPay} />

      {/* Coupon */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={15} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aplicar Cupom</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="CÓDIGO DO CUPOM"
            value={coupon}
            onChange={e => setCoupon(e.target.value.toUpperCase())}
            className="flex-1"
            disabled={isCancelled}
            onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
          />
          <Button onClick={handleApplyCoupon} loading={applying} disabled={isCancelled || !coupon.trim()}>
            Aplicar
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
          Cupons estendem a data de vencimento do plano.
        </p>
      </div>

      {/* Invoices */}
      {billing?.invoices?.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={15} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico de Faturas</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {billing.invoices.map((inv, i) => (
              <div key={i} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{inv.description}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                    {fmtDate(inv.paidAt || inv.createdAt)}
                    {inv.card && ` · Cartão final ${inv.card}`}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {inv.amount > 0 ? fmtCurrency(inv.amount) : 'Grátis'}
                  </p>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel plan */}
      {!isCancelled && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Cancelar Plano</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ao cancelar, você perderá o acesso ao sistema ao final do período vigente.
              </p>
            </div>
            {!confirmCancel ? (
              <Button
                variant="outline"
                onClick={() => setConfirmCancel(true)}
                className="shrink-0 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cancelar plano
              </Button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500 dark:text-gray-400">Confirmar?</span>
                <Button
                  variant="outline"
                  onClick={() => setConfirmCancel(false)}
                  className="text-xs px-3 py-1.5"
                >
                  Não
                </Button>
                <Button
                  onClick={handleCancel}
                  loading={cancelling}
                  className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  Sim, cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
