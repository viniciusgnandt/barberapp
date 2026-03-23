import { useState, useEffect, useCallback } from 'react';
import { Brain, CheckCircle, Activity, MessageSquare, Calendar, Phone } from 'lucide-react';
import {
  useReportFilters, ReportLayout, KpiCard, KpiGrid, Section,
  DataTable, ReportSkeleton, fmtDate, fmtDT, fmtNum
} from './components';
import { Reports as ReportsAPI } from '../../utils/api';

export default function ReceptionReport() {
  const filters = useReportFilters();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ReportsAPI.getReception(filters.params());
    if (r.ok) setData(r.data.data);
    setLoading(false);
  }, [filters.params]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis ?? {};
  // backend: data.conversations = [{id, contactName, contactPhone, messages, lastMessage}]
  const conversations = data?.conversations ?? [];

  const tableColumns = [
    { key: 'contactName', label: 'Contato' },
    { key: 'contactPhone', label: 'Telefone' },
    { key: 'messages', label: 'Mensagens', align: 'right', render: (v) => fmtNum(v) },
    { key: 'lastMessage', label: 'Última Mensagem', render: (v) => fmtDT(v) },
  ];

  const totalConvs    = kpis.totalConversations?.value ?? 0;
  const totalMessages = kpis.totalMessages?.value ?? 0;
  const avgMessages   = kpis.avgMessagesPerConv?.value ?? 0;
  const portalBookings = kpis.portalBookings?.value ?? 0;

  return (
    <ReportLayout
      title="Recepção IA"
      filters={filters}
      exportProps={{
        title: 'Recepção IA',
        period: filters.periodLabel,
        kpis: [
          { label: 'Conversas', value: totalConvs },
          { label: 'Mensagens', value: totalMessages },
          { label: 'Média por Conversa', value: avgMessages },
          { label: 'Agendamentos via Portal', value: portalBookings },
        ],
        tableColumns,
        tableRows: conversations,
      }}
    >
      {loading ? <ReportSkeleton /> : !data ? (
        <p className="text-gray-400 text-center py-12">Erro ao carregar dados.</p>
      ) : (
        <div className="space-y-5">
          <KpiGrid>
            <KpiCard label="Conversas" icon={Brain} color="bg-blue-500" format="number"
              value={totalConvs} pct={kpis.totalConversations?.pct} />
            <KpiCard label="Total de Mensagens" icon={MessageSquare} color="bg-violet-500" format="number"
              value={totalMessages} />
            <KpiCard label="Média por Conversa" icon={Activity} color="bg-orange-500" format="number"
              value={avgMessages} />
            <KpiCard label="Agendamentos via Portal" icon={Calendar} color="bg-emerald-500" format="number"
              value={portalBookings} />
            <KpiCard label="Contatos Únicos" icon={CheckCircle} color="bg-teal-500" format="number"
              value={conversations.length} />
          </KpiGrid>

          <Section title="Histórico de Conversas" noPad>
            <DataTable columns={tableColumns} rows={conversations.map((c, i) => ({ ...c, id: String(c.id ?? i) }))} />
          </Section>
        </div>
      )}
    </ReportLayout>
  );
}
