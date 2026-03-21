import { useState, useEffect, useCallback, useRef } from 'react';
import { Financial, Barbershops } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import {
  Percent, DollarSign, CheckCircle, ChevronDown, ChevronRight,
  User, Calendar, X, Banknote, CreditCard, Smartphone, Receipt,
  TrendingUp, Clock, Printer, Download, Check,
} from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const fmt      = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtShort = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
const fmtDT    = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Atalhos de período ───────────────────────────────────────────────────────
function periodShortcuts() {
  const now   = new Date();
  const pad   = (n) => String(n).padStart(2, '0');
  const fmt_  = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const today = fmt_(now);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);

  return [
    { label: 'Hoje',       start: today,           end: today },
    { label: 'Esta semana',start: fmt_(weekStart),  end: today },
    { label: 'Este mês',   start: fmt_(monthStart), end: today },
    { label: 'Mês passado',start: fmt_(lastMonthStart), end: fmt_(lastMonthEnd) },
    { label: 'Tudo',       start: '',               end: '' },
  ];
}

// ── Métodos de pagamento ─────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote,   color: 'emerald' },
  { key: 'pix',      label: 'Pix',      icon: Smartphone,  color: 'violet' },
  { key: 'debito',   label: 'Débito',   icon: CreditCard,  color: 'blue' },
  { key: 'credito',  label: 'Crédito',  icon: CreditCard,  color: 'amber' },
  { key: 'outro',    label: 'Outro',    icon: Receipt,     color: 'gray' },
];
const PM_LABEL = Object.fromEntries(PAYMENT_METHODS.map(p => [p.key, p.label]));

const PM_STYLES = {
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300',
  violet:  'bg-violet-50 dark:bg-violet-900/20 border-violet-400 dark:border-violet-600 text-violet-700 dark:text-violet-300',
  blue:    'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300',
  amber:   'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300',
  gray:    'bg-gray-50 dark:bg-gray-800/40 border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300',
};

// ── Comprovante ──────────────────────────────────────────────────────────────
function Receipt_({ data, onClose }) {
  const ref = useRef(null);

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Comprovante de Comissões</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 24px; max-width: 400px; }
        h2 { font-size: 16px; margin: 0 0 4px; }
        .sub { color: #666; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { text-align: left; font-size: 10px; color: #666; border-bottom: 1px solid #ddd; padding: 4px 0; }
        td { padding: 4px 0; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
        .right { text-align: right; }
        .total { font-weight: bold; font-size: 13px; margin-top: 12px; display: flex; justify-content: space-between; border-top: 2px solid #111; padding-top: 8px; }
        .badge { display: inline-block; padding: 2px 6px; background: #dcfce7; color: #166534; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
      </style></head><body>
      <h2>Comprovante de Pagamento de Comissões</h2>
      <div class="sub">Emitido em ${fmtDT(new Date())}</div>
      <div><strong>Profissional:</strong> ${data.barberName}</div>
      <div><strong>Período:</strong> ${data.period}</div>
      <div><strong>Forma de pagamento:</strong> ${PM_LABEL[data.paymentMethod] || data.paymentMethod}</div>
      <table>
        <thead><tr>
          <th>Serviço</th><th>Data</th><th class="right">Taxa</th><th class="right">Comissão</th>
        </tr></thead>
        <tbody>
          ${data.items.map(i => `<tr>
            <td>${i.serviceName || 'Serviço'}</td>
            <td>${fmtShort(i.createdAt)}</td>
            <td class="right">${i.commissionRate}%</td>
            <td class="right">${fmt(i.commissionAmount)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="total"><span>Total pago</span><span>${fmt(data.total)}</span></div>
      <div style="margin-top:12px"><span class="badge">✓ PAGO</span></div>
      <div class="footer">AgendaVip — Sistema de Gestão para Barbearias</div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-500">
          <div className="flex items-center gap-2.5">
            <CheckCircle size={18} className="text-white" />
            <p className="font-bold text-white">Pagamento realizado!</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4" ref={ref}>
          {/* Resumo */}
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 dark:text-gray-100">{data.barberName}</p>
              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">PAGO</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Período: {data.period}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Forma: {PM_LABEL[data.paymentMethod] || data.paymentMethod}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Emitido em {fmtDT(new Date())}</p>
          </div>

          {/* Itens */}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{item.serviceName || 'Serviço'}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{fmtShort(item.createdAt)} · {item.commissionRate}% de {fmt(item.serviceAmount)}</p>
                </div>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(item.commissionAmount)}</p>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="font-bold text-gray-900 dark:text-gray-100">Total pago</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{fmt(data.total)}</p>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Fechar
            </button>
            <button onClick={handlePrint}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white transition-colors flex items-center justify-center gap-2">
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal de confirmação de pagamento ────────────────────────────────────────
function PayModal({ barberName, selectedItems, onConfirm, onClose }) {
  const [payMethod, setPayMethod] = useState('dinheiro');
  const [paying,    setPaying]    = useState(false);

  const total = selectedItems.reduce((s, c) => s + c.commissionAmount, 0);

  const handle = async () => {
    setPaying(true);
    await onConfirm(selectedItems.map(c => c._id), payMethod, selectedItems);
    setPaying(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-500">
          <div className="flex items-center gap-2.5">
            <DollarSign size={18} className="text-white" />
            <p className="font-bold text-white">Pagar comissões</p>
          </div>
          <button onClick={onClose} disabled={paying} className="text-white/80 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* Resumo */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center shrink-0">
                <User size={14} className="text-brand-600 dark:text-brand-400" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{barberName}</p>
            </div>
            <div className="flex items-center justify-between text-sm border-t border-gray-100 dark:border-gray-700 pt-2">
              <span className="text-gray-500 dark:text-gray-400">{selectedItems.length} comissão(ões) selecionada(s)</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-lg">{fmt(total)}</span>
            </div>

            {/* Mini-lista */}
            {selectedItems.length <= 6 && (
              <div className="space-y-1 pt-1">
                {selectedItems.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="truncate max-w-[60%]">{c.serviceName || 'Serviço'} · {fmtShort(c.createdAt)}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(c.commissionAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Método de pagamento */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-5 gap-2">
              {PAYMENT_METHODS.map(pm => {
                const selected = payMethod === pm.key;
                const Icon     = pm.icon;
                return (
                  <button key={pm.key} type="button" onClick={() => setPayMethod(pm.key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all',
                      selected
                        ? PM_STYLES[pm.color]
                        : 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300',
                    )}>
                    <Icon size={15} />
                    <span className="text-[10px] font-semibold leading-none">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
            <CheckCircle size={13} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              As comissões selecionadas serão marcadas como <strong>pagas</strong> e o valor será lançado como saída no caixa. Um comprovante será gerado.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={paying}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button onClick={handle} disabled={paying}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {paying
                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Pagando...</>
                : <><DollarSign size={14} />Confirmar {fmt(total)}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card de profissional ─────────────────────────────────────────────────────
function BarberCard({ barberName, commissions, isAdmin, onPay }) {
  const [expanded,  setExpanded]  = useState(false);
  const [selected,  setSelected]  = useState([]); // IDs selecionados

  const pending = commissions.filter(c => c.status === 'pendente');
  const paid    = commissions.filter(c => c.status === 'pago');
  const pendingTotal  = pending.reduce((s, c) => s + c.commissionAmount, 0);
  const paidTotal     = paid.reduce((s, c) => s + c.commissionAmount, 0);
  const selectedItems = pending.filter(c => selected.includes(c._id));
  const selectedTotal = selectedItems.reduce((s, c) => s + c.commissionAmount, 0);

  const toggleOne = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () => {
    const allIds = pending.map(c => c._id);
    setSelected(prev => prev.length === allIds.length ? [] : allIds);
  };

  const allChecked  = pending.length > 0 && selected.length === pending.length;
  const someChecked = selected.length > 0 && !allChecked;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">

          {/* Checkbox selecionar todos os pendentes */}
          {isAdmin && pending.length > 0 && expanded && (
            <button onClick={toggleAll}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                allChecked
                  ? 'bg-emerald-500 border-emerald-500'
                  : someChecked
                    ? 'bg-emerald-200 border-emerald-400 dark:bg-emerald-800 dark:border-emerald-600'
                    : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400',
              )}>
              {(allChecked || someChecked) && <Check size={11} className="text-white dark:text-white" strokeWidth={3} />}
            </button>
          )}

          <div className="w-9 h-9 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center shrink-0">
            <User size={16} className="text-brand-600 dark:text-brand-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{barberName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {pending.length > 0 && <span className="text-amber-600 dark:text-amber-400">{pending.length} pendente(s)</span>}
              {pending.length > 0 && paid.length > 0 && <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>}
              {paid.length > 0 && <span className="text-emerald-600 dark:text-emerald-400">{paid.length} pago(s)</span>}
            </p>
          </div>

          {/* Totais */}
          <div className="hidden sm:flex items-center gap-4 text-right shrink-0">
            {pendingTotal > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Pendente</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{fmt(pendingTotal)}</p>
              </div>
            )}
            {paidTotal > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Pago</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(paidTotal)}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botão pagar selecionados */}
            {isAdmin && selectedItems.length > 0 && (
              <button onClick={() => onPay(barberName, selectedItems)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors">
                <DollarSign size={12} /> {fmt(selectedTotal)}
              </button>
            )}

            {/* Botão pagar todos pendentes (quando não expandido ou nenhum selecionado) */}
            {isAdmin && pending.length > 0 && selectedItems.length === 0 && (
              <button onClick={() => onPay(barberName, pending)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors">
                <DollarSign size={12} /> Pagar {fmt(pendingTotal)}
              </button>
            )}

            <button onClick={() => { setExpanded(v => !v); if (!expanded) setSelected([]); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>

        {/* Totais mobile */}
        <div className="flex sm:hidden items-center gap-4 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/60">
          {pendingTotal > 0 && (
            <div><p className="text-[10px] text-gray-400">Pendente</p><p className="text-xs font-bold text-amber-600 dark:text-amber-400">{fmt(pendingTotal)}</p></div>
          )}
          {paidTotal > 0 && (
            <div><p className="text-[10px] text-gray-400">Pago</p><p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{fmt(paidTotal)}</p></div>
          )}
        </div>
      </div>

      {/* Lista expandida com checkboxes */}
      {expanded && (
        <div className="border-t border-gray-50 dark:border-gray-800">
          {commissions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-5">Nenhuma comissão neste período.</p>
          ) : (
            <>
              {/* Barra de seleção flutuante */}
              {selected.length > 0 && (
                <div className="flex items-center justify-between px-5 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/40">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {selected.length} selecionada(s) · {fmt(selectedTotal)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected([])} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      Limpar
                    </button>
                    <button onClick={() => onPay(barberName, selectedItems)}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors">
                      <DollarSign size={11} /> Pagar selecionadas
                    </button>
                  </div>
                </div>
              )}

              <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {commissions.map(c => {
                  const isPending = c.status === 'pendente';
                  const isChecked = selected.includes(c._id);
                  return (
                    <div key={c._id}
                      onClick={() => isPending && isAdmin && toggleOne(c._id)}
                      className={cn(
                        'flex items-center gap-3 px-5 py-3 transition-colors',
                        isPending && isAdmin ? 'cursor-pointer' : '',
                        isChecked ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
                      )}>

                      {/* Checkbox */}
                      {isAdmin && isPending ? (
                        <div className={cn(
                          'w-4.5 h-4.5 w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-gray-600',
                        )}>
                          {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                        </div>
                      ) : (
                        <div className="w-[18px] h-[18px] shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">
                          {c.serviceName || c.service?.name || 'Serviço'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{fmtDate(c.createdAt)}</span>
                          <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{c.commissionRate}% de {fmt(c.serviceAmount)}</span>
                          {c.paidAt && (
                            <>
                              <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                              <span className="text-[10px] text-emerald-500">pago {fmtShort(c.paidAt)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-sm font-bold', isPending ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                          {fmt(c.commissionAmount)}
                        </span>
                        <span className={cn(
                          'px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
                          isPending
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                        )}>
                          {isPending ? 'Pendente' : 'Pago'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Commissions() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';

  const [commissions, setCommissions] = useState([]);
  const [summary,     setSummary]     = useState([]);
  const [barbers,     setBarbers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [payModal,    setPayModal]    = useState(null);  // { barberName, items }
  const [receipt,     setReceipt]     = useState(null);  // comprovante

  // Período
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [activeShortcut, setActiveShortcut] = useState('');

  // Filtro de barbeiro
  const [filterBarber, setFilterBarber] = useState('');
  const [filterStatus, setFilterStatus] = useState('pendente');

  const SHORTCUTS = periodShortcuts();

  const applyShortcut = (s) => {
    setActiveShortcut(s.label);
    setStartDate(s.start);
    setEndDate(s.end);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 500 };
    if (filterBarber) params.barber    = filterBarber;
    if (filterStatus) params.status    = filterStatus;
    if (startDate)    params.startDate = startDate;
    if (endDate)      params.endDate   = endDate;
    Financial.getCommissions(params).then(r => {
      setLoading(false);
      if (r.ok) {
        setCommissions(r.data.data.commissions || []);
        setSummary(r.data.data.summary || []);
      }
    });
  }, [filterBarber, filterStatus, startDate, endDate]);

  useEffect(() => {
    Barbershops.getEmployees(user.barbershop).then(r => {
      if (r.ok) setBarbers(r.data.data || r.data || []);
    });
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  // Agrupar por barbeiro
  const grouped = {};
  commissions.forEach(c => {
    const id   = c.barber?._id || String(c.barber) || 'unknown';
    const name = c.barber?.name || '—';
    if (!grouped[id]) grouped[id] = { name, commissions: [] };
    grouped[id].commissions.push(c);
  });

  const totalPendente  = summary.filter(s => s.status === 'pendente').reduce((a, s) => a + s.total, 0);
  const totalPago      = summary.filter(s => s.status === 'pago').reduce((a, s) => a + s.total, 0);
  const countPendente  = commissions.filter(c => c.status === 'pendente').length;

  const openPayModal = (barberName, items) => {
    setPayModal({ barberName, selectedItems: items });
  };

  const handleConfirmPay = async (ids, paymentMethod, items) => {
    const r = await Financial.payCommissions({ commissionIds: ids, paymentMethod });
    if (r.ok) {
      const period = startDate || endDate
        ? `${startDate ? fmtDate(startDate) : 'início'} até ${endDate ? fmtDate(endDate) : 'hoje'}`
        : 'Completo';
      setPayModal(null);
      setReceipt({
        barberName:    payModal.barberName,
        period,
        paymentMethod,
        items,
        total:         r.data.totalPaid ?? items.reduce((s, c) => s + c.commissionAmount, 0),
      });
      load();
    } else {
      toast(r.data?.message || 'Erro ao processar pagamento.', 'error');
    }
  };

  const handlePayAll = () => {
    const allPending = commissions.filter(c => c.status === 'pendente');
    if (!allPending.length) return;
    openPayModal('Todos os profissionais', allPending);
  };

  const periodLabel = startDate || endDate
    ? `${startDate ? fmtDate(startDate) : '—'} até ${endDate ? fmtDate(endDate) : 'hoje'}`
    : 'Todo o período';

  return (
    <>
      {payModal && (
        <PayModal
          barberName={payModal.barberName}
          selectedItems={payModal.selectedItems}
          onConfirm={handleConfirmPay}
          onClose={() => setPayModal(null)}
        />
      )}
      {receipt && (
        <Receipt_ data={receipt} onClose={() => setReceipt(null)} />
      )}

      <div className="space-y-4">

        {/* ── Seleção de período ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-brand-500 shrink-0" />
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Período de pagamento</p>
            {(startDate || endDate) && (
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{periodLabel}</span>
            )}
          </div>

          {/* Atalhos */}
          <div className="flex flex-wrap gap-2">
            {SHORTCUTS.map(s => (
              <button key={s.label} onClick={() => applyShortcut(s)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                  activeShortcut === s.label
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-400 hover:text-brand-600',
                )}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Datas manuais */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-36">
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">De</label>
              <input type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setActiveShortcut(''); }}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 focus:border-brand-500 outline-none text-gray-900 dark:text-white" />
            </div>
            <div className="flex-1 min-w-36">
              <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Até</label>
              <input type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setActiveShortcut(''); }}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2 focus:border-brand-500 outline-none text-gray-900 dark:text-white" />
            </div>
            {(startDate || endDate) && (
              <div className="flex items-end">
                <button onClick={() => { setStartDate(''); setEndDate(''); setActiveShortcut(''); }}
                  className="px-3 py-2 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1">
                  <X size={12} /> Limpar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={13} className="text-amber-500" />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">A pagar</p>
            </div>
            <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 leading-none">{fmt(totalPendente)}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{countPendente} comissão(ões)</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle size={13} className="text-emerald-500" />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Pago</p>
            </div>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{fmt(totalPago)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} className="text-brand-500" />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">Profissionais</p>
            </div>
            <p className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-none">{Object.keys(grouped).length}</p>
          </div>
        </div>

        {/* ── Filtros e ações ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-1">
            {[
              { val: '', label: 'Todos' },
              { val: 'pendente', label: 'Pendentes' },
              { val: 'pago', label: 'Pagos' },
            ].map(s => (
              <button key={s.val} onClick={() => setFilterStatus(s.val)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  filterStatus === s.val
                    ? s.val === 'pendente' ? 'bg-amber-500 text-white'
                      : s.val === 'pago' ? 'bg-emerald-500 text-white'
                        : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Barbeiro */}
          {barbers.length > 1 && (
            <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}
              className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs px-3 py-2 text-gray-600 dark:text-gray-400 focus:border-brand-500 outline-none">
              <option value="">Todos os profissionais</option>
              {barbers.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          )}

          {/* Pagar todos */}
          {isAdmin && countPendente > 0 && (
            <button onClick={handlePayAll}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30">
              <DollarSign size={14} />
              Pagar todos · {fmt(totalPendente)}
            </button>
          )}
        </div>

        {/* ── Cards por profissional ────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-10 text-center">
            <Percent size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma comissão encontrada</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {filterStatus === 'pendente' ? 'Não há comissões pendentes no período selecionado.' : 'Ajuste os filtros ou o período.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([id, data]) => (
              <BarberCard
                key={id}
                barberName={data.name}
                commissions={data.commissions}
                isAdmin={isAdmin}
                onPay={openPayModal}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
