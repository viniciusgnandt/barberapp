import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Star, Users, TrendingUp, Award, Info } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtNum, fmtDate
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

// LTV score = total spent / (months since first visit + 1), projected to 12 months
function computeLtv(spent, firstVisit) {
  if (!firstVisit) return spent;
  const months = Math.max(1, (Date.now() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24 * 30));
  return Math.round((spent / months) * 12 * 100) / 100;
}

export default function CliLtvReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getClients(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.topClients [{name, phone, visits, spent, lastVisit}]
  const topClients = data?.topClients ?? [];

  // Enrich with LTV
  const rows = topClients.map((c, i) => ({
    ...c,
    id: String(c._id ?? i),
    avgTicket: c.visits > 0 ? c.spent / c.visits : 0,
    ltv: computeLtv(c.spent, c.lastVisit),
    tier: c.spent >= 500 ? 'platinum' : c.spent >= 200 ? 'gold' : c.spent >= 100 ? 'silver' : 'bronze',
  })).sort((a, b) => b.ltv - a.ltv);

  const avgLtv = rows.length > 0 ? rows.reduce((s, r) => s + r.ltv, 0) / rows.length : 0;
  const highValueCount = rows.filter(r => r.tier === 'platinum' || r.tier === 'gold').length;
  const totalRevenue = rows.reduce((s, r) => s + r.spent, 0);
  const avgVisits = rows.length > 0 ? rows.reduce((s, r) => s + r.visits, 0) / rows.length : 0;
  const topClientName = rows[0]?.name ?? '—';

  // LTV distribution by bucket
  const ltvBuckets = { 'Até R$100': 0, 'R$100-R$300': 0, 'R$300-R$600': 0, 'Acima R$600': 0 };
  rows.forEach(r => {
    if (r.ltv < 100)       ltvBuckets['Até R$100']++;
    else if (r.ltv < 300)  ltvBuckets['R$100-R$300']++;
    else if (r.ltv < 600)  ltvBuckets['R$300-R$600']++;
    else                   ltvBuckets['Acima R$600']++;
  });
  const ltvFreqData = Object.entries(ltvBuckets).map(([bucket, count]) => ({ bucket, count }));

  const tierColors = { platinum: 'bg-violet-500', gold: 'bg-amber-500', silver: 'bg-gray-400', bronze: 'bg-orange-600' };
  const tierLabels = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };

  const tableColumns = [
    { key: 'name', label: 'Cliente' },
    { key: 'visits', label: 'Visitas', align: 'right', render: (v) => fmtNum(v) },
    { key: 'spent', label: 'Total Gasto', render: (v) => fmt(v), align: 'right' },
    { key: 'avgTicket', label: 'Ticket Médio', render: (v) => fmt(v), align: 'right' },
    { key: 'lastVisit', label: 'Última Visita', render: (v) => fmtDate(v) },
    { key: 'ltv', label: 'LTV Anual', render: (v) => (
      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(v)}</span>
    ), align: 'right' },
    { key: 'tier', label: 'Tier', render: (v) => (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${tierColors[v] || 'bg-gray-400'}`}>
        {tierLabels[v] || v}
      </span>
    )},
  ];

  return (
    <ReportLayout
      title="LTV de Clientes"
      filters={filters}
      showBarbers
      exportProps={{
        title: 'LTV de Clientes',
        period: filters.periodLabel,
        kpis: [
          { label: 'LTV Médio Anual', value: fmt(avgLtv) },
          { label: 'Clientes Alto Valor', value: highValueCount },
          { label: 'Receita Total', value: fmt(totalRevenue) },
          { label: 'Visitas Médias', value: avgVisits.toFixed(1) },
          { label: 'Top Cliente', value: topClientName },
        ],
        tableColumns: tableColumns.slice(0, 6),
        tableRows: rows,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">

          {/* LTV explanation card */}
          <div className="flex gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
            <Info size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800 dark:text-emerald-300 space-y-1">
              <p className="font-semibold">O que é LTV (Lifetime Value)?</p>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs leading-relaxed">
                LTV é o <strong>valor total que um cliente gera ao longo do relacionamento com o estabelecimento</strong>.
                Quanto maior o LTV, mais valioso é aquele cliente para o negócio.
                Aqui calculamos o <strong>LTV anual projetado</strong>: com base no gasto total e no tempo desde a primeira visita,
                estimamos quanto esse cliente deve gastar nos próximos 12 meses.
                Use isso para priorizar clientes fidelizados, criar promoções direcionadas e evitar a perda de clientes.
              </p>
            </div>
          </div>

          <KpiGrid>
            <KpiCard label="LTV Médio Anual" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={avgLtv} />
            <KpiCard label="Clientes Alto Valor" icon={Star} color="bg-amber-400" format="number"
              value={highValueCount} />
            <KpiCard label="Receita Total" icon={TrendingUp} color="bg-emerald-500" format="currency"
              value={totalRevenue} />
            <KpiCard label="Visitas Médias" icon={Users} color="bg-blue-500" format="number"
              displayValue={avgVisits.toFixed(1)} value={avgVisits} />
            <KpiCard label="Top Cliente" icon={Award} color="bg-violet-500" format="text"
              value={topClientName} />
          </KpiGrid>

          {/* LTV distribution */}
          {ltvFreqData.length > 0 && (
            <Section title="Distribuição de LTV" subtitle="LTV anual projetado por faixa de valor">
              <SimpleBarChart
                data={ltvFreqData}
                labelKey="bucket"
                valueKey="count"
                formatValue={v => `${v} clientes`}
                colorClass="bg-emerald-500"
                height={160}
              />
            </Section>
          )}

          {/* Top clients ranking */}
          {rows.length > 0 && (
            <Section title="Top Clientes por LTV" subtitle="Clientes com maior valor vitalício">
              <div className="space-y-2.5 p-1">
                {rows.slice(0, 10).map((c, i) => {
                  const maxLtv = rows[0]?.ltv || 1;
                  const pct = Math.round((c.ltv / maxLtv) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-gray-400 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{c.name || '—'}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${tierColors[c.tier] || 'bg-gray-400'} shrink-0`}>
                              {tierLabels[c.tier]}
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500 ml-2 shrink-0">
                            <span>{fmtNum(c.visits)} visitas</span>
                            <span>{fmt(c.spent)} gasto</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-20 text-right shrink-0">{fmt(c.ltv)}/ano</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Ranking Completo por LTV" noPad>
            <DataTable columns={tableColumns} rows={rows} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
