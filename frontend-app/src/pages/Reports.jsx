import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart2, TrendingUp, TrendingDown, Scissors, Users,
  Download, Search,
  DollarSign, Calendar, Package, AlertTriangle, ShoppingCart,
  RefreshCw, Filter, Wallet, Store, FileSpreadsheet, ChevronDown, Bot, MessageSquare, MessagesSquare,
  Scale, Landmark, CircleDollarSign, ArrowUpRight, ArrowDownRight, FileText, Info,
  CheckCircle, AlertCircle, ChevronRight,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { Reports, Barbershops, Products as ProductsAPI, Reception as ReceptionAPI, Financial } from '../utils/api';
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

const DAY_NAMES   = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ── Change badge (▲/▼ %) ─────────────────────────────────────────────────────
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

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, highlight, note }) {
  return (
    <div className={cn(
      'relative bg-white dark:bg-gray-900 rounded-2xl border p-5 flex items-start gap-4 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
      highlight
        ? 'border-brand-200 dark:border-brand-800 shadow-sm shadow-brand-100/60 dark:shadow-none'
        : 'border-gray-100 dark:border-gray-800 shadow-sm',
    )}>
      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/80 to-transparent dark:from-brand-900/10 pointer-events-none" />
      )}
      <div className={cn('p-3 rounded-2xl shrink-0 shadow-sm', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1 relative">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
        <p className={cn('text-2xl font-bold tracking-tight', highlight ? 'text-brand-600 dark:text-brand-400' : 'text-gray-900 dark:text-gray-100')}>{value}</p>
        {sub  && <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">{sub}</p>}
        {note && <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1.5 leading-snug italic border-t border-dashed border-gray-100 dark:border-gray-800 pt-1.5">{note}</p>}
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
      <div className="flex items-end gap-1.5 pb-1 pt-16 min-w-0" style={{ minHeight: 136 }}>
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
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg pointer-events-none">
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

// ── PDF helpers ───────────────────────────────────────────────────────────────
function pdfHeader(doc, title, subtitle, period, ts) {
  // Brand bar
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, 210, 2, 'F');

  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text(title, 14, 18);
  if (subtitle) { doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100); doc.text(subtitle, 14, 25); }

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(130);
  const rightX = 196;
  doc.text(`Período: ${period}`, rightX, 12, { align: 'right' });
  doc.text(`Gerado: ${ts}`, rightX, 17, { align: 'right' });

  doc.setDrawColor(230); doc.setLineWidth(0.3);
  doc.line(14, subtitle ? 29 : 23, 196, subtitle ? 29 : 23);
  doc.setTextColor(0);
  return subtitle ? 35 : 29;
}

function pdfSection(doc, title, y) {
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
  doc.text(title.toUpperCase(), 14, y);
  doc.setTextColor(0);
  return y + 5;
}

const PDF_HEAD  = { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 };
const PDF_ALT   = { fillColor: [250, 250, 250] };
const PDF_STYLE = { fontSize: 8, cellPadding: 3 };

// ── PDF generator ─────────────────────────────────────────────────────────────
function generatePDF({ data, filters, isAdmin, barberName }) {
  const doc = new jsPDF();
  const { summary, byService, byBarber, list } = data;
  const period = `${fmtDate(filters.startDate)} a ${fmtDate(filters.endDate)}`;
  const ts     = new Date().toLocaleString('pt-BR');
  const ticket = summary.completed > 0 ? fmt(summary.revenue / summary.completed) : '—';

  let y = pdfHeader(doc, 'JubaOS — Relatório', barberName ? `Profissional: ${barberName}` : null, period, ts);

  // ── Summary KPIs ────────────────────────────────────────────────────────────
  y = pdfSection(doc, 'Resumo de Atendimentos', y);
  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de agendamentos', summary.total],
      ['Concluídos',            summary.completed],
      ['Cancelados',            summary.cancelled],
      ['Pendentes',             summary.pending],
    ],
    styles: PDF_STYLE, headStyles: PDF_HEAD, alternateRowStyles: PDF_ALT,
    columnStyles: { 1: { halign: 'right' } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Financial KPIs (role-based) ──────────────────────────────────────────────
  y = pdfSection(doc, 'Gestão Financeira', y);
  const financialBody = isAdmin ? [
    ['Faturamento total',  fmt(summary.revenue)],
    ['Lucro bruto',        fmt(summary.shopRevenue)],
    ['Comissão a pagar',   fmt(summary.barberCommission)],
    ['Ticket médio',       ticket],
  ] : [
    ['Comissão a receber', fmt(summary.barberCommission)],
    ['Ticket médio',       ticket],
    ['Total gerado',       fmt(summary.revenue)],
  ];
  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: financialBody,
    styles: PDF_STYLE, headStyles: PDF_HEAD, alternateRowStyles: PDF_ALT,
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── By barber with commissions (admin) ──────────────────────────────────────
  if (isAdmin && byBarber.length) {
    y = pdfSection(doc, 'Comissão por Profissional', y);
    autoTable(doc, {
      startY: y,
      head: [['Profissional', 'Atend.', 'Concluídos', 'Faturado', 'Comissão a pagar']],
      body: byBarber.map(b => [b.name, b.count, b.completed, fmt(b.revenue), fmt(b.barberCommission)]),
      styles: PDF_STYLE, headStyles: PDF_HEAD, alternateRowStyles: PDF_ALT,
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── By service ──────────────────────────────────────────────────────────────
  if (byService.length) {
    y = pdfSection(doc, 'Serviços', y);
    autoTable(doc, {
      startY: y,
      head: [['Serviço', 'Total', 'Concluídos', 'Faturamento', 'Comissão', 'Lucro']],
      body: byService.map(s => [s.name, s.count, s.completed, fmt(s.revenue), fmt(s.barberCommission), fmt(s.shopRevenue)]),
      styles: PDF_STYLE, headStyles: PDF_HEAD, alternateRowStyles: PDF_ALT,
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ── Appointments list ────────────────────────────────────────────────────────
  if (list.length) {
    if (y > 200) { doc.addPage(); y = 14; }
    y = pdfSection(doc, 'Agendamentos', y);
    const cols = isAdmin
      ? ['Cliente', 'Serviço', 'Profissional', 'Data', 'Hora', 'Status', 'Valor']
      : ['Cliente', 'Serviço', 'Data', 'Hora', 'Status', 'Valor', 'Comissão'];
    const rows = isAdmin
      ? list.map(a => [a.clientName, a.service, a.barber, fmtDate(a.date), fmtTime(a.date), a.status, fmt(a.price)])
      : list.map(a => [a.clientName, a.service, fmtDate(a.date), fmtTime(a.date), a.status, fmt(a.price), a.status === 'concluído' ? fmt(a.price * (a.commission ?? 50) / 100) : '—']);
    autoTable(doc, {
      startY: y, head: [cols], body: rows,
      styles: { fontSize: 7, cellPadding: 2.5 }, headStyles: PDF_HEAD, alternateRowStyles: PDF_ALT,
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 25 } },
    });
    // Footer totals
    const lastY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(50);
    if (isAdmin) {
      doc.text(`Total faturado: ${fmt(summary.revenue)}`, 196, lastY, { align: 'right' });
    } else {
      doc.text(`Sua comissão: ${fmt(summary.barberCommission)}`, 196, lastY, { align: 'right' });
    }
  }

  doc.save(`relatorio-barberapp-${filters.startDate}-${filters.endDate}.pdf`);
}

// ── Excel generator (Appointments) ────────────────────────────────────────────
function generateExcel({ data, filters, isAdmin, barberName }) {
  const { summary, byService, byBarber, list } = data;
  const wb = XLSX.utils.book_new();
  const ticket = summary.completed > 0 ? (summary.revenue / summary.completed).toFixed(2) : 0;

  // Sheet 1: Resumo
  const summaryRows = isAdmin ? [
    ['Período', `${filters.startDate} a ${filters.endDate}`],
    [],
    ['ATENDIMENTOS'],
    ['Total', summary.total],
    ['Concluídos', summary.completed],
    ['Cancelados', summary.cancelled],
    ['Pendentes', summary.pending],
    [],
    ['GESTÃO FINANCEIRA'],
    ['Faturamento total', summary.revenue],
    ['Lucro bruto', summary.shopRevenue],
    ['Comissão a pagar', summary.barberCommission],
    ['Ticket médio', parseFloat(ticket)],
  ] : [
    ['Período', `${filters.startDate} a ${filters.endDate}`],
    [],
    ['ATENDIMENTOS'],
    ['Total', summary.total],
    ['Concluídos', summary.completed],
    ['Cancelados', summary.cancelled],
    ['Pendentes', summary.pending],
    [],
    ['GESTÃO FINANCEIRA'],
    ['Comissão a receber', summary.barberCommission],
    ['Ticket médio', parseFloat(ticket)],
    ['Total gerado', summary.revenue],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Resumo');

  // Sheet 2: Agendamentos
  const apptHeader = isAdmin
    ? ['Cliente', 'Serviço', 'Profissional', 'Data', 'Hora', 'Status', 'Valor (R$)']
    : ['Cliente', 'Serviço', 'Data', 'Hora', 'Status', 'Valor (R$)', 'Comissão (R$)'];
  const apptRows = isAdmin
    ? list.map(a => [a.clientName, a.service, a.barber, fmtDate(a.date), fmtTime(a.date), a.status, a.status === 'concluído' ? a.price : ''])
    : list.map(a => [a.clientName, a.service, fmtDate(a.date), fmtTime(a.date), a.status, a.status === 'concluído' ? a.price : '', a.status === 'concluído' ? parseFloat(((a.price || 0) * (a.commission ?? 50) / 100).toFixed(2)) : '']);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([apptHeader, ...apptRows]), 'Agendamentos');

  // Sheet 3: Por Serviço
  const svcHeader = ['Serviço', 'Total', 'Concluídos', 'Faturamento (R$)', 'Comissão (R$)', 'Lucro (R$)'];
  const svcRows   = byService.map(s => [s.name, s.count, s.completed, s.revenue, s.barberCommission, s.shopRevenue]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([svcHeader, ...svcRows]), 'Por Serviço');

  // Sheet 4: Por Profissional (admin only)
  if (isAdmin && byBarber.length) {
    const barberHeader = ['Profissional', 'Atend.', 'Concluídos', 'Faturado (R$)', 'Comissão a pagar (R$)'];
    const barberRows   = byBarber.map(b => [b.name, b.count, b.completed, b.revenue, b.barberCommission]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([barberHeader, ...barberRows]), 'Por Profissional');
  }

  XLSX.writeFile(wb, `relatorio-barberapp-${filters.startDate}-${filters.endDate}.xlsx`);
}

// ── Excel generator (Stock) ────────────────────────────────────────────────────
function generateStockExcel({ reportData, startDate, endDate }) {
  const { summary, stockList, salesByProduct, movements } = reportData;
  const wb = XLSX.utils.book_new();

  // Resumo
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Período', startDate && endDate ? `${startDate} a ${endDate}` : 'Completo'],
    [],
    ['Total de produtos',          summary.totalProducts],
    ['Produtos com estoque baixo', summary.lowStockCount],
    ['Valor total em estoque',     summary.totalStockValue],
    ['Receita de vendas',          summary.salesRevenue],
    ['Custo das vendas',           summary.salesCost],
    ['Lucro líquido',              summary.salesProfit],
  ]), 'Resumo');

  // Estoque atual
  const stockHeader = ['Produto', 'Marca', 'Categoria', 'Estoque', 'Mín', 'Custo Unit. (R$)', 'Preço Venda (R$)', 'Valor Total (R$)', 'Estoque Baixo'];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([stockHeader, ...stockList.map(p => [
    p.name, p.brand || '', p.category === 'venda' ? 'Venda' : 'Consumo',
    p.stock, p.minStock, p.costPrice, p.salePrice || '', p.stockValue, p.lowStock ? 'Sim' : 'Não',
  ])]), 'Estoque');

  // Vendas por produto
  if (salesByProduct.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Produto', 'Qtd Vendida', 'Receita (R$)', 'Custo (R$)', 'Lucro (R$)'],
      ...salesByProduct.map(p => [p.name, p.quantity, p.revenue, p.cost, p.profit]),
    ]), 'Vendas');
  }

  // Movimentações
  if (movements?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Data', 'Produto', 'Tipo', 'Qtd', 'Custo Unit. (R$)', 'Obs'],
      ...movements.map(m => [
        new Date(m.createdAt).toLocaleDateString('pt-BR'),
        m.product?.name || '—', m.type, m.quantity, m.unitCost, m.notes || '',
      ]),
    ]), 'Movimentações');
  }

  XLSX.writeFile(wb, `estoque-barberapp-${new Date().toLocaleDateString('sv')}.xlsx`);
}

// ── Stock KPI Card ────────────────────────────────────────────────────────────
function StockKpiCard({ label, value, icon: Icon, color, sub, warn }) {
  return (
    <div className={cn(
      'relative bg-white dark:bg-gray-900 rounded-2xl border p-5 flex items-start gap-4 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shadow-sm',
      warn ? 'border-orange-200 dark:border-orange-800'
           : 'border-gray-100 dark:border-gray-800',
    )}>
      {warn && <div className="absolute inset-0 bg-gradient-to-br from-orange-50/80 to-transparent dark:from-orange-900/10 pointer-events-none" />}
      <div className={cn('p-3 rounded-2xl shrink-0 shadow-sm', color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="relative">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</p>
        <p className={cn('text-2xl font-bold tracking-tight', warn ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100')}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Stock PDF ─────────────────────────────────────────────────────────────────
function generateStockPDF({ reportData, startDate, endDate }) {
  const { summary, stockList, salesByProduct } = reportData;
  const doc    = new jsPDF();
  const fmtD   = iso => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const period = startDate && endDate ? `${fmtD(startDate)} a ${fmtD(endDate)}` : 'Período completo';
  const ts     = new Date().toLocaleString('pt-BR');
  const fmtCur = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('JubaOS — Relatório de Estoque', 14, 18);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(`Período: ${period}`, 14, 26);
  doc.text(`Gerado em: ${ts}`, 14, 31);
  doc.setTextColor(0);

  let y = 40;
  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de produtos',          summary.totalProducts],
      ['Produtos com estoque baixo', summary.lowStockCount],
      ['Valor total em estoque',     fmtCur(summary.totalStockValue)],
      ['Receita de vendas',          fmtCur(summary.salesRevenue)],
      ['Custo das vendas',           fmtCur(summary.salesCost)],
      ['Lucro líquido',              fmtCur(summary.salesProfit)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [124, 58, 237] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });
  y = doc.lastAutoTable.finalY + 10;

  if (salesByProduct.length) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Vendas por produto', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Produto', 'Qtd', 'Receita', 'Custo', 'Lucro']],
      body: salesByProduct.map(p => [p.name, `${p.quantity} ${p.unit}`, fmtCur(p.revenue), fmtCur(p.cost), fmtCur(p.profit)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [124, 58, 237] },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  if (y > 220) { doc.addPage(); y = 14; }
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Estoque atual', 14, y); y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Categoria', 'Estoque', 'Mín', 'Custo Unit.', 'Valor Total']],
    body: stockList.map(p => [
      p.name, p.category === 'venda' ? 'Venda' : 'Consumo',
      `${p.stock} ${p.unit}`, `${p.minStock} ${p.unit}`,
      fmtCur(p.costPrice), fmtCur(p.stockValue),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [124, 58, 237] },
  });
  doc.save(`estoque-${new Date().toLocaleDateString('sv')}.pdf`);
}

// ── Balance Sheet helpers ─────────────────────────────────────────────────────
const BS_CAT_LABELS = {
  servico: 'Serviços', produto: 'Produtos', gorjeta: 'Gorjetas', comanda: 'Comandas',
  comissao: 'Comissões', fornecedor: 'Fornecedores', salario: 'Salários',
  aluguel: 'Aluguel', manutencao: 'Manutenção', materiais: 'Materiais',
  energia: 'Energia / Água', internet: 'Internet / Telefone', impostos: 'Impostos / Taxas',
  marketing: 'Marketing', equipamentos: 'Equipamentos', limpeza: 'Limpeza / Higiene',
  alimentacao: 'Alimentação', transporte: 'Transporte', despesa: 'Despesa Geral',
  ajuste: 'Ajuste', outros: 'Outros',
};
const bsFmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const bsFmtPct = (v) => (v ?? 0).toFixed(1) + '%';

function BLine({ label, value, sub, indent = 0, bold, positive, negative, muted }) {
  return (
    <div className={cn(
      'flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0',
      indent === 1 && 'pl-4',
      indent === 2 && 'pl-8',
    )}>
      <span className={cn(
        'text-sm',
        bold ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400',
        muted && 'text-gray-400 dark:text-gray-600 text-xs',
      )}>
        {label}
        {sub && <span className="ml-2 text-[10px] text-gray-400 dark:text-gray-600">({sub})</span>}
      </span>
      <span className={cn(
        'text-sm tabular-nums',
        bold ? 'font-bold' : 'font-medium',
        positive && 'text-emerald-600 dark:text-emerald-400',
        negative && 'text-red-500 dark:text-red-400',
        !positive && !negative && 'text-gray-800 dark:text-gray-200',
        muted && 'text-gray-400 dark:text-gray-600 text-xs',
      )}>
        {bsFmt(value)}
      </span>
    </div>
  );
}

function BSSection({ title, icon: Icon, color, children, total, totalLabel, totalPositive, totalNegative }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className={cn('p-2 rounded-xl shrink-0', color)}>
          <Icon size={15} className="text-white" />
        </div>
        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 flex-1">{title}</span>
        {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-gray-50 dark:border-gray-800">
          <div className="pt-3 space-y-0">{children}</div>
          {totalLabel !== undefined && (
            <div className={cn(
              'flex items-center justify-between mt-3 pt-3 border-t-2',
              totalPositive ? 'border-emerald-200 dark:border-emerald-800/60'
              : totalNegative ? 'border-red-200 dark:border-red-800/60'
              : 'border-gray-200 dark:border-gray-700',
            )}>
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{totalLabel}</span>
              <span className={cn(
                'font-extrabold text-base tabular-nums',
                totalPositive ? 'text-emerald-600 dark:text-emerald-400'
                : totalNegative ? 'text-red-500 dark:text-red-400'
                : 'text-gray-900 dark:text-gray-100',
              )}>
                {bsFmt(total)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BSKPI({ label, value, icon: Icon, color, note, positive, negative, neutral }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3">
      <div className={cn('p-2.5 rounded-xl shrink-0 shadow-sm', color)}>
        <Icon size={16} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={cn(
          'text-xl font-extrabold leading-none tabular-nums',
          positive ? 'text-emerald-600 dark:text-emerald-400'
          : negative ? 'text-red-500 dark:text-red-400'
          : 'text-gray-900 dark:text-gray-100',
        )}>
          {value}
        </p>
        {note && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 italic">{note}</p>}
      </div>
    </div>
  );
}

function DRECatRow({ label, value, total, isExpense }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-32 shrink-0">
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{label}</p>
      </div>
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', isExpense ? 'bg-red-400 dark:bg-red-500' : 'bg-emerald-400 dark:bg-emerald-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300 w-24 text-right">{bsFmt(value)}</span>
      <span className="text-[10px] text-gray-400 w-10 text-right">{bsFmtPct(pct)}</span>
    </div>
  );
}

function generateBalancePDF(bsData, startDate, endDate) {
  const { ativo, passivo, patrimonioLiquido, equacao, dre, indicadores } = bsData;
  const doc = new jsPDF();
  const ts = new Date().toLocaleString('pt-BR');
  const period = startDate && endDate
    ? `${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
    : 'Todo o período';

  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, 210, 2, 'F');
  doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
  doc.text('JubaOS — Balanço Patrimonial', 14, 18);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(`Período DRE: ${period}`, 14, 26);
  doc.text(`Gerado em: ${ts}`, 14, 31);
  doc.setDrawColor(230); doc.setLineWidth(0.3);
  doc.line(14, 35, 196, 35);
  doc.setTextColor(0);
  let y = 41;

  // Equação
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
  doc.text('EQUAÇÃO CONTÁBIL', 14, y); y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Ativo Total', 'Passivo', 'Patrimônio Líquido', 'Equilibrado?']],
    body: [[bsFmt(equacao.ativo), bsFmt(passivo.total), bsFmt(patrimonioLiquido.total), equacao.equilibrado ? '✓ Sim' : '⚠ Verificar']],
    styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255], fontSize: 8 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Ativo
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
  doc.text('ATIVO', 14, y); y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Item', 'Valor']],
    body: [
      ['Caixa (Disponibilidades)', bsFmt(ativo.circulante.caixa.valor)],
      ['Contas a Receber (Comandas abertas)', bsFmt(ativo.circulante.contasAReceber.valor)],
      ['Estoques', bsFmt(ativo.circulante.estoques.valor)],
      ['TOTAL DO ATIVO', bsFmt(ativo.total)],
    ],
    styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255], fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Passivo + PL
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
  doc.text('PASSIVO E PATRIMÔNIO LÍQUIDO', 14, y); y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Item', 'Valor']],
    body: [
      ['Comissões a Pagar', bsFmt(passivo.circulante.comissoesAPagar.valor)],
      ['TOTAL DO PASSIVO', bsFmt(passivo.total)],
      ['Patrimônio Líquido (Capital Próprio)', bsFmt(patrimonioLiquido.total)],
    ],
    styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255], fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // DRE
  if (y > 200) { doc.addPage(); y = 14; }
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
  doc.text('DRE — DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO', 14, y); y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Métrica', 'Valor']],
    body: [
      ['Receita Bruta', bsFmt(dre.receitaBruta)],
      ['(-) Despesas Totais', bsFmt(dre.despesasTotais)],
      ['(=) Resultado Líquido', bsFmt(dre.resultadoLiquido)],
    ],
    styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255], fontSize: 8 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Indicadores
  if (y > 230) { doc.addPage(); y = 14; }
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
  doc.text('INDICADORES FINANCEIROS', 14, y); y += 5;
  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: [
      ['Capital de Giro', bsFmt(indicadores.capitalDeGiro)],
      ['Liquidez Corrente', indicadores.liquidezCorrente !== null ? indicadores.liquidezCorrente.toFixed(2) : '—'],
      ['Endividamento', bsFmtPct(indicadores.endividamento)],
      ['Margem Líquida', bsFmtPct(indicadores.margemLiquida)],
      ['Giro do Ativo', indicadores.giroAtivo !== null ? indicadores.giroAtivo.toFixed(2) + 'x' : '—'],
    ],
    styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255], fontSize: 8 },
    columnStyles: { 1: { halign: 'right' } },
  });

  doc.save(`balanco-patrimonial-${new Date().toLocaleDateString('sv')}.pdf`);
}

function generateBalanceExcel(bsData, startDate, endDate) {
  const { ativo, passivo, patrimonioLiquido, equacao, dre, indicadores } = bsData;
  const wb = XLSX.utils.book_new();
  const period = startDate && endDate ? `${startDate} a ${endDate}` : 'Todo o período';

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Balanço Patrimonial — JubaOS'],
    ['Período DRE', period],
    [],
    ['ATIVO'],
    ['Caixa (Disponibilidades)', ativo.circulante.caixa.valor],
    ['Contas a Receber', ativo.circulante.contasAReceber.valor],
    ['Estoques', ativo.circulante.estoques.valor],
    ['TOTAL DO ATIVO', ativo.total],
    [],
    ['PASSIVO'],
    ['Comissões a Pagar', passivo.circulante.comissoesAPagar.valor],
    ['TOTAL DO PASSIVO', passivo.total],
    [],
    ['PATRIMÔNIO LÍQUIDO'],
    ['Capital Próprio', patrimonioLiquido.total],
    [],
    ['DRE'],
    ['Receita Bruta', dre.receitaBruta],
    ['Despesas Totais', dre.despesasTotais],
    ['Resultado Líquido', dre.resultadoLiquido],
    [],
    ['INDICADORES'],
    ['Capital de Giro', indicadores.capitalDeGiro],
    ['Liquidez Corrente', indicadores.liquidezCorrente ?? '—'],
    ['Endividamento (%)', indicadores.endividamento],
    ['Margem Líquida (%)', indicadores.margemLiquida],
    ['Giro do Ativo', indicadores.giroAtivo ?? '—'],
  ]), 'Balanço Patrimonial');

  if (dre.receitasPorCategoria?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Categoria', 'Receita (R$)'],
      ...dre.receitasPorCategoria.map(r => [BS_CAT_LABELS[r.category] || r.category, r.total]),
    ]), 'Receitas por Categoria');
  }
  if (dre.despesasPorCategoria?.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Categoria', 'Despesa (R$)'],
      ...dre.despesasPorCategoria.map(r => [BS_CAT_LABELS[r.category] || r.category, r.total]),
    ]), 'Despesas por Categoria');
  }

  XLSX.writeFile(wb, `balanco-patrimonial-${new Date().toLocaleDateString('sv')}.xlsx`);
}

// ── Stock Report Tab ──────────────────────────────────────────────────────────
function StockReportTab({ onDataChange }) {
  const todayStr  = new Date().toLocaleDateString('sv');
  const firstDay  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('sv');
  const fmtCur    = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const MOV_COLOR = {
    entrada: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    saida:   'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    venda:   'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300',
    ajuste:  'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  };
  const MOV_LABEL = { entrada: 'Entrada', saida: 'Saída', venda: 'Venda', ajuste: 'Ajuste' };

  const [rptStart,   setRptStart]   = useState(firstDay);
  const [rptEnd,     setRptEnd]     = useState(todayStr);
  const [reportData, setReportData] = useState(null);
  const [rptLoading, setRptLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setRptLoading(true);
    const r = await ProductsAPI.getReport({ startDate: rptStart, endDate: rptEnd });
    if (r.ok) {
      setReportData(r.data?.data);
      onDataChange?.({ reportData: r.data?.data, startDate: rptStart, endDate: rptEnd });
    }
    setRptLoading(false);
  }, [rptStart, rptEnd]);

  useEffect(() => { loadReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inputCls = 'px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data inicial</label>
            <input type="date" value={rptStart} max={rptEnd} onChange={e => setRptStart(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data final</label>
            <input type="date" value={rptEnd} min={rptStart} max={todayStr} onChange={e => setRptEnd(e.target.value)} className={inputCls} />
          </div>
          <Button onClick={loadReport} loading={rptLoading}>
            <Filter size={14} className="mr-1.5" /> Filtrar
          </Button>
        </div>
      </div>

      {rptLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {reportData && !rptLoading && (() => {
        const { summary, lowStock, salesByProduct, stockList, movements } = reportData;
        return (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StockKpiCard label="Produtos"         value={summary.totalProducts}        icon={Package}       color="bg-brand-500" />
              <StockKpiCard label="Estoque baixo"    value={summary.lowStockCount}        icon={AlertTriangle} color="bg-orange-500" warn={summary.lowStockCount > 0} />
              <StockKpiCard label="Valor em estoque" value={fmtCur(summary.totalStockValue)} icon={DollarSign} color="bg-teal-500" />
              <StockKpiCard label="Receita vendas"   value={fmtCur(summary.salesRevenue)} icon={TrendingUp}    color="bg-emerald-500" />
              <StockKpiCard label="Custo vendas"     value={fmtCur(summary.salesCost)}    icon={TrendingDown}  color="bg-rose-500" />
              <StockKpiCard label="Lucro líquido"    value={fmtCur(summary.salesProfit)}  icon={BarChart2}     color="bg-violet-500" />
            </div>

            {/* Low stock alert */}
            {lowStock.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-orange-500" />
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-300">Produtos com estoque baixo</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {lowStock.map(p => (
                    <div key={p._id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-xl border border-orange-200 dark:border-orange-800/40 px-3 py-2">
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-600">{p.brand || p.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{p.stock} {p.unit}</p>
                        <p className="text-[10px] text-gray-400">mín: {p.minStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sales by product */}
            {salesByProduct.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart size={15} className="text-brand-500" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Vendas por produto</h2>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        {['Produto', 'Qtd Vendida', 'Receita', 'Custo', 'Lucro', 'Margem'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {salesByProduct.map(p => {
                        const margin = p.revenue > 0 ? Math.round(p.profit / p.revenue * 100) : 0;
                        return (
                          <tr key={p.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 px-2 font-medium text-gray-700 dark:text-gray-300">{p.name}</td>
                            <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{p.quantity} {p.unit}</td>
                            <td className="py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">{fmtCur(p.revenue)}</td>
                            <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{fmtCur(p.cost)}</td>
                            <td className={cn('py-2 px-2 font-semibold', p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
                              {fmtCur(p.profit)}
                            </td>
                            <td className="py-2 px-2">
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                                margin >= 30 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                             : margin >= 10 ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                             : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
                              )}>
                                {margin}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                        <td className="py-2 px-2 text-xs font-bold text-gray-700 dark:text-gray-300" colSpan={2}>Total</td>
                        <td className="py-2 px-2 font-bold text-teal-600 dark:text-teal-400">{fmtCur(summary.salesRevenue)}</td>
                        <td className="py-2 px-2 font-bold text-gray-500 dark:text-gray-400">{fmtCur(summary.salesCost)}</td>
                        <td className="py-2 px-2 font-bold text-emerald-600 dark:text-emerald-400">{fmtCur(summary.salesProfit)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Stock position */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Posição atual do estoque</h2>
              </div>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {['Produto', 'Categoria', 'Estoque', 'Mín', 'Custo Unit.', 'Preço Venda', 'Valor Total'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {stockList.map(p => (
                      <tr key={p._id} className={cn('hover:bg-gray-50 dark:hover:bg-gray-800/50', p.lowStock && 'bg-orange-50/40 dark:bg-orange-900/5')}>
                        <td className="py-2 px-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{p.name}</span>
                          {p.brand && <span className="ml-1.5 text-[10px] text-gray-400 dark:text-gray-600">{p.brand}</span>}
                        </td>
                        <td className="py-2 px-2">
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                            p.category === 'venda'
                              ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                          )}>
                            {p.category === 'venda' ? 'Venda' : 'Consumo'}
                          </span>
                        </td>
                        <td className={cn('py-2 px-2 font-semibold', p.lowStock ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300')}>
                          {p.lowStock && <AlertTriangle size={11} className="inline mr-1" />}
                          {p.stock} {p.unit}
                        </td>
                        <td className="py-2 px-2 text-gray-400 dark:text-gray-600">{p.minStock} {p.unit}</td>
                        <td className="py-2 px-2 text-gray-500 dark:text-gray-400">{fmtCur(p.costPrice)}</td>
                        <td className="py-2 px-2 text-brand-600 dark:text-brand-400">{p.salePrice ? fmtCur(p.salePrice) : '—'}</td>
                        <td className="py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">{fmtCur(p.stockValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-2 text-xs font-bold text-gray-700 dark:text-gray-300" colSpan={6}>Total em estoque</td>
                      <td className="py-2 px-2 font-bold text-teal-600 dark:text-teal-400">{fmtCur(summary.totalStockValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Recent movements */}
            {movements?.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <RefreshCw size={15} className="text-brand-500" />
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Movimentações recentes</h2>
                </div>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        {['Data', 'Produto', 'Tipo', 'Qtd', 'Custo Unit.', 'Obs'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 py-2 px-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {movements.map(m => (
                        <tr key={m._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 px-2 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(m.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </td>
                          <td className="py-2 px-2 text-xs font-medium text-gray-700 dark:text-gray-300">{m.product?.name || '—'}</td>
                          <td className="py-2 px-2">
                            <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', MOV_COLOR[m.type])}>
                              {MOV_LABEL[m.type]}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-xs text-gray-700 dark:text-gray-300">{m.quantity} {m.product?.unit || ''}</td>
                          <td className="py-2 px-2 text-xs text-gray-500 dark:text-gray-400">{fmtCur(m.unitCost)}</td>
                          <td className="py-2 px-2 text-xs text-gray-400 dark:text-gray-600 max-w-32 truncate">{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}


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

  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [generating,  setGenerating]  = useState(false);
  const [genXlsx,     setGenXlsx]     = useState(false);
  const [exportOpen,  setExportOpen]  = useState(false);
  const exportRef = useRef(null);
  const [stockPDF,    setStockPDF]    = useState(null); // { reportData, startDate, endDate }
  const [servicesOpen,     setServicesOpen]     = useState(true);
  const [appointmentsOpen, setAppointmentsOpen] = useState(true);
  const [serviceSubTab,    setServiceSubTab]    = useState('resumo');
  const [aiUsage,          setAiUsage]          = useState(null);
  const [aiUsageLoading,   setAiUsageLoading]   = useState(false);
  const [aiStartDate,      setAiStartDate]      = useState(firstDay);
  const [aiEndDate,        setAiEndDate]        = useState(today);

  // Balance Sheet state
  const [bsData,      setBsData]      = useState(null);
  const [bsLoading,   setBsLoading]   = useState(false);
  const [bsStart,     setBsStart]     = useState(firstDay);
  const [bsEnd,       setBsEnd]       = useState(today);

  const loadBalanceSheet = useCallback(async (s, e) => {
    setBsLoading(true);
    const params = {};
    if (s) params.startDate = s;
    if (e) params.endDate   = e;
    const r = await Financial.getBalanceSheet(params);
    setBsLoading(false);
    if (r.ok) setBsData(r.data.data);
  }, []);

  const loadAiUsage = async (start, end) => {
    setAiUsageLoading(true);
    const params = {};
    if (start) params.startDate = start;
    if (end)   params.endDate   = end;
    const r = await ReceptionAPI.getUsage(params);
    setAiUsageLoading(false);
    if (r.ok) setAiUsage(r.data.data);
  };

  // Load AI usage when tab becomes active
  useEffect(() => {
    if (activeTab !== 'ia') return;
    if (aiUsage) return; // already loaded
    loadAiUsage(aiStartDate, aiEndDate);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load balance sheet when tab becomes active
  useEffect(() => {
    if (activeTab !== 'balanco') return;
    if (bsData) return;
    loadBalanceSheet(bsStart, bsEnd);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

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

  const getBarberName = () => filterBarber ? barbers.find(b => b._id === filterBarber)?.name : null;

  const handleDownload = () => {
    if (!data) return;
    generatePDF({ data, filters: { startDate, endDate }, isAdmin, barberName: getBarberName() });
  };

  const handleDownloadExcel = () => {
    if (!data) return;
    generateExcel({ data, filters: { startDate, endDate }, isAdmin, barberName: getBarberName() });
  };

  const { summary, byService, byBarber, timeline, list } = data || {};

  const setTab = (tab) => setSearchParams({ tab });

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Relatórios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isAdmin ? 'Visão completa do estabelecimento' : 'Seus dados de atendimento'}
          </p>
        </div>

        {/* Export dropdown */}
        {((data && activeTab === 'services') || (stockPDF && activeTab === 'stock') || (bsData && activeTab === 'balanco')) && (
          <div className="relative" ref={exportRef}>
            <Button variant="secondary" onClick={() => setExportOpen(o => !o)} loading={generating || genXlsx}>
              <Download size={15} className="mr-1.5" /> Exportar
              <svg className={cn('ml-1.5 w-3.5 h-3.5 transition-transform', exportOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-xl z-50 overflow-hidden">
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => {
                    setExportOpen(false);
                    setGenerating(true);
                    try {
                      if (activeTab === 'stock') generateStockPDF(stockPDF);
                      else if (activeTab === 'balanco') generateBalancePDF(bsData, bsStart, bsEnd);
                      else handleDownload();
                    } finally { setGenerating(false); }
                  }}
                >
                  <Download size={14} className="text-gray-400" /> Baixar PDF
                </button>
                <button
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors border-t border-gray-100 dark:border-gray-800"
                  onClick={() => {
                    setExportOpen(false);
                    setGenXlsx(true);
                    try {
                      if (activeTab === 'stock') generateStockExcel(stockPDF);
                      else if (activeTab === 'balanco') generateBalanceExcel(bsData, bsStart, bsEnd);
                      else handleDownloadExcel();
                    } finally { setGenXlsx(false); }
                  }}
                >
                  <FileSpreadsheet size={14} className="text-emerald-500" /> Baixar Excel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl p-1 w-fit border border-gray-200/60 dark:border-gray-700/40">
        {[
          { id: 'services',  label: 'Serviços',   icon: Scissors,  adminOnly: false },
          { id: 'stock',     label: 'Vendas',      icon: Package,   adminOnly: true  },
          { id: 'balanco',   label: 'Balanço',     icon: Scale,     adminOnly: true  },
          { id: 'ia',        label: 'Recepção IA', icon: Bot,       adminOnly: true  },
        ].filter(t => !t.adminOnly || isAdmin).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              activeTab === id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Filters + empty state — hidden on stock tab (it has its own) */}
      {activeTab === 'services' && (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
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
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4">
                <BarChart2 size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum relatório gerado</p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Selecione o período e clique em "Gerar relatório"</p>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Desempenho (Serviços + Gestão Financeira) ───────────────── */}
      {data && activeTab === 'services' && (
        <div className="space-y-5">

          {/* ── Sub-tab pills ───────────────────────────────────────────────── */}
          {(() => {
            const subTabs = [
              { id: 'resumo',       label: 'Resumo',        icon: BarChart2  },
              { id: 'atendimentos', label: 'Atendimentos',  icon: Scissors   },
              ...(isAdmin ? [{ id: 'financeiro', label: 'Financeiro', icon: Wallet }] : []),
              { id: 'detalhes',     label: 'Detalhes',      icon: Calendar   },
            ];
            return (
              <div className="flex gap-2 flex-wrap">
                {subTabs.map(st => {
                  const Icon = st.icon;
                  const active = serviceSubTab === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setServiceSubTab(st.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
                        active
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                          : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-600 dark:hover:text-brand-400',
                      )}
                    >
                      <Icon size={14} />
                      {st.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* ── Sub-tab: Resumo ─────────────────────────────────────────────── */}
          {serviceSubTab === 'resumo' && (
            <div className="space-y-5">
              {/* Status breakdown pills */}
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Total', value: summary.total, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
                  { label: 'Concluídos', value: summary.completed, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
                  { label: 'Pendentes', value: summary.pending, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
                  { label: 'Cancelados', value: summary.cancelled, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
                  ...(summary.absent > 0 ? [{ label: 'Ausentes', value: summary.absent, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' }] : []),
                ].map(({ label, value, color }) => (
                  <div key={label} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold', color)}>
                    <span>{label}:</span><strong>{value}</strong>
                  </div>
                ))}
              </div>

              {/* KPIs — Admin */}
              {isAdmin && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <KpiCard label="Faturamento total" value={fmt(summary.revenue)}
                    icon={DollarSign} color="bg-teal-500" highlight
                    sub={`${summary.completed} serviços concluídos`} />
                  <KpiCard label="Lucro bruto" value={fmt(summary.shopRevenue)}
                    icon={Store} color="bg-violet-500"
                    sub={summary.revenue > 0 ? `${Math.round(summary.shopRevenue / summary.revenue * 100)}% do faturamento` : undefined} />
                  <KpiCard label="Comissão calculada" value={fmt(summary.barberCommission)}
                    icon={Wallet} color="bg-brand-500"
                    sub={summary.revenue > 0 ? `${Math.round(summary.barberCommission / summary.revenue * 100)}% do faturamento` : undefined} />
                  <KpiCard label="Comissão paga" value={fmt(summary.commissionPaid)}
                    icon={TrendingDown} color="bg-emerald-500"
                    sub="Já repassado aos profissionais" />
                  <KpiCard label="Comissão pendente" value={fmt(summary.commissionPending)}
                    icon={TrendingUp} color="bg-amber-500"
                    sub="Aguardando pagamento" />
                  <KpiCard label="Ticket médio" value={summary.completed > 0 ? fmt(summary.revenue / summary.completed) : '—'}
                    icon={TrendingUp} color="bg-violet-500"
                    note="Valor médio faturado por serviço concluído no período" />
                </div>
              )}

              {/* KPIs — Barbeiro */}
              {!isAdmin && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <KpiCard label="Comissão a receber" value={fmt(summary.barberCommission)}
                    icon={Wallet} color="bg-brand-500" highlight
                    sub={`${summary.completed} serviços concluídos`} />
                  <KpiCard label="Ticket médio" value={summary.completed > 0 ? fmt(summary.revenue / summary.completed) : '—'}
                    icon={TrendingUp} color="bg-violet-500"
                    note="Valor médio faturado por serviço concluído no período" />
                  {summary.completed > 0 && (
                    <KpiCard label="Total gerado" value={fmt(summary.revenue)}
                      icon={DollarSign} color="bg-teal-500"
                      sub="Faturamento dos seus serviços" />
                  )}
                </div>
              )}

              {/* Timeline */}
              {timeline.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                      <TrendingUp size={15} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {isAdmin ? 'Faturamento por dia' : 'Comissão por dia'}
                      </h2>
                      <p className="text-xs text-gray-400 dark:text-gray-600">Evolução diária no período selecionado</p>
                    </div>
                    <span className="ml-auto text-xs text-gray-400 hidden sm:block">Passe o mouse para detalhes</span>
                  </div>
                  <TimelineChart timeline={timeline} />
                </div>
              )}
            </div>
          )}

          {/* ── Sub-tab: Atendimentos ───────────────────────────────────────── */}
          {serviceSubTab === 'atendimentos' && (
            <div className="space-y-5">
              {/* Por serviço */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/20">
                    <Scissors size={15} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Desempenho por Serviço</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-600">Total de atendimentos por serviço</p>
                  </div>
                </div>
                {byService.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BarChart2 size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível para o período selecionado.</p>
                  </div>
                ) : (
                  <HBarChart rows={byService} valueKey="count" labelKey="name" colorClass="bg-brand-500" fmtValue={r => `${r.count} atend.`} />
                )}
              </div>

              {/* Por profissional (admin) */}
              {isAdmin && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                      <Users size={15} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Desempenho por Profissional</h2>
                      <p className="text-xs text-gray-400 dark:text-gray-600">Faturamento gerado por barbeiro</p>
                    </div>
                    <span className="ml-auto text-xs text-gray-400 hidden sm:block">Passe o mouse para detalhes</span>
                  </div>
                  {byBarber.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart2 size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum dado disponível para o período selecionado.</p>
                    </div>
                  ) : (
                    <HBarChart rows={byBarber} valueKey="revenue" labelKey="name" colorClass="bg-teal-500" fmtValue={r => fmt(r.revenue)} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Sub-tab: Financeiro (admin only) ───────────────────────────── */}
          {serviceSubTab === 'financeiro' && isAdmin && (
            <div className="space-y-5">
              {byBarber?.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-16">Nenhum dado financeiro para o período.</p>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2.5 rounded-2xl bg-brand-500 shrink-0 shadow-sm">
                      <Wallet size={16} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Comissão a pagar por profissional</h2>
                      <p className="text-xs text-gray-400 dark:text-gray-600">Valor a repassar a cada profissional no período</p>
                    </div>
                    <div className="text-right shrink-0 bg-brand-50 dark:bg-brand-900/20 rounded-xl px-3 py-2">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total</p>
                      <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{fmt(summary.barberCommission)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...byBarber].sort((a, b) => b.barberCommission - a.barberCommission).map(b => (
                      <div key={b.name} className="bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl p-3.5 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate mb-1.5">{b.name}</p>
                        <p className="text-lg font-bold text-brand-600 dark:text-brand-400">{fmt(b.barberCommission)}</p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-400 dark:text-gray-600">{b.completed} serv.</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">pago {fmt(b.commissionPaid || 0)}</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400">pend. {fmt(b.commissionPending || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Sub-tab: Detalhes ───────────────────────────────────────────── */}
          {serviceSubTab === 'detalhes' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {list.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Nenhum agendamento no período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-800/50">
                        <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-3 px-4 uppercase tracking-wide">Cliente</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-3 px-4 uppercase tracking-wide">Serviço</th>
                        {isAdmin && <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-3 px-4 uppercase tracking-wide">Barbeiro</th>}
                        <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-3 px-4 uppercase tracking-wide">Data</th>
                        <th className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-3 px-4 uppercase tracking-wide">Status</th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-3 px-4 uppercase tracking-wide">Valor</th>
                        <th className="text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400 py-3 px-4 uppercase tracking-wide">Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((a, idx) => (
                        <tr key={a.id} className={cn('hover:bg-brand-50/30 dark:hover:bg-brand-900/5 transition-colors', idx % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/20')}>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{a.clientName}</td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.service}</td>
                          {isAdmin && <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{a.barber}</td>}
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {fmtDate(a.date)} <span className="text-gray-400 dark:text-gray-600">{fmtTime(a.date)}</span>
                          </td>
                          <td className="py-3 px-4"><Badge variant={a.status} /></td>
                          <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-gray-200">
                            {a.status === 'concluído' ? fmt(a.price) : <span className="text-gray-300 dark:text-gray-700 font-normal">—</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {a.status === 'concluído' ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-semibold text-brand-600 dark:text-brand-400">{fmt(a.commissionAmount || 0)}</span>
                                {a.commissionStatus && (
                                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                    a.commissionStatus === 'pago'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                                  )}>
                                    {a.commissionStatus === 'pago' ? 'Pago' : 'Pendente'}
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-gray-300 dark:text-gray-700">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30">
                        <td colSpan={isAdmin ? 5 : 4} className="py-3 px-4 text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide text-right">
                          {isAdmin ? 'Total faturado' : 'Sua comissão'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-base text-brand-600 dark:text-brand-400">
                          {isAdmin ? fmt(summary.revenue) : fmt(summary.barberCommission)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-gray-400 dark:text-gray-600">
                          {isAdmin && summary.commissionPending > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">{fmt(summary.commissionPending)} pend.</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Estoque ─────────────────────────────────────────────────── */}
      {activeTab === 'stock' && isAdmin && <StockReportTab onDataChange={setStockPDF} />}

      {/* ── Tab: Balanço Patrimonial ─────────────────────────────────────── */}
      {activeTab === 'balanco' && isAdmin && (
        <div className="space-y-6">
          {/* Period filter */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <FileText size={11} /> Período da DRE
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  <input type="date" value={bsStart} max={bsEnd}
                    onChange={e => setBsStart(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors" />
                  <span className="text-gray-400 text-sm">até</span>
                  <input type="date" value={bsEnd} min={bsStart} max={today}
                    onChange={e => setBsEnd(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors" />
                  {[
                    { label: 'Este mês', s: firstDay, e: today },
                    { label: 'Este ano', s: new Date().getFullYear() + '-01-01', e: today },
                  ].map(({ label, s, e }) => (
                    <button key={label} onClick={() => { setBsStart(s); setBsEnd(e); loadBalanceSheet(s, e); }}
                      className={cn('px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
                        s === bsStart && e === bsEnd
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                      )}>
                      {label}
                    </button>
                  ))}
                  <button onClick={() => loadBalanceSheet(bsStart, bsEnd)} disabled={bsLoading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-brand-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-brand-300 transition-colors disabled:opacity-40">
                    <RefreshCw size={12} className={bsLoading ? 'animate-spin' : ''} /> Atualizar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {bsLoading && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {bsData && !bsLoading && (() => {
            const { ativo, passivo, patrimonioLiquido, equacao, dre, indicadores } = bsData;
            const resultadoPositivo = dre.resultadoLiquido >= 0;
            return (
              <div className="space-y-6">
                {/* Equação contábil */}
                <div className={cn(
                  'flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm',
                  equacao.equilibrado
                    ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400',
                )}>
                  {equacao.equilibrado ? <CheckCircle size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
                  <span className="font-medium">
                    Ativo Total <strong>{bsFmt(equacao.ativo)}</strong>
                    {' = '}Passivo <strong>{bsFmt(passivo.total)}</strong>
                    {' + '}Patrimônio Líquido <strong>{bsFmt(patrimonioLiquido.total)}</strong>
                  </span>
                  <span className="ml-auto text-xs font-bold">{equacao.equilibrado ? '✓ Equilibrado' : '⚠ Verificar'}</span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <BSKPI label="Capital de Giro" value={bsFmt(indicadores.capitalDeGiro)} icon={Wallet} color="bg-brand-500"
                    positive={indicadores.capitalDeGiro > 0} negative={indicadores.capitalDeGiro < 0} note="Ativo − Passivo Circ." />
                  <BSKPI label="Liquidez Corrente" value={indicadores.liquidezCorrente !== null ? indicadores.liquidezCorrente.toFixed(2) : '—'}
                    icon={Scale} color="bg-teal-500"
                    positive={indicadores.liquidezCorrente > 1} negative={indicadores.liquidezCorrente !== null && indicadores.liquidezCorrente < 1}
                    note={indicadores.liquidezCorrente > 1 ? 'Solvente' : 'Atenção'} />
                  <BSKPI label="Endividamento" value={bsFmtPct(indicadores.endividamento)} icon={Landmark}
                    color={indicadores.endividamento > 50 ? 'bg-red-500' : 'bg-violet-500'}
                    negative={indicadores.endividamento > 50} positive={indicadores.endividamento <= 30} note="Passivo / Ativo Total" />
                  <BSKPI label="Margem Líquida" value={bsFmtPct(indicadores.margemLiquida)} icon={TrendingUp}
                    color={resultadoPositivo ? 'bg-emerald-500' : 'bg-red-500'}
                    positive={indicadores.margemLiquida > 0} negative={indicadores.margemLiquida < 0} note="Resultado / Receita" />
                  <BSKPI label="Giro do Ativo" value={indicadores.giroAtivo !== null ? indicadores.giroAtivo.toFixed(2) + 'x' : '—'}
                    icon={RefreshCw} color="bg-amber-500" note="Receita / Ativo Total" />
                </div>

                {/* Ativo / Passivo+PL */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BSSection title="ATIVO" icon={TrendingUp} color="bg-emerald-500" total={ativo.total} totalLabel="TOTAL DO ATIVO" totalPositive>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest py-1">Ativo Circulante</p>
                    <BLine indent={1} label={ativo.circulante.caixa.label} value={ativo.circulante.caixa.valor} positive={ativo.circulante.caixa.valor > 0} />
                    <BLine indent={1} label={ativo.circulante.contasAReceber.label} value={ativo.circulante.contasAReceber.valor}
                      sub={ativo.circulante.contasAReceber.count > 0 ? `${ativo.circulante.contasAReceber.count} comanda(s)` : null}
                      positive={ativo.circulante.contasAReceber.valor > 0} />
                    <BLine indent={1} label={ativo.circulante.estoques.label} value={ativo.circulante.estoques.valor}
                      sub={ativo.circulante.estoques.count > 0 ? `${ativo.circulante.estoques.count} itens` : null}
                      positive={ativo.circulante.estoques.valor > 0} />
                    <BLine label="Total Ativo Circulante" value={ativo.totalCirculante} bold positive />
                    <BLine indent={1} muted label="Ativo Não Circulante (imobilizado)" value={0} />
                  </BSSection>
                  <div className="space-y-4">
                    <BSSection title="PASSIVO" icon={TrendingDown} color="bg-red-500" total={passivo.total} totalLabel="TOTAL DO PASSIVO" totalNegative={passivo.total > 0}>
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest py-1">Passivo Circulante</p>
                      <BLine indent={1} label={passivo.circulante.comissoesAPagar.label} value={passivo.circulante.comissoesAPagar.valor}
                        sub={passivo.circulante.comissoesAPagar.count > 0 ? `${passivo.circulante.comissoesAPagar.count} pendente(s)` : null}
                        negative={passivo.circulante.comissoesAPagar.valor > 0} />
                      {passivo.mesAtual?.length > 0 && passivo.mesAtual.map(cat => (
                        <BLine key={cat._id} indent={1} muted label={BS_CAT_LABELS[cat._id] || cat._id} value={cat.total} />
                      ))}
                    </BSSection>
                    <BSSection title="PATRIMÔNIO LÍQUIDO" icon={Landmark} color="bg-brand-500" total={patrimonioLiquido.total} totalLabel="TOTAL DO PATRIMÔNIO LÍQUIDO"
                      totalPositive={patrimonioLiquido.total >= 0} totalNegative={patrimonioLiquido.total < 0}>
                      <BLine indent={1} label={patrimonioLiquido.capitalProprio.label} value={patrimonioLiquido.capitalProprio.valor}
                        positive={patrimonioLiquido.capitalProprio.valor >= 0} negative={patrimonioLiquido.capitalProprio.valor < 0} />
                      <BLine indent={2} muted label="= Ativo Total − Passivo Total" value={patrimonioLiquido.total} />
                    </BSSection>
                  </div>
                </div>

                {/* DRE */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500 shrink-0"><BarChart2 size={15} className="text-white" /></div>
                    <div>
                      <p className="font-bold text-sm text-gray-900 dark:text-gray-100">DRE — Demonstração do Resultado do Exercício</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {dre.periodo.startDate && dre.periodo.endDate
                          ? `${new Date(dre.periodo.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} a ${new Date(dre.periodo.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
                          : 'Todo o período'}
                      </p>
                    </div>
                  </div>
                  <div className="p-5 space-y-5">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/40">
                        <div className="flex items-center gap-1.5 mb-1"><ArrowUpRight size={13} className="text-emerald-500" />
                          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receita Bruta</p>
                        </div>
                        <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{bsFmt(dre.receitaBruta)}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-800/40">
                        <div className="flex items-center gap-1.5 mb-1"><ArrowDownRight size={13} className="text-red-500" />
                          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Despesas Totais</p>
                        </div>
                        <p className="text-xl font-extrabold text-red-500 dark:text-red-400 tabular-nums">{bsFmt(dre.despesasTotais)}</p>
                      </div>
                      <div className={cn('rounded-xl p-4 border', resultadoPositivo ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-800/40' : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700')}>
                        <div className="flex items-center gap-1.5 mb-1"><CircleDollarSign size={13} className={resultadoPositivo ? 'text-brand-500' : 'text-gray-400'} />
                          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resultado Líquido</p>
                        </div>
                        <p className={cn('text-xl font-extrabold tabular-nums', resultadoPositivo ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400')}>
                          {bsFmt(dre.resultadoLiquido)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {dre.receitasPorCategoria?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <ArrowUpRight size={13} className="text-emerald-500" /> Receitas por categoria
                          </p>
                          <div className="space-y-1">
                            {dre.receitasPorCategoria.map(r => (
                              <DRECatRow key={r.category} label={BS_CAT_LABELS[r.category] || r.category} value={r.total} total={dre.receitaBruta} isExpense={false} />
                            ))}
                          </div>
                        </div>
                      )}
                      {dre.despesasPorCategoria?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <ArrowDownRight size={13} className="text-red-500" /> Despesas por categoria
                          </p>
                          <div className="space-y-1">
                            {dre.despesasPorCategoria.map(r => (
                              <DRECatRow key={r.category} label={BS_CAT_LABELS[r.category] || r.category} value={r.total} total={dre.despesasTotais} isExpense />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-[11px] text-gray-400 dark:text-gray-500">
                      <Info size={12} className="shrink-0 mt-0.5" />
                      <p>O Balanço reflete a posição atual: disponibilidades em caixa, contas a receber (comandas abertas) e estoques no ativo; comissões pendentes no passivo. A DRE demonstra o resultado do período filtrado.</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Tab: Recepção IA ─────────────────────────────────────────────── */}
      {activeTab === 'ia' && isAdmin && (
        <div className="space-y-4">

          {/* Filter bar */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end justify-between">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data inicial</label>
                  <input
                    type="date" value={aiStartDate} max={aiEndDate}
                    onChange={e => setAiStartDate(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Data final</label>
                  <input
                    type="date" value={aiEndDate} min={aiStartDate} max={today}
                    onChange={e => setAiEndDate(e.target.value)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
                  />
                </div>
                {/* Shortcuts */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { label: 'Este mês',     start: firstDay, end: today },
                    { label: 'Últ. 3 meses', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10); })(), end: today },
                    { label: 'Últ. 6 meses', start: (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10); })(), end: today },
                  ].map(({ label, start, end }) => (
                    <button
                      key={label}
                      onClick={() => { setAiStartDate(start); setAiEndDate(end); }}
                      className={cn(
                        'px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
                        start === aiStartDate && end === aiEndDate
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Button onClick={() => loadAiUsage(aiStartDate, aiEndDate)} loading={aiUsageLoading}>
                  <Search size={15} className="mr-1.5" /> Filtrar
                </Button>
              </div>

              {/* PDF export */}
              {aiUsage && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    const doc = new jsPDF();
                    const period = `${fmtDate(aiStartDate)} a ${fmtDate(aiEndDate)}`;
                    const ts = new Date().toLocaleString('pt-BR');
                    const MONTHS = { '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez' };

                    doc.setFillColor(124, 58, 237);
                    doc.rect(0, 0, 210, 2, 'F');
                    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
                    doc.text('JubaOS — Recepção IA', 14, 18);
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(130);
                    doc.text(`Período: ${period}`, 196, 12, { align: 'right' });
                    doc.text(`Gerado: ${ts}`, 196, 17, { align: 'right' });
                    doc.setDrawColor(230); doc.setLineWidth(0.3); doc.line(14, 23, 196, 23);
                    doc.setTextColor(0);

                    let y = 32;
                    autoTable(doc, {
                      startY: y,
                      head: [['Métrica', 'Valor']],
                      body: [
                        ['Mensagens respondidas pela IA', aiUsage.totalMensagens],
                        ['Contatos atendidos',            aiUsage.totalContatos],
                        ['Conversas',                    aiUsage.totalConversas],
                      ],
                      styles: { fontSize: 9, cellPadding: 3 },
                      headStyles: { fillColor: [124, 58, 237], textColor: [255,255,255], fontStyle: 'bold' },
                      alternateRowStyles: { fillColor: [250, 250, 250] },
                      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
                    });
                    y = doc.lastAutoTable.finalY + 10;

                    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(60);
                    doc.text('MENSAGENS POR MÊS', 14, y); y += 5;
                    doc.setTextColor(0);
                    autoTable(doc, {
                      startY: y,
                      head: [['Mês', 'Mensagens']],
                      body: aiUsage.porMes.map(({ mes, mensagens }) => {
                        const [yr, mo] = mes.split('-');
                        return [`${MONTHS[mo] || mo} ${yr}`, mensagens];
                      }),
                      styles: { fontSize: 9, cellPadding: 3 },
                      headStyles: { fillColor: [40, 40, 40], textColor: [255,255,255], fontStyle: 'bold' },
                      alternateRowStyles: { fillColor: [250, 250, 250] },
                      columnStyles: { 1: { halign: 'right' } },
                    });

                    doc.save(`recepcao-ia-${aiStartDate}-${aiEndDate}.pdf`);
                  }}
                >
                  <Download size={14} className="mr-1.5" /> Exportar PDF
                </Button>
              )}
            </div>
          </div>

          {aiUsageLoading && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={16} className="animate-spin text-gray-400" />
            </div>
          )}

          {!aiUsageLoading && aiUsage && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: MessageSquare,  label: 'Mensagens da IA',   value: aiUsage.totalMensagens, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
                  { icon: Users,          label: 'Contatos atendidos', value: aiUsage.totalContatos,  color: 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' },
                  { icon: MessagesSquare, label: 'Conversas',          value: aiUsage.totalConversas, color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly bar chart */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-5">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Mensagens por mês</p>
                <div className="flex items-end gap-3 h-36">
                  {aiUsage.porMes.map(({ mes, mensagens }) => {
                    const [year, month] = mes.split('-');
                    const maxVal = Math.max(...aiUsage.porMes.map(m => m.mensagens), 1);
                    const pct    = Math.round((mensagens / maxVal) * 100);
                    const MONTHS = { '01':'Jan','02':'Fev','03':'Mar','04':'Abr','05':'Mai','06':'Jun','07':'Jul','08':'Ago','09':'Set','10':'Out','11':'Nov','12':'Dez' };
                    return (
                      <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{mensagens > 0 ? mensagens : ''}</span>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden" style={{ height: '88px' }}>
                          <div
                            className="w-full bg-violet-500 dark:bg-violet-600 rounded-md transition-all duration-500"
                            style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{MONTHS[month]} {year.slice(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!aiUsageLoading && !aiUsage && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center mb-4">
                <Bot size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Não foi possível carregar os dados.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
