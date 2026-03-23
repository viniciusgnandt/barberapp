import { useState, useEffect, useCallback } from 'react';
import {
  Star, Award, Calendar, DollarSign, Percent, Users,
  TrendingUp, TrendingDown, CheckCircle, XCircle,
  AlertTriangle, Lightbulb, Zap, Crown,
  ChevronUp, ChevronDown, Minus, UserX,
} from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, SimpleBarChart, ReportSkeleton, fmt, fmtNum,
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

// ── Score & Tier ─────────────────────────────────────────────────────────────
function computeScore(p, maxRevenue, maxCompleted) {
  const completionScore = (p.completionRate ?? 0) * 0.5;
  const revenueScore    = maxRevenue  > 0 ? ((p.revenue  / maxRevenue)  * 100) * 0.3 : 0;
  const completedScore  = maxCompleted > 0 ? ((p.completed / maxCompleted) * 100) * 0.2 : 0;
  return Math.round((completionScore + revenueScore + completedScore) * 10) / 10;
}

function getTier(score) {
  if (score >= 85) return 'S';
  if (score >= 70) return 'A';
  if (score >= 55) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

const TIER_BG = { S: 'bg-emerald-500', A: 'bg-blue-500', B: 'bg-amber-500', C: 'bg-orange-500', D: 'bg-red-500' };
const TIER_TEXT = { S: 'text-emerald-600 dark:text-emerald-400', A: 'text-blue-600 dark:text-blue-400', B: 'text-amber-600 dark:text-amber-400', C: 'text-orange-600 dark:text-orange-400', D: 'text-red-500 dark:text-red-400' };
const TIER_BAR  = { S: 'bg-emerald-500', A: 'bg-blue-500', B: 'bg-amber-500', C: 'bg-orange-500', D: 'bg-red-500' };

function TierBadge({ tier }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white ${TIER_BG[tier]}`}>
      {tier}
    </span>
  );
}

function RankColor(i) {
  if (i === 0) return 'bg-amber-500';
  if (i === 1) return 'bg-gray-400';
  if (i === 2) return 'bg-orange-600';
  return 'bg-gray-300 dark:bg-gray-600';
}

function ScoreBar({ score, tier }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${TIER_BAR[tier]}`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}

function PctArrow({ pct }) {
  if (pct == null) return null;
  if (pct > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-500 font-medium"><ChevronUp size={13} />{pct.toFixed(1)}%</span>;
  if (pct < 0) return <span className="inline-flex items-center gap-0.5 text-red-500 font-medium"><ChevronDown size={13} />{Math.abs(pct).toFixed(1)}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-gray-400 font-medium"><Minus size={13} />0%</span>;
}

// ── Insight cards ─────────────────────────────────────────────────────────────
function InsightCard({ icon, text, variant }) {
  const styles = {
    yellow: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700',
    green:  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700',
    red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
  };
  return (
    <div className={`rounded-2xl border p-4 flex gap-3 items-start ${styles[variant] ?? styles.blue}`}>
      <span className="text-xl leading-none mt-0.5">{icon}</span>
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{text}</p>
    </div>
  );
}

function buildInsights(rows, kpis) {
  const insights = [];

  // Low completion rate
  rows.forEach(p => {
    if ((p.completionRate ?? 0) < 50) {
      insights.push({ icon: '⚠️', text: `${p.name} tem taxa de conclusão baixa (${p.completionRate ?? 0}%). Verifique ausências e cancelamentos.`, variant: 'yellow' });
    }
  });

  // Top performer tier S
  const best = rows[0];
  if (best && best.score >= 85) {
    insights.push({ icon: '🌟', text: `${best.name} está no tier S — desempenho excepcional. Considere reconhecê-lo para a equipe.`, variant: 'green' });
  }

  // High pending commissions
  rows.forEach(p => {
    if ((p.commissionPending ?? 0) > 500) {
      insights.push({ icon: '💰', text: `${p.name} tem ${fmt(p.commissionPending)} em comissões pendentes há tempo. Considere regularizar.`, variant: 'orange' });
    }
  });

  // Low avg completion rate
  const avgCR = kpis.avgCompletionRate?.value ?? kpis.avgCompletionRate ?? 0;
  if (avgCR < 60 && rows.length > 0) {
    insights.push({ icon: '📉', text: `Taxa de conclusão geral abaixo de 60%. Revise a política de agendamentos e confirmações.`, variant: 'red' });
  }

  // Revenue drop vs previous period
  rows.forEach(p => {
    if (p.pctRevenue != null && p.pctRevenue < -10) {
      insights.push({ icon: '📉', text: `${p.name} teve queda de ${Math.abs(p.pctRevenue).toFixed(1)}% na receita vs período anterior.`, variant: 'red' });
    }
  });

  // Motivational tip (always)
  insights.push({ icon: '💡', text: 'Dica: Profissionais com ticket médio alto geralmente atendem menos clientes mas com maior qualidade. Equilíbrio entre volume e valor é chave.', variant: 'blue' });

  return insights;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PerformanceReport() {
  const filters = useReportFilters();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getProfessionals(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis          = data?.kpis ?? {};
  const professionals = data?.professionals ?? [];

  const maxRevenue   = Math.max(...professionals.map(p => p.revenue   ?? 0), 1);
  const maxCompleted = Math.max(...professionals.map(p => p.completed ?? 0), 1);

  const rows = professionals.map(p => {
    const score = computeScore(p, maxRevenue, maxCompleted);
    const tier  = getTier(score);
    return {
      ...p,
      id:         String(p._id),
      appointments: p.total,
      score,
      tier,
      avgTicket:  p.avgTicket ?? (p.completed > 0 ? p.revenue / p.completed : 0),
    };
  }).sort((a, b) => b.score - a.score);

  const avgScore = rows.length > 0
    ? Math.round((rows.reduce((s, r) => s + r.score, 0) / rows.length) * 10) / 10
    : 0;
  const avgTier        = getTier(avgScore);
  const topPerformer   = rows[0]?.name ?? '—';
  const avgCR          = kpis.avgCompletionRate?.value ?? kpis.avgCompletionRate ?? 0;
  const totalRevenue   = kpis.totalRevenue?.value ?? kpis.totalRevenue ?? 0;
  const totalAppts     = professionals.reduce((s, p) => s + (p.total ?? 0), 0);
  const totalCommPend  = kpis.totalCommissions ?? 0;

  const insights = rows.length > 0 ? buildInsights(rows, kpis) : [];

  const tableColumns = [
    { key: 'name',           label: 'Profissional' },
    { key: 'appointments',   label: 'Agend.',        align: 'right', render: v => fmtNum(v) },
    { key: 'completed',      label: 'Concluídos',    align: 'right', render: v => fmtNum(v) },
    { key: 'cancelled',      label: 'Cancelados',    align: 'right', render: v => fmtNum(v ?? 0) },
    { key: 'completionRate', label: 'Taxa%',          align: 'right', render: v => `${v ?? 0}%` },
    { key: 'revenue',        label: 'Receita',        align: 'right', render: v => fmt(v) },
    { key: 'avgTicket',      label: 'Ticket Médio',   align: 'right', render: v => fmt(v) },
    { key: 'score',          label: 'Score',          align: 'right', render: (v, row) => (
      <span className={`font-bold ${TIER_TEXT[row.tier]}`}>{(v ?? 0).toFixed(1)}</span>
    )},
    { key: 'tier',           label: 'Tier',           align: 'center', render: v => <TierBadge tier={v} /> },
  ];

  const bestScoreTier = rows.length > 0 ? rows[0].tier : 'B';
  const scoreBarColor = TIER_BAR[bestScoreTier];

  return (
    <ReportLayout
      title="Desempenho"
      filters={filters}
      showBarbers
      exportProps={{
        title: 'Desempenho de Profissionais',
        period: filters.periodLabel,
        kpis: [
          { label: 'Score Médio',           value: `${avgScore.toFixed(1)} (${avgTier})` },
          { label: 'Melhor Profissional',   value: topPerformer },
          { label: 'Taxa de Conclusão Média', value: `${avgCR}%` },
          { label: 'Receita Total',         value: fmt(totalRevenue) },
          { label: 'Total Agendamentos',    value: fmtNum(totalAppts) },
          { label: 'Comissões Pendentes',   value: fmt(totalCommPend) },
        ],
        tableColumns,
        tableRows: rows,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-6">

          {/* ── KPIs ── */}
          <KpiGrid>
            <KpiCard
              label="Score Médio do Estabelecimento"
              icon={Star}
              color="bg-amber-400"
              format="number"
              displayValue={
                <span className="flex items-center gap-2">
                  {avgScore.toFixed(1)}
                  <TierBadge tier={avgTier} />
                </span>
              }
              value={avgScore}
            />
            <KpiCard label="Melhor Profissional" icon={Crown} color="bg-emerald-500" format="text" value={topPerformer} />
            <KpiCard label="Taxa de Conclusão Média" icon={Percent} color="bg-teal-500" format="percent" value={avgCR} />
            <KpiCard label="Receita Total" icon={DollarSign} color="bg-emerald-600" format="currency" value={totalRevenue} />
            <KpiCard label="Total Agendamentos" icon={Calendar} color="bg-blue-500" format="number" value={totalAppts} />
            <KpiCard label="Comissões Pendentes" icon={Award} color="bg-orange-500" format="currency" value={totalCommPend} />
          </KpiGrid>

          {/* ── Ranking de Desempenho ── */}
          {rows.length === 0 ? (
            <Section title="Ranking de Desempenho">
              <p className="text-gray-400 dark:text-gray-500 text-center py-10 text-sm">
                Nenhum dado encontrado para o período selecionado.
              </p>
            </Section>
          ) : (
            <Section title="Ranking de Desempenho" subtitle="Score = conclusão (50%) + receita (30%) + atendimentos (20%)">
              <div className="space-y-3 p-1">
                {rows.map((p, i) => (
                  <div
                    key={p.id}
                    className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-4 hover:shadow-md transition-shadow duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    <div className="flex items-start gap-4">
                      {/* Rank number */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 mt-0.5 ${RankColor(i)}`}>
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Name + tier + vs prev */}
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{p.name}</span>
                          <TierBadge tier={p.tier} />
                          {p.pctRevenue != null && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                              receita vs ant.: <PctArrow pct={p.pctRevenue} />
                            </span>
                          )}
                        </div>

                        {/* Score bar */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold ${TIER_TEXT[p.tier]}`}>{p.score.toFixed(1)} pts</span>
                          <div className="flex-1">
                            <ScoreBar score={p.score} tier={p.tier} />
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                          <span className="flex items-center gap-1"><Calendar size={11} />{fmtNum(p.appointments)} agend.</span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle size={11} />{fmtNum(p.completed)} concluídos</span>
                          <span className="flex items-center gap-1"><Percent size={11} />{p.completionRate ?? 0}% taxa</span>
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><DollarSign size={11} />{fmt(p.revenue)}</span>
                          <span className="flex items-center gap-1"><Zap size={11} />ticket {fmt(p.avgTicket)}</span>
                        </div>

                        {/* Commission info */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Comissão paga: <span className="text-gray-700 dark:text-gray-300 font-medium">{fmt(p.commissionPaid ?? 0)}</span>
                          {' | '}
                          pendente: <span className={`font-medium ${(p.commissionPending ?? 0) > 0 ? 'text-orange-500' : 'text-gray-700 dark:text-gray-300'}`}>{fmt(p.commissionPending ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Score por Profissional ── */}
          {rows.length > 0 && (
            <Section title="Score por Profissional" subtitle="Pontuação calculada pelo algoritmo de desempenho">
              <SimpleBarChart
                data={rows}
                labelKey="name"
                valueKey="score"
                formatValue={v => `${(v ?? 0).toFixed(1)} pts`}
                colorClass={scoreBarColor}
                height={160}
              />
            </Section>
          )}

          {/* ── Receita por Profissional ── */}
          {rows.length > 0 && (
            <Section title="Receita por Profissional" subtitle="Receita gerada no período selecionado">
              <SimpleBarChart
                data={rows}
                labelKey="name"
                valueKey="revenue"
                formatValue={v => fmt(v)}
                colorClass="bg-emerald-500"
                height={160}
              />
            </Section>
          )}

          {/* ── Insights e Sugestões ── */}
          {insights.length > 0 && (
            <Section title="Insights e Sugestões" subtitle="Análise automática baseada nos dados do período">
              <div className="grid gap-3 sm:grid-cols-2">
                {insights.map((ins, i) => (
                  <InsightCard key={i} icon={ins.icon} text={ins.text} variant={ins.variant} />
                ))}
              </div>
            </Section>
          )}

          {/* ── Tabela Completa ── */}
          {rows.length > 0 && (
            <Section title="Tabela Completa" noPad>
              <DataTable columns={tableColumns} rows={rows} />
            </Section>
          )}

          {rows.length === 0 && !insights.length && (
            <p className="text-gray-400 dark:text-gray-500 text-center py-16 text-sm">
              Nenhum dado encontrado para o período selecionado.
            </p>
          )}
        </div>
      )}
    </ReportLayout>
  );
}
