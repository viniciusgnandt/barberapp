import { useState, useEffect } from 'react';
import { Bot, Loader2, Package, RefreshCw, Sparkles, Plus, Minus } from 'lucide-react';
import { Reception as ReceptionAPI, Billing as BillingAPI } from '../utils/api';
import Button from '../components/ui/Button';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TIERS = [
  { messages: 1000, price: 49,  label: '1.000 mensagens' },
  { messages: 3000, price: 139, label: '3.000 mensagens', popular: true },
  { messages: 5000, price: 229, label: '5.000 mensagens' },
];

// ── Buy Package Card ───────────────────────────────────────────────────────────

function BuyPackageCard({ onPurchased }) {
  const [selected,  setSelected]  = useState(3000);
  const [qty,       setQty]       = useState(1);
  const [recurring, setRecurring] = useState(false);
  const [buying,    setBuying]    = useState(false);

  const tier  = TIERS.find(t => t.messages === selected);
  const total = (tier?.price || 0) * qty;

  const handleBuy = async () => {
    setBuying(true);
    const r = await BillingAPI.buyPackage(selected, qty, recurring);
    setBuying(false);
    if (r.ok) {
      toast(r.data.message || 'Pacote adicionado com sucesso!');
      setQty(1);
      onPurchased?.();
    } else {
      toast(r.data?.message || 'Erro ao contratar pacote.', 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pacotes adicionais de mensagens</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Válidos por 30 dias. Consumidos após o limite base.</p>
        </div>
      </div>

      {/* Tier selector */}
      <div className="grid grid-cols-3 gap-3">
        {TIERS.map(t => (
          <button
            key={t.messages}
            onClick={() => setSelected(t.messages)}
            className={cn(
              'relative flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-center transition-colors',
              selected === t.messages
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700',
            )}
          >
            {t.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-600 text-white whitespace-nowrap">
                Popular
              </span>
            )}
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {t.messages.toLocaleString('pt-BR')}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">mensagens</span>
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
              R$ {t.price}
            </span>
          </button>
        ))}
      </div>

      {/* Quantity + recurring */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Quantidade</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="w-7 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
              {qty}
            </span>
            <button
              onClick={() => setQty(q => Math.min(10, q + 1))}
              className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <RefreshCw size={13} className="text-gray-400 dark:text-gray-500 shrink-0" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Recorrente</span>
          <button
            type="button"
            role="switch"
            aria-checked={recurring}
            onClick={() => setRecurring(r => !r)}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
              recurring ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
              recurring ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </label>
      </div>

      {/* Buy button */}
      <div className="pt-1 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {qty > 1 ? `${qty}x ` : ''}{tier?.label} ·{' '}
          <strong className="text-gray-900 dark:text-gray-100">
            R$ {total}
          </strong>
        </span>
        <Button onClick={handleBuy} loading={buying}>
          <Package size={14} className="mr-1.5" />
          Contratar pacote
        </Button>
      </div>
    </div>
  );
}

// ── Active Packages ────────────────────────────────────────────────────────────

function ActivePackages({ pacotes }) {
  if (!pacotes?.length) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
          <Package size={18} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Pacotes ativos</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{pacotes.length} pacote(s) com mensagens disponíveis</p>
        </div>
      </div>

      <div className="space-y-3">
        {pacotes.map((p, i) => {
          const used = p.messages - p.remaining;
          const pct  = Math.min(Math.round((used / p.messages) * 100), 100);
          return (
            <div key={p.id || i} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  Pacote {i + 1}{p.recurring ? ' · recorrente' : ''}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  {p.remaining.toLocaleString('pt-BR')} restantes · expira {fmtDate(p.expiresAt)}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function UsageSettings() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await ReceptionAPI.getUsage();
    setLoading(false);
    if (r.ok) setData(r.data.data);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const used          = data?.mensagensCiclo   ?? 0;
  const limit         = data?.limite           ?? 2000;
  const pkgRemaining  = data?.packageRemaining ?? 0;
  const totalDisp     = data?.totalDisponivel  ?? limit;
  const baseUsed      = Math.min(used, limit);
  const pkgUsed       = Math.max(0, used - limit);
  const basePct       = Math.min(Math.round((baseUsed / limit) * 100), 100);

  const barColor =
    basePct >= 90 ? 'bg-red-500'
    : basePct >= 70 ? 'bg-yellow-500'
    : 'bg-violet-500';

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Uso</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Mensagens respondidas pela Recepção Virtual no ciclo atual
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Base usage card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <Bot size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recepção Virtual</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Mensagens respondidas no ciclo</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                  {used.toLocaleString('pt-BR')}
                </span>
                <span className="text-sm text-gray-400 dark:text-gray-500 pb-1">
                  de {totalDisp.toLocaleString('pt-BR')} disponíveis
                </span>
              </div>

              {/* Base 2000 bar */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500">Base incluída ({limit.toLocaleString('pt-BR')} mensagens)</p>
                <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${basePct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                  <span>{basePct}% utilizado</span>
                  <span>{Math.max(0, limit - baseUsed).toLocaleString('pt-BR')} restantes</span>
                </div>
              </div>

              {/* Package overflow bar */}
              {pkgRemaining > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Pacote adicional ({pkgRemaining.toLocaleString('pt-BR')} restantes)
                  </p>
                  <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${Math.min(Math.round((pkgUsed / (pkgUsed + pkgRemaining)) * 100), 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                    <span>{pkgUsed.toLocaleString('pt-BR')} do pacote utilizados</span>
                    <span>{pkgRemaining.toLocaleString('pt-BR')} restantes</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>Ciclo: {fmtDate(data.cicloInicio)} – {fmtDate(data.cicloFim)}</span>
              <span>Renova em {fmtDate(data.cicloFim)}</span>
            </div>
          </div>

          {/* Active packages */}
          <ActivePackages pacotes={data.pacotes} />

          {/* Buy package */}
          <BuyPackageCard onPurchased={load} />
        </>
      )}

      {!loading && !data && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Não foi possível carregar os dados de uso.
        </p>
      )}
    </div>
  );
}
