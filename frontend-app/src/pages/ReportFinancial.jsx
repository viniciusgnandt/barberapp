// pages/ReportFinancial.jsx — Gestão Financeira

import { useState, useCallback, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Users, Download, Search,
  BarChart2, Award, Scissors, Store, Wallet,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { Reports, Barbershops } from '../utils/api';
import Button from '../components/ui/Button';
import { AreaChart, HBarChart } from '../components/ui/Charts';
import { cn } from '../utils/cn';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtShort = iso => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

function KpiCard({ label, value, icon: Icon, color, sub, highlight, note }) {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 rounded-xl border p-5 flex items-start gap-4',
      highlight
        ? 'border-brand-200 dark:border-brand-800 ring-1 ring-brand-200 dark:ring-brand-800/50'
        : 'border-gray-100 dark:border-gray-800',
    )}>
      <div className={cn('p-2.5 rounded-xl shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        <p className={cn('text-2xl font-bold', highlight ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-gray-100')}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {note && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1 leading-snug italic">{note}</p>}
      </div>
    </div>
  );
}

function FilterBar({ startDate, endDate, setStart, setEnd, filterBarber, setBarber, barbers, loadBarbers, isAdmin, today, onSearch, loading }) {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const SHORTCUTS = [
    { label: 'Hoje',          start: today, end: today },
    { label: 'Esta semana',   start: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10); })(), end: today },
    { label: 'Este mês',      start: firstDay, end: today },
    { label: 'Últ. 3 meses',  start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })(), end: today },
  ];
  const inputCls = 'px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data inicial</label>
          <input type="date" value={startDate} max={endDate} onChange={e => setStart(e.target.value)} className={inputCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data final</label>
          <input type="date" value={endDate} min={startDate} max={today} onChange={e => setEnd(e.target.value)} className={inputCls} />
        </div>
        {isAdmin && (
          <div className="space-y-1" onClick={loadBarbers}>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Profissional</label>
            <select value={filterBarber} onChange={e => setBarber(e.target.value)} className={inputCls}>
              <option value="">Todos</option>
              {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-1.5 flex-wrap">
          {SHORTCUTS.map(({ label, start, end }) => (
            <button key={label} onClick={() => { setStart(start); setEnd(end); }}
              className={cn('px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
                start === startDate && end === endDate
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
              )}>
              {label}
            </button>
          ))}
        </div>
        <Button onClick={onSearch} loading={loading}>
          <Search size={15} className="mr-1.5" /> Gerar relatório
        </Button>
      </div>
    </div>
  );
}

// ── PDF ─────────────────────────────────────────────────────────────────────────
function generatePDF({ data, filters, isAdmin, barberName }) {
  const doc = new jsPDF();
  const { summary, byBarber, byService, timeline } = data;
  const period = `${fmtDate(filters.startDate)} a ${fmtDate(filters.endDate)}`;
  const ts = new Date().toLocaleString('pt-BR');

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('BarberApp — Gestão Financeira', 14, 18);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(`Período: ${period}`, 14, 26);
  if (isAdmin && barberName) doc.text(`Profissional: ${barberName}`, 14, 31);
  doc.text(`Gerado em: ${ts}`, 14, isAdmin && barberName ? 36 : 31);
  doc.setTextColor(0);

  let y = isAdmin && barberName ? 44 : 40;

  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: [
      ['Faturamento total',      fmt(summary.revenue)],
      ['Comissão profissionais', fmt(summary.barberCommission)],
      ['Receita estabelecimento',fmt(summary.shopRevenue)],
      ['Ticket médio',           summary.completed > 0 ? fmt(summary.revenue / summary.completed) : '—'],
      ['Serviços concluídos',    summary.completed],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 184, 166] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });
  y = doc.lastAutoTable.finalY + 10;

  if (timeline.length) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Faturamento por dia', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Data', 'Agendamentos', 'Concluídos', 'Faturamento']],
      body: timeline.map(t => [fmtShort(t.date), t.count, t.completed, fmt(t.revenue)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [20, 184, 166] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (isAdmin && byBarber.length) {
    if (y > 220) { doc.addPage(); y = 14; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Por Profissional', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Profissional', 'Total', 'Concluídos', 'Faturamento', 'Comissão']],
      body: byBarber.map(b => [b.name, b.count, b.completed, fmt(b.revenue), fmt(b.barberCommission)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 184, 166] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (byService.length) {
    if (y > 220) { doc.addPage(); y = 14; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Faturamento por Serviço', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Serviço', 'Concluídos', 'Faturamento', 'Comissão Prof.', 'Receita Est.']],
      body: byService.map(s => [s.name, s.completed, fmt(s.revenue), fmt(s.barberCommission), fmt(s.shopRevenue)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [20, 184, 166] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });
  }

  doc.save(`financeiro-${filters.startDate}-${filters.endDate}.pdf`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportFinancial() {
  const { user, isAdmin } = useAuth();
  const today    = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [startDate,    setStartDate]    = useState(() => localStorage.getItem('rpt_start') || firstDay);
  const [endDate,      setEndDate]      = useState(() => localStorage.getItem('rpt_end')   || today);
  const [filterBarber, setFilterBarber] = useState(() => localStorage.getItem('rpt_barber') || '');
  const [barbers,      setBarbers]      = useState([]);
  const [barbersLoaded,setBarbersLoaded]= useState(false);
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [generating,   setGenerating]   = useState(false);

  const setStart  = v => { setStartDate(v);    localStorage.setItem('rpt_start',  v); };
  const setEnd    = v => { setEndDate(v);      localStorage.setItem('rpt_end',    v); };
  const setBarber = v => { setFilterBarber(v); localStorage.setItem('rpt_barber', v); };

  const loadBarbers = useCallback(async () => {
    if (!isAdmin || barbersLoaded) return;
    const r = await Barbershops.getEmployees(user.barbershop);
    if (r.ok) setBarbers(r.data?.data || []);
    setBarbersLoaded(true);
  }, [isAdmin, user, barbersLoaded]);

  const handleSearch = async () => {
    if (!startDate || !endDate) { setError('Informe o período.'); return; }
    setError('');
    setLoading(true);
    const params = { startDate, endDate };
    if (filterBarber) params.barber = filterBarber;
    const r = await Reports.get(params);
    setLoading(false);
    if (r.ok) setData(r.data.data);
    else setError(r.data?.message || 'Erro ao carregar relatório.');
  };

  useEffect(() => { handleSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { summary, byBarber, byService, timeline } = data || {};

  const ticketMedio  = summary?.completed > 0 ? summary.revenue / summary.completed : 0;
  const bestDay      = timeline?.length ? timeline.reduce((a, b) => b.revenue > a.revenue ? b : a, timeline[0]) : null;
  const bestBarber   = byBarber?.length  ? byBarber.reduce((a, b) => b.revenue > a.revenue ? b : a, byBarber[0]) : null;

  const timelineChart = timeline?.map(t => ({
    date:      t.date,
    revenue:   t.revenue,
    completed: t.completed,
  })) || [];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestão Financeira</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin ? 'Análise financeira do estabelecimento' : 'Seu desempenho financeiro'}
          </p>
        </div>
        {data && (
          <Button onClick={() => { setGenerating(true); try { generatePDF({ data, filters: { startDate, endDate }, isAdmin, barberName: filterBarber ? barbers.find(b => b._id === filterBarber)?.name : null }); } finally { setGenerating(false); } }} loading={generating} variant="secondary">
            <Download size={15} className="mr-1.5" /> Baixar PDF
          </Button>
        )}
      </div>

      <FilterBar
        startDate={startDate} endDate={endDate}
        setStart={setStart} setEnd={setEnd}
        filterBarber={filterBarber} setBarber={setBarber}
        barbers={barbers} loadBarbers={loadBarbers}
        isAdmin={isAdmin} today={today}
        onSearch={handleSearch} loading={loading}
      />

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">{error}</p>
      )}

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione o período e clique em "Gerar relatório"</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* ── KPIs — Admin ────────────────────────────────────────────────── */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard label="Faturamento total" value={fmt(summary.revenue)}
                icon={DollarSign} color="bg-teal-500" highlight
                sub={`${summary.completed} serviços concluídos`} />
              <KpiCard label="Lucro bruto" value={fmt(summary.shopRevenue)}
                icon={Store} color="bg-violet-500"
                sub={summary.revenue > 0 ? `${Math.round(summary.shopRevenue / summary.revenue * 100)}% do faturamento` : undefined} />
              <KpiCard label="Comissão a pagar" value={fmt(summary.barberCommission)}
                icon={Wallet} color="bg-brand-500"
                sub={summary.revenue > 0 ? `${Math.round(summary.barberCommission / summary.revenue * 100)}% do faturamento` : undefined} />
              <KpiCard label="Ticket médio" value={ticketMedio > 0 ? fmt(ticketMedio) : '—'}
                icon={TrendingUp} color="bg-amber-500"
                sub={bestDay ? `Melhor dia: ${fmtShort(bestDay.date)}` : undefined}
                note="Valor médio faturado por serviço concluído no período" />
            </div>
          )}

          {/* ── KPIs — Barbeiro ─────────────────────────────────────────────── */}
          {!isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <KpiCard label="Comissão a receber" value={fmt(summary.barberCommission)}
                icon={Wallet} color="bg-brand-500" highlight
                sub={`${summary.completed} serviços concluídos`} />
              <KpiCard label="Ticket médio" value={ticketMedio > 0 ? fmt(ticketMedio) : '—'}
                icon={TrendingUp} color="bg-amber-500" />
              {bestDay && (
                <KpiCard label="Melhor dia" value={fmt(bestDay.revenue)}
                  icon={Award} color="bg-rose-500"
                  sub={fmtShort(bestDay.date)} />
              )}
            </div>
          )}

          {/* ── Comissão a pagar por profissional (admin) ───────────────────── */}
          {isAdmin && byBarber?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-brand-100 dark:border-brand-900/40 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-brand-500 shrink-0">
                  <Wallet size={15} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comissão a pagar por profissional</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Valor a ser repassado para cada profissional no período</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{fmt(summary.barberCommission)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...byBarber].sort((a, b) => b.barberCommission - a.barberCommission).map(b => (
                  <div key={b.name} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate mb-1">{b.name}</p>
                    <p className="text-base font-bold text-brand-600 dark:text-brand-400">{fmt(b.barberCommission)}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                      {b.completed} serviço{b.completed !== 1 ? 's' : ''} · fat. {fmt(b.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue split visual bar — admin only */}
          {isAdmin && summary.revenue > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">Distribuição do faturamento</p>
              <div className="flex rounded-xl overflow-hidden h-8 text-sm font-semibold">
                <div
                  className="flex items-center justify-center bg-brand-500 text-white gap-1.5 transition-all"
                  style={{ width: `${Math.round(summary.barberCommission / summary.revenue * 100)}%` }}
                >
                  <Scissors size={13} />
                  {fmt(summary.barberCommission)}
                </div>
                <div
                  className="flex items-center justify-center bg-violet-500 text-white gap-1.5 transition-all"
                  style={{ width: `${Math.round(summary.shopRevenue / summary.revenue * 100)}%` }}
                >
                  <Store size={13} />
                  {fmt(summary.shopRevenue)}
                </div>
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-gray-400 dark:text-gray-600">
                <span>Comissão a pagar</span>
                <span>Lucro bruto</span>
              </div>
            </div>
          )}

          {/* Revenue timeline */}
          {timelineChart.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={15} className="text-teal-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {isAdmin ? 'Faturamento por dia' : 'Comissão por dia'}
                </h2>
              </div>
              <AreaChart
                data={timelineChart}
                xKey="date"
                yKey="revenue"
                formatX={fmtShort}
                formatY={fmt}
                color="#14b8a6"
                secondaryYKey="completed"
                secondaryColor="#6366f1"
                secondaryLabel="Concluídos"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by service */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={15} className="text-teal-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Por serviço</h2>
              </div>
              <div className="space-y-3">
                {[...(byService || [])].sort((a, b) => b.revenue - a.revenue).map(s => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{fmt(s.revenue)}</span>
                    </div>
                    <div className="flex rounded-md overflow-hidden h-4 text-[10px] font-semibold">
                      <div className="flex items-center justify-center bg-brand-400 text-white"
                        style={{ width: `${s.revenue > 0 ? Math.round(s.barberCommission / s.revenue * 100) : 0}%` }}
                        title={`Prof.: ${fmt(s.barberCommission)}`}>
                      </div>
                      <div className="flex items-center justify-center bg-violet-400 text-white"
                        style={{ width: `${s.revenue > 0 ? Math.round(s.shopRevenue / s.revenue * 100) : 0}%` }}
                        title={`Est.: ${fmt(s.shopRevenue)}`}>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-600">
                      <span>Prof. {fmt(s.barberCommission)} ({s.completed}×)</span>
                      <span>Est. {fmt(s.shopRevenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By barber (admin only) */}
            {isAdmin && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={15} className="text-brand-500" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Por profissional</h2>
                </div>
                <HBarChart
                  items={[...(byBarber || [])].sort((a, b) => b.revenue - a.revenue)}
                  getLabel={b => b.name}
                  getValue={b => b.completed}
                  getTooltipMain={b => `Fat. ${fmt(b.revenue)} | Com. ${fmt(b.barberCommission)}`}
                  getTooltipSub={b => `${b.completed} concluídos`}
                  colorClass="bg-brand-500"
                />
              </div>
            )}
          </div>

          {/* Summary table */}
          {timelineChart.length > 1 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Resumo diário</h2>
              </div>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['Data', 'Agendamentos', 'Concluídos', isAdmin ? 'Faturamento' : 'Comissão'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {timeline.map(t => (
                      <tr key={t.date} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{fmtShort(t.date)}</td>
                        <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{t.count}</td>
                        <td className="py-2 px-2 text-emerald-600 dark:text-emerald-400 font-medium">{t.completed}</td>
                        <td className="py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">
                          {isAdmin ? fmt(t.revenue) : fmt(t.barberCommission ?? t.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-2 text-sm font-bold text-gray-700 dark:text-gray-300" colSpan={3}>Total</td>
                      <td className="py-2 px-2 font-bold text-teal-600 dark:text-teal-400">
                        {isAdmin ? fmt(summary.revenue) : fmt(summary.barberCommission)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Commission by barber table (admin only) */}
          {isAdmin && byBarber?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Scissors size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comissão por profissional</h2>
              </div>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['Profissional', 'Concluídos', 'Faturamento', 'Comissão', 'Estabelecimento'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {[...byBarber].sort((a, b) => b.revenue - a.revenue).map(b => (
                      <tr key={b.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{b.name}</td>
                        <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{b.completed}</td>
                        <td className="py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">{fmt(b.revenue)}</td>
                        <td className="py-2 px-2 font-semibold text-brand-600 dark:text-brand-400">{fmt(b.barberCommission)}</td>
                        <td className="py-2 px-2 font-semibold text-violet-600 dark:text-violet-400">{fmt(b.revenue - b.barberCommission)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-2 text-xs font-bold text-gray-700 dark:text-gray-300" colSpan={2}>Total</td>
                      <td className="py-2 px-2 font-bold text-teal-600 dark:text-teal-400">{fmt(summary.revenue)}</td>
                      <td className="py-2 px-2 font-bold text-brand-600 dark:text-brand-400">{fmt(summary.barberCommission)}</td>
                      <td className="py-2 px-2 font-bold text-violet-600 dark:text-violet-400">{fmt(summary.shopRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
