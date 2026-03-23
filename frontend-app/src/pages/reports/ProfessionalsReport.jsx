import { useState, useEffect, useCallback } from 'react';
import { Users, DollarSign, TrendingUp, CheckCircle, XCircle, Award } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtNum, fmtPct
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function ProfessionalsReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getProfessionals(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.professionals = [{name, total, completed, cancelled, absent, revenue, completionRate, avgTicket, pctRevenue}]
  const professionals = data?.professionals ?? [];
  const totalRevenue = professionals.reduce((s, p) => s + (p.revenue ?? 0), 0) || 1;

  const rows = professionals.map(p => ({
    ...p,
    id: String(p._id),
    appointments: p.total,
    avgTicket: p.avgTicket ?? (p.completed > 0 ? p.revenue / p.completed : 0),
    pctRevenue: Math.round((p.revenue / totalRevenue) * 100),
  }));

  const topProName = rows[0]?.name ?? '—';
  const avgRevPerPro = professionals.length > 0
    ? professionals.reduce((s, p) => s + p.revenue, 0) / professionals.length
    : 0;

  const tableColumns = [
    { key: 'name', label: 'Profissional' },
    { key: 'appointments', label: 'Agend.', align: 'right', render: (v) => fmtNum(v) },
    { key: 'completed', label: 'Concluídos', align: 'right', render: (v) => fmtNum(v) },
    { key: 'cancelled', label: 'Cancelados', align: 'right', render: (v) => fmtNum(v) },
    { key: 'revenue', label: 'Receita', render: (v) => fmt(v), align: 'right' },
    { key: 'avgTicket', label: 'Ticket Médio', render: (v) => fmt(v), align: 'right' },
    { key: 'completionRate', label: 'Conclusão', render: (v) => `${v ?? 0}%`, align: 'right' },
  ];

  return (
    <ReportLayout
      title="Profissionais"
      filters={filters}
      showBarbers
      exportProps={{
        title: 'Profissionais',
        period: filters.periodLabel,
        kpis: [
          { label: 'Profissionais', value: kpis.totalProfessionals?.value ?? 0 },
          { label: 'Receita Total', value: fmt(kpis.totalRevenue?.value ?? 0) },
          { label: 'Receita Média/Pro', value: fmt(avgRevPerPro) },
          { label: 'Top Profissional', value: topProName },
          { label: 'Taxa de Conclusão Média', value: `${kpis.avgCompletionRate?.value ?? 0}%` },
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
            <KpiCard label="Profissionais Ativos" icon={Users} color="bg-blue-500" format="number"
              value={kpis.totalProfessionals?.value} />
            <KpiCard label="Receita Total" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={kpis.totalRevenue?.value} />
            <KpiCard label="Receita Média/Pro" icon={TrendingUp} color="bg-violet-500" format="currency"
              value={avgRevPerPro} />
            <KpiCard label="Taxa de Conclusão" icon={CheckCircle} color="bg-teal-500" format="percent"
              value={kpis.avgCompletionRate?.value} />
            <KpiCard label="Melhor Performance" icon={Award} color="bg-amber-500" format="text"
              value={topProName} />
          </KpiGrid>

          {/* Revenue chart */}
          {rows.length > 0 && (
            <Section title="Receita por Profissional">
              <SimpleBarChart
                data={rows}
                labelKey="name"
                valueKey="revenue"
                formatValue={v => fmt(v)}
                colorClass="bg-blue-500"
                height={180}
              />
            </Section>
          )}

          {/* Ranking cards */}
          {rows.length > 0 && (
            <Section title="Ranking de Profissionais" subtitle="Por receita gerada no período">
              <div className="space-y-3 p-1">
                {rows.map((p, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-2 shrink-0">{fmt(p.revenue)}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{fmtNum(p.appointments)} agend.</span>
                        <span>{fmtNum(p.completed)} concluídos</span>
                        <span className="text-teal-600 dark:text-teal-400">{p.completionRate ?? 0}% conclusão</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-gray-400">Ticket Médio</div>
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fmt(p.avgTicket)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Tabela Completa" noPad>
            <DataTable columns={tableColumns} rows={rows} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
