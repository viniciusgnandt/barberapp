// pages/Business.jsx — Meu Negócio

import { useState, useCallback, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Scissors, CheckCircle2, XCircle,
  DollarSign, Calendar, Package, AlertTriangle, ShoppingCart,
  RefreshCw, Award, BarChart2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Reports, Products as ProductsAPI } from '../utils/api';
import Button from '../components/ui/Button';
import { cn } from '../utils/cn';

const DAY_NAMES   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function ChangeBadge({ pct }) {
  if (pct === null || pct === undefined) return null;
  const positive = pct > 0, neutral = pct === 0;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full',
      neutral   ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
      : positive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                 : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    )}>
      {neutral ? '—' : positive ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}

export default function Business() {
  const { isAdmin } = useAuth();

  const today        = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [preset,      setPreset]      = useState('month');
  const [customStart, setCustomStart] = useState(firstOfMonth);
  const [customEnd,   setCustomEnd]   = useState(today);
  const [curData,     setCurData]     = useState(null);
  const [prevData,    setPrevData]    = useState(null);
  const [stockData,   setStockData]   = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [prevPeriod,  setPrevPeriod]  = useState(null);

  const getPeriod = useCallback(() => {
    const now = new Date();
    if (preset === 'month')   return { startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), endDate: today };
    if (preset === 'quarter') { const q = Math.floor(now.getMonth() / 3); return { startDate: new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10), endDate: today }; }
    if (preset === 'year')    return { startDate: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10), endDate: today };
    return { startDate: customStart, endDate: customEnd };
  }, [preset, customStart, customEnd, today]);

  const getCompPeriod = (start, end) => {
    const s = new Date(start), e = new Date(end);
    const dur = e.getTime() - s.getTime();
    const prevEnd   = new Date(s.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - dur);
    return { startDate: prevStart.toISOString().slice(0, 10), endDate: prevEnd.toISOString().slice(0, 10) };
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const period = getPeriod();
    const comp   = getCompPeriod(period.startDate, period.endDate);
    setPrevPeriod(comp);
    const [cur, prev] = await Promise.all([Reports.get(period), Reports.get(comp)]);
    if (cur.ok)  setCurData(cur.data.data);
    if (prev.ok) setPrevData(prev.data.data);
    if (isAdmin) {
      const stock = await ProductsAPI.getReport(period);
      if (stock.ok) setStockData(stock.data?.data);
    }
    setLoading(false);
  }, [getPeriod, isAdmin]);

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pctChange = (curr, prev) => {
    if (prev == null || prev === 0) return curr > 0 ? 100 : null;
    return Math.round(((curr - prev) / Math.abs(prev)) * 100);
  };

  const getDayStats = (list) => {
    if (!list?.length) return null;
    const m = {};
    list.forEach(a => { const d = new Date(a.date).getDay(); m[d] = (m[d] || 0) + 1; });
    return Object.entries(m).sort((a, b) => Number(b[1]) - Number(a[1])).map(([d, c]) => ({ day: Number(d), count: c }));
  };

  const getInsights = (cur, prev, stock) => {
    const out = [];
    if (!cur) return out;
    const { summary, byService, byBarber } = cur;
    if (prev) {
      const rc = pctChange(summary.revenue, prev.summary.revenue);
      if (rc !== null) out.push({ type: rc >= 0 ? 'positive' : 'negative', icon: rc >= 0 ? TrendingUp : TrendingDown,
        text: rc >= 0 ? `Faturamento cresceu ${rc}% em relação ao período anterior — ótimo resultado!` : `Faturamento caiu ${Math.abs(rc)}% em relação ao período anterior. Vale revisar estratégias.` });
      const cr = summary.total > 0 ? (summary.completed / summary.total * 100) : 0;
      const pr = prev.summary.total > 0 ? (prev.summary.completed / prev.summary.total * 100) : 0;
      if (prev.summary.total > 0) {
        const d = Math.round(cr - pr);
        if (d !== 0) out.push({ type: d >= 0 ? 'positive' : 'warning', icon: d >= 0 ? CheckCircle2 : XCircle,
          text: d >= 0 ? `Taxa de conclusão subiu ${d}% — menos cancelamentos e mais atendimentos realizados.` : `Taxa de conclusão caiu ${Math.abs(d)}%. Considere confirmar agendamentos com antecedência.` });
      }
      if (cur.summary.completed > 0 && prev.summary.completed > 0) {
        const ct = summary.revenue / summary.completed, pt = prev.summary.revenue / prev.summary.completed;
        const tc = pctChange(ct, pt);
        if (tc !== null && Math.abs(tc) >= 5) out.push({ type: tc >= 0 ? 'positive' : 'warning', icon: DollarSign,
          text: tc >= 0 ? `Ticket médio subiu ${tc}% — seus clientes estão investindo mais por visita.` : `Ticket médio caiu ${Math.abs(tc)}%. Promover serviços complementares pode ajudar.` });
      }
    }
    if (byService?.length > 0) {
      const t = byService[0];
      out.push({ type: 'info', icon: Scissors, text: `"${t.name}" é o serviço mais popular: ${t.count} atendimento${t.count !== 1 ? 's' : ''} e ${fmt(t.revenue)} em faturamento.` });
    }
    if (isAdmin && byBarber?.length > 0) {
      const t = byBarber[0];
      out.push({ type: 'info', icon: Award, text: `${t.name} é o profissional destaque do período com ${fmt(t.revenue)} faturados em ${t.completed} atendimento${t.completed !== 1 ? 's' : ''}.` });
    }
    if (summary.total > 0 && summary.cancelled / summary.total > 0.2) {
      out.push({ type: 'warning', icon: AlertTriangle, text: `${Math.round(summary.cancelled / summary.total * 100)}% dos agendamentos foram cancelados. Reduzir cancelamentos pode aumentar o faturamento consideravelmente.` });
    }
    if (stock?.salesByProduct?.length > 0) {
      const t = stock.salesByProduct[0];
      out.push({ type: 'info', icon: Package, text: `"${t.name}" foi o produto mais vendido: ${t.quantity} ${t.unit} e ${fmt(t.revenue)} em receita.` });
    }
    return out.slice(0, 6);
  };

  const period   = getPeriod();
  const cur      = curData, prev = prevData;
  const growth   = cur && prev ? pctChange(cur.summary.revenue, prev.summary.revenue) : null;
  const compRate = cur?.summary.total > 0 ? Math.round(cur.summary.completed / cur.summary.total * 100) : 0;
  const prevRate = prev?.summary.total > 0 ? Math.round(prev.summary.completed / prev.summary.total * 100) : 0;
  const dayStats = getDayStats(cur?.list);
  const insights = getInsights(cur, prev, stockData);

  const inputCls = 'px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';

  const PRESETS = [
    { id: 'month',   label: 'Este mês' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'year',    label: 'Este ano' },
    { id: 'custom',  label: 'Personalizado' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Meu Negócio</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {isAdmin ? 'Visão estratégica do estabelecimento' : 'Seus dados de desempenho'}
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Período de análise</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => setPreset(p.id)} className={cn(
                  'px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors',
                  preset === p.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                )}>{p.label}</button>
              ))}
            </div>
          </div>
          {preset === 'custom' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Início</label>
                <input type="date" value={customStart} max={customEnd} onChange={e => setCustomStart(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Fim</label>
                <input type="date" value={customEnd} min={customStart} max={today} onChange={e => setCustomEnd(e.target.value)} className={inputCls} />
              </div>
            </>
          )}
          <Button onClick={loadData} loading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Atualizar
          </Button>
        </div>
        {cur && prevPeriod && (
          <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-2.5">
            Período atual: <strong className="text-gray-600 dark:text-gray-400">{fmtDate(period.startDate)} → {fmtDate(period.endDate)}</strong>
            {' '}· Comparando com: <strong className="text-gray-600 dark:text-gray-400">{fmtDate(prevPeriod.startDate)} → {fmtDate(prevPeriod.endDate)}</strong>
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!cur && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp size={48} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível para o período selecionado.</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Tente ajustar os filtros ou aguarde novos agendamentos.</p>
        </div>
      )}

      {cur && !loading && (
        <>
          {/* Executive Summary Banner */}
          <div className={cn(
            'rounded-2xl p-6 border flex items-center gap-5',
            growth === null  ? 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700'
            : growth >= 0   ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/15 dark:to-teal-900/15 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/15 dark:to-orange-900/15 border-red-200 dark:border-red-800/50',
          )}>
            <div className={cn('p-4 rounded-2xl shrink-0 shadow-sm',
              growth === null ? 'bg-gray-300 dark:bg-gray-700' : growth >= 0 ? 'bg-emerald-500' : 'bg-red-500',
            )}>
              {growth !== null && growth < 0
                ? <TrendingDown size={26} className="text-white" />
                : <TrendingUp size={26} className="text-white" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Visão geral do negócio</p>
              {growth !== null ? (
                <>
                  <h2 className={cn('text-xl font-bold tracking-tight',
                    growth >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300',
                  )}>
                    {growth >= 0 ? `Seu negócio cresceu ${growth}% 🎉` : `Queda de ${Math.abs(growth)}% no faturamento`}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {growth >= 0
                      ? `Faturamento subiu de ${fmt(prev.summary.revenue)} para ${fmt(cur.summary.revenue)} no período.`
                      : `Faturamento caiu de ${fmt(prev.summary.revenue)} para ${fmt(cur.summary.revenue)}. Hora de agir!`}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">Faturamento do período</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fmt(cur.summary.revenue)} · {cur.summary.completed} atendimentos concluídos</p>
                </>
              )}
            </div>
            {growth !== null && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-gray-400 dark:text-gray-600 mb-1 uppercase tracking-wide">Vs. período anterior</p>
                <ChangeBadge pct={growth} />
              </div>
            )}
          </div>

          {/* Comparison KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Faturamento',     curr: fmt(cur.summary.revenue),  prevV: prev ? fmt(prev.summary.revenue) : null,
                chg: prev ? pctChange(cur.summary.revenue, prev.summary.revenue) : null, icon: DollarSign, color: 'bg-teal-500' },
              { label: 'Atendimentos',    curr: cur.summary.completed,     prevV: prev?.summary.completed ?? null,
                chg: prev ? pctChange(cur.summary.completed, prev.summary.completed) : null, icon: Calendar, color: 'bg-brand-500' },
              { label: 'Ticket médio',
                curr: cur.summary.completed > 0 ? fmt(cur.summary.revenue / cur.summary.completed) : '—',
                prevV: prev?.summary.completed > 0 ? fmt(prev.summary.revenue / prev.summary.completed) : null,
                chg: (cur.summary.completed > 0 && prev?.summary.completed > 0) ? pctChange(cur.summary.revenue / cur.summary.completed, prev.summary.revenue / prev.summary.completed) : null,
                icon: TrendingUp, color: 'bg-amber-500' },
              { label: 'Taxa de conclusão', curr: `${compRate}%`, prevV: prev ? `${prevRate}%` : null,
                chg: prev ? pctChange(compRate, prevRate) : null, icon: CheckCircle2, color: 'bg-violet-500' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('p-2.5 rounded-xl', kpi.color)}>
                    <kpi.icon size={16} className="text-white" />
                  </div>
                  <ChangeBadge pct={kpi.chg} />
                </div>
                <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{kpi.curr}</p>
                {kpi.prevV !== null && kpi.prevV !== undefined && (
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Anterior: {kpi.prevV}</p>
                )}
              </div>
            ))}
          </div>

          {/* Rankings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cur.byService?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/20">
                    <Scissors size={14} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Serviços em destaque</h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600">Top 3 por atendimentos</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {cur.byService.slice(0, 3).map((s, i) => (
                    <div key={s.name} className="flex items-center gap-2.5">
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : i === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                      )}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{s.name}</p>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.round(s.count / cur.byService[0].count * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{s.count}×</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600">{fmt(s.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && cur.byBarber?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                    <Award size={14} className="text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Profissionais em destaque</h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600">Top 3 por faturamento</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {cur.byBarber.slice(0, 3).map((b, i) => (
                    <div key={b.name} className="flex items-center gap-2.5">
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : i === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                      )}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{b.name}</p>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.round(b.revenue / cur.byBarber[0].revenue * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{fmt(b.revenue)}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600">{b.completed} serv.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && stockData?.salesByProduct?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                    <ShoppingCart size={14} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Produtos mais vendidos</h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600">Top 3 por receita</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {stockData.salesByProduct.slice(0, 3).map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2.5">
                      <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : i === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
                      )}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{p.name}</p>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Math.round(p.revenue / stockData.salesByProduct[0].revenue * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{fmt(p.revenue)}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600">{p.quantity} {p.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dayStats && dayStats.length > 0 && (() => {
              const maxC = Math.max(...dayStats.map(d => d.count));
              return (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                      <Calendar size={14} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Movimento por dia da semana</h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600">Total de atendimentos por dia</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 h-16 mb-2">
                    {[0,1,2,3,4,5,6].map(day => {
                      const stat = dayStats.find(d => d.day === day);
                      const count = stat?.count || 0;
                      const barH = maxC > 0 ? Math.max(3, Math.round((count / maxC) * 52)) : 3;
                      const isTop = count === maxC && count > 0;
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                          {count > 0 && <span className="text-[9px] text-gray-400 dark:text-gray-600">{count}</span>}
                          <div className={cn('w-full rounded-t', isTop ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700')} style={{ height: barH }} />
                          <span className="text-[9px] text-gray-400 dark:text-gray-600">{DAY_NAMES[day]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
                    Dia mais movimentado: <strong className="text-brand-600 dark:text-brand-400">{DAY_NAMES[dayStats[0].day]}</strong>
                    <span className="text-gray-400 dark:text-gray-600"> · {dayStats[0].count} atendimentos</span>
                  </p>
                </div>
              );
            })()}

            {(preset === 'year' || preset === 'quarter') && cur.timeline?.length > 0 && (() => {
              const monthMap = {};
              cur.timeline.forEach(t => {
                const m = t.date.slice(0, 7);
                if (!monthMap[m]) monthMap[m] = { month: m, revenue: 0, count: 0 };
                monthMap[m].revenue += t.revenue;
                monthMap[m].count   += t.count;
              });
              const months = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
              const maxRev = Math.max(...months.map(m => m.revenue), 1);
              return (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm sm:col-span-2">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                      <BarChart2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Faturamento por mês</h3>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600">Evolução ao longo do período</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 h-20">
                    {months.map(m => {
                      const barH = Math.max(4, Math.round((m.revenue / maxRev) * 72));
                      const label = MONTH_NAMES[parseInt(m.month.slice(5, 7)) - 1];
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[9px] rounded px-1.5 py-1 whitespace-nowrap shadow">
                              {fmt(m.revenue)}
                            </div>
                          </div>
                          <div className="w-full rounded-t bg-brand-500 hover:bg-brand-600 transition-colors cursor-default" style={{ height: barH }} />
                          <span className="text-[9px] text-gray-400 dark:text-gray-600">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Auto insights */}
          {insights.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <TrendingUp size={15} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Insights automáticos</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-600">Análise inteligente dos seus dados no período</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((ins, i) => (
                  <div key={i} className={cn(
                    'flex items-start gap-3 p-4 rounded-xl border',
                    ins.type === 'positive' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/40'
                    : ins.type === 'negative' ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/40'
                    : ins.type === 'warning'  ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/40'
                                              : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50',
                  )}>
                    <ins.icon size={15} className={cn('shrink-0 mt-0.5',
                      ins.type === 'positive' ? 'text-emerald-600 dark:text-emerald-400'
                      : ins.type === 'negative' ? 'text-red-600 dark:text-red-400'
                      : ins.type === 'warning'  ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-gray-500 dark:text-gray-400',
                    )} />
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{ins.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
