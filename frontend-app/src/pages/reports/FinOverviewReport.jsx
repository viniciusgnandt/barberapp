import { useState, useEffect, useCallback } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownLeft, TrendingUp, BarChart2, CreditCard } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtDate
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function FinOverviewReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getFinancial(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend returns: data.timeline [{date, entradas, saidas, saldo}]
  // data.byPayment [{method, total, count, prev, pct}]
  const timeline    = data?.timeline ?? [];
  const byPayment   = data?.byPayment ?? [];
  const receitas    = data?.receitas ?? [];
  const despesas    = data?.despesas ?? [];

  const totalEntradas = kpis.entradas?.value ?? 0;
  const totalSaidas   = kpis.saidas?.value ?? 0;
  const saldo         = kpis.saldo?.value ?? 0;
  const profitMargin  = totalEntradas > 0 ? Math.round((saldo / totalEntradas) * 100) : 0;
  const avgDaily      = timeline.length > 0 ? totalEntradas / timeline.length : 0;

  const timelineTableColumns = [
    { key: 'date', label: 'Data', render: (v) => fmtDate(v) },
    { key: 'entradas', label: 'Entradas', render: (v) => fmt(v), align: 'right' },
    { key: 'saidas', label: 'Saídas', render: (v) => fmt(v), align: 'right' },
    { key: 'saldo', label: 'Saldo', render: (v) => (
      <span className={v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>{fmt(v)}</span>
    ), align: 'right' },
  ];

  const paymentTableColumns = [
    { key: 'method', label: 'Forma de Pagamento' },
    { key: 'count', label: 'Transações', align: 'right' },
    { key: 'total', label: 'Total', render: (v) => fmt(v), align: 'right' },
    { key: 'pct', label: 'vs Anterior', render: (v) => (
      <span className={v > 0 ? 'text-emerald-600' : v < 0 ? 'text-red-500' : 'text-gray-400'}>
        {v > 0 ? '+' : ''}{v ?? 0}%
      </span>
    ), align: 'right' },
  ];

  return (
    <ReportLayout
      title="Financeiro — Visão Geral"
      filters={filters}
      showPayments
      exportProps={{
        title: 'Financeiro — Visão Geral',
        period: filters.periodLabel,
        kpis: [
          { label: 'Receita Total', value: fmt(totalEntradas) },
          { label: 'Despesas', value: fmt(totalSaidas) },
          { label: 'Saldo', value: fmt(saldo) },
          { label: 'Margem de Lucro', value: `${profitMargin}%` },
          { label: 'Receita Média/Dia', value: fmt(avgDaily) },
        ],
        tableColumns: timelineTableColumns,
        tableRows: timeline,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Receita Total" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={totalEntradas} pct={kpis.entradas?.pct} />
            <KpiCard label="Despesas" icon={ArrowDownLeft} color="bg-red-500" format="currency"
              value={totalSaidas} pct={kpis.saidas?.pct} />
            <KpiCard label="Saldo Líquido" icon={ArrowUpRight} color="bg-emerald-500" format="currency"
              value={saldo} />
            <KpiCard label="Margem de Lucro" icon={TrendingUp} color="bg-violet-500" format="percent"
              value={profitMargin} />
            <KpiCard label="Receita Média/Dia" icon={BarChart2} color="bg-blue-500" format="currency"
              value={avgDaily} />
            <KpiCard label="Transações" icon={CreditCard} color="bg-indigo-500" format="number"
              value={byPayment.reduce((s, p) => s + p.count, 0)} />
          </KpiGrid>

          {/* Revenue timeline */}
          {timeline.length > 0 && (
            <Section title="Entradas por Dia" subtitle="Evolução diária de receita">
              <SimpleBarChart
                data={timeline}
                labelKey="date"
                valueKey="entradas"
                formatValue={v => fmt(v)}
                labelFormat={d => d ? d.slice(5).replace('-', '/') : ''}
                colorClass="bg-emerald-500"
                height={180}
              />
            </Section>
          )}

          {/* Payment method breakdown */}
          {byPayment.length > 0 && (
            <Section title="Receita por Forma de Pagamento">
              <div className="space-y-2.5 p-1">
                {byPayment.map((pm, i) => {
                  const maxTotal = byPayment[0]?.total || 1;
                  const pct = Math.round((pm.total / maxTotal) * 100);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{pm.method || '—'}</span>
                          <span className="text-xs text-gray-500 ml-2 shrink-0">{pm.count} transações</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-24 text-right shrink-0">{fmt(pm.total)}</span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Daily summary table */}
          {timeline.length > 0 && (
            <Section title="Resumo Diário" noPad>
              <DataTable columns={timelineTableColumns} rows={timeline.map((t, i) => ({ ...t, id: i }))} />
            </Section>
          )}

          {/* Payment methods table */}
          {byPayment.length > 0 && (
            <Section title="Por Forma de Pagamento" noPad>
              <DataTable columns={paymentTableColumns} rows={byPayment.map((p, i) => ({ ...p, id: i }))} />
            </Section>
          )}
        </div>
      )}
    </ReportLayout>
  );
}
