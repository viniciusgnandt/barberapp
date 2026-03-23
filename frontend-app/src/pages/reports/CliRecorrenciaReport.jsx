import { useState, useEffect, useCallback } from 'react';
import { Users, Repeat, Clock, TrendingUp, BarChart2 } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtNum, fmtDate
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function CliRecorrenciaReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // Uses clients endpoint — backend topClients has visits data
    const r = await ReportsAPI.getClients(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.topClients [{name, visits, spent, lastVisit}]
  const topClients = data?.topClients ?? [];

  // Build visit frequency distribution
  const buckets = { '1 visita': 0, '2-3 visitas': 0, '4-6 visitas': 0, '7+ visitas': 0 };
  topClients.forEach(c => {
    const v = c.visits ?? 0;
    if (v === 1)       buckets['1 visita']++;
    else if (v <= 3)   buckets['2-3 visitas']++;
    else if (v <= 6)   buckets['4-6 visitas']++;
    else               buckets['7+ visitas']++;
  });
  const freqData = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

  const recurring  = topClients.filter(c => (c.visits ?? 0) > 1).length;
  const recRate    = topClients.length > 0 ? Math.round((recurring / topClients.length) * 100) : 0;
  const avgVisits  = topClients.length > 0
    ? Math.round((topClients.reduce((s, c) => s + (c.visits ?? 0), 0) / topClients.length) * 10) / 10
    : 0;

  const tableColumns = [
    { key: 'name', label: 'Cliente' },
    { key: 'visits', label: 'Visitas', align: 'right', render: (v) => fmtNum(v) },
    { key: 'lastVisit', label: 'Última Visita', render: (v) => fmtDate(v) },
    { key: 'spent', label: 'Total Gasto', render: (v) => fmt(v), align: 'right' },
    { key: 'status', label: 'Status', render: (v, row) => (
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        (row.visits ?? 0) > 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
        (row.visits ?? 0) > 1 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      }`}>
        {(row.visits ?? 0) > 3 ? 'Fiel' : (row.visits ?? 0) > 1 ? 'Recorrente' : 'Novo'}
      </span>
    )},
  ];

  return (
    <ReportLayout
      title="Recorrência de Clientes"
      filters={filters}
      showBarbers
      exportProps={{
        title: 'Recorrência de Clientes',
        period: filters.periodLabel,
        kpis: [
          { label: 'Total de Clientes', value: kpis.totalClients?.value ?? topClients.length },
          { label: 'Clientes Recorrentes', value: recurring },
          { label: 'Taxa de Recorrência', value: `${recRate}%` },
          { label: 'Visitas Médias', value: avgVisits.toFixed(1) },
        ],
        tableColumns: tableColumns.slice(0, 4),
        tableRows: topClients.map((c, i) => ({ ...c, id: String(c._id ?? i) })),
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Total de Clientes" icon={Users} color="bg-blue-500" format="number"
              value={kpis.totalClients?.value ?? topClients.length} />
            <KpiCard label="Clientes Recorrentes" icon={Repeat} color="bg-emerald-500" format="number"
              value={recurring} />
            <KpiCard label="Taxa de Recorrência" icon={TrendingUp} color="bg-teal-500" format="percent"
              value={recRate} />
            <KpiCard label="Visitas Médias" icon={BarChart2} color="bg-violet-500" format="number"
              displayValue={avgVisits.toFixed(1)} value={avgVisits} />
            <KpiCard label="Clientes Novos" icon={Clock} color="bg-orange-500" format="number"
              value={topClients.length - recurring} />
          </KpiGrid>

          {/* Frequency distribution */}
          {freqData.length > 0 && (
            <Section title="Distribuição de Frequência de Visitas" subtitle="Quantos clientes visitaram N vezes">
              <SimpleBarChart
                data={freqData}
                labelKey="bucket"
                valueKey="count"
                formatValue={v => `${v} clientes`}
                colorClass="bg-teal-500"
                height={160}
              />
            </Section>
          )}

          {/* Status breakdown */}
          <Section title="Segmentação de Clientes">
            <div className="grid grid-cols-3 gap-3 p-1">
              {[
                { label: 'Novos (1 visita)',    value: topClients.filter(c => (c.visits ?? 0) === 1).length,  color: 'bg-gray-400' },
                { label: 'Recorrentes (2-6)',   value: topClients.filter(c => (c.visits ?? 0) > 1 && (c.visits ?? 0) <= 6).length, color: 'bg-blue-500' },
                { label: 'Fiéis (7+ visitas)',  value: topClients.filter(c => (c.visits ?? 0) > 6).length,   color: 'bg-emerald-500' },
              ].map(({ label, value, color }) => {
                const pct = topClients.length > 0 ? Math.round((value / topClients.length) * 100) : 0;
                return (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-3 text-center">
                    <div className={`w-3 h-3 rounded-full ${color} mx-auto mb-2`} />
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmtNum(value)}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Detalhamento de Recorrência" noPad>
            <DataTable columns={tableColumns} rows={topClients.map((c, i) => ({ ...c, id: String(c._id ?? i) }))} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
