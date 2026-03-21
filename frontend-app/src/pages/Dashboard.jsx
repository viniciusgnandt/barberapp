import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, DollarSign, Plus, Lock, Users } from 'lucide-react';
import JubaOSLogo from '../components/ui/JubaOSLogo';
import { useAuth } from '../context/AuthContext';
import { Appointments, Barbershops } from '../utils/api';
import CalendarWidget from '../components/CalendarWidget';
import Button from '../components/ui/Button';
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

const STATUS_COLORS = {
  agendado:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  concluido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'concluído': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  bloqueado: 'bg-gray-200 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
};

const STATUS_LABELS = {
  agendado: 'Agendado',
  concluido: 'Concluído',
  'concluído': 'Concluído',
  cancelado: 'Cancelado',
  bloqueado: 'Bloqueado',
};

function formatTime(dateStr) {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function BarberColumn({ barber, appointments }) {
  const sorted = [...appointments].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 min-w-0">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-brand-600 dark:text-brand-300">
            {barber.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{barber.name}</p>
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 shrink-0">{appointments.length}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Sem agendamentos</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(appt => (
            <div
              key={appt._id}
              className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatTime(appt.date)}
                </span>
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-500')}>
                  {STATUS_LABELS[appt.status] || appt.status}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {appt.client?.name || appt.clientName || 'Cliente'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {appt.service?.name || '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats,        setStats]        = useState({ today: 0, done: 0, pending: 0, revenue: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const [barbers,          setBarbers]          = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loadingBarbers,   setLoadingBarbers]   = useState(true);

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

  const loadBarberView = useCallback(async () => {
    if (!user?.barbershop) return;
    setLoadingBarbers(true);
    const today = new Date().toISOString().split('T')[0];

    const isAdmin = user.role === 'admin';

    const [apptRes, empRes] = await Promise.all([
      Appointments.getAll({ date: today }),
      isAdmin ? Barbershops.getEmployees(user.barbershop) : Promise.resolve(null),
    ]);

    const appts = apptRes.ok ? (apptRes.data?.data || []) : [];
    setTodayAppointments(appts);

    if (isAdmin && empRes?.ok) {
      setBarbers(empRes.data?.data || []);
    } else {
      // Non-admin: show only own column
      setBarbers([{ _id: user._id, name: user.name }]);
    }

    setLoadingBarbers(false);
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadBarberView(); }, [loadBarberView]);

  const statCards = [
    { icon: CalendarDays, label: 'Agendamentos hoje', value: stats.today,                      color: 'bg-brand-500'   },
    { icon: CheckCircle2, label: 'Concluídos',        value: stats.done,                       color: 'bg-emerald-500' },
    { icon: Clock,        label: 'Pendentes',         value: stats.pending,                    color: 'bg-amber-500'   },
    { icon: DollarSign,   label: 'Receita total',     value: `R$ ${stats.revenue.toFixed(2)}`, color: 'bg-violet-500'  },
  ];

  // Group today's appointments by barber
  const appointmentsByBarber = {};
  barbers.forEach(b => { appointmentsByBarber[b._id] = []; });
  todayAppointments.forEach(appt => {
    const barberId = appt.barber?._id || appt.barber;
    if (appointmentsByBarber[barberId]) {
      appointmentsByBarber[barberId].push(appt);
    }
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <JubaOSLogo size={40} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Olá, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={() => navigate('/agenda', { state: { openBlock: true } })}>
            <Lock size={15} className="mr-1.5" /> Bloquear
          </Button>
          <Button onClick={() => navigate('/agenda', { state: { openCreate: true } })}>
            <Plus size={16} className="mr-1.5" /> Novo agendamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(card => (
          <StatCard key={card.label} {...card} loading={loadingStats} />
        ))}
      </div>

      {/* Barber columns — today's appointments by professional */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Agenda por profissional</h2>
        </div>

        {loadingBarbers ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 h-48 animate-pulse" />
            ))}
          </div>
        ) : barbers.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum profissional encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {barbers.map(barber => (
              <BarberColumn
                key={barber._id}
                barber={barber}
                appointments={appointmentsByBarber[barber._id] || []}
              />
            ))}
          </div>
        )}
      </div>

      <CalendarWidget />
    </div>
  );
}
