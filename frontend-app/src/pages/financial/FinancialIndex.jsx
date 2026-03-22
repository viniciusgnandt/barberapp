import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Wallet, History, Receipt, Percent, ArrowUpDown, FileText, Settings,
} from 'lucide-react';

const TABS = [
  { to: '/financeiro',               label: 'Caixa',          icon: Wallet,      end: true },
  { to: '/financeiro/historico',     label: 'Histórico',      icon: History },
  { to: '/financeiro/comandas',      label: 'Comandas',       icon: Receipt },
  { to: '/financeiro/comissoes',     label: 'Comissões',      icon: Percent },
  { to: '/financeiro/lancamentos',   label: 'Lançamentos',    icon: ArrowUpDown },
  { to: '/financeiro/notas',         label: 'Notas',          icon: FileText },
  { to: '/financeiro/configuracoes', label: 'Configurações',  icon: Settings },
];

export default function FinancialIndex() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Financeiro</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Controle de caixa, comissoes e lancamentos</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-100 dark:border-gray-800 pb-px">
        {TABS.map(tab => (
          <NavLink
            key={tab.to} to={tab.to} end={tab.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 ${
                isActive
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`
            }
          >
            <tab.icon size={14} />
            {tab.label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
