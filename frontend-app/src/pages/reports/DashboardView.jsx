// pages/reports/DashboardView.jsx — Dashboard customizável com widgets

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, DollarSign, Calendar, CheckCircle, Users, Scissors,
  TrendingUp, ShoppingCart, Package, Settings2, Plus, X, GripVertical,
} from 'lucide-react';
import { Reports as ReportsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { KpiCard, KpiGrid, Section, ReportSkeleton, SimpleBarChart, fmt, fmtDate, fmtNum } from './components';
import { cn } from '../../utils/cn';

const STORAGE_KEY = 'dashboard_widgets';
const PRESETS = {
  geral:       ['kpi_revenue', 'kpi_completed', 'kpi_avgTicket', 'kpi_completionRate', 'chart_timeline', 'list_topServices'],
  financeiro:  ['kpi_entradas', 'kpi_saidas', 'kpi_saldo', 'chart_timeline_financial', 'chart_byPayment'],
  operacional: ['kpi_completed', 'kpi_cancelled', 'kpi_absent', 'kpi_completionRate', 'chart_byBarber', 'list_topServices'],
};

const ALL_WIDGETS = [
  // KPIs
  { id: 'kpi_revenue',        label: 'Faturamento',       type: 'kpi', category: 'Financeiro' },
  { id: 'kpi_avgTicket',      label: 'Ticket Médio',      type: 'kpi', category: 'Financeiro' },
  { id: 'kpi_entradas',       label: 'Entradas',          type: 'kpi', category: 'Financeiro' },
  { id: 'kpi_saidas',         label: 'Saídas',            type: 'kpi', category: 'Financeiro' },
  { id: 'kpi_saldo',          label: 'Saldo',             type: 'kpi', category: 'Financeiro' },
  { id: 'kpi_completed',      label: 'Concluídos',        type: 'kpi', category: 'Agenda' },
  { id: 'kpi_cancelled',      label: 'Cancelados',        type: 'kpi', category: 'Agenda' },
  { id: 'kpi_absent',         label: 'Ausentes',          type: 'kpi', category: 'Agenda' },
  { id: 'kpi_completionRate', label: 'Taxa Conclusão',    type: 'kpi', category: 'Agenda' },
  { id: 'kpi_newClients',     label: 'Novos Clientes',    type: 'kpi', category: 'Clientes' },
  // Charts
  { id: 'chart_timeline',            label: 'Evolução Receita',      type: 'chart', category: 'Gráficos' },
  { id: 'chart_timeline_financial',  label: 'Fluxo Financeiro',      type: 'chart', category: 'Gráficos' },
  { id: 'chart_byPayment',          label: 'Por Pagamento',          type: 'chart', category: 'Gráficos' },
  { id: 'chart_byBarber',           label: 'Por Profissional',       type: 'chart', category: 'Gráficos' },
  // Lists
  { id: 'list_topServices',  label: 'Top Serviços',  type: 'list', category: 'Listas' },
  { id: 'list_topClients',   label: 'Top Clientes',  type: 'list', category: 'Listas' },
];

const today    = () => new Date().toISOString().slice(0, 10);
const firstDay = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

export default function DashboardView() {
  const { isAdmin } = useAuth();

  const [preset, setPreset]     = useState('geral');
  const [widgets, setWidgets]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || PRESETS.geral; }
    catch { return PRESETS.geral; }
  });
  const [editing, setEditing]   = useState(false);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets)); }, [widgets]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = { startDate: firstDay(), endDate: today() };
    const [overview, financial] = await Promise.all([
      ReportsAPI.getOverview(params),
      isAdmin ? ReportsAPI.getFinancial(params) : Promise.resolve({ ok: false }),
    ]);
    setData({
      overview: overview.ok ? overview.data.data : null,
      financial: financial.ok ? financial.data.data : null,
    });
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (key) => {
    setPreset(key);
    setWidgets(PRESETS[key]);
  };

  const addWidget = (id) => {
    if (widgets.includes(id) || widgets.length >= 8) return;
    setWidgets(prev => [...prev, id]);
  };

  const removeWidget = (id) => {
    setWidgets(prev => prev.filter(w => w !== id));
  };

  if (loading) return <ReportSkeleton />;

  const ovr = data?.overview;
  const fin = data?.financial;

  const renderWidget = (widgetId) => {
    const def = ALL_WIDGETS.find(w => w.id === widgetId);
    if (!def) return null;

    // KPIs
    if (widgetId === 'kpi_revenue')        return <KpiCard label="Faturamento"    value={ovr?.kpis?.revenue?.value}        pct={ovr?.kpis?.revenue?.pct}        icon={DollarSign} color="bg-emerald-500" format="currency" />;
    if (widgetId === 'kpi_avgTicket')      return <KpiCard label="Ticket Médio"   value={ovr?.kpis?.avgTicket?.value}      pct={ovr?.kpis?.avgTicket?.pct}      icon={TrendingUp}  color="bg-violet-500"  format="currency" />;
    if (widgetId === 'kpi_completed')      return <KpiCard label="Concluídos"     value={ovr?.kpis?.completedAppointments?.value} pct={ovr?.kpis?.completedAppointments?.pct} icon={CheckCircle} color="bg-brand-500" format="number" />;
    if (widgetId === 'kpi_cancelled')      return <KpiCard label="Cancelados"     value={ovr?.kpis?.cancelledAppointments?.value} icon={Calendar} color="bg-red-500" format="number" />;
    if (widgetId === 'kpi_absent')         return <KpiCard label="Ausentes"       value={ovr?.kpis?.absentAppointments?.value}    icon={Calendar} color="bg-orange-500" format="number" />;
    if (widgetId === 'kpi_completionRate') return <KpiCard label="Taxa Conclusão" value={ovr?.kpis?.completionRate?.value}        icon={CheckCircle} color="bg-sky-500" format="percent" />;
    if (widgetId === 'kpi_newClients')     return <KpiCard label="Novos Clientes" value={ovr?.kpis?.newClients?.value}            icon={Users} color="bg-orange-500" format="number" />;
    if (widgetId === 'kpi_entradas')       return <KpiCard label="Entradas"       value={fin?.kpis?.entradas?.value}  pct={fin?.kpis?.entradas?.pct} icon={DollarSign} color="bg-emerald-500" format="currency" />;
    if (widgetId === 'kpi_saidas')         return <KpiCard label="Saídas"         value={fin?.kpis?.saidas?.value}    pct={fin?.kpis?.saidas?.pct}   icon={DollarSign} color="bg-red-500" format="currency" />;
    if (widgetId === 'kpi_saldo')          return <KpiCard label="Saldo"          value={fin?.kpis?.saldo?.value}     icon={DollarSign} color="bg-indigo-500" format="currency" />;

    // Charts
    if (widgetId === 'chart_timeline' && ovr?.timeline?.length > 1) {
      return (
        <Section title="Evolução de Receita">
          <SimpleBarChart data={ovr.timeline} labelKey="date" valueKey="revenue" formatValue={v => fmt(v)} />
        </Section>
      );
    }
    if (widgetId === 'chart_timeline_financial' && fin?.timeline?.length > 1) {
      return (
        <Section title="Fluxo Financeiro">
          <SimpleBarChart data={fin.timeline} labelKey="date" valueKey="entradas" formatValue={v => fmt(v)} colorClass="bg-emerald-500" />
        </Section>
      );
    }
    if (widgetId === 'chart_byPayment' && fin?.byPayment?.length > 0) {
      return (
        <Section title="Por Forma de Pagamento">
          <SimpleBarChart data={fin.byPayment} labelKey="method" valueKey="total" formatValue={v => fmt(v)} colorClass="bg-violet-500" />
        </Section>
      );
    }
    if (widgetId === 'chart_byBarber') return null; // Needs professionals data, skip for now

    // Lists
    if (widgetId === 'list_topServices' && ovr?.topServices?.length > 0) {
      return (
        <Section title="Top Serviços">
          <div className="space-y-2">
            {ovr.topServices.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-300 w-4 text-right">{i + 1}</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">{s.name || '—'}</span>
                </div>
                <span className="text-xs text-gray-500">{s.count}×</span>
              </div>
            ))}
          </div>
        </Section>
      );
    }

    return null;
  };

  const kpiWidgets   = widgets.filter(w => w.startsWith('kpi_'));
  const otherWidgets = widgets.filter(w => !w.startsWith('kpi_'));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">Este mês</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Presets */}
          {['geral', 'financeiro', 'operacional'].map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={cn(
                'px-2.5 py-1 text-[10px] rounded-lg border transition-colors capitalize',
                preset === p && JSON.stringify(widgets) === JSON.stringify(PRESETS[p])
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 font-semibold'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700',
              )}>
              {p}
            </button>
          ))}
          <button onClick={() => setEditing(!editing)}
            className={cn('p-1.5 rounded-lg transition-colors', editing ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-500' : 'text-gray-400 hover:text-gray-600')}>
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {/* Widget editor */}
      {editing && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Adicionar widgets ({widgets.length}/8)</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_WIDGETS.filter(w => !widgets.includes(w.id)).map(w => (
              <button key={w.id} onClick={() => addWidget(w.id)} disabled={widgets.length >= 8}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-brand-500 hover:text-brand-500 disabled:opacity-30 transition-colors">
                <Plus size={10} /> {w.label}
              </button>
            ))}
          </div>
          <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">
            <p className="text-[10px] text-gray-400 mb-2">Widgets ativos (clique para remover)</p>
            <div className="flex flex-wrap gap-1.5">
              {widgets.map(wId => {
                const def = ALL_WIDGETS.find(w => w.id === wId);
                return (
                  <button key={wId} onClick={() => removeWidget(wId)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                    {def?.label || wId} <X size={10} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* KPI row */}
      {kpiWidgets.length > 0 && (
        <KpiGrid>
          {kpiWidgets.map(w => <div key={w}>{renderWidget(w)}</div>)}
        </KpiGrid>
      )}

      {/* Other widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {otherWidgets.map(w => {
          const rendered = renderWidget(w);
          return rendered ? <div key={w}>{rendered}</div> : null;
        })}
      </div>
    </div>
  );
}
