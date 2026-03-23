import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Scissors, ShoppingBag, BarChart2, TrendingUp } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtNum
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function FinReceitasReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // getFinancial returns receitas (by category) + timeline
    const r = await ReportsAPI.getFinancial(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.receitas = [{category, total, count}]
  // data.byPayment = [{method, total, count}]
  const receitas   = data?.receitas ?? [];
  const byPayment  = data?.byPayment ?? [];

  const totalRevenue = kpis.entradas?.value ?? receitas.reduce((s, r) => s + r.total, 0);
  const totalTxns    = receitas.reduce((s, r) => s + r.count, 0);
  const avgTxn       = totalTxns > 0 ? totalRevenue / totalTxns : 0;

  // Enrich receitas with pct
  const rows = receitas.map((r, i) => ({
    id: i,
    category: r.category || 'Outros',
    transactions: r.count,
    total: r.total,
    pct: totalRevenue > 0 ? Math.round((r.total / totalRevenue) * 100) : 0,
  }));

  const tableColumns = [
    { key: 'category', label: 'Categoria' },
    { key: 'transactions', label: 'Transações', align: 'right', render: (v) => fmtNum(v) },
    { key: 'total', label: 'Total', render: (v) => fmt(v), align: 'right' },
    { key: 'pct', label: '% Receita', render: (v) => `${v}%`, align: 'right' },
  ];

  const paymentTableColumns = [
    { key: 'method', label: 'Forma de Pagamento' },
    { key: 'count', label: 'Transações', align: 'right', render: (v) => fmtNum(v) },
    { key: 'total', label: 'Total', render: (v) => fmt(v), align: 'right' },
  ];

  return (
    <ReportLayout
      title="Receitas"
      filters={filters}
      showPayments
      exportProps={{
        title: 'Receitas',
        period: filters.periodLabel,
        kpis: [
          { label: 'Receita Total', value: fmt(totalRevenue) },
          { label: 'Transações', value: fmtNum(totalTxns) },
          { label: 'Valor Médio', value: fmt(avgTxn) },
          { label: 'Categorias', value: receitas.length },
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
            <KpiCard label="Receita Total" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={totalRevenue} pct={kpis.entradas?.pct} />
            <KpiCard label="Transações" icon={BarChart2} color="bg-blue-500" format="number"
              value={totalTxns} />
            <KpiCard label="Valor Médio" icon={TrendingUp} color="bg-violet-500" format="currency"
              value={avgTxn} />
            <KpiCard label="Categorias" icon={Scissors} color="bg-orange-500" format="number"
              value={receitas.length} />
          </KpiGrid>

          {/* Category chart */}
          {rows.length > 0 && (
            <Section title="Receita por Categoria">
              <SimpleBarChart
                data={rows}
                labelKey="category"
                valueKey="total"
                formatValue={v => fmt(v)}
                colorClass="bg-emerald-500"
                height={160}
              />
            </Section>
          )}

          {/* Category breakdown with progress */}
          {rows.length > 0 && (
            <Section title="Distribuição por Categoria">
              <div className="space-y-3 p-1">
                {rows.map((r, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.category}</span>
                      <div className="flex gap-3 text-xs">
                        <span className="text-gray-500">{fmtNum(r.transactions)} tx</span>
                        <span className="text-gray-500">{r.pct}%</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(r.total)}</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Payment methods */}
          {byPayment.length > 0 && (
            <Section title="Por Forma de Pagamento">
              <SimpleBarChart
                data={byPayment.map(p => ({ ...p, methodLabel: p.method || 'outro' }))}
                labelKey="methodLabel"
                valueKey="total"
                formatValue={v => fmt(v)}
                colorClass="bg-blue-500"
                height={140}
              />
            </Section>
          )}

          <Section title="Detalhamento por Categoria" noPad>
            <DataTable columns={tableColumns} rows={rows} />
          </Section>

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
