import { useState, useCallback } from 'react';
import { Wand2, Play, Save, Trash2, FolderOpen } from 'lucide-react';
import {
  useReportFilters, ReportLayout, Section,
  DataTable, SimpleBarChart, fmt, todayStr, firstOfMonth
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

const STORAGE_KEY = 'customReports_v1';

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveSaved(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const SOURCE_OPTIONS = [
  { value: 'appointments', label: 'Agendamentos' },
  { value: 'transactions', label: 'Transações' },
  { value: 'clients', label: 'Clientes' },
  { value: 'stock', label: 'Estoque' },
];
const GROUPBY_OPTIONS = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'service', label: 'Serviço' },
  { value: 'barber', label: 'Profissional' },
  { value: 'paymentMethod', label: 'Forma de Pagamento' },
];
const METRIC_OPTIONS = [
  { value: 'count', label: 'Contagem' },
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
];

export default function CustomReport() {
  const filters = useReportFilters();
  const [source, setSource] = useState('appointments');
  const [groupBy, setGroupBy] = useState('day');
  const [metric, setMetric] = useState('count');
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [reportName, setReportName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(loadSaved);

  const run = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.postCustom({ source, groupBy, metric, startDate, endDate });
    if (r.ok) setResult(r.data.data);
    setLoading(false);
  }, [source, groupBy, metric, startDate, endDate]);

  const saveReport = () => {
    if (!reportName.trim()) return;
    const newList = [...saved, { id: Date.now(), name: reportName.trim(), source, groupBy, metric, startDate, endDate }];
    setSaved(newList);
    saveSaved(newList);
    setReportName('');
  };

  const loadReport = (rep) => {
    setSource(rep.source);
    setGroupBy(rep.groupBy);
    setMetric(rep.metric);
    setStartDate(rep.startDate);
    setEndDate(rep.endDate);
  };

  const deleteReport = (id) => {
    const newList = saved.filter(r => r.id !== id);
    setSaved(newList);
    saveSaved(newList);
  };

  const rows = result?.rows ?? [];
  const chart = result?.chart ?? rows.slice(0, 20);

  const labelKey = result?.labelKey ?? 'label';
  const valueKey = result?.valueKey ?? 'value';

  const tableColumns = rows.length > 0
    ? Object.keys(rows[0]).map(k => ({
        key: k,
        label: k.charAt(0).toUpperCase() + k.slice(1),
        render: typeof rows[0][k] === 'number' && k !== 'count'
          ? r => fmt(r[k])
          : undefined,
        className: typeof rows[0][k] === 'number' ? 'text-right' : undefined,
      }))
    : [];

  return (
    <ReportLayout
      title="Relatório Personalizado"
      filters={filters}
      exportProps={result ? {
        title: 'Relatório Personalizado',
        period: `${startDate} a ${endDate}`,
        kpis: [],
        tableColumns,
        tableRows: rows,
      } : undefined}
    >
      <div className="space-y-5">
        {/* Builder */}
        <Section title="Construtor de Relatório">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Fonte</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Agrupar por</label>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {GROUPBY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Métrica</label>
              <select value={metric} onChange={e => setMetric(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {METRIC_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={run} disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Play className="w-4 h-4" />
              {loading ? 'Executando...' : 'Executar'}
            </button>
            <input value={reportName} onChange={e => setReportName(e.target.value)}
              placeholder="Nome do relatório..."
              className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <button onClick={saveReport} disabled={!reportName.trim()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors">
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        </Section>

        {/* Saved reports */}
        {saved.length > 0 && (
          <Section title="Relatórios Salvos"
            subtitle={`${saved.length} relatório${saved.length !== 1 ? 's' : ''} salvo${saved.length !== 1 ? 's' : ''}`}>
            <div className="space-y-2">
              {saved.map(rep => (
                <div key={rep.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                  <div>
                    <p className="text-sm font-medium text-white">{rep.name}</p>
                    <p className="text-xs text-gray-400">{rep.source} · {rep.groupBy} · {rep.metric} · {rep.startDate} → {rep.endDate}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadReport(rep)}
                      className="text-gray-400 hover:text-white p-1.5 rounded transition-colors">
                      <FolderOpen className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteReport(rep.id)}
                      className="text-gray-400 hover:text-red-400 p-1.5 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Results */}
        {loading && (
          <div className="text-center py-12 text-gray-400">Gerando relatório...</div>
        )}

        {!loading && result && (
          <>
            {chart.length > 0 && (
              <Section title="Visualização">
                <SimpleBarChart data={chart} labelKey={labelKey} valueKey={valueKey}
                  formatValue={v => typeof v === 'number' && v > 100 ? fmt(v) : `${v}`} />
              </Section>
            )}
            {rows.length > 0 && (
              <Section title="Dados">
                <DataTable columns={tableColumns} rows={rows} expandLimit={20} sortable />
              </Section>
            )}
            {rows.length === 0 && (
              <p className="text-gray-400 text-center py-8">Nenhum dado encontrado para os filtros selecionados.</p>
            )}
          </>
        )}

        {!loading && !result && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
            <Wand2 className="w-10 h-10 opacity-40" />
            <p className="text-sm">Configure os parâmetros acima e clique em Executar.</p>
          </div>
        )}
      </div>
    </ReportLayout>
  );
}
