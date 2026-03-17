import { useState, useEffect } from 'react';
import { CalendarDays, MapPin, X, Clock, RefreshCw } from 'lucide-react';
import { Portal } from '../../utils/api';
import { cn } from '../../utils/cn';
import BookingModal from '../../components/client/BookingModal';

const STATUS_MAP = {
  agendado:  { label: 'Agendado',  cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  concluído: { label: 'Concluído', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
  bloqueado: { label: 'Bloqueado', cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
};

function AppointmentCard({ appt, onCancel, onReschedule }) {
  const [cancelling, setCancelling] = useState(false);
  const date   = new Date(appt.date);
  const isPast = date < new Date();
  const status = STATUS_MAP[appt.status] || STATUS_MAP.agendado;
  const canAct = appt.status === 'agendado' && !isPast;

  const handleCancel = async () => {
    if (!confirm('Cancelar este agendamento?')) return;
    setCancelling(true);
    const r = await Portal.Appointments.cancel(appt._id);
    setCancelling(false);
    if (r.ok) onCancel(appt._id);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 overflow-hidden">
          {appt.barbershop?.logo
            ? <img src={appt.barbershop.logo} alt="" className="w-full h-full object-cover" />
            : <CalendarDays size={20} className="text-violet-600 dark:text-violet-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {appt.barbershop?.name || 'Estabelecimento'}
            </p>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', status.cls)}>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
            {appt.service?.name} · {appt.barber?.name}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              {date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {appt.service?.duration && <span>{appt.service.duration} min</span>}
          </div>
          {appt.barbershop?.city && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <MapPin size={11} /> {appt.barbershop.city}
            </p>
          )}
        </div>
      </div>

      {canAct && (
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => onReschedule(appt)}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
          >
            <RefreshCw size={13} /> Reagendar
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <X size={13} /> {cancelling ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MyAppointments() {
  const [appts,        setAppts]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('upcoming');
  const [reschedAppt,  setReschedAppt]  = useState(null); // agendamento a reagendar
  const [reschedData,  setReschedData]  = useState(null); // { shop, services, employees }
  const [reschedLoading, setReschedLoading] = useState(false);

  useEffect(() => {
    Portal.Appointments.getAll().then(r => {
      if (r.ok) setAppts(r.data.data);
      setLoading(false);
    });
  }, []);

  const now      = new Date();
  const upcoming = appts.filter(a => new Date(a.date) >= now && a.status !== 'cancelado');
  const past     = appts.filter(a => new Date(a.date) <  now || a.status === 'cancelado');

  const handleCancel = (id) => setAppts(prev => prev.map(a => a._id === id ? { ...a, status: 'cancelado' } : a));

  const handleReschedule = async (appt) => {
    setReschedLoading(true);
    const r = await Portal.Barbershops.get(appt.barbershop._id);
    setReschedLoading(false);
    if (!r.ok) return;
    setReschedData({
      shop:      r.data.data,
      services:  r.data.data.services  || [],
      employees: r.data.data.employees || [],
    });
    setReschedAppt(appt);
  };

  const handleRescheduleBooked = (newAppt) => {
    setAppts(prev => [...prev, newAppt]);
    setReschedAppt(null);
    setReschedData(null);
  };

  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Meus agendamentos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gerencie seus horários</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {[['upcoming', 'Próximos'], ['past', 'Histórico']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === v ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
            {l}
            {v === 'upcoming' && upcoming.length > 0 && (
              <span className="ml-1.5 text-xs bg-violet-600 text-white rounded-full px-1.5 py-0.5">{upcoming.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tab === 'upcoming' ? 'Nenhum agendamento próximo.' : 'Nenhum histórico.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(appt => (
            <AppointmentCard key={appt._id} appt={appt} onCancel={handleCancel} onReschedule={handleReschedule} />
          ))}
        </div>
      )}

      {reschedLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl px-8 py-6 flex items-center gap-3 shadow-xl">
            <RefreshCw size={18} className="animate-spin text-violet-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Carregando...</span>
          </div>
        </div>
      )}

      {reschedAppt && reschedData && (
        <BookingModal
          shop={reschedData.shop}
          services={reschedData.services}
          employees={reschedData.employees}
          initialService={reschedData.services.find(s => s._id === reschedAppt.service?._id) || null}
          initialBarber={reschedData.employees.find(e => e._id === reschedAppt.barber?._id) || null}
          onClose={() => { setReschedAppt(null); setReschedData(null); }}
          onBooked={handleRescheduleBooked}
        />
      )}
    </div>
  );
}
