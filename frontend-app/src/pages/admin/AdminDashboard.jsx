import { useState, useEffect } from 'react';
import { PlatformAdmin } from '../../utils/api';
import {
  Building2, Users, TrendingUp, DollarSign, CalendarCheck, BarChart3,
} from 'lucide-react';

const fmtCurrency = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function StatCard({ icon: Icon, label, value, sub, color = 'violet' }) {
  const colors = {
    violet:  'bg-violet-600/20 text-violet-400',
    emerald: 'bg-emerald-600/20 text-emerald-400',
    amber:   'bg-amber-600/20 text-amber-400',
    blue:    'bg-blue-600/20 text-blue-400',
    rose:    'bg-rose-600/20 text-rose-400',
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    PlatformAdmin.getDashboard().then(r => {
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

  if (!data) return <p className="text-gray-500 text-center py-12">Erro ao carregar dashboard.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Building2} label="Estabelecimentos" value={data.totalBarbershops} sub={`${data.activeBarbershops} ativos`} color="violet" />
        <StatCard icon={Users} label="Usuarios" value={data.totalUsers} color="blue" />
        <StatCard icon={TrendingUp} label="Novos este mes" value={data.newThisMonth} sub={`${data.growthRate > 0 ? '+' : ''}${data.growthRate}% crescimento`} color="emerald" />
        <StatCard icon={DollarSign} label="Faturamento total" value={fmtCurrency(data.totalRevenue)} color="amber" />
        <StatCard icon={DollarSign} label="Faturamento mensal" value={fmtCurrency(data.monthRevenue)} color="emerald" />
        <StatCard icon={CalendarCheck} label="Agendamentos" value={data.totalAppointments.toLocaleString('pt-BR')} color="blue" />
      </div>

      {/* Plan distribution */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-violet-400" /> Distribuicao de planos
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(data.planDistribution || {}).map(([plan, count]) => (
            <div key={plan} className="bg-gray-800/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs text-gray-400 capitalize">{plan || 'Sem plano'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
