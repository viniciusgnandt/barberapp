import { useState, useEffect } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { PlatformAdmin } from '../../utils/api';
import {
  LayoutDashboard, Users, Brain, ShieldCheck, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';

const NAV = [
  { to: '/painel-administrativo',           label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/painel-administrativo/clientes',  label: 'Clientes',  icon: Users },
  { to: '/painel-administrativo/ia',        label: 'IA',        icon: Brain },
  { to: '/painel-administrativo/admins',    label: 'Admins',    icon: ShieldCheck },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [admin, setAdmin]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { navigate('/painel-administrativo/login'); return; }

    PlatformAdmin.me().then(r => {
      setLoading(false);
      if (r.ok) setAdmin(r.data.admin);
      else {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/painel-administrativo/login');
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/painel-administrativo/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 border-r border-gray-800 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="px-5 py-6 flex items-center gap-3 border-b border-gray-800">
            <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin Panel</p>
              <p className="text-xs text-gray-500">{admin?.name}</p>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(item => (
              <NavLink
                key={item.to} to={item.to} end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'bg-violet-600/20 text-violet-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-gray-800">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors w-full">
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3 lg:px-8">
          <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-500">{admin?.email}</span>
        </header>
        <main className="p-4 lg:p-8">
          <Outlet context={{ admin }} />
        </main>
      </div>
    </div>
  );
}
