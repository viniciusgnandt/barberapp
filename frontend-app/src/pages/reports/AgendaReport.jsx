import { useState, useEffect, useCallback } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Percent, UserX } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, StatusBadge, ReportSkeleton, fmt, fmtNum, fmtDate, fmtDT
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function AgendaReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getAgenda(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.byDayOfWeek [{day, count}], data.byHour [{hour, count}], data.list [...]
  const byDayOfWeek = data?.byDayOfWeek ?? [];
  const byHour      = data?.byHour ?? [];
  const list        = data?.list ?? [];

  const cancellationRate = (kpis.total?.value ?? 0) > 0
    ? Math.round(((kpis.cancelled?.value ?? 0) / (kpis.total?.value ?? 1)) * 100)
    : 0;

  const tableColumns = [
    { key: 'date',        label: 'Data/Hora',    render: (v) => fmtDT(v) },
    { key: 'clientName',  label: 'Cliente' },
    { key: 'service',     label: 'Serviço' },
    { key: 'barber',      label: 'Profissional' },
    { key: 'status',      label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'price',       label: 'Valor', render: (v) => fmt(v), align: 'right' },
  ];

  return (
    <ReportLayout
      title="Agenda"
      filters={filters}
      showBarbers
      showServices
      exportProps={{
        title: 'Agenda',
        period: filters.periodLabel,
        kpis: [
          { label: 'Total', value: kpis.total?.value ?? 0 },
          { label: 'Concluídos', value: kpis.completed?.value ?? 0 },
          { label: 'Cancelados', value: kpis.cancelled?.value ?? 0 },
          { label: 'Ausências', value: kpis.absent?.value ?? 0 },
          { label: 'Taxa de Conclusão', value: `${kpis.completionRate?.value ?? 0}%` },
          { label: 'Taxa de Cancelamento', value: `${cancellationRate}%` },
        ],
        tableColumns,
        tableRows: list,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Total de Agendamentos" icon={Calendar} color="bg-blue-500" format="number"
              value={kpis.total?.value} />
            <KpiCard label="Concluídos" icon={CheckCircle} color="bg-emerald-500" format="number"
              value={kpis.completed?.value} />
            <KpiCard label="Cancelados" icon={XCircle} color="bg-red-500" format="number"
              value={kpis.cancelled?.value} />
            <KpiCard label="Ausências" icon={UserX} color="bg-orange-500" format="number"
              value={kpis.absent?.value} />
            <KpiCard label="Taxa de Conclusão" icon={Percent} color="bg-teal-500" format="percent"
              value={kpis.completionRate?.value} />
            <KpiCard label="Taxa de Cancelamento" icon={Clock} color="bg-rose-500" format="percent"
              value={cancellationRate} />
          </KpiGrid>

          {/* Weekday chart */}
          {byDayOfWeek.length > 0 && (
            <Section title="Agendamentos por Dia da Semana" subtitle="Distribuição ao longo da semana">
              <SimpleBarChart
                data={byDayOfWeek}
                labelKey="day"
                valueKey="count"
                formatValue={v => `${v} agend.`}
                colorClass="bg-blue-500"
                height={160}
              />
            </Section>
          )}

          {/* Hour of day chart */}
          {byHour.length > 0 && (
            <Section title="Horários de Pico" subtitle="Distribuição por hora do dia">
              <SimpleBarChart
                data={byHour.map(h => ({ ...h, label: `${String(h.hour).padStart(2, '0')}h` }))}
                labelKey="label"
                valueKey="count"
                formatValue={v => `${v} agend.`}
                colorClass="bg-violet-500"
                height={160}
              />
            </Section>
          )}

          {/* Status summary */}
          {(kpis.total?.value ?? 0) > 0 && (
            <Section title="Distribuição por Status">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-1">
                {[
                  { label: 'Concluídos',  value: kpis.completed?.value ?? 0,  color: 'bg-emerald-500' },
                  { label: 'Cancelados',  value: kpis.cancelled?.value ?? 0,  color: 'bg-red-500' },
                  { label: 'Ausências',   value: kpis.absent?.value ?? 0,     color: 'bg-orange-500' },
                  { label: 'Agendados',   value: kpis.pending?.value ?? 0,    color: 'bg-blue-500' },
                ].map(({ label, value, color }) => {
                  const pct = (kpis.total?.value ?? 0) > 0
                    ? Math.round((value / (kpis.total?.value ?? 1)) * 100) : 0;
                  return (
                    <div key={label} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-500">{label}</span>
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
          )}

          <Section title="Listagem de Agendamentos" noPad>
            <DataTable columns={tableColumns} rows={list} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
