import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Store, Clock, Save, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Barbershops } from '../utils/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const TABS = [
  { id: 'info',  label: 'Estabelecimento', icon: Store },
  { id: 'hours', label: 'Horários',        icon: Clock },
];

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

// ── ViaCEP ─────────────────────────────────────────────────────────────────────
async function fetchCep(cep) {
  const clean = cep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const d = await r.json();
    return d.erro ? null : d;
  } catch {
    return null;
  }
}

// ── CPF/CNPJ mask ──────────────────────────────────────────────────────────────
function maskDocument(v) {
  const d = v.replace(/\D/g, '');
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join('.') + (e ? '-' + e : '')
    );
  }
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, a, b, c, dd, e) =>
    [a, b, c, dd].filter(Boolean).join('.').replace(/\.(\d{4})/, '/$1') + (e ? '-' + e : '')
  );
}

// ── Tab: Informações do estabelecimento ────────────────────────────────────────
function InfoTab({ shop, onSaved }) {
  const [form,       setForm]       = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    if (shop) setForm({
      name:        shop.name        || '',
      email:       shop.email       || '',
      document:    shop.document    || '',
      phone:       shop.phone       || '',
      zipCode:     shop.zipCode     || '',
      address:     shop.address     || '',
      city:        shop.city        || '',
      state:       shop.state       || '',
      description: shop.description || '',
    });
  }, [shop]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCepBlur = async () => {
    const clean = form.zipCode.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    const data = await fetchCep(clean);
    setCepLoading(false);
    if (data) {
      const street = [data.logradouro, data.bairro].filter(Boolean).join(', ');
      setForm(f => ({
        ...f,
        address: street || f.address,
        city:    data.localidade || f.city,
        state:   data.uf         || f.state,
      }));
      toast('Endereço preenchido automaticamente.');
    }
  };

  const handleDocChange = e => {
    setForm(f => ({ ...f, document: maskDocument(e.target.value) }));
  };

  const handleSave = async () => {
    if (!form.document) return toast('CPF/CNPJ é obrigatório.', 'error');
    if (!form.address)  return toast('Endereço é obrigatório.', 'error');
    setSaving(true);
    const r = await Barbershops.update(shop._id, form);
    setSaving(false);
    if (r.ok) { toast('Estabelecimento atualizado!'); onSaved(r.data.data); }
    else      toast(r.data?.message || 'Erro ao salvar.', 'error');
  };

  if (!form) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Nome da barbearia" required value={form.name}     onChange={set('name')}    placeholder="Ex: Barbearia do João" className="sm:col-span-2" />
        <Input label="E-mail"            required value={form.email}    onChange={set('email')}   placeholder="contato@barbearia.com" type="email" />
        <Input label="Telefone"            value={form.phone}    onChange={set('phone')}   placeholder="(11) 99999-9999" />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CPF / CNPJ <span className="text-red-400 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={form.document}
            onChange={handleDocChange}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            maxLength={18}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
            CEP
            {cepLoading && <div className="w-3 h-3 border border-brand-500 border-t-transparent rounded-full animate-spin" />}
          </label>
          <input
            type="text"
            value={form.zipCode}
            onChange={set('zipCode')}
            onBlur={handleCepBlur}
            placeholder="00000-000"
            maxLength={9}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-colors"
          />
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            <MapPin size={10} /> Sai do campo para preencher o endereço automaticamente
          </p>
        </div>
        <Input label="Endereço" required  value={form.address} onChange={set('address')} placeholder="Rua, número, bairro" className="sm:col-span-2" />
        <Input label="Cidade"      value={form.city}    onChange={set('city')}    placeholder="São Paulo" />
        <Input label="Estado"      value={form.state}   onChange={set('state')}   placeholder="SP" />
        <Input label="Descrição"   value={form.description} onChange={set('description')} placeholder="Sobre o estabelecimento..." className="sm:col-span-2" />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} className="mr-1.5" /> Salvar alterações
        </Button>
      </div>
    </div>
  );
}

// ── Tab: Horário de funcionamento ──────────────────────────────────────────────
function HoursTab({ shop, onSaved }) {
  const defaultHours = [
    { day: 0, open: false, from: '09:00', to: '18:00' },
    { day: 1, open: true,  from: '09:00', to: '18:00' },
    { day: 2, open: true,  from: '09:00', to: '18:00' },
    { day: 3, open: true,  from: '09:00', to: '18:00' },
    { day: 4, open: true,  from: '09:00', to: '18:00' },
    { day: 5, open: true,  from: '09:00', to: '18:00' },
    { day: 6, open: true,  from: '09:00', to: '13:00' },
  ];

  const [hours,  setHours]  = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    const src = shop.openingHours?.length === 7
      ? [...shop.openingHours].sort((a, b) => a.day - b.day)
      : defaultHours;
    setHours(src.map(h => ({ ...h })));
  }, [shop]);

  const update = (day, field, value) =>
    setHours(prev => prev.map(h => h.day === day ? { ...h, [field]: value } : h));

  const handleSave = async () => {
    setSaving(true);
    const r = await Barbershops.update(shop._id, { openingHours: hours });
    setSaving(false);
    if (r.ok) { toast('Horários salvos!'); onSaved(r.data.data); }
    else      toast(r.data?.message || 'Erro ao salvar.', 'error');
  };

  if (!hours) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Configure os horários de atendimento do seu estabelecimento.
      </p>
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {hours.map((h, i) => (
          <div key={h.day} className={cn(
            'flex items-center gap-4 px-4 py-3',
            i !== hours.length - 1 && 'border-b border-gray-50 dark:border-gray-800/60',
            !h.open && 'opacity-50',
          )}>
            <button
              onClick={() => update(h.day, 'open', !h.open)}
              className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', h.open ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', h.open && 'translate-x-4')} />
            </button>
            <span className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{DAYS[h.day]}</span>
            {h.open ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={h.from} onChange={e => update(h.day, 'from', e.target.value)}
                  className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                <span className="text-gray-400 text-sm">até</span>
                <input type="time" value={h.to} onChange={e => update(h.day, 'to', e.target.value)}
                  className="px-2 py-1 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
              </div>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-600 flex-1">Fechado</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          <Save size={14} className="mr-1.5" /> Salvar horários
        </Button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Establishment() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab    = searchParams.get('tab') || 'info';
  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });
  const [shop,    setShop]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    Barbershops.getMine().then(r => {
      if (r.ok) setShop(r.data.data);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Store size={36} className="text-gray-300 dark:text-gray-700 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Estabelecimento</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gerencie as informações da sua barbearia</p>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
            )}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : !shop ? (
          <p className="text-sm text-gray-400">Nenhum estabelecimento encontrado.</p>
        ) : (
          <>
            {tab === 'info'  && <InfoTab  shop={shop} onSaved={setShop} />}
            {tab === 'hours' && <HoursTab shop={shop} onSaved={setShop} />}
          </>
        )}
      </div>
    </div>
  );
}
