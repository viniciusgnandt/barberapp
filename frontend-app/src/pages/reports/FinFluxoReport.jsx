import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, DollarSign, Activity, TrendingUp } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtDate
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function FinFluxoReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // FinFluxo uses the same financial endpoint — shows timeline & saldo data
    const r = await ReportsAPI.getFinancial(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.timeline [{date, entradas, saidas, saldo}]
  const timeline = data?.timeline ?? [];

  // Build cumulative balance series
  let cumulative = 0;
  const cumulativeData = timeline.map(t => {
    cumulative += (t.saldo ?? 0);
    return { ...t, cumBalance: cumulative };
  });

  const totalEntradas = kpis.entradas?.value ?? 0;
  const totalSaidas   = kpis.saidas?.value ?? 0;
  const saldo         = kpis.saldo?.value ?? 0;
  const avgDaily      = timeline.length > 0 ? saldo / timeline.length : 0;

  const tableColumns = [
    { key: 'date', label: 'Data', render: (v) => fmtDate(v) },
    { key: 'entradas', label: 'Entradas', render: (v) => fmt(v), align: 'right' },
    { key: 'saidas', label: 'Saídas', render: (v) => fmt(v), align: 'right' },
    { key: 'saldo', label: 'Saldo do Dia', render: (v) => (
      <span className={v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{fmt(v)}</span>
    ), align: 'right' },
    { key: 'cumBalance', label: 'Saldo Acumulado', render: (v) => (
      <span className={v >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-500 font-semibold'}>{fmt(v)}</span>
    ), align: 'right' },
  ];

  return (
    <ReportLayout
      title="Fluxo de Caixa"
      filters={filters}
      showPayments
      exportProps={{
        title: 'Fluxo de Caixa',
        period: filters.periodLabel,
        kpis: [
          { label: 'Total Entradas', value: fmt(totalEntradas) },
          { label: 'Total Saídas', value: fmt(totalSaidas) },
          { label: 'Saldo Final', value: fmt(saldo) },
          { label: 'Saldo Médio/Dia', value: fmt(avgDaily) },
          { label: 'Dias com Movimento', value: timeline.length },
        ],
        tableColumns: tableColumns.slice(0, 4),
        tableRows: cumulativeData.map((t, i) => ({ ...t, id: i })),
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Total Entradas" icon={ArrowUpRight} color="bg-emerald-500" format="currency"
              value={totalEntradas} pct={kpis.entradas?.pct} />
            <KpiCard label="Total Saídas" icon={ArrowDownLeft} color="bg-red-500" format="currency"
              value={totalSaidas} pct={kpis.saidas?.pct} />
            <KpiCard label="Saldo Final" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={saldo} />
            <KpiCard label="Saldo Médio/Dia" icon={TrendingUp} color="bg-blue-500" format="currency"
              value={avgDaily} />
            <KpiCard label="Dias com Movimento" icon={Activity} color="bg-violet-500" format="number"
              value={timeline.length} />
          </KpiGrid>

          {/* Entradas / Saídas por Dia — side-by-side stacked look */}
          {timeline.length > 0 && (
            <Section title="Entradas / Saídas por Dia">
              <SimpleBarChart
                data={timeline}
                labelKey="date"
                valueKey="entradas"
                formatValue={v => fmt(v)}
                labelFormat={d => d ? d.slice(5).replace('-', '/') : ''}
                colorClass="bg-emerald-500"
                height={160}
              />
            </Section>
          )}

          {timeline.length > 0 && (
            <Section title="Saídas por Dia">
              <SimpleBarChart
                data={timeline}
                labelKey="date"
                valueKey="saidas"
                formatValue={v => fmt(v)}
                labelFormat={d => d ? d.slice(5).replace('-', '/') : ''}
                colorClass="bg-red-400"
                height={140}
              />
            </Section>
          )}

          {/* Daily table */}
          {cumulativeData.length > 0 && (
            <Section title="Histórico de Fluxo" noPad>
              <DataTable columns={tableColumns} rows={cumulativeData.map((t, i) => ({ ...t, id: i }))} />
            </Section>
          )}
        </div>
      )}
    </ReportLayout>
  );
}
