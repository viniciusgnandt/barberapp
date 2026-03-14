import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart2, TrendingUp, Scissors, Users,
  Download, Search, CheckCircle2, XCircle, Clock,
  DollarSign, Calendar,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../context/AuthContext';
import { Reports, Barbershops } from '../utils/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { cn } from '../utils/cn';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 flex items-start gap-4">
      <div className={cn('p-2.5 rounded-xl', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Interactive horizontal bar chart ─────────────────────────────────────────
function HBarChart({ rows, valueKey, labelKey, colorClass, fmtValue }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...rows.map(r => r[valueKey]), 1);

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const pct = Math.round((row[valueKey] / max) * 100);
        const isHov = hovered === i;
        return (
          <div
            key={row[labelKey] ?? i}
            className={cn('space-y-1 p-2 rounded-lg transition-colors cursor-default', isHov && 'bg-gray-50 dark:bg-gray-800/60')}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">{row[labelKey]}</span>
              <span className={cn('font-semibold transition-colors', isHov ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400')}>
                {fmtValue ? fmtValue(row) : row[valueKey]}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', colorClass, isHov && 'opacity-80')}
                style={{ width: `${pct}%` }}
              />
            </div>
            {isHov && (
              <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-400 pt-0.5">
                {row.count     !== undefined && <span>Total: <strong className="text-gray-700 dark:text-gray-300">{row.count}</strong></span>}
                {row.completed !== undefined && <span>Concluídos: <strong className="text-green-600 dark:text-green-400">{row.completed}</strong></span>}
                {row.revenue   !== undefined && <span>Faturamento: <strong className="text-teal-600 dark:text-teal-400">{fmt(row.revenue)}</strong></span>}
                {row.price     !== undefined && <span>Preço: <strong className="text-gray-700 dark:text-gray-300">{fmt(row.price)}</strong></span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Interactive timeline (vertical bars) ─────────────────────────────────────
function TimelineChart({ timeline }) {
  const [hovered, setHovered] = useState(null);
  const maxRev = Math.max(...timeline.map(t => t.revenue), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 min-w-0 pb-1" style={{ minHeight: 120 }}>
        {timeline.map((t, i) => {
          const barH = Math.max(4, (t.revenue / maxRev) * 80);
          const isHov = hovered === i;
          return (
            <div
              key={t.date}
              className="relative flex flex-col items-center gap-1 flex-1 min-w-[32px] cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHov && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg pointer-events-none">
                  <p className="font-semibold">{fmtDate(t.date + 'T12:00:00')}</p>
                  <p>{fmt(t.revenue)}</p>
                  <p className="text-gray-400 dark:text-gray-600">{t.count} agend. · {t.completed} concl.</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
                </div>
              )}
              <div
                className={cn(
                  'w-full rounded-t transition-all duration-150',
                  isHov ? 'bg-brand-600' : 'bg-brand-500',
                )}
                style={{ height: barH }}
              />
              <span className="text-[9px] text-gray-400 dark:text-gray-600 truncate w-full text-center">
                {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PDF generator ─────────────────────────────────────────────────────────────
function generatePDF({ data, filters, isAdmin, barberName }) {
  const doc = new jsPDF();
  const { summary, byService, byBarber, list } = data;

  const period = `${fmtDate(filters.startDate)} a ${fmtDate(filters.endDate)}`;
  const ts     = new Date().toLocaleString('pt-BR');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BarberApp — Relatório', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Período: ${period}`, 14, 26);
  if (isAdmin && barberName) doc.text(`Barbeiro: ${barberName}`, 14, 31);
  doc.text(`Gerado em: ${ts}`, 14, isAdmin && barberName ? 36 : 31);
  doc.setTextColor(0);

  let y = isAdmin && barberName ? 44 : 40;

  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Resumo', 14, y); y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de agendamentos', summary.total],
      ['Concluídos',            summary.completed],
      ['Cancelados',            summary.cancelled],
      ['Pendentes',             summary.pending],
      ['Faturamento (concluídos)', fmt(summary.revenue)],
      ['Ticket médio', summary.completed > 0 ? fmt(summary.revenue / summary.completed) : '—'],
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
      head: [['Serviço', 'Total', 'Concluídos', 'Faturamento']],
      body: byService.map(s => [s.name, s.count, s.completed, fmt(s.revenue)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (isAdmin && byBarber.length) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Por Barbeiro', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Barbeiro', 'Total', 'Concluídos', 'Faturamento']],
      body: byBarber.map(b => [b.name, b.count, b.completed, fmt(b.revenue)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (list.length) {
    if (y > 200) { doc.addPage(); y = 14; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Agendamentos', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Cliente', 'Serviço', 'Barbeiro', 'Data', 'Hora', 'Status', 'Valor']],
      body: list.map(a => [
        a.clientName, a.service, a.barber,
        fmtDate(a.date), fmtTime(a.date), a.status, fmt(a.price),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 } },
    });
  }

  doc.save(`relatorio-barberapp-${filters.startDate}-${filters.endDate}.pdf`);
}

// ── Tab pill ─────────────────────────────────────────────────────────────────
const STATUS_LABEL = { agendado: 'Agendado', 'concluído': 'Concluído', cancelado: 'Cancelado' };

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'services';

  const today    = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [startDate,    setStartDate]    = useState(firstDay);
  const [endDate,      setEndDate]      = useState(today);
  const [filterBarber, setFilterBarber] = useState('');
  const [barbers,      setBarbers]      = useState([]);
  const [barbersLoaded, setBarbersLoaded] = useState(false);

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [generating, setGenerating] = useState(false);

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
    else      setError(r.data?.message || 'Erro ao carregar relatório.');
  };

  const handleDownload = () => {
    if (!data) return;
    setGenerating(true);
    try {
      const barberName = filterBarber
        ? barbers.find(b => b._id === filterBarber)?.name
        : null;
      generatePDF({ data, filters: { startDate, endDate }, isAdmin, barberName });
    } finally {
      setGenerating(false);
    }
  };

  const { summary, byService, byBarber, timeline, list } = data || {};

  const setTab = (tab) => setSearchParams({ tab });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatórios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isAdmin ? 'Visão completa do estabelecimento' : 'Seus dados de atendimento'}
          </p>
        </div>
        {data && (
          <Button onClick={handleDownload} loading={generating} variant="secondary">
            <Download size={15} className="mr-1.5" /> Baixar PDF
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {[
          { id: 'services',  label: 'Serviços',          icon: Scissors   },
          { id: 'financial', label: 'Gestão Financeira',  icon: DollarSign },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data inicial</label>
            <input
              type="date" value={startDate} max={endDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data final</label>
            <input
              type="date" value={endDate} min={startDate} max={today}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
            />
          </div>

          {isAdmin && (
            <div className="space-y-1" onClick={loadBarbers}>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Profissional</label>
              <select
                value={filterBarber}
                onChange={e => setFilterBarber(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
              >
                <option value="">Todos os profissionais</option>
                {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {/* Shortcuts */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { label: 'Hoje',         start: today,    end: today },
              { label: 'Esta semana',  start: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10); })(), end: today },
              { label: 'Este mês',     start: firstDay, end: today },
              { label: 'Últ. 3 meses', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })(), end: today },
            ].map(({ label, start, end }) => (
              <button
                key={label}
                onClick={() => { setStartDate(start); setEndDate(end); }}
                className={cn(
                  'px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
                  start === startDate && end === endDate
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Button onClick={handleSearch} loading={loading}>
            <Search size={15} className="mr-1.5" /> Gerar relatório
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mt-3">{error}</p>
        )}
      </div>

      {/* Empty state */}
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Selecione o período e clique em "Gerar relatório"</p>
        </div>
      )}

      {/* ── Tab: Serviços ─────────────────────────────────────────────────── */}
      {data && activeTab === 'services' && (
        <div className="space-y-6">
          {/* Services bar chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Scissors size={15} className="text-brand-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Desempenho por Serviço</h2>
              <span className="ml-auto text-xs text-gray-400">Passe o mouse para detalhes</span>
            </div>
            {byService.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum dado.</p>
            ) : (
              <HBarChart
                rows={byService}
                valueKey="count"
                labelKey="name"
                colorClass="bg-brand-500"
                fmtValue={r => `${r.count} atend.`}
              />
            )}
          </div>

          {/* By barber chart (admin only) */}
          {isAdmin && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Desempenho por Profissional</h2>
                <span className="ml-auto text-xs text-gray-400">Passe o mouse para detalhes</span>
              </div>
              {byBarber.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum dado.</p>
              ) : (
                <HBarChart
                  rows={byBarber}
                  valueKey="revenue"
                  labelKey="name"
                  colorClass="bg-teal-500"
                  fmtValue={r => fmt(r.revenue)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Gestão Financeira ────────────────────────────────────────── */}
      {data && activeTab === 'financial' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KpiCard label="Total"       value={summary.total}     icon={Calendar}      color="bg-brand-500"   />
            <KpiCard label="Concluídos"  value={summary.completed} icon={CheckCircle2}  color="bg-emerald-500" />
            <KpiCard label="Cancelados"  value={summary.cancelled} icon={XCircle}       color="bg-red-400"     />
            <KpiCard label="Pendentes"   value={summary.pending}   icon={Clock}         color="bg-amber-400"   />
            <KpiCard
              label="Faturamento"
              value={fmt(summary.revenue)}
              sub={`${summary.completed} concluídos`}
              icon={DollarSign}
              color="bg-teal-500"
            />
            <KpiCard
              label="Ticket médio"
              value={summary.completed > 0 ? fmt(summary.revenue / summary.completed) : '—'}
              icon={TrendingUp}
              color="bg-violet-500"
            />
          </div>

          {/* Revenue timeline */}
          {timeline.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Faturamento por dia</h2>
                <span className="ml-auto text-xs text-gray-400">Passe o mouse para detalhes</span>
              </div>
              <TimelineChart timeline={timeline} />
            </div>
          )}

          {/* Appointments table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Agendamentos ({list.length})
                </h2>
              </div>
            </div>

            {list.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento no período.</p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">Cliente</th>
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">Serviço</th>
                      {isAdmin && <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">Barbeiro</th>}
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">Data</th>
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">Status</th>
                      <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {list.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-2.5 px-2 font-medium text-gray-900 dark:text-gray-100">{a.clientName}</td>
                        <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{a.service}</td>
                        {isAdmin && <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">{a.barber}</td>}
                        <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400">
                          {fmtDate(a.date)} {fmtTime(a.date)}
                        </td>
                        <td className="py-2.5 px-2"><Badge variant={a.status} /></td>
                        <td className="py-2.5 px-2 text-right font-medium text-gray-700 dark:text-gray-300">
                          {a.status === 'concluído' ? fmt(a.price) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100 dark:border-gray-800">
                      <td colSpan={isAdmin ? 5 : 4} className="py-2.5 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
                        Total faturado:
                      </td>
                      <td className="py-2.5 px-2 text-right font-bold text-gray-900 dark:text-gray-100">
                        {fmt(summary.revenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
