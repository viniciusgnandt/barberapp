import { useState, useEffect, useCallback } from 'react';
import { CreditCard, Percent, DollarSign, BarChart2, AlertCircle } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtNum
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

// Payment method fee rates (approximate)
const FEE_RATES = {
  'pix':        0,
  'dinheiro':   0,
  'débito':     1.5,
  'credito':    2.8,
  'crédito':    2.8,
  'voucher':    3.5,
};

export default function FinTaxasReport() {
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

  // backend: data.byPayment [{method, total, count, prev, pct}]
  const byPayment = data?.byPayment ?? [];

  // Compute fees per payment method
  const rows = byPayment.map((pm, i) => {
    const rate    = FEE_RATES[pm.method?.toLowerCase()] ?? 0;
    const fees    = pm.total * (rate / 100);
    const net     = pm.total - fees;
    return { id: i, method: pm.method || 'outro', transactions: pm.count, gross: pm.total, fees, net, feeRate: rate };
  });

  const totalFees = rows.reduce((s, r) => s + r.fees, 0);
  const totalNet  = rows.reduce((s, r) => s + r.net, 0);
  const totalGross = rows.reduce((s, r) => s + r.gross, 0);
  const avgFeeRate = totalGross > 0 ? Math.round((totalFees / totalGross) * 100 * 10) / 10 : 0;
  const mostExpensive = rows.sort((a, b) => b.feeRate - a.feeRate)[0]?.method ?? '—';

  const tableColumns = [
    { key: 'method', label: 'Forma de Pagamento' },
    { key: 'transactions', label: 'Transações', align: 'right', render: (v) => fmtNum(v) },
    { key: 'gross', label: 'Bruto', render: (v) => fmt(v), align: 'right' },
    { key: 'feeRate', label: 'Taxa %', render: (v) => `${v}%`, align: 'right' },
    { key: 'fees', label: 'Taxas', render: (v) => (
      <span className="text-red-500">{fmt(v)}</span>
    ), align: 'right' },
    { key: 'net', label: 'Líquido', render: (v) => (
      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(v)}</span>
    ), align: 'right' },
  ];

  return (
    <ReportLayout
      title="Taxas de Pagamento"
      filters={filters}
      showPayments
      exportProps={{
        title: 'Taxas de Pagamento',
        period: filters.periodLabel,
        kpis: [
          { label: 'Total em Taxas', value: fmt(totalFees) },
          { label: 'Taxa Média', value: `${avgFeeRate}%` },
          { label: 'Total Líquido', value: fmt(totalNet) },
          { label: 'Método Mais Caro', value: mostExpensive },
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
            <KpiCard label="Total em Taxas" icon={CreditCard} color="bg-red-500" format="currency"
              value={totalFees} />
            <KpiCard label="Taxa Média" icon={Percent} color="bg-orange-500" format="number"
              displayValue={`${avgFeeRate}%`} value={avgFeeRate} />
            <KpiCard label="Total Líquido" icon={DollarSign} color="bg-emerald-600" format="currency"
              value={totalNet} />
            <KpiCard label="Formas de Pagamento" icon={BarChart2} color="bg-blue-500" format="number"
              value={byPayment.length} />
            <KpiCard label="Método Mais Caro" icon={AlertCircle} color="bg-rose-500" format="text"
              value={mostExpensive} />
          </KpiGrid>

          {/* Volume by payment method chart */}
          {rows.length > 0 && (
            <Section title="Volume por Forma de Pagamento">
              <SimpleBarChart
                data={rows}
                labelKey="method"
                valueKey="gross"
                formatValue={v => fmt(v)}
                colorClass="bg-blue-400"
                height={160}
              />
            </Section>
          )}

          {/* Gross vs net comparison */}
          {rows.length > 0 && (
            <Section title="Bruto vs Líquido por Forma de Pagamento">
              <div className="space-y-3 p-1">
                {rows.map((r, i) => {
                  const netPct = r.gross > 0 ? Math.round((r.net / r.gross) * 100) : 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{r.method}</span>
                        <div className="flex gap-3 text-xs">
                          <span className="text-gray-500">{fmtNum(r.transactions)} tx</span>
                          <span className="text-red-500">taxa {r.feeRate}%</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(r.net)}</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-red-100 dark:bg-red-900/20 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${netPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Detalhamento por Forma de Pagamento" noPad>
            <DataTable columns={tableColumns} rows={rows} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
