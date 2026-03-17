import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { UserCircle, Palette, Store, CreditCard, Users, BarChart2 } from 'lucide-react';
import JubaOSLogo from '../components/ui/JubaOSLogo';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

const SETTINGS_NAV = [
  { to: '/settings/account',       icon: UserCircle, label: 'Conta',           adminOnly: false },
  { to: '/settings/appearance',    icon: Palette,    label: 'Aparência',       adminOnly: false },
  { to: '/settings/establishment', icon: Store,      label: 'Estabelecimento', adminOnly: true  },
  { to: '/settings/team',          icon: Users,      label: 'Equipe',          adminOnly: true  },
  { to: '/settings/billing',       icon: CreditCard, label: 'Meu Plano',       adminOnly: true  },
  { to: '/settings/usage',         icon: BarChart2,  label: 'Uso',             adminOnly: true  },
];

const navLinkClass = (isActive) => cn(
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
  isActive
    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
);

export default function Settings() {
  const { isAdmin } = useAuth();
  const visible     = SETTINGS_NAV.filter(n => !n.adminOnly || isAdmin);

  return (
    <div className="flex gap-6 animate-fade-up">

      {/* Left sub-nav */}
      <div className="w-48 shrink-0">
        <div className="flex items-center gap-2 px-3 mb-4">
          <JubaOSLogo size={24} />
          <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">JubaOS</span>
        </div>
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
          Configurações
        </p>
        <nav className="space-y-0.5">
          {visible.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

// Default redirect inside /settings
export function SettingsIndex() {
  return <Navigate to="/settings/account" replace />;
}
