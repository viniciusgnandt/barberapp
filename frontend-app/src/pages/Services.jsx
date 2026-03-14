import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign, Upload, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Services as ServicesAPI, Upload as UploadAPI } from '../utils/api';
import { PRESET_ICONS, ServiceIcon } from '../utils/serviceIcons';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const EMPTY_FORM = { name: '', price: '', duration: '', description: '', icon: '' };

// ── Icon Picker ───────────────────────────────────────────────────────────────
function IconPicker({ value, onChange }) {
  const fileRef     = useRef(null);
  const [uploading, setUploading] = useState(false);

  const isPreset = value?.startsWith('preset:');
  const isCustom = value && !isPreset;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const r = await UploadAPI.file(file, 'icon');
    setUploading(false);
    e.target.value = '';
    if (r.ok) {
      onChange(r.data?.data?.url || '');
      toast('Ícone enviado!');
    } else {
      toast(r.data?.message || 'Erro ao enviar ícone.', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Ícone do serviço
      </label>

      {/* Presets grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {PRESET_ICONS.map(({ key, label, Icon }) => {
          const presetVal = `preset:${key}`;
          const active    = value === presetVal;
          return (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => onChange(active ? '' : presetVal)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all',
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                  : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              {active && <Check size={9} className="absolute top-0.5 right-0.5 text-brand-500" />}
              <Icon size={16} />
              <span className="text-[9px] leading-none truncate w-full text-center">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom upload */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
            isCustom
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
          )}
        >
          {uploading
            ? <div className="w-4 h-4 border border-gray-400 border-t-brand-500 rounded-full animate-spin" />
            : <Upload size={14} />
          }
          {isCustom ? 'Imagem personalizada ✓' : 'Enviar imagem própria'}
        </button>

        {isCustom && (
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-brand-300 shrink-0">
            <img src={value} alt="ícone" className="w-full h-full object-cover" />
          </div>
        )}

        {value && (
          <button type="button" onClick={() => onChange('')}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Remover
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

// ── Service Card ──────────────────────────────────────────────────────────────
function ServiceCard({ service, onEdit, onDelete, isAdmin }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-brand-200 dark:hover:border-brand-800 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 overflow-hidden text-brand-600 dark:text-brand-400">
          <ServiceIcon icon={service.icon} size={20} />
        </div>
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(service)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDelete(service)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{service.name}</h3>
        {service.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{service.description}</p>
        )}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-gray-800">
        <span className="flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
          <DollarSign size={13} />
          R$ {service.price?.toFixed(2)}
        </span>
        {service.duration && (
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600">
            <Clock size={12} />
            {service.duration} min
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Services() {
  const { isAdmin } = useAuth();

  const [services,     setServices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [formErr,      setFormErr]      = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    const r = await ServicesAPI.getAll();
    if (r.ok) setServices(r.data?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setModal(true);
  };

  const openEdit = svc => {
    setEditing(svc);
    setForm({
      name:        svc.name        || '',
      price:       svc.price       ?? '',
      duration:    svc.duration    ?? '',
      description: svc.description || '',
      icon:        svc.icon        || '',
    });
    setFormErr('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || form.price === '') return setFormErr('Nome e preço são obrigatórios.');
    if (isNaN(Number(form.price)) || Number(form.price) < 0) return setFormErr('Preço inválido.');

    setFormErr('');
    setSaving(true);

    const payload = {
      name:        form.name,
      price:       Number(form.price),
      duration:    form.duration ? Number(form.duration) : undefined,
      description: form.description || undefined,
      icon:        form.icon        || undefined,
    };

    const r = editing
      ? await ServicesAPI.update(editing._id, payload)
      : await ServicesAPI.create(payload);

    setSaving(false);
    if (r.ok) {
      toast(editing ? 'Serviço atualizado!' : 'Serviço criado!');
      setModal(false);
      load();
    } else {
      setFormErr(r.data?.message || 'Erro ao salvar.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const r = await ServicesAPI.delete(deleteTarget._id);
    setDeleting(false);
    if (r.ok) {
      toast('Serviço removido.');
      setDeleteTarget(null);
      load();
    } else {
      toast(r.data?.message || 'Erro ao remover.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Serviços</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {services.length} serviço{services.length !== 1 ? 's' : ''} cadastrado{services.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus size={16} className="mr-1.5" /> Novo serviço
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ServiceIcon size={40} className="text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isAdmin ? 'Nenhum serviço cadastrado. Crie o primeiro!' : 'Nenhum serviço disponível.'}
          </p>
          {isAdmin && (
            <Button className="mt-4" size="sm" onClick={openCreate}>
              <Plus size={14} className="mr-1.5" /> Criar serviço
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {services.map(svc => (
            <ServiceCard key={svc._id} service={svc} onEdit={openEdit} onDelete={setDeleteTarget} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar serviço' : 'Novo serviço'} size="full">
        <div className="space-y-4">
          <Input label="Nome do serviço *" placeholder="Ex: Corte + Barba" value={form.name} onChange={set('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Preço (R$) *" type="number" min="0" step="0.01" placeholder="0.00"
              value={form.price} onChange={set('price')} />
            <Input label="Duração (min)" type="number" min="0" placeholder="30"
              value={form.duration} onChange={set('duration')} />
          </div>
          <Input label="Descrição" placeholder="Descrição opcional..." value={form.description} onChange={set('description')} />

          {isAdmin && (
            <IconPicker value={form.icon} onChange={v => setForm(f => ({ ...f, icon: v }))} />
          )}

          {formErr && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formErr}</p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar alterações' : 'Criar serviço'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remover serviço">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deseja remover o serviço <strong className="text-gray-900 dark:text-gray-100">{deleteTarget?.name}</strong>?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Remover</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
