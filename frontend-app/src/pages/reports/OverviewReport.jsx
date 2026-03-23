import { useState, useEffect, useCallback } from 'react';
import { Calendar, DollarSign, CheckCircle, XCircle, Users, TrendingUp, Percent, UserX } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtDate, fmtNum
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function OverviewReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getOverview(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend returns data.timeline (array of {date, total, completed, revenue})
  const timeline = data?.timeline ?? [];
  // backend returns data.topServices (array of {name, count, price})
  const topServices = data?.topServices ?? [];

  const totalRevenue = kpis.revenue?.value ?? 0;

  const serviceTableColumns = [
    { key: 'name', label: 'Serviço' },
    { key: 'count', label: 'Qtd', align: 'right' },
    { key: 'price', label: 'Preço', render: (v) => fmt(v), align: 'right' },
    { key: 'revenue', label: 'Receita Est.', render: (v, row) => fmt(v ?? (row.count * (row.price ?? 0))), align: 'right' },
  ];

  // Status breakdown
  const completed  = kpis.completedAppointments?.value ?? 0;
  const cancelled  = kpis.cancelledAppointments?.value ?? 0;
  const absent     = kpis.absentAppointments?.value ?? 0;
  const total      = kpis.totalAppointments?.value ?? 1;

  return (
    <ReportLayout
      title="Visão Geral"
      filters={filters}
      showBarbers
      showPayments
      exportProps={{
        title: 'Visão Geral',
        period: filters.periodLabel,
        kpis: [
          { label: 'Agendamentos', value: kpis.totalAppointments?.value ?? 0 },
          { label: 'Concluídos', value: kpis.completedAppointments?.value ?? 0 },
          { label: 'Cancelados', value: kpis.cancelledAppointments?.value ?? 0 },
          { label: 'Receita', value: fmt(kpis.revenue?.value ?? 0) },
          { label: 'Ticket Médio', value: fmt(kpis.avgTicket?.value ?? 0) },
          { label: 'Taxa de Conclusão', value: `${kpis.completionRate?.value ?? 0}%` },
          { label: 'Novos Clientes', value: kpis.newClients?.value ?? 0 },
        ],
        tableColumns: serviceTableColumns,
        tableRows: topServices,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          {/* KPIs */}
          <KpiGrid>
            <KpiCard label="Agendamentos" icon={Calendar} color="bg-blue-500" format="number"
              value={kpis.totalAppointments?.value} pct={kpis.totalAppointments?.pct} />
            <KpiCard label="Concluídos" icon={CheckCircle} color="bg-emerald-500" format="number"
              value={kpis.completedAppointments?.value} pct={kpis.completedAppointments?.pct} />
            <KpiCard label="Cancelados" icon={XCircle} color="bg-red-500" format="number"
              value={kpis.cancelledAppointments?.value} />
            <KpiCard label="Ausências" icon={UserX} color="bg-orange-500" format="number"
              value={kpis.absentAppointments?.value} />
            <KpiCard label="Receita" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={kpis.revenue?.value} pct={kpis.revenue?.pct} />
            <KpiCard label="Ticket Médio" icon={TrendingUp} color="bg-violet-500" format="currency"
              value={kpis.avgTicket?.value} pct={kpis.avgTicket?.pct} />
            <KpiCard label="Taxa de Conclusão" icon={Percent} color="bg-teal-500" format="percent"
              value={kpis.completionRate?.value} />
            <KpiCard label="Novos Clientes" icon={Users} color="bg-indigo-500" format="number"
              value={kpis.newClients?.value} />
          </KpiGrid>

          {/* Revenue timeline */}
          {timeline.length > 0 && (
            <Section title="Receita por Dia" subtitle="Agendamentos concluídos no período">
              <SimpleBarChart
                data={timeline}
                labelKey="date"
                valueKey="revenue"
                formatValue={v => fmt(v)}
                labelFormat={d => d ? d.slice(5).replace('-', '/') : ''}
                colorClass="bg-emerald-500"
                height={180}
              />
            </Section>
          )}

          {/* Status breakdown */}
          <Section title="Distribuição por Status">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-1">
              {[
                { label: 'Concluídos', value: completed, color: 'bg-emerald-500' },
                { label: 'Cancelados', value: cancelled, color: 'bg-red-500' },
                { label: 'Ausências', value: absent, color: 'bg-orange-500' },
                { label: 'Outros', value: Math.max(0, total - completed - cancelled - absent), color: 'bg-blue-500' },
              ].map(({ label, value, color }) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{pct}%</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{fmtNum(value)}</p>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Top services */}
          {topServices.length > 0 && (
            <Section title="Top 5 Serviços" subtitle="Por quantidade de realizações">
              <div className="space-y-2 p-1">
                {topServices.slice(0, 5).map((s, i) => {
                  const maxCount = topServices[0]?.count || 1;
                  const pct = Math.round((s.count / maxCount) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-gray-400 shrink-0">{i + 1}</span>
                      <span className="text-sm text-gray-700 dark:text-gray-300 w-32 shrink-0 truncate">{s.name || '—'}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-10 text-right shrink-0">{fmtNum(s.count)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Services table */}
          {topServices.length > 0 && (
            <Section title="Detalhamento de Serviços" noPad>
              <DataTable columns={serviceTableColumns} rows={topServices} />
            </Section>
          )}
        </div>
      )}
    </ReportLayout>
  );
}
