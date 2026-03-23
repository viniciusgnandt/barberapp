// pages/reports/ReportsIndex.jsx

import { createContext, useContext, useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart2, DollarSign, Settings2, Users, Brain, Plus, X, Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const CUSTOM_CATS_KEY  = 'reports_custom_categories';
const CUSTOM_REPS_KEY  = 'reports_custom_reports';

// ── Filter Context ────────────────────────────────────────────────────────────
const FilterContext = createContext(null);
export function useReportContext() { return useContext(FilterContext); }

// ── Built-in categories ───────────────────────────────────────────────────────
const BUILTIN_CATEGORIES = [
  {
    key: 'geral',
    label: 'Geral',
    icon: BarChart2,
    subs: [
      { to: '/relatorios', label: 'Visão Geral', end: true },
      { to: '/relatorios/desempenho', label: 'Desempenho' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    adminOnly: true,
    subs: [
      { to: '/relatorios/fin-overview',  label: 'Visão Geral' },
      { to: '/relatorios/fin-fluxo',     label: 'Fluxo de Caixa' },
      { to: '/relatorios/fin-taxas',     label: 'Taxas' },
      { to: '/relatorios/fin-receitas',  label: 'Receitas' },
    ],
  },
  {
    key: 'operacional',
    label: 'Operacional',
    icon: Settings2,
    subs: [
      { to: '/relatorios/servicos',      label: 'Serviços' },
      { to: '/relatorios/profissionais', label: 'Profissionais', adminOnly: true },
      { to: '/relatorios/agenda',        label: 'Agenda' },
    ],
  },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: Users,
    adminOnly: true,
    subs: [
      { to: '/relatorios/clientes',        label: 'Visão Geral' },
      { to: '/relatorios/cli-recorrencia', label: 'Recorrência' },
      { to: '/relatorios/cli-ltv',         label: 'LTV' },
    ],
  },
  {
    key: 'inteligencia',
    label: 'Inteligência',
    icon: Brain,
    subs: [
      { to: '/relatorios/recepcao', label: 'Recepção IA', adminOnly: true },
    ],
  },
];

function loadCustomCats()  { try { return JSON.parse(localStorage.getItem(CUSTOM_CATS_KEY) ?? '[]'); } catch { return []; } }
function loadCustomReps()  { try { return JSON.parse(localStorage.getItem(CUSTOM_REPS_KEY) ?? '[]'); } catch { return []; } }

function useActiveCategory(location, allCategories, isAdmin) {
  const path = location.pathname;
  for (const cat of allCategories) {
    if (cat.adminOnly && !isAdmin) continue;
    const subs = (cat.subs || []).filter(s => !s.adminOnly || isAdmin);
    if (subs.some(s => s.end ? path === s.to : path.startsWith(s.to))) {
      return cat.key;
    }
  }
  return 'geral';
}

// ── Modal: Nova Categoria ─────────────────────────────────────────────────────
function NewCategoryModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const handle = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Nova Categoria</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><X size={16} /></button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Nome da categoria</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handle()}
            placeholder="ex: Marketing, RH, Operações..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handle} disabled={!name.trim()}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
            <Check size={13} /> Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Novo Relatório ─────────────────────────────────────────────────────
function NewReportModal({ categories, onSave, onClose }) {
  const [label, setLabel] = useState('');
  const [catKey, setCatKey] = useState(categories[0]?.key ?? '');
  const handle = () => {
    if (!label.trim() || !catKey) return;
    onSave({ label: label.trim(), catKey });
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Novo Relatório</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Nome do relatório</label>
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle()}
              placeholder="ex: Receita por bairro..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Categoria</label>
            <select value={catKey} onChange={e => setCatKey(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-brand-500">
              {categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          O relatório abrirá o construtor personalizado onde você pode configurar fonte, agrupamento e métricas.
        </p>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <button onClick={handle} disabled={!label.trim() || !catKey}
            className="flex-1 py-2 rounded-xl text-sm font-bold bg-brand-500 hover:bg-brand-600 text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
            <Check size={13} /> Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportsIndex() {
  const { isAdmin } = useAuth();
  const location    = useLocation();
  const navigate    = useNavigate();

  const [customCats, setCustomCats] = useState(loadCustomCats);
  const [customReps, setCustomReps] = useState(loadCustomReps);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewRep, setShowNewRep] = useState(false);

  // Persist to localStorage
  useEffect(() => { localStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(customCats)); }, [customCats]);
  useEffect(() => { localStorage.setItem(CUSTOM_REPS_KEY, JSON.stringify(customReps)); }, [customReps]);

  // Build full categories list: builtins + custom (each custom cat gets its custom reports as subs)
  const allCategories = [
    ...BUILTIN_CATEGORIES,
    ...customCats.map(cat => ({
      key: cat.key,
      label: cat.label,
      icon: BarChart2,
      custom: true,
      subs: customReps
        .filter(r => r.catKey === cat.key)
        .map(r => ({ to: `/relatorios/personalizado?rep=${r.id}`, label: r.label, custom: true })),
    })),
  ];

  const activeCategory = useActiveCategory(location, allCategories, isAdmin);
  const visibleCategories = allCategories.filter(c => !c.adminOnly || isAdmin);
  const activeCat = allCategories.find(c => c.key === activeCategory);
  const visibleSubs = (activeCat?.subs || []).filter(s => !s.adminOnly || isAdmin);

  const handleCategoryClick = (cat) => {
    const subs = (cat.subs || []).filter(s => !s.adminOnly || isAdmin);
    if (subs.length) navigate(subs[0].to);
    else if (cat.custom) navigate('/relatorios/personalizado');
  };

  const handleNewCategory = (name) => {
    const key = `custom_${Date.now()}`;
    setCustomCats(prev => [...prev, { key, label: name }]);
  };

  const handleNewReport = ({ label, catKey }) => {
    const id = `rep_${Date.now()}`;
    const newRep = { id, label, catKey };
    setCustomReps(prev => [...prev, newRep]);
    // Navigate to the personalizado page with this rep id
    navigate(`/relatorios/personalizado?rep=${id}`);
  };

  // All categories available for "Novo Relatório" selector
  const allCatsForPicker = visibleCategories;

  return (
    <FilterContext.Provider value={{ isAdmin }}>
      {showNewCat && <NewCategoryModal onSave={handleNewCategory} onClose={() => setShowNewCat(false)} />}
      {showNewRep && <NewReportModal categories={allCatsForPicker} onSave={handleNewReport} onClose={() => setShowNewRep(false)} />}

      <div className="flex flex-col -m-6 bg-gray-50 dark:bg-gray-950 min-h-[calc(100vh-0px)]">

        {/* ── Level 1: Categories ──────────────────────────────────────────── */}
        <div className="shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {visibleCategories.map(cat => {
              const Icon = cat.icon ?? BarChart2;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 shrink-0 whitespace-nowrap transition-colors',
                    isActive
                      ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                  )}>
                  <Icon size={14} />
                  {cat.label}
                </button>
              );
            })}

            {/* + Nova Categoria */}
            <button
              onClick={() => setShowNewCat(true)}
              className="flex items-center gap-1.5 px-3 py-3.5 text-sm font-medium border-b-2 border-transparent text-gray-400 dark:text-gray-600 hover:text-brand-500 dark:hover:text-brand-400 shrink-0 whitespace-nowrap transition-colors ml-1">
              <Plus size={13} />
              Nova Categoria
            </button>
          </div>
        </div>

        {/* ── Level 2: Submenus + Novo Relatório ───────────────────────────── */}
        <div className="shrink-0 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {visibleSubs.map(sub => (
              <NavLink
                key={sub.to}
                to={sub.to}
                end={sub.end}
                className={({ isActive }) => cn(
                  'px-3 py-2 text-xs font-medium rounded-lg mx-0.5 my-1.5 transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/70 dark:hover:bg-gray-800/50',
                )}>
                {sub.label}
              </NavLink>
            ))}

            {/* + Novo Relatório — always visible */}
            <button
              onClick={() => setShowNewRep(true)}
              className="flex items-center gap-1 px-3 py-1.5 mx-0.5 my-1.5 text-xs font-semibold rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-brand-400 hover:text-brand-500 dark:hover:border-brand-600 dark:hover:text-brand-400 transition-colors whitespace-nowrap shrink-0">
              <Plus size={11} />
              Novo Relatório
            </button>
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </div>
    </FilterContext.Provider>
  );
}
