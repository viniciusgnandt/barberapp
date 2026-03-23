// pages/reports/components.jsx — Shared report UI primitives

import { useState, useCallback, useEffect } from 'react';
import {
  Download, FileSpreadsheet, FileText,
  TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Filter, X, Settings2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '../../utils/cn';
import { Reports as ReportsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── Formatters ──────────────────────────────────────────────────────────────
export const fmt     = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
export const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
export const fmtDT   = (iso) => iso ? new Date(iso).toLocaleString('pt-BR') : '—';
export const fmtPct  = (v) => `${v || 0}%`;
export const fmtNum  = (v) => new Intl.NumberFormat('pt-BR').format(v || 0);

// ── Date helpers ─────────────────────────────────────────────────────────────
export const todayStr    = () => new Date().toISOString().slice(0, 10);
export const firstOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
export const daysAgo      = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

const SHORTCUTS = [
  { label: 'Hoje',         s: () => todayStr(),   e: () => todayStr() },
  { label: 'Ontem',        s: () => daysAgo(1),   e: () => daysAgo(1) },
  { label: 'Esta semana',  s: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10); }, e: () => todayStr() },
  { label: 'Este mês',     s: () => firstOfMonth(), e: () => todayStr() },
  { label: 'Últ. 7 dias',  s: () => daysAgo(7),   e: () => todayStr() },
  { label: 'Últ. 30 dias', s: () => daysAgo(30),  e: () => todayStr() },
  { label: 'Últ. 90 dias', s: () => daysAgo(90),  e: () => todayStr() },
];

// ── useReportFilters hook — each report gets its own filter state ─────────────
export function useReportFilters({ defaultBarbers = false, defaultPayments = false, defaultServices = false } = {}) {
  const { isAdmin } = useAuth();
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate,   setEndDate]   = useState(todayStr);
  const [barbers,   setBarbers]   = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [services,  setServices]  = useState([]);
  const [options,   setOptions]   = useState({ barbers: [], services: [], paymentMethods: [] });
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    ReportsAPI.getFilters().then(r => { if (r.ok) setOptions(r.data.data); });
  }, []);

  const params = useCallback(() => {
    const p = { startDate, endDate };
    if (barbers.length === 1)  p.barber = barbers[0];
    else if (barbers.length > 1)  p.barbers = barbers.join(',');
    if (payments.length === 1) p.paymentMethod = payments[0];
    else if (payments.length > 1)  p.paymentMethods = payments.join(',');
    if (services.length === 1) p.service = services[0];
    else if (services.length > 1)  p.services = services.join(',');
    return p;
  }, [startDate, endDate, barbers, payments, services]);

  const toggle = (arr, set, id) => set(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const clearAll = () => { setBarbers([]); setPayments([]); setServices([]); };

  const periodLabel = `${fmtDate(startDate)} — ${fmtDate(endDate)}`;
  const activeCount = barbers.length + payments.length + services.length;

  return {
    startDate, setStartDate, endDate, setEndDate,
    barbers, payments, services,
    options, params, toggle, clearAll,
    filtersOpen, setFiltersOpen,
    periodLabel, activeCount, isAdmin,
    // Expose setters for shortcut compatibility
    setBarbers, setPayments, setServices,
  };
}

// ── FilterSidebar — colapsável, por relatório ─────────────────────────────────
export function FilterSidebar({
  filters,
  showBarbers = true,
  showPayments = true,
  showServices = true,
  extra,         // optional JSX for extra filter sections
}) {
  const {
    startDate, setStartDate, endDate, setEndDate,
    barbers, payments, services,
    options, toggle, clearAll,
    filtersOpen, setFiltersOpen,
    activeCount, isAdmin,
    setBarbers, setPayments, setServices,
  } = filters;

  return (
    <div className={cn(
      'shrink-0 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-all duration-300 overflow-hidden',
      filtersOpen ? 'w-60' : 'w-0',
    )}>
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-gray-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Filtros</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold bg-brand-500 text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">{activeCount}</span>
          )}
        </div>
        <button onClick={() => setFiltersOpen(false)} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
          <ChevronLeft size={13} />
        </button>
      </div>

      <div className="overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin" style={{ maxHeight: 'calc(100vh - 180px)' }}>

        {/* Period shortcuts */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-2">Período</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {SHORTCUTS.map(({ label, s, e }) => {
              const sv = s(), ev = e();
              const active = sv === startDate && ev === endDate;
              return (
                <button key={label} onClick={() => { setStartDate(sv); setEndDate(ev); }}
                  className={cn(
                    'px-2 py-1 text-[10px] rounded border transition-colors',
                    active
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                  )}>
                  {label}
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <input type="date" value={startDate} max={endDate || todayStr()}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500" />
            <input type="date" value={endDate} min={startDate} max={todayStr()}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500" />
          </div>
        </div>

        {/* Barbers */}
        {showBarbers && isAdmin && options.barbers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-2">Profissional</p>
            <div className="space-y-1.5">
              {/* "Todos" checkbox */}
              <label className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 cursor-pointer hover:opacity-80 transition-opacity">
                <input type="checkbox"
                  checked={barbers.length === options.barbers.length && options.barbers.length > 0}
                  ref={el => { if (el) el.indeterminate = barbers.length > 0 && barbers.length < options.barbers.length; }}
                  onChange={() => setBarbers(barbers.length === options.barbers.length ? [] : options.barbers.map(b => b._id))}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0" />
                Todos os profissionais
              </label>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5 space-y-1.5">
                {options.barbers.map(b => (
                  <label key={b._id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    <input type="checkbox" checked={barbers.includes(b._id)}
                      onChange={() => toggle(barbers, setBarbers, b._id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0" />
                    <span className="truncate">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Payment methods */}
        {showPayments && options.paymentMethods.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-2">Pagamento</p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 cursor-pointer hover:opacity-80 transition-opacity">
                <input type="checkbox"
                  checked={payments.length === options.paymentMethods.length && options.paymentMethods.length > 0}
                  ref={el => { if (el) el.indeterminate = payments.length > 0 && payments.length < options.paymentMethods.length; }}
                  onChange={() => setPayments(payments.length === options.paymentMethods.length ? [] : [...options.paymentMethods])}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0" />
                Todos os pagamentos
              </label>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5 space-y-1.5">
                {options.paymentMethods.map(pm => (
                  <label key={pm} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 capitalize transition-colors">
                    <input type="checkbox" checked={payments.includes(pm)}
                      onChange={() => toggle(payments, setPayments, pm)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0" />
                    {pm}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Services */}
        {showServices && options.services.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-2">Serviço</p>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 cursor-pointer hover:opacity-80 transition-opacity">
                <input type="checkbox"
                  checked={services.length === options.services.length && options.services.length > 0}
                  ref={el => { if (el) el.indeterminate = services.length > 0 && services.length < options.services.length; }}
                  onChange={() => setServices(services.length === options.services.length ? [] : options.services.map(s => s._id))}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0" />
                Todos os serviços
              </label>
              <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5 space-y-1.5 max-h-44 overflow-y-auto scrollbar-thin pr-1">
                {options.services.map(s => (
                  <label key={s._id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                    <input type="checkbox" checked={services.includes(s._id)}
                      onChange={() => toggle(services, setServices, s._id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Extra filters (report-specific) */}
        {extra}

        {/* Clear */}
        {activeCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors">
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}

// ── ReportLayout — standard wrapper for every report ────────────────────────
export function ReportLayout({
  title,
  filters,
  showBarbers,
  showPayments,
  showServices,
  extra,
  exportProps = {},
  children,
}) {
  const { filtersOpen, setFiltersOpen, periodLabel } = filters;

  return (
    <div className="flex">

      {/* Filter sidebar */}
      <FilterSidebar filters={filters} showBarbers={showBarbers} showPayments={showPayments} showServices={showServices} extra={extra} />

      {/* Main area — grows to fill width, no fixed height so it grows with content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Report header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center gap-3">
          {!filtersOpen && (
            <button onClick={() => setFiltersOpen(true)} title="Mostrar filtros"
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
              <ChevronRight size={14} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{periodLabel}</p>
          </div>
          <ExportButtons {...exportProps} title={exportProps.title || title} period={exportProps.period || periodLabel} />
        </div>

        {/* Content scrolls with page naturally */}
        <div className="p-6 space-y-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── KpiCard ───────────────────────────────────────────────────────────────────
export function KpiCard({ label, value, displayValue, pct, icon: Icon, color = 'bg-brand-500', format = 'text' }) {
  const formatted = displayValue ?? (
    format === 'currency' ? fmt(value)
    : format === 'percent' ? fmtPct(value)
    : format === 'number'  ? fmtNum(value)
    : String(value ?? '—')
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-start gap-3 min-w-0 hover:shadow-sm transition-shadow">
      <div className={cn('p-2.5 rounded-xl shrink-0 shadow-sm', color)}>
        <Icon size={15} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 truncate">{formatted}</p>
        {pct !== undefined && pct !== null && (
          <div className="flex items-center gap-1 mt-1">
            {pct > 0
              ? <TrendingUp  size={10} className="text-emerald-500 shrink-0" />
              : pct < 0
              ? <TrendingDown size={10} className="text-red-500 shrink-0" />
              : <Minus size={10} className="text-gray-400 shrink-0" />}
            <span className={cn(
              'text-[10px] font-bold',
              pct > 0 ? 'text-emerald-600 dark:text-emerald-400'
              : pct < 0 ? 'text-red-600 dark:text-red-400'
              : 'text-gray-400',
            )}>
              {pct > 0 ? '+' : ''}{pct}%
            </span>
            <span className="text-[9px] text-gray-400 dark:text-gray-600">vs anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KpiGrid — NEVER breaks or overflows ──────────────────────────────────────
export function KpiGrid({ children }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
      {children}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export function Section({ title, subtitle, children, className, actions, noPad }) {
  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────
export function DataTable({ columns, rows, emptyText = 'Nenhum dado encontrado.', maxRows = 50 }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [showAll, setShowAll] = useState(false);

  const handleSort = (key) => {
    setSortCol(k => k === key ? key : key);
    setSortDir(d => sortCol === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  let sorted = [...(rows || [])];
  if (sortCol) {
    sorted.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      const cmp = typeof va === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const visible = showAll ? sorted : sorted.slice(0, maxRows);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {columns.map(col => (
                <th key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={cn(
                    'px-4 py-2.5 text-left text-[11px] font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap',
                    col.sortable !== false && 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-300',
                    col.align === 'right' && 'text-right',
                  )}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortCol === col.key && (sortDir === 'asc' ? <ChevronUp size={9} /> : <ChevronDown size={9} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {!visible.length ? (
              <tr><td colSpan={columns.length} className="text-center py-10 text-sm text-gray-400">{emptyText}</td></tr>
            ) : visible.map((row, i) => (
              <tr key={row.id ?? i} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/20 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className={cn(
                    'px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300',
                    col.align === 'right' && 'text-right',
                    col.className,
                  )}>
                    {col.render ? col.render(row[col.key], row, i) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(rows?.length ?? 0) > maxRows && !showAll && (
        <button onClick={() => setShowAll(true)}
          className="w-full py-2.5 text-xs text-brand-500 hover:text-brand-600 font-medium border-t border-gray-100 dark:border-gray-800 transition-colors">
          Ver todos ({rows.length} registros)
        </button>
      )}
    </div>
  );
}

// ── ExportButtons ─────────────────────────────────────────────────────────────
export function ExportButtons({ title, period, kpis = [], tableColumns = [], tableRows = [] }) {
  const [open, setOpen] = useState(false);

  const doPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(title || 'Relatório', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(`Período: ${period || '—'}`, 14, 26);

    let y = 34;
    if (kpis.length) {
      doc.setFontSize(9);
      doc.setTextColor(60);
      kpis.forEach(k => {
        const line = `${k.label}: ${k.value}${k.pct !== undefined ? ` (${k.pct > 0 ? '+' : ''}${k.pct}%)` : ''}`;
        doc.text(line, 14, y);
        y += 5;
      });
      y += 4;
    }
    if (tableColumns.length && tableRows.length) {
      autoTable(doc, {
        startY: y,
        head: [tableColumns.map(c => c.label)],
        body: tableRows.map(row => tableColumns.map(c => {
          const v = row[c.key];
          if (c.format === 'currency') return fmt(v);
          if (c.format === 'date') return fmtDate(v);
          return v ?? '—';
        })),
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [99, 102, 241] },
      });
    }
    doc.save(`${(title || 'relatorio').replace(/\s+/g, '_').toLowerCase()}.pdf`);
    setOpen(false);
  };

  const doExcel = () => {
    if (!tableColumns.length || !tableRows.length) return;
    const data = tableRows.map(row => {
      const obj = {};
      tableColumns.forEach(c => {
        const v = row[c.key];
        obj[c.label] = c.format === 'currency' ? (v || 0) : c.format === 'date' ? fmtDate(v) : (v ?? '—');
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title?.slice(0, 31) || 'Relatório');
    XLSX.writeFile(wb, `${(title || 'relatorio').replace(/\s+/g, '_').toLowerCase()}.xlsx`);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        <Download size={13} /> Exportar
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 min-w-[130px]">
            <button onClick={doPDF}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <FileText size={13} className="text-red-500 shrink-0" /> PDF
            </button>
            <button onClick={doExcel}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              <FileSpreadsheet size={13} className="text-emerald-500 shrink-0" /> Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const STATUS_CLS = {
  'concluído': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  'cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  'ausente':   'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  'agendado':  'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
};
export function StatusBadge({ status }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', STATUS_CLS[status] || 'bg-gray-100 text-gray-500')}>
      {status}
    </span>
  );
}

// ── ReportSkeleton ────────────────────────────────────────────────────────────
export function ReportSkeleton() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />)}
      </div>
      <div className="h-56 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}

// ── SimpleBarChart — horizontal bars, always renders correctly ────────────────
// Works in any container regardless of height. maxRows controls how many bars show.
export function SimpleBarChart({ data = [], labelKey, valueKey, formatValue, labelFormat, colorClass = 'bg-brand-500', height, maxBars = 20 }) {
  const [hov, setHov] = useState(null);
  if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">Sem dados</p>;

  // Sample if too many items
  let display = data;
  if (data.length > maxBars) {
    const step = Math.ceil(data.length / maxBars);
    display = data.filter((_, i) => i % step === 0).slice(0, maxBars);
  }

  const max = Math.max(...display.map(d => Number(d[valueKey]) || 0), 1);

  return (
    <div className="space-y-1.5">
      {display.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = Math.max((val / max) * 100, val > 0 ? 1 : 0);
        const rawLabel = d[labelKey];
        const label = labelFormat ? labelFormat(rawLabel) : rawLabel;
        return (
          <div key={i} className="flex items-center gap-2 group"
            onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 w-16 shrink-0 text-right truncate">{label}</span>
            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
              <div
                className={cn('h-full rounded-md transition-all duration-500', colorClass, hov === i && 'brightness-110')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 w-20 shrink-0 text-right">
              {formatValue ? formatValue(val) : val}
            </span>
          </div>
        );
      })}
    </div>
  );
}
