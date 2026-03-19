import { useState, useEffect } from 'react';
import { Bot, Loader2, Package } from 'lucide-react';
import { Reception as ReceptionAPI } from '../utils/api';
import { cn } from '../utils/cn';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ── Active Packages Stats ─────────────────────────────────────────────────────

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
            <div key={p._id || i} className="space-y-1.5">
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function UsageSettings() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const r = await ReceptionAPI.getUsage();
      setLoading(false);
      if (r.ok) setData(r.data.data);
    })();
  }, []);

  const used         = data?.mensagensCiclo   ?? 0;
  const limit        = data?.limite           ?? 2000;
  const pkgRemaining = data?.packageRemaining ?? 0;
  const totalDisp    = data?.totalDisponivel  ?? limit;
  const baseUsed     = Math.min(used, limit);
  const pkgUsed      = Math.max(0, used - limit);
  const basePct      = Math.min(Math.round((baseUsed / limit) * 100), 100);

  const barColor =
    basePct >= 90 ? 'bg-red-500' :
    basePct >= 70 ? 'bg-yellow-500' :
                    'bg-violet-500';

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

              {/* Base bar */}
              <div className="space-y-1">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Base incluída ({limit.toLocaleString('pt-BR')} mensagens)
                </p>
                <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all duration-700', barColor)} style={{ width: `${basePct}%` }} />
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

          {/* Active packages stats */}
          <ActivePackages pacotes={data.pacotes} />
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
