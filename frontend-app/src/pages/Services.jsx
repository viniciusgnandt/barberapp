import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign, Upload, Check, Percent, Tag, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Services as ServicesAPI, ServiceCategories as CategoriesAPI, Upload as UploadAPI } from '../utils/api';
import { PRESET_ICONS, ServiceIcon } from '../utils/serviceIcons';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { toast } from '../components/ui/Toast';
import { cn } from '../utils/cn';

const EMPTY_FORM = { name: '', price: '', duration: '', description: '', icon: '', commission: '50', category: '' };

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#64748b', '#1f2937',
];

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
function ServiceCard({ service, onEdit, onDelete, isAdmin, categories }) {
  const commission = service.commission ?? 50;
  const shopPct    = 100 - commission;
  const cat = categories.find(c => c._id === (service.category?._id || service.category));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-brand-200 dark:hover:border-brand-800 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0 overflow-hidden text-brand-600 dark:text-brand-400">
          <ServiceIcon icon={service.icon} size={20} />
        </div>
        <div className="flex items-center gap-1">
          {cat && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ backgroundColor: cat.color }}
            >
              {cat.name}
            </span>
          )}
          {isAdmin && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(service)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors"
                aria-label={`Editar ${service.name}`}>
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(service)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label={`Remover ${service.name}`}>
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
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

      <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span className="flex items-center gap-1"><Percent size={10} /> Comissão</span>
        </div>
        <div className="flex rounded-lg overflow-hidden h-5 text-[10px] font-semibold">
          <div
            className="flex items-center justify-center bg-brand-500 text-white transition-all"
            style={{ width: `${commission}%` }}
            title={`Profissional: ${commission}%`}
          >
            {commission >= 20 ? `${commission}%` : ''}
          </div>
          <div
            className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all"
            style={{ width: `${shopPct}%` }}
            title={`Estabelecimento: ${shopPct}%`}
          >
            {shopPct >= 20 ? `${shopPct}%` : ''}
          </div>
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400 dark:text-gray-600">
          <span>Profissional</span>
          <span>Estabelecimento</span>
        </div>
      </div>
    </div>
  );
}

// ── Category Management Modal ─────────────────────────────────────────────────
function CategoryModal({ open, onClose, categories, onChanged }) {
  const [newName,    setNewName]    = useState('');
  const [newColor,   setNewColor]   = useState(PRESET_COLORS[0]);
  const [creating,   setCreating]   = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [editName,   setEditName]   = useState('');
  const [editColor,  setEditColor]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const r = await CategoriesAPI.create({ name: newName.trim(), color: newColor });
    setCreating(false);
    if (r.ok) { setNewName(''); onChanged(); toast('Categoria criada!'); }
    else toast(r.data?.message || 'Erro ao criar categoria.', 'error');
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    const r = await CategoriesAPI.update(id, { name: editName.trim(), color: editColor });
    setSaving(false);
    if (r.ok) { setEditingId(null); onChanged(); toast('Categoria atualizada!'); }
    else toast(r.data?.message || 'Erro ao atualizar.', 'error');
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const r = await CategoriesAPI.remove(id);
    setDeletingId(null);
    if (r.ok) { onChanged(); toast('Categoria removida.'); }
    else toast(r.data?.message || 'Erro ao remover.', 'error');
  };

  return (
    <Modal open={open} onClose={onClose} title="Gerenciar Categorias" size="md">
      <div className="space-y-4">
        {/* Create new */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nova categoria</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                placeholder="Nome da categoria"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex gap-1 flex-wrap mb-1">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn('w-5 h-5 rounded-full border-2 transition-all', newColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button onClick={handleCreate} loading={creating} size="sm" className="mb-1">
              <Plus size={14} />
            </Button>
          </div>
        </div>

        {/* Existing categories */}
        {categories.length > 0 && (
          <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Categorias existentes</p>
            {categories.map(cat => (
              <div key={cat._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                {editingId === cat._id ? (
                  <>
                    <div className="flex gap-1 flex-wrap shrink-0">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={cn('w-4 h-4 rounded-full border-2 transition-all', editColor === c ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent')}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      className="flex-1 text-sm bg-transparent border-b border-brand-400 outline-none text-gray-900 dark:text-gray-100"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdate(cat._id); if (e.key === 'Escape') setEditingId(null); }}
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(cat._id)} disabled={saving}
                      className="text-green-600 hover:text-green-700 p-1">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{cat.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-600">{cat.serviceCount ?? ''}</span>
                    <button onClick={() => startEdit(cat)}
                      className="p-1 text-gray-400 hover:text-brand-600 transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(cat._id)} disabled={deletingId === cat._id}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      {deletingId === cat._id
                        ? <div className="w-3 h-3 border border-gray-400 border-t-red-500 rounded-full animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Services() {
  const { isAdmin } = useAuth();

  const [services,      setServices]      = useState([]);
  const [categories,    setCategories]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [modal,         setModal]         = useState(false);
  const [catModal,      setCatModal]      = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [saving,        setSaving]        = useState(false);
  const [formErr,       setFormErr]       = useState('');
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const loadCategories = useCallback(async () => {
    const r = await CategoriesAPI.getAll();
    if (r.ok) setCategories(r.data?.data || []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [sr] = await Promise.all([ServicesAPI.getAll(), loadCategories()]);
    if (sr.ok) setServices(sr.data?.data || []);
    setLoading(false);
  }, [loadCategories]);

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
      commission:  String(svc.commission ?? 50),
      category:    svc.category?._id || svc.category || '',
    });
    setFormErr('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name || form.price === '') return setFormErr('Nome e preço são obrigatórios.');
    if (isNaN(Number(form.price)) || Number(form.price) < 0) return setFormErr('Preço inválido.');
    const comm = Number(form.commission);
    if (isNaN(comm) || comm < 0 || comm > 100) return setFormErr('Comissão deve ser entre 0 e 100%.');

    setFormErr('');
    setSaving(true);

    const payload = {
      name:        form.name,
      price:       Number(form.price),
      duration:    form.duration ? Number(form.duration) : undefined,
      description: form.description || undefined,
      icon:        form.icon        || undefined,
      commission:  comm,
      category:    form.category    || undefined,
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

  const commVal  = Number(form.commission) || 0;
  const shopVal  = 100 - commVal;
  const price    = Number(form.price) || 0;

  const filteredServices = activeCategory
    ? services.filter(s => String(s.category?._id || s.category) === activeCategory)
    : services;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Serviços</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {services.length} serviço{services.length !== 1 ? 's' : ''} cadastrado{services.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setCatModal(true)}>
              <Tag size={14} className="mr-1.5" /> Categorias
            </Button>
          )}
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-1.5" /> Novo serviço
            </Button>
          )}
        </div>
      </div>

      {/* Category filter tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              activeCategory === null
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}
          >
            Todos ({services.length})
          </button>
          {categories.map(cat => {
            const count = services.filter(s => String(s.category?._id || s.category) === cat._id).length;
            return (
              <button
                key={cat._id}
                onClick={() => setActiveCategory(activeCategory === cat._id ? null : cat._id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  activeCategory === cat._id
                    ? 'text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:opacity-80',
                )}
                style={
                  activeCategory === cat._id
                    ? { backgroundColor: cat.color }
                    : { backgroundColor: cat.color + '22', color: cat.color }
                }
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ServiceIcon size={40} className="text-gray-300 dark:text-gray-700 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {services.length === 0
              ? (isAdmin ? 'Nenhum serviço cadastrado. Crie o primeiro!' : 'Nenhum serviço disponível.')
              : 'Nenhum serviço nesta categoria.'
            }
          </p>
          {isAdmin && services.length === 0 && (
            <Button className="mt-4" size="sm" onClick={openCreate}>
              <Plus size={14} className="mr-1.5" /> Criar serviço
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map(svc => (
            <ServiceCard
              key={svc._id}
              service={svc}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              isAdmin={isAdmin}
              categories={categories}
            />
          ))}
        </div>
      )}

      {/* Service form modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar serviço' : 'Novo serviço'} size="full">
        <div className="space-y-4">
          <Input label="Nome do serviço" required placeholder="Ex: Corte + Barba" value={form.name} onChange={set('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Preço (R$)" required type="number" min="0" step="0.01" placeholder="0.00"
              value={form.price} onChange={set('price')} />
            <Input label="Duração (min)" type="number" min="0" placeholder="30"
              value={form.duration} onChange={set('duration')} />
          </div>

          {/* Category selector */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, category: '' }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                    !form.category
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
                  )}
                >
                  Sem categoria
                </button>
                {categories.map(cat => (
                  <button
                    key={cat._id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat._id }))}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all',
                      form.category === cat._id ? 'text-white border-transparent' : 'border-transparent text-gray-600 dark:text-gray-400',
                    )}
                    style={
                      form.category === cat._id
                        ? { backgroundColor: cat.color }
                        : { backgroundColor: cat.color + '22', color: cat.color }
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input label="Descrição" placeholder="Descrição opcional..." value={form.description} onChange={set('description')} />

          {isAdmin && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Comissão do profissional
                </label>
                <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{commVal}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="1"
                value={form.commission}
                onChange={set('commission')}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-brand-500 bg-gray-200 dark:bg-gray-700"
              />
              <div className="flex rounded-lg overflow-hidden h-7 text-xs font-semibold">
                <div className="flex items-center justify-center bg-brand-500 text-white transition-all gap-1"
                  style={{ width: `${commVal}%` }}>
                  {commVal >= 15 && (
                    <>
                      {commVal}%
                      {price > 0 && <span className="opacity-75">(R$ {(price * commVal / 100).toFixed(2)})</span>}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all gap-1"
                  style={{ width: `${shopVal}%` }}>
                  {shopVal >= 15 && (
                    <>
                      {shopVal}%
                      {price > 0 && <span className="opacity-75">(R$ {(price * shopVal / 100).toFixed(2)})</span>}
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-600">
                <span>Profissional</span>
                <span>Estabelecimento</span>
              </div>
            </div>
          )}

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

      {/* Delete modal */}
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

      {/* Category management modal */}
      <CategoryModal
        open={catModal}
        onClose={() => setCatModal(false)}
        categories={categories}
        onChanged={() => { loadCategories(); load(); }}
      />
    </div>
  );
}
