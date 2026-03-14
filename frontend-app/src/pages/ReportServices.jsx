// pages/ReportServices.jsx — Relatório de Serviços

import { useState, useCallback, useEffect } from 'react';
import {
  Scissors, CheckCircle2, XCircle, Clock, Calendar,
  Download, Search,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { Reports, Barbershops } from '../utils/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { HBarChart, DonutChart } from '../components/ui/Charts';
import { cn } from '../utils/cn';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtTime = iso => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={cn('p-2.5 rounded-xl shrink-0', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function FilterBar({ startDate, endDate, setStart, setEnd, filterBarber, setBarber, barbers, loadBarbers, isAdmin, today, onSearch, loading }) {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const SHORTCUTS = [
    { label: 'Hoje',        start: today, end: today },
    { label: 'Esta semana', start: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10); })(), end: today },
    { label: 'Este mês',    start: firstDay, end: today },
    { label: 'Últ. 3 meses', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })(), end: today },
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
  const { summary, byService, list } = data;
  const period = `${fmtDate(filters.startDate)} a ${fmtDate(filters.endDate)}`;
  const ts = new Date().toLocaleString('pt-BR');

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('BarberApp — Relatório de Serviços', 14, 18);
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
      ['Total', summary.total],
      ['Concluídos', summary.completed],
      ['Cancelados', summary.cancelled],
      ['Pendentes', summary.pending],
      ['Taxa de conclusão', summary.total > 0 ? `${Math.round(summary.completed / summary.total * 100)}%` : '—'],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });
  y = doc.lastAutoTable.finalY + 10;

  if (byService.length) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Serviços', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Serviço', 'Preço', 'Total', 'Concluídos', 'Faturamento']],
      body: byService.map(s => [s.name, fmt(s.price), s.count, s.completed, fmt(s.revenue)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (list.length) {
    if (y > 220) { doc.addPage(); y = 14; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Agendamentos', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Cliente', 'Serviço', ...(isAdmin ? ['Barbeiro'] : []), 'Data', 'Status']],
      body: list.map(a => [a.clientName, a.service, ...(isAdmin ? [a.barber] : []), `${fmtDate(a.date)} ${fmtTime(a.date)}`, a.status]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });
  }
  doc.save(`servicos-${filters.startDate}-${filters.endDate}.pdf`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReportServices() {
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

  // Auto-load on mount if we have saved filters
  useEffect(() => { handleSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { summary, byService, list } = data || {};
  const completionRate = summary?.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  const donutSegments = summary ? [
    { label: 'Concluído', value: summary.completed, color: '#10b981' },
    { label: 'Cancelado', value: summary.cancelled, color: '#f87171' },
    { label: 'Agendado',  value: summary.pending,   color: '#f59e0b' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatório de Serviços</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin ? 'Visão de serviços do estabelecimento' : 'Seus dados de atendimento'}
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
          <Scissors size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione o período e clique em "Gerar relatório"</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Total"      value={summary.total}     icon={Calendar}     color="bg-brand-500" />
            <KpiCard label="Concluídos" value={summary.completed} icon={CheckCircle2} color="bg-emerald-500"
              sub={`${completionRate}% do total`} />
            <KpiCard label="Cancelados" value={summary.cancelled} icon={XCircle}      color="bg-red-400" />
            <KpiCard label="Pendentes"  value={summary.pending}   icon={Clock}        color="bg-amber-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Services bar chart */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Scissors size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Serviços por quantidade</h2>
              </div>
              <HBarChart
                items={byService}
                getLabel={s => s.name}
                getValue={s => s.count}
                getTooltipMain={s => `${s.count} × ${fmt(s.price)}`}
                getTooltipSub={s => `${fmt(s.revenue)} faturado`}
                colorClass="bg-brand-500"
              />
            </div>

            {/* Status donut */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <CheckCircle2 size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Distribuição por status</h2>
              </div>
              {summary.total > 0 ? (
                <div className="flex justify-center pt-2">
                  <DonutChart segments={donutSegments} size={150} />
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum dado.</p>
              )}
            </div>
          </div>

          {/* Services revenue bar chart */}
          {byService.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-5">
                <Scissors size={15} className="text-teal-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Serviços por faturamento</h2>
              </div>
              <HBarChart
                items={[...byService].sort((a, b) => b.revenue - a.revenue)}
                getLabel={s => s.name}
                getValue={s => s.completed}
                getTooltipMain={s => fmt(s.revenue)}
                getTooltipSub={s => `${s.completed} concluídos`}
                colorClass="bg-teal-500"
              />
            </div>
          )}

          {/* Appointments table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={15} className="text-brand-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Agendamentos ({list.length})
              </h2>
            </div>

            {list.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento no período.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['Cliente', 'Serviço', ...(isAdmin ? ['Barbeiro'] : []), 'Data', 'Status'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {list.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 px-2 font-medium text-gray-900 dark:text-gray-100">{a.clientName}</td>
                        <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{a.service}</td>
                        {isAdmin && <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{a.barber}</td>}
                        <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{fmtDate(a.date)} {fmtTime(a.date)}</td>
                        <td className="py-2.5 px-2"><Badge variant={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
