import { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { Reception as ReceptionAPI } from '../utils/api';

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function UsageSettings() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await ReceptionAPI.getUsage();
      setLoading(false);
      if (r.ok) setData(r.data.data);
    })();
  }, []);

  const used  = data?.mensagensCiclo ?? 0;
  const limit = data?.limite         ?? 2000;
  const pct   = Math.min(Math.round((used / limit) * 100), 100);

  const barColor =
    pct >= 90 ? 'bg-red-500'
    : pct >= 70 ? 'bg-yellow-500'
    : 'bg-violet-500';

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Uso</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Mensagens respondidas pela Recepção IA no ciclo atual
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {!loading && data && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-6 space-y-5">

          {/* Icon + label */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
              <Bot size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recepção IA</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Mensagens respondidas no ciclo</p>
            </div>
          </div>

          {/* Counter */}
          <div className="space-y-2">
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                {used.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm text-gray-400 dark:text-gray-500 pb-1">
                de {limit.toLocaleString('pt-BR')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>{pct}% utilizado</span>
              <span>{(limit - used).toLocaleString('pt-BR')} restantes</span>
            </div>
          </div>

          {/* Cycle dates */}
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>Ciclo: {fmtDate(data.cicloInicio)} – {fmtDate(data.cicloFim)}</span>
            <span>Renova em {fmtDate(data.cicloFim)}</span>
          </div>
        </div>
      )}

      {!loading && !data && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Não foi possível carregar os dados de uso.
        </p>
      )}
    </div>
  );
}
