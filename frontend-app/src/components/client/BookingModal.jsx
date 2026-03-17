import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, Loader2, CheckCircle2, User } from 'lucide-react';
import { Portal } from '../../utils/api';
import { useClientAuth } from '../../context/ClientAuthContext';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';

const WEEKDAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function toYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ── Step 1: Service ───────────────────────────────────────────────────────────
function StepService({ services, selected, onSelect }) {
  const grouped = services.reduce((acc, s) => {
    const cat = s.category?.name || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Escolha o serviço</p>
      {Object.entries(grouped).map(([cat, svcs]) => (
        <div key={cat}>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-2 uppercase tracking-wide">{cat}</p>
          <div className="space-y-2">
            {svcs.map(s => (
              <button key={s._id} onClick={() => onSelect(s)}
                className={cn('w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors',
                  selected?._id === s._id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-100 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700')}>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.duration} min</p>
                </div>
                <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                  {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Step 2: Professional ──────────────────────────────────────────────────────
function StepProfessional({ employees, selected, onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Escolha o profissional</p>
      <button onClick={() => onSelect({ _id: 'any', name: 'Qualquer profissional' })}
        className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-colors',
          selected?._id === 'any'
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : 'border-gray-100 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700')}>
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
          <User size={18} className="text-gray-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Qualquer profissional</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Próximo horário disponível</p>
        </div>
      </button>
      {employees.map(emp => (
        <button key={emp._id} onClick={() => onSelect(emp)}
          className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-colors',
            selected?._id === emp._id
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
              : 'border-gray-100 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700')}>
          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 overflow-hidden">
            {emp.profileImage
              ? <img src={emp.profileImage} alt={emp.name} className="w-full h-full object-cover" />
              : <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{emp.name?.[0]?.toUpperCase()}</span>
            }
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{emp.name}</p>
        </button>
      ))}
    </div>
  );
}

// ── Step 3: Date + Slot (daily strip) ────────────────────────────────────────
function StepDateTime({ shopId, service, barber, selectedDate, selectedSlot, onSelect }) {
  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(false);
  const stripRef = useRef(null);

  // Build next 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
    return d;
  });

  const dayLabel = (d, i) => {
    if (i === 0) return 'Hoje';
    if (i === 1) return 'Amanhã';
    return WEEKDAYS_SHORT[d.getDay()];
  };

  const handleDayClick = async (d) => {
    const date = toYMD(d);
    onSelect(date, null);
    setSlots([]);
    setLoading(true);
    const r = await Portal.Barbershops.getSlots(shopId, {
      serviceId: service._id,
      barberId:  barber._id === 'any' ? 'any' : barber._id,
      date,
    });
    setLoading(false);
    setSlots(r.ok ? r.data.slots : []);
  };

  // Auto-select today on first render
  useEffect(() => {
    if (!selectedDate) handleDayClick(days[0]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Day strip */}
      <div ref={stripRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin -mx-1 px-1">
        {days.map((d, i) => {
          const ymd        = toYMD(d);
          const isSelected = selectedDate === ymd;
          return (
            <button key={ymd} onClick={() => handleDayClick(d)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border text-center shrink-0 transition-colors',
                isSelected
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20',
              )}>
              <span className={cn('text-[10px] font-medium uppercase tracking-wide', isSelected ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500')}>
                {dayLabel(d, i)}
              </span>
              <span className="text-base font-bold leading-none">{d.getDate()}</span>
              <span className={cn('text-[10px]', isSelected ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500')}>
                {d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time slots */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-8">
            <Loader2 size={16} className="animate-spin text-violet-500" /> Buscando horários...
          </div>
        ) : slots.length === 0 && selectedDate ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">Nenhum horário disponível neste dia.</p>
            <p className="text-xs text-gray-400 mt-1">Tente outro dia ou profissional.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {slots.map((s, i) => {
              const isSelected = selectedSlot?.time === s.time && selectedSlot?.barberId?.toString() === s.barberId?.toString();
              return (
                <button key={i} onClick={() => onSelect(selectedDate, s)}
                  className={cn(
                    'py-2.5 text-sm font-semibold rounded-xl border transition-colors text-center',
                    isSelected
                      ? 'bg-violet-600 border-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-violet-900/30'
                      : 'border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20',
                  )}>
                  {s.time}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Confirm ───────────────────────────────────────────────────────────
function StepConfirm({ shop, service, barber, date, slot, loading, error, onConfirm }) {
  const dateLabel = date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Confirme seu agendamento</p>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3">
        <Row label="Estabelecimento" value={shop?.name} />
        <Row label="Serviço"         value={`${service?.name} · ${service?.duration} min · ${service?.price?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`} />
        <Row label="Profissional"    value={slot?.barberName || barber?.name} />
        <Row label="Data"            value={dateLabel} />
        <Row label="Horário"         value={slot?.time} />
      </div>
      {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}
      <Button className="w-full" loading={loading} onClick={onConfirm}>Confirmar agendamento</Button>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100 text-right">{value}</span>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
const STEPS = ['Serviço', 'Profissional', 'Data e hora', 'Confirmar'];

export default function BookingModal({ shop, services, employees, onClose, onBooked, initialService = null, initialBarber = null }) {
  const { client } = useClientAuth();
  const [step,          setStep]     = useState(initialService ? (initialBarber ? 2 : 1) : 0);
  const [service,       setService]  = useState(initialService);
  const [barber,        setBarber]   = useState(initialBarber);
  const [selectedDate,  setDate]     = useState(null);
  const [selectedSlot,  setSlot]     = useState(null);
  const [loading,       setLoading]  = useState(false);
  const [error,         setError]    = useState('');
  const [success,       setSuccess]  = useState(false);

  const handleDateSlot = (date, slot) => { setDate(date); setSlot(slot); };

  const next = () => {
    if (step === 0 && !service) return;
    if (step === 1 && !barber)  return;
    if (step === 2 && (!selectedDate || !selectedSlot)) return;
    setStep(s => s + 1);
  };

  const canNext = () => {
    if (step === 0) return !!service;
    if (step === 1) return !!barber;
    if (step === 2) return !!(selectedDate && selectedSlot);
    return false;
  };

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    const r = await Portal.Appointments.create({
      barbershopId: shop._id,
      serviceId:    service._id,
      barberId:     selectedSlot.barberId,
      date:         selectedDate,
      time:         selectedSlot.time,
    });
    setLoading(false);
    if (r.ok) { setSuccess(true); onBooked?.(r.data.data); }
    else setError(r.data?.message || 'Erro ao agendar. Tente novamente.');
  };

  // Redirect to login if not authenticated
  if (!client) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm text-center">
          <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">Faça login para agendar</p>
          <a href="/client/login" className="text-violet-600 dark:text-violet-400 text-sm font-medium hover:underline">Ir para o login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            {step > 0 && !success && (
              <button onClick={() => setStep(s => s - 1)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 mr-1">
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              {!success && <p className="text-xs text-gray-400">{shop?.name}</p>}
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {success ? 'Agendado!' : STEPS[step]}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        {!success && (
          <div className="flex gap-1 px-5 pb-4 shrink-0">
            {STEPS.map((_, i) => (
              <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-violet-600' : 'bg-gray-100 dark:bg-gray-800')} />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {success ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 size={48} className="text-green-500 mx-auto" />
              <p className="text-gray-900 dark:text-gray-100 font-semibold">Agendamento confirmado!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {service?.name} · {selectedSlot?.time}
              </p>
              <Button variant="secondary" className="mt-4" onClick={onClose}>Fechar</Button>
            </div>
          ) : (
            <>
              {step === 0 && <StepService   services={services}   selected={service}   onSelect={setService} />}
              {step === 1 && <StepProfessional employees={employees} selected={barber}    onSelect={setBarber} />}
              {step === 2 && <StepDateTime  shopId={shop._id} service={service} barber={barber} selectedDate={selectedDate} selectedSlot={selectedSlot} onSelect={handleDateSlot} />}
              {step === 3 && <StepConfirm   shop={shop} service={service} barber={barber} date={selectedDate} slot={selectedSlot} loading={loading} error={error} onConfirm={handleConfirm} />}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && step < 3 && (
          <div className="px-5 pb-5 pt-2 shrink-0 border-t border-gray-50 dark:border-gray-800">
            <Button className="w-full" disabled={!canNext()} onClick={next}>
              {step === 2 ? 'Ver resumo' : 'Continuar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
