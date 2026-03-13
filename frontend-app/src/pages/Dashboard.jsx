import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Appointments } from '../utils/api';
import CalendarWidget from '../components/CalendarWidget';
import { cn } from '../utils/cn';

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 flex items-center gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        {loading
          ? <div className="mt-1 h-7 w-14 bg-gray-100 dark:bg-gray-800 rounded-md animate-pulse" />
          : <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
        }
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [stats,        setStats]        = useState({ today: 0, done: 0, pending: 0, revenue: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    const today = new Date().toISOString().split('T')[0];
    const [todayRes, allRes] = await Promise.all([
      Appointments.getAll({ date: today }),
      Appointments.getAll(),
    ]);
    if (allRes.ok) {
      const all    = allRes.data?.data || [];
      const todays = todayRes.ok ? (todayRes.data?.data || []) : [];
      const done    = all.filter(a => a.status === 'concluido' || a.status === 'concluído');
      const pending = all.filter(a => a.status === 'agendado');
      const revenue = done.reduce((sum, a) => sum + (a.service?.price || 0), 0);
      setStats({ today: todays.length, done: done.length, pending: pending.length, revenue });
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const statCards = [
    { icon: CalendarDays, label: 'Agendamentos hoje', value: stats.today,                      color: 'bg-brand-500'   },
    { icon: CheckCircle2, label: 'Concluídos',        value: stats.done,                       color: 'bg-emerald-500' },
    { icon: Clock,        label: 'Pendentes',         value: stats.pending,                    color: 'bg-amber-500'   },
    { icon: DollarSign,   label: 'Receita total',     value: `R$ ${stats.revenue.toFixed(2)}`, color: 'bg-violet-500'  },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Olá, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(card => (
          <StatCard key={card.label} {...card} loading={loadingStats} />
        ))}
      </div>

      <CalendarWidget />
    </div>
  );
}
