import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Search, CalendarDays, Settings, LogOut, Scissors } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext';
import { cn } from '../../utils/cn';

const NAV = [
  { to: '/client',              icon: Search,       label: 'Descobrir',       end: true },
  { to: '/client/appointments', icon: CalendarDays, label: 'Agendamentos' },
];

export default function ClientLayout() {
  const { client, logout } = useClientAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/client/login'); };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <Scissors size={16} className="text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900 dark:text-gray-100">JubaOS</span>
          <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">Cliente</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100',
            )}>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
          <NavLink to="/client/settings" className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
          )}>
            <Settings size={16} />
            Configurações
          </NavLink>

          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {client?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="flex-1 text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{client?.name}</span>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
            <Outlet />
          </div>
        </div>

        {/* Bottom nav — mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center justify-around px-2 py-2 z-40">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn(
              'flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg text-xs font-medium transition-colors',
              isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400',
            )}>
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
          <NavLink to="/client/settings" className={({ isActive }) => cn(
            'flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg text-xs font-medium transition-colors',
            isActive ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400',
          )}>
            <Settings size={20} />
            Config.
          </NavLink>
        </nav>
      </main>
    </div>
  );
}
