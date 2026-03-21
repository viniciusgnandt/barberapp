import { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Scissors, LogOut,
  Camera, ChevronUp, Check,
  BarChart2, TrendingUp, Settings, Boxes,
  PanelLeftClose, PanelLeftOpen, UserRound, Bot, Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Upload as UploadAPI } from '../../utils/api';
import { cn } from '../../utils/cn';
import Badge from '../ui/Badge';
import { toast } from '../ui/Toast';
import JubaOSLogo from '../ui/JubaOSLogo';

// ── Navigation structure ───────────────────────────────────────────────────────
const NAV_MAIN = [
  { to: '/agenda',    icon: CalendarDays,    label: 'Agenda',    adminOnly: false },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
  { to: '/services',  icon: Scissors,        label: 'Serviços',  adminOnly: false },
  { to: '/clients',   icon: UserRound,       label: 'Clientes',  adminOnly: false },
];

const NAV_STORE = [
  { to: '/stock',  icon: Boxes, label: 'Estoque' },
];

const NAV_FINANCIAL = [
  { to: '/financeiro', icon: Wallet, label: 'Financeiro' },
];

const NAV_ANALYTICS = [
  { to: '/reports',  icon: BarChart2,  label: 'Relatórios' },
  { to: '/business', icon: TrendingUp, label: 'Desempenho'  },
];

const NAV_AI = [
  { to: '/reception', icon: Bot, label: 'Recepção Virtual' },
];

const navLinkClass = (isActive, collapsed) => cn(
  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
  collapsed && 'justify-center px-2',
  isActive
    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
);

export default function Sidebar() {
  const { user, logout, isAdmin, updateUser, profiles, switchProfile } = useAuth();
  const navigate = useNavigate();

  const logoInputRef   = useRef(null);
  const avatarInputRef = useRef(null);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [switching,       setSwitching]       = useState(null);
  const [collapsed,       setCollapsed]       = useState(false);

  const initials = user?.name
    ?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

  const otherProfiles = profiles.filter(p => String(p.id) !== String(user?.id));

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const r = await UploadAPI.file(file, 'logo');
    setUploadingLogo(false);
    e.target.value = '';
    if (r.ok) { updateUser({ barbershopLogo: r.data?.data?.url }); toast('Logo atualizada!'); }
    else      toast(r.data?.message || 'Erro ao atualizar logo.', 'error');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const r = await UploadAPI.file(file, 'avatar');
    setUploadingAvatar(false);
    e.target.value = '';
    if (r.ok) { updateUser({ profileImage: r.data?.data?.url }); toast('Foto atualizada!'); }
    else      toast(r.data?.message || 'Erro ao atualizar foto.', 'error');
  };

  const handleSwitchProfile = async (profileId) => {
    setSwitching(profileId);
    const r = await switchProfile(profileId);
    setSwitching(null);
    setProfileMenuOpen(false);
    if (r.ok) toast('Perfil alterado!');
    else      toast(r.data?.message || 'Erro ao trocar perfil.', 'error');
  };

  const visibleMain = NAV_MAIN.filter(n => !n.adminOnly || isAdmin);

  return (
    <aside className={cn(
      'relative flex flex-col shrink-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300',
      collapsed ? 'w-16' : 'w-60',
    )}>

      {/* Collapse toggle */}
      <button
        onClick={() => { setCollapsed(c => !c); setProfileMenuOpen(false); }}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="absolute -right-3 top-6 z-30 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-brand-500 shadow-sm transition-colors"
      >
        {collapsed ? <PanelLeftOpen size={12} /> : <PanelLeftClose size={12} />}
      </button>

      {/* Brand / Logo */}
      <div className={cn('border-b border-gray-100 dark:border-gray-800', collapsed ? 'px-3 py-5' : 'px-5 py-5')}>
        <div className="flex items-center gap-3">
          <div
            onClick={() => isAdmin && logoInputRef.current?.click()}
            className={cn(
              'relative w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden',
              isAdmin && 'cursor-pointer group',
            )}
            title={isAdmin ? 'Clique para atualizar o logo' : undefined}
          >
            {user?.barbershopLogo
              ? <img src={user.barbershopLogo} alt="logo" className="w-full h-full object-cover" />
              : <JubaOSLogo size={36} />
            }
            {isAdmin && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingLogo
                  ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera size={11} className="text-white" />
                }
              </div>
            )}
            {isAdmin && <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />}
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user?.barbershopName || 'JubaOS'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">Agendamento Inteligente</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 py-3 overflow-y-auto scrollbar-thin', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Menu</p>
        )}
        <div className="space-y-1">
          {visibleMain.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} title={collapsed ? label : undefined}
              className={({ isActive }) => navLinkClass(isActive, collapsed)}>
              <Icon size={16} className="shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </div>

        {/* Loja (admin only) */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-2 mt-5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Loja</p>
            )}
            {collapsed && <div className="my-3 border-t border-gray-100 dark:border-gray-800" />}
            <div className="space-y-1">
              {NAV_STORE.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} title={collapsed ? label : undefined}
                  className={({ isActive }) => navLinkClass(isActive, collapsed)}>
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          </>
        )}

        {/* Financeiro */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-2 mt-5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Financeiro</p>
            )}
            {collapsed && <div className="my-3 border-t border-gray-100 dark:border-gray-800" />}
            <div className="space-y-1">
              {NAV_FINANCIAL.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} title={collapsed ? label : undefined}
                  className={({ isActive }) => navLinkClass(isActive, collapsed)}>
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          </>
        )}

        {/* Análises */}
        <>
          {!collapsed && (
            <p className="px-2 mt-5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Análises</p>
          )}
          {collapsed && <div className="my-3 border-t border-gray-100 dark:border-gray-800" />}
          <div className="space-y-1">
            {NAV_ANALYTICS.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} title={collapsed ? label : undefined}
                className={({ isActive }) => navLinkClass(isActive, collapsed)}>
                <Icon size={16} className="shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </div>
        </>

        {/* IA (admin only) */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-2 mt-5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Inteligência Artificial</p>
            )}
            {collapsed && <div className="my-3 border-t border-gray-100 dark:border-gray-800" />}
            <div className="space-y-1">
              {NAV_AI.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} title={collapsed ? label : undefined}
                  className={({ isActive }) => navLinkClass(isActive, collapsed)}>
                  <Icon size={16} className="shrink-0" />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className={cn('py-3 border-t border-gray-100 dark:border-gray-800 space-y-1', collapsed ? 'px-2' : 'px-3')}>

        {/* Profile switcher popup */}
        {profileMenuOpen && otherProfiles.length > 0 && !collapsed && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} />
            <div className="absolute bottom-28 left-3 right-3 z-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl p-2 space-y-1 animate-scale-in">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
                Trocar perfil
              </p>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-900/20">
                <div className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden">
                  {user?.profileImage
                    ? <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                    : initials
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user?.barbershopName}</p>
                  <Badge variant={user?.role} />
                </div>
                <Check size={12} className="text-brand-500 shrink-0" />
              </div>
              {otherProfiles.map(p => {
                const pInitials = p.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
                const isLoading = switching === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchProfile(p.id)}
                    disabled={!!switching}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 text-[10px] font-bold shrink-0 overflow-hidden">
                      {p.profileImage
                        ? <img src={p.profileImage} alt="" className="w-full h-full object-cover" />
                        : pInitials
                      }
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{p.barbershopName}</p>
                      <Badge variant={p.role} />
                    </div>
                    {isLoading && (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Settings button */}
        <button
          onClick={() => navigate('/settings')}
          title={collapsed ? 'Configurações' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
            collapsed && 'justify-center px-2',
          )}
        >
          <Settings size={16} className="shrink-0" />
          {!collapsed && 'Configurações'}
        </button>

        {/* User row */}
        <div className={cn('relative flex items-center gap-3 px-3 py-2 rounded-lg', collapsed && 'justify-center px-2')}>
          <div
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0 cursor-pointer overflow-hidden group"
            title="Clique para atualizar sua foto"
          >
            {user?.profileImage
              ? <img src={user.profileImage} alt="avatar" className="w-full h-full object-cover" />
              : initials
            }
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingAvatar
                ? <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={9} className="text-white" />
              }
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          {!collapsed && (
            <>
              <button
                onClick={() => otherProfiles.length > 0 && setProfileMenuOpen(o => !o)}
                className={cn('flex-1 min-w-0 text-left', otherProfiles.length > 0 && 'cursor-pointer')}
                title={otherProfiles.length > 0 ? 'Clique para trocar de perfil' : undefined}
              >
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
                  {otherProfiles.length > 0 && (
                    <ChevronUp size={12} className={cn('text-gray-400 shrink-0 transition-transform', !profileMenuOpen && 'rotate-180')} />
                  )}
                </div>
                <Badge variant={user?.role} className="mt-0.5" />
              </button>

              <button onClick={logout} title="Sair"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>

        {/* Logout when collapsed */}
        {collapsed && (
          <button onClick={logout} title="Sair"
            className="flex items-center justify-center w-full px-2 py-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
