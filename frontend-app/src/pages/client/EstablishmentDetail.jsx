import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Clock, Phone, ChevronLeft, Scissors, Users, CalendarPlus } from 'lucide-react';
import { Portal } from '../../utils/api';
import { useClientAuth } from '../../context/ClientAuthContext';
import BookingModal from '../../components/client/BookingModal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import { toast } from '../../components/ui/Toast';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TABS = ['Serviços', 'Profissionais', 'Info'];

export default function EstablishmentDetail() {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const { client }    = useClientAuth();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState(0);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    Portal.Barbershops.get(id).then(r => {
      if (r.ok) setData(r.data.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
      </div>
    );
  }

  if (!data) return <p className="text-center text-gray-500 py-16">Estabelecimento não encontrado.</p>;

  const { shop, services, employees } = data;

  const nowDay = new Date().getDay();
  const todayHours = shop.openingHours?.find(h => h.day === nowDay);

  const handleBooked = () => {
    setBooking(false);
    toast('Agendamento confirmado!');
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors -mb-2">
        <ChevronLeft size={16} /> Voltar
      </button>

      {/* Hero */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Cover placeholder */}
        <div className="h-28 bg-gradient-to-br from-violet-500 to-purple-700 flex items-end px-5 pb-3">
          <div className="w-16 h-16 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center shadow-md overflow-hidden">
            {shop.logo
              ? <img src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
              : <Scissors size={28} className="text-violet-600" />
            }
          </div>
        </div>
        <div className="px-5 pt-3 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{shop.name}</h1>
              {shop.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{shop.description}</p>}
            </div>
            <Button onClick={() => { if (!client) navigate('/client/login'); else setBooking(true); }} className="shrink-0">
              <CalendarPlus size={14} className="mr-1.5" /> Agendar
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
            {(shop.address || shop.city) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {[shop.address, shop.neighborhood, shop.city, shop.state].filter(Boolean).join(', ')}
              </span>
            )}
            {shop.phone && (
              <a href={`tel:${shop.phone}`} className="flex items-center gap-1.5 hover:text-violet-600 dark:hover:text-violet-400">
                <Phone size={14} />
                {shop.phone}
              </a>
            )}
            {todayHours && (
              <span className={cn('flex items-center gap-1.5 font-medium', todayHours.open ? 'text-green-600 dark:text-green-400' : 'text-gray-400')}>
                <Clock size={14} />
                {todayHours.open ? `Hoje: ${todayHours.from} – ${todayHours.to}` : 'Fechado hoje'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === i ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Serviços */}
      {tab === 0 && (
        <div className="space-y-2">
          {services.length === 0
            ? <p className="text-sm text-gray-400 text-center py-8">Nenhum serviço cadastrado.</p>
            : services.map(s => (
              <div key={s._id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.duration} min</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => { if (!client) navigate('/client/login'); else setBooking(true); }}>
                    Agendar
                  </Button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Tab: Profissionais */}
      {tab === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {employees.length === 0
            ? <p className="col-span-full text-sm text-gray-400 text-center py-8">Nenhum profissional cadastrado.</p>
            : employees.map(emp => (
              <div key={emp._id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col items-center gap-2 text-center">
                <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center overflow-hidden">
                  {emp.profileImage
                    ? <img src={emp.profileImage} alt={emp.name} className="w-full h-full object-cover" />
                    : <span className="text-lg font-bold text-violet-700 dark:text-violet-300">{emp.name?.[0]?.toUpperCase()}</span>
                  }
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
              </div>
            ))
          }
        </div>
      )}

      {/* Tab: Info */}
      {tab === 2 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800">
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Horário de funcionamento</p>
            <div className="space-y-2">
              {shop.openingHours?.map(h => (
                <div key={h.day} className={cn('flex items-center justify-between text-sm', h.day === nowDay && 'font-semibold')}>
                  <span className="text-gray-700 dark:text-gray-300">{DAYS[h.day]}</span>
                  {h.open
                    ? <span className="text-gray-900 dark:text-gray-100">{h.from} – {h.to}</span>
                    : <span className="text-gray-400">Fechado</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Booking modal */}
      {booking && (
        <BookingModal
          shop={shop}
          services={services}
          employees={employees}
          onClose={() => setBooking(false)}
          onBooked={handleBooked}
        />
      )}
    </div>
  );
}
