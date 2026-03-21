import { useState, useEffect } from 'react';
import { PlatformAdmin } from '../../utils/api';
import { Brain, MessageSquare, BarChart3, Trophy } from 'lucide-react';

export default function AdminAI() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PlatformAdmin.getAIStats().then(r => {
      setLoading(false);
      if (r.ok) setData(r.data.data);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) return <p className="text-gray-500 text-center py-12">Erro ao carregar dados de IA.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Painel de IA</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: MessageSquare, label: 'Msgs compradas',  value: (data.packages.totalPurchased || 0).toLocaleString('pt-BR'), color: 'bg-blue-600/20 text-blue-400' },
          { icon: Brain,         label: 'Msgs consumidas', value: (data.packages.totalUsed || 0).toLocaleString('pt-BR'),      color: 'bg-violet-600/20 text-violet-400' },
          { icon: MessageSquare, label: 'Msgs restantes',  value: (data.packages.totalRemaining || 0).toLocaleString('pt-BR'), color: 'bg-emerald-600/20 text-emerald-400' },
          { icon: BarChart3,     label: 'Conversas IA',    value: (data.conversations.total || 0).toLocaleString('pt-BR'),     color: 'bg-amber-600/20 text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon size={18} />
              </div>
              <p className="text-xs font-medium text-gray-400 uppercase">{s.label}</p>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top consumers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-amber-400" /> Ranking — Pacotes de mensagens
          </h2>
          <div className="space-y-3">
            {(data.topConsumers || []).map((c, i) => (
              <div key={c._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-5">#{i + 1}</span>
                  <span className="text-sm text-white">{c.name}</span>
                </div>
                <span className="text-sm font-medium text-violet-400">{c.used.toLocaleString('pt-BR')} msgs</span>
              </div>
            ))}
            {!data.topConsumers?.length && <p className="text-sm text-gray-500">Sem dados.</p>}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-400" /> Ranking — Conversas IA
          </h2>
          <div className="space-y-3">
            {(data.conversationsByShop || []).map((c, i) => (
              <div key={c._id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 w-5">#{i + 1}</span>
                  <span className="text-sm text-white">{c.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-blue-400">{c.messages.toLocaleString('pt-BR')} msgs</span>
                  <span className="text-xs text-gray-500 ml-2">({c.conversations} conversas)</span>
                </div>
              </div>
            ))}
            {!data.conversationsByShop?.length && <p className="text-sm text-gray-500">Sem dados.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
