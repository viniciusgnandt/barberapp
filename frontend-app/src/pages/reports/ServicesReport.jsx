import { useState, useEffect, useCallback } from 'react';
import { Scissors, DollarSign, TrendingUp, BarChart2, Hash } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtNum, fmtPct
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function ServicesReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getServices(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.byService = [{name, count, revenue, avgDuration, price, pctChange}]
  const byService = data?.byService ?? [];
  const totalRevenue = byService.reduce((s, sv) => s + (sv.revenue ?? 0), 0) || 1;
  const totalCount   = byService.reduce((s, sv) => s + (sv.count ?? 0), 0) || 1;

  // Enrich rows with pct
  const rows = byService.map(s => ({
    ...s,
    avgTicket: s.count > 0 ? s.revenue / s.count : 0,
    pctRevenue: Math.round((s.revenue / totalRevenue) * 100),
    pctCount: Math.round((s.count / totalCount) * 100),
  }));

  const topServiceName = rows[0]?.name ?? '—';

  const tableColumns = [
    { key: 'name', label: 'Serviço' },
    { key: 'count', label: 'Reservas', align: 'right', render: (v) => fmtNum(v) },
    { key: 'revenue', label: 'Receita', render: (v) => fmt(v), align: 'right' },
    { key: 'avgTicket', label: 'Ticket Médio', render: (v) => fmt(v), align: 'right' },
    { key: 'pctRevenue', label: '% Receita', render: (v) => `${v}%`, align: 'right' },
    { key: 'pctChange', label: 'vs Anterior', render: (v) => (
      <span className={v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-500' : 'text-gray-400'}>
        {v > 0 ? '+' : ''}{v ?? 0}%
      </span>
    ), align: 'right' },
  ];

  return (
    <ReportLayout
      title="Serviços"
      filters={filters}
      showBarbers
      showServices
      exportProps={{
        title: 'Serviços',
        period: filters.periodLabel,
        kpis: [
          { label: 'Tipos de Serviço', value: kpis.uniqueServices?.value ?? byService.length },
          { label: 'Agendamentos', value: kpis.totalServices?.value ?? 0 },
          { label: 'Receita', value: fmt(kpis.totalRevenue?.value ?? 0) },
          { label: 'Ticket Médio', value: fmt(kpis.avgTicket?.value ?? 0) },
          { label: 'Serviço Top', value: topServiceName },
        ],
        tableColumns,
        tableRows: rows,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Tipos de Serviço" icon={Scissors} color="bg-blue-500" format="number"
              value={kpis.uniqueServices?.value ?? byService.length} />
            <KpiCard label="Agendamentos" icon={BarChart2} color="bg-violet-500" format="number"
              value={kpis.totalServices?.value} pct={kpis.totalServices?.pct} />
            <KpiCard label="Receita Total" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={kpis.totalRevenue?.value} />
            <KpiCard label="Ticket Médio" icon={TrendingUp} color="bg-orange-500" format="currency"
              value={kpis.avgTicket?.value} />
            <KpiCard label="Serviço Mais Popular" icon={Hash} color="bg-pink-500" format="text"
              value={topServiceName} />
          </KpiGrid>

          {/* Revenue bar chart */}
          {rows.length > 0 && (
            <Section title="Receita por Serviço" subtitle="Top 10 por receita gerada">
              <SimpleBarChart
                data={rows.slice(0, 10)}
                labelKey="name"
                valueKey="revenue"
                formatValue={v => fmt(v)}
                colorClass="bg-violet-500"
                height={180}
              />
            </Section>
          )}

          {/* Horizontal ranking */}
          {rows.length > 0 && (
            <Section title="Ranking de Serviços" subtitle="Por quantidade de realizações">
              <div className="space-y-2.5 p-1">
                {rows.slice(0, 8).map((s, i) => {
                  const maxCount = rows[0]?.count || 1;
                  const pct = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-gray-400 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                          <span className="text-xs text-gray-500 ml-2 shrink-0">{fmtNum(s.count)} × {fmt(s.avgTicket)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-20 text-right shrink-0">{fmt(s.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Detalhamento por Serviço" noPad>
            <DataTable columns={tableColumns} rows={rows} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
