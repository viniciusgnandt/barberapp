import { Palette, Sun, Moon, Monitor, Type } from 'lucide-react';
import { useTheme, COLORS, FONTS } from '../context/ThemeContext';
import { cn } from '../utils/cn';

const THEME_MODES = [
  { id: 'light', label: 'Claro',      icon: Sun     },
  { id: 'dark',  label: 'Escuro',     icon: Moon    },
  { id: 'auto',  label: 'Automático', icon: Monitor },
];

export default function Appearance() {
  const { mode, color, font, setMode, setColor, setFont } = useTheme();

  return (
    <div className="max-w-xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Aparência</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Personalize o visual do sistema</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Aparência</h2>
        </div>

        {/* Tema */}
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Tema</p>
          <div className="flex gap-2">
            {THEME_MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-colors',
                  mode === id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
                )}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Cor do sistema</p>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                title={c.label}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
                  color === c.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
                )}
              >
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: c.swatch }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fonte */}
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
            <Type size={12} className="inline mr-1" />Fonte
          </p>
          <div className="flex gap-2 flex-wrap">
            {FONTS.map(f => (
              <button
                key={f.id}
                onClick={() => setFont(f.id)}
                className={cn(
                  'px-3 py-2 rounded-xl border text-xs font-medium transition-colors',
                  font === f.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
                )}
                style={{ fontFamily: f.css }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
