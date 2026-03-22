import { useState, useEffect, useCallback } from 'react';
import { Financial } from '../../utils/api';
import {
  Scale, TrendingUp, TrendingDown, Wallet, Package, FileText,
  RefreshCw, AlertCircle, CheckCircle, Info, ChevronDown, ChevronRight,
  BarChart2, Landmark, CircleDollarSign, ArrowUpRight, ArrowDownRight, Percent,
} from 'lucide-react';

const DEFAULT_FEES = { dinheiro: 0, pix: 0, debito: 1.5, credito: 2.99, outro: 0 };
function loadFees() {
  try { return { ...DEFAULT_FEES, ...JSON.parse(localStorage.getItem('cashregister_fees') || '{}') }; }
  catch { return DEFAULT_FEES; }
}
import { cn } from '../../utils/cn';

const fmt = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtPct = (v) => (v ?? 0).toFixed(1) + '%';
const today = () => new Date().toISOString().slice(0, 10);
const firstDay = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const CAT_LABELS = {
  servico: 'Serviços', produto: 'Produtos', gorjeta: 'Gorjetas', comanda: 'Comandas',
  comissao: 'Comissões', fornecedor: 'Fornecedores', salario: 'Salários',
  aluguel: 'Aluguel', manutencao: 'Manutenção', materiais: 'Materiais',
  energia: 'Energia / Água', internet: 'Internet / Telefone', impostos: 'Impostos / Taxas',
  marketing: 'Marketing', equipamentos: 'Equipamentos', limpeza: 'Limpeza / Higiene',
  alimentacao: 'Alimentação', transporte: 'Transporte', despesa: 'Despesa Geral',
  ajuste: 'Ajuste', outros: 'Outros',
};

// ── Linha do Balanço ──────────────────────────────────────────────────────────
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
        {fmt(value)}
      </span>
    </div>
  );
}

// ── Bloco de seção contábil ───────────────────────────────────────────────────
function Section({ title, icon: Icon, color, children, total, totalLabel, totalPositive, totalNegative }) {
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
          <div className="pt-3 space-y-0">
            {children}
          </div>
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
                {fmt(total)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, icon: Icon, color, sub, note, positive, negative, neutral }) {
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
          : neutral ? 'text-gray-900 dark:text-gray-100'
          : 'text-gray-900 dark:text-gray-100',
        )}>
          {value}
        </p>
        {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
        {note && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 italic">{note}</p>}
      </div>
    </div>
  );
}

// ── DRE linha de categoria ────────────────────────────────────────────────────
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
      <span className="text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300 w-24 text-right">{fmt(value)}</span>
      <span className="text-[10px] text-gray-400 w-10 text-right">{fmtPct(pct)}</span>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function BalanceSheet() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [startDate, setStartDate] = useState(firstDay());
  const [endDate,   setEndDate]   = useState(today());

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    const r = await Financial.getBalanceSheet(params);
    setLoading(false);
    if (r.ok) setData(r.data.data);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const inputCls = 'px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors';

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale size={18} className="text-brand-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Balanço Patrimonial</h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Posição patrimonial em{' '}
            <strong>{data ? new Date(data.referenceDate).toLocaleDateString('pt-BR') : '...'}</strong>
            {data?.caixaAberto && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> CAIXA ABERTO
              </span>
            )}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-300 transition-colors disabled:opacity-40">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* ── Filtro de período (DRE) ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-5 py-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText size={11} /> Período da DRE
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <input type="date" value={startDate} max={endDate}
                onChange={e => setStartDate(e.target.value)} className={inputCls} />
              <span className="text-gray-400 text-sm">até</span>
              <input type="date" value={endDate} min={startDate} max={today()}
                onChange={e => setEndDate(e.target.value)} className={inputCls} />
              {/* Atalhos */}
              {[
                { label: 'Este mês', s: firstDay(), e: today() },
                { label: 'Últ. 3m', s: (() => { const d = new Date(); d.setMonth(d.getMonth()-3); return d.toISOString().slice(0,10); })(), e: today() },
                { label: 'Este ano', s: new Date().getFullYear() + '-01-01', e: today() },
              ].map(({ label, s, e }) => (
                <button key={label} onClick={() => { setStartDate(s); setEndDate(e); }}
                  className={cn('px-2.5 py-1.5 text-xs rounded-lg border transition-colors',
                    s === startDate && e === endDate
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 italic self-end pb-1">
            * O Balanço Patrimonial reflete a posição atual (todos os períodos). A DRE respeita o filtro acima.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && !loading && (() => {
        const { ativo, passivo, patrimonioLiquido, equacao, dre, indicadores } = data;
        const fees      = loadFees();
        const taxasDRE  = (dre.receitasPorMetodo || []).reduce((s, r) =>
          s + r.total * ((fees[r.method] || 0) / 100), 0);
        const receitaLiquida    = dre.receitaBruta - taxasDRE;
        const resultadoLiquido  = receitaLiquida - dre.despesasTotais;
        const resultadoPositivo = resultadoLiquido >= 0;

        return (
          <div className="space-y-6">

            {/* ── Equação contábil ───────────────────────────────────────── */}
            <div className={cn(
              'flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm',
              equacao.equilibrado
                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400',
            )}>
              {equacao.equilibrado
                ? <CheckCircle size={15} className="shrink-0" />
                : <AlertCircle size={15} className="shrink-0" />}
              <span className="font-medium">
                Ativo Total <strong>{fmt(equacao.ativo)}</strong>
                {' = '}
                Passivo <strong>{fmt(passivo.total)}</strong>
                {' + '}
                Patrimônio Líquido <strong>{fmt(patrimonioLiquido.total)}</strong>
                {' = '}
                <strong>{fmt(equacao.passivoPL)}</strong>
              </span>
              <span className="ml-auto text-xs font-bold">
                {equacao.equilibrado ? '✓ Equilibrado' : '⚠ Verificar'}
              </span>
            </div>

            {/* ── Indicadores financeiros ────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPI
                label="Capital de Giro"
                value={fmt(indicadores.capitalDeGiro)}
                icon={Wallet} color="bg-brand-500"
                positive={indicadores.capitalDeGiro > 0}
                negative={indicadores.capitalDeGiro < 0}
                note="Ativo Circulante − Passivo Circulante"
              />
              <KPI
                label="Liquidez Corrente"
                value={indicadores.liquidezCorrente !== null ? indicadores.liquidezCorrente.toFixed(2) : '—'}
                icon={Scale} color="bg-teal-500"
                positive={indicadores.liquidezCorrente > 1}
                negative={indicadores.liquidezCorrente !== null && indicadores.liquidezCorrente < 1}
                note={indicadores.liquidezCorrente > 1 ? 'Solvente' : indicadores.liquidezCorrente !== null ? 'Atenção' : 'Sem passivo'}
              />
              <KPI
                label="Endividamento"
                value={fmtPct(indicadores.endividamento)}
                icon={Landmark} color={indicadores.endividamento > 50 ? 'bg-red-500' : 'bg-violet-500'}
                negative={indicadores.endividamento > 50}
                positive={indicadores.endividamento <= 30}
                note="Passivo / Ativo Total"
              />
              <KPI
                label="Margem Líquida"
                value={fmtPct(indicadores.margemLiquida)}
                icon={TrendingUp} color={resultadoPositivo ? 'bg-emerald-500' : 'bg-red-500'}
                positive={indicadores.margemLiquida > 0}
                negative={indicadores.margemLiquida < 0}
                note="Resultado / Receita Bruta"
              />
              <KPI
                label="Giro do Ativo"
                value={indicadores.giroAtivo !== null ? indicadores.giroAtivo.toFixed(2) + 'x' : '—'}
                icon={RefreshCw} color="bg-amber-500" neutral
                note="Receita / Ativo Total"
              />
            </div>

            {/* ── Balanço: Ativo + Passivo+PL lado a lado ───────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* ATIVO */}
              <Section
                title="ATIVO"
                icon={TrendingUp} color="bg-emerald-500"
                total={ativo.total} totalLabel="TOTAL DO ATIVO"
                totalPositive
              >
                <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest py-1">Ativo Circulante</p>
                <BLine
                  indent={1}
                  label={ativo.circulante.caixa.label}
                  value={ativo.circulante.caixa.valor}
                  positive={ativo.circulante.caixa.valor > 0}
                />
                <BLine
                  indent={1}
                  label={ativo.circulante.contasAReceber.label}
                  value={ativo.circulante.contasAReceber.valor}
                  sub={ativo.circulante.contasAReceber.count > 0 ? `${ativo.circulante.contasAReceber.count} comanda(s)` : null}
                  positive={ativo.circulante.contasAReceber.valor > 0}
                />
                <BLine
                  indent={1}
                  label={ativo.circulante.estoques.label}
                  value={ativo.circulante.estoques.valor}
                  sub={ativo.circulante.estoques.count > 0 ? `${ativo.circulante.estoques.count} itens` : null}
                  positive={ativo.circulante.estoques.valor > 0}
                />
                <BLine
                  label="Total Ativo Circulante" value={ativo.totalCirculante} bold positive
                />
                <BLine
                  indent={1} muted
                  label="Ativo Não Circulante (imobilizado)" value={0}
                />
              </Section>

              {/* PASSIVO + PL */}
              <div className="space-y-4">
                <Section
                  title="PASSIVO"
                  icon={TrendingDown} color="bg-red-500"
                  total={passivo.total} totalLabel="TOTAL DO PASSIVO"
                  totalNegative={passivo.total > 0}
                >
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest py-1">Passivo Circulante</p>
                  <BLine
                    indent={1}
                    label={passivo.circulante.comissoesAPagar.label}
                    value={passivo.circulante.comissoesAPagar.valor}
                    sub={passivo.circulante.comissoesAPagar.count > 0 ? `${passivo.circulante.comissoesAPagar.count} pendente(s)` : null}
                    negative={passivo.circulante.comissoesAPagar.valor > 0}
                  />
                  {passivo.mesAtual?.length > 0 && (
                    <>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 pt-2 pb-1 uppercase tracking-wider">Despesas do mês (referência)</p>
                      {passivo.mesAtual.map(cat => (
                        <BLine
                          key={cat._id}
                          indent={1} muted
                          label={CAT_LABELS[cat._id] || cat._id}
                          value={cat.total}
                        />
                      ))}
                    </>
                  )}
                </Section>

                <Section
                  title="PATRIMÔNIO LÍQUIDO"
                  icon={Landmark} color="bg-brand-500"
                  total={patrimonioLiquido.total} totalLabel="TOTAL DO PATRIMÔNIO LÍQUIDO"
                  totalPositive={patrimonioLiquido.total >= 0}
                  totalNegative={patrimonioLiquido.total < 0}
                >
                  <BLine
                    indent={1}
                    label={patrimonioLiquido.capitalProprio.label}
                    value={patrimonioLiquido.capitalProprio.valor}
                    positive={patrimonioLiquido.capitalProprio.valor >= 0}
                    negative={patrimonioLiquido.capitalProprio.valor < 0}
                  />
                  <BLine
                    indent={2} muted
                    label="= Ativo Total − Passivo Total"
                    value={patrimonioLiquido.total}
                  />
                </Section>
              </div>
            </div>

            {/* ── DRE ───────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500 shrink-0">
                  <BarChart2 size={15} className="text-white" />
                </div>
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

                {/* Resumo DRE */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800/40">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowUpRight size={13} className="text-emerald-500" />
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Receita Bruta</p>
                    </div>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(dre.receitaBruta)}</p>
                  </div>
                  {taxasDRE > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-100 dark:border-amber-800/40">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Percent size={13} className="text-amber-500" />
                        <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Taxas</p>
                      </div>
                      <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">− {fmt(taxasDRE)}</p>
                      <p className="text-[10px] text-gray-400 mt-1">Líq.: {fmt(receitaLiquida)}</p>
                    </div>
                  )}
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-100 dark:border-red-800/40">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowDownRight size={13} className="text-red-500" />
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Despesas Totais</p>
                    </div>
                    <p className="text-xl font-extrabold text-red-500 dark:text-red-400 tabular-nums">{fmt(dre.despesasTotais)}</p>
                  </div>
                  <div className={cn(
                    'rounded-xl p-4 border',
                    resultadoPositivo
                      ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-800/40'
                      : 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700',
                  )}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <CircleDollarSign size={13} className={resultadoPositivo ? 'text-brand-500' : 'text-gray-400'} />
                      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resultado Líquido</p>
                    </div>
                    <p className={cn(
                      'text-xl font-extrabold tabular-nums',
                      resultadoPositivo ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400',
                    )}>
                      {fmt(resultadoLiquido)}
                    </p>
                  </div>
                </div>

                {/* Detalhamento por categoria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Receitas */}
                  {dre.receitasPorCategoria?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ArrowUpRight size={13} className="text-emerald-500" /> Receitas por categoria
                      </p>
                      <div className="space-y-1">
                        {dre.receitasPorCategoria.map(r => (
                          <DRECatRow
                            key={r.category}
                            label={CAT_LABELS[r.category] || r.category}
                            value={r.total}
                            total={dre.receitaBruta}
                            isExpense={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Despesas */}
                  {dre.despesasPorCategoria?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ArrowDownRight size={13} className="text-red-500" /> Despesas por categoria
                      </p>
                      <div className="space-y-1">
                        {dre.despesasPorCategoria.map(r => (
                          <DRECatRow
                            key={r.category}
                            label={CAT_LABELS[r.category] || r.category}
                            value={r.total}
                            total={dre.despesasTotais}
                            isExpense
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Nota metodológica */}
                <div className="flex items-start gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl text-[11px] text-gray-400 dark:text-gray-500">
                  <Info size={12} className="shrink-0 mt-0.5" />
                  <p>
                    O Balanço Patrimonial reflete a posição atual do negócio: disponibilidades em caixa, contas a receber (comandas abertas)
                    e valor de estoque no ativo; comissões pendentes no passivo. A DRE demonstra receitas e despesas do período filtrado.
                    Regime de caixa — lançamentos baseados em entradas e saídas registradas.
                  </p>
                </div>
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
}
