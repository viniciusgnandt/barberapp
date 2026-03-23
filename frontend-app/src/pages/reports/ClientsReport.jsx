import { useState, useEffect, useCallback } from 'react';
import { Users, UserCheck, TrendingUp, DollarSign, BarChart2, Repeat } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, ReportSkeleton, fmt, fmtNum, fmtDate
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function ClientsReport() {
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
  // backend: data.topClients = [{name, phone, visits, spent, lastVisit}]
  const topClients = data?.topClients ?? [];

  const maxSpent = topClients[0]?.spent || 1;

  const tableColumns = [
    { key: 'name', label: 'Cliente' },
    { key: 'phone', label: 'Telefone' },
    { key: 'visits', label: 'Visitas', align: 'right', render: (v) => fmtNum(v) },
    { key: 'lastVisit', label: 'Última Visita', render: (v) => fmtDate(v) },
    { key: 'spent', label: 'Total Gasto', render: (v) => fmt(v), align: 'right' },
    { key: 'avgTicket', label: 'Ticket Médio', render: (v, row) => fmt(v ?? (row.visits > 0 ? (row.spent / row.visits) : 0)), align: 'right' },
  ];

  const totalSpent = topClients.reduce((s, c) => s + (c.spent ?? 0), 0);
  const avgSpent = topClients.length > 0 ? totalSpent / topClients.length : 0;

  return (
    <ReportLayout
      title="Clientes — Visão Geral"
      filters={filters}
      showBarbers
      exportProps={{
        title: 'Clientes',
        period: filters.periodLabel,
        kpis: [
          { label: 'Total de Clientes', value: kpis.totalClients?.value ?? 0 },
          { label: 'Novos Clientes', value: kpis.newClients?.value ?? 0 },
          { label: 'Clientes Ativos', value: kpis.activeClients?.value ?? 0 },
          { label: 'Gasto Médio', value: fmt(kpis.avgSpent?.value ?? avgSpent) },
        ],
        tableColumns,
        tableRows: topClients,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Total de Clientes" icon={Users} color="bg-blue-500" format="number"
              value={kpis.totalClients?.value} />
            <KpiCard label="Novos Clientes" icon={UserCheck} color="bg-emerald-500" format="number"
              value={kpis.newClients?.value} pct={kpis.newClients?.pct} />
            <KpiCard label="Clientes Ativos" icon={Repeat} color="bg-violet-500" format="number"
              value={kpis.activeClients?.value} />
            <KpiCard label="Gasto Médio" icon={DollarSign} color="bg-teal-500" format="currency"
              value={kpis.avgSpent?.value ?? avgSpent} />
            <KpiCard label="Receita Top Clientes" icon={TrendingUp} color="bg-orange-500" format="currency"
              value={totalSpent} />
          </KpiGrid>

          {/* Top clients ranked list */}
          {topClients.length > 0 && (
            <Section title="Top Clientes por Gasto" subtitle="Clientes que mais gastaram no período">
              <div className="space-y-2.5 p-1">
                {topClients.slice(0, 10).map((c, i) => {
                  const pct = Math.round((c.spent / maxSpent) * 100);
                  const avgTicket = c.visits > 0 ? c.spent / c.visits : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-gray-400 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{c.name || '—'}</span>
                          <div className="flex gap-3 text-xs text-gray-500 ml-2 shrink-0">
                            <span>{fmtNum(c.visits)} visitas</span>
                            <span>ticket {fmt(avgTicket)}</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-20 text-right shrink-0">{fmt(c.spent)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Tabela de Clientes" noPad>
            <DataTable columns={tableColumns} rows={topClients.map((c, i) => ({
              ...c,
              id: String(c._id ?? i),
              avgTicket: c.visits > 0 ? c.spent / c.visits : 0,
            }))} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
