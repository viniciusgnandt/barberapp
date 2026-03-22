import { useState } from 'react';
import { Banknote, CreditCard, Smartphone, Receipt, Percent } from 'lucide-react';
import { toast } from '../../components/ui/Toast';
import { cn } from '../../utils/cn';

const PAYMENT_METHODS = [
  { key: 'dinheiro', label: 'Dinheiro', icon: Banknote  },
  { key: 'pix',      label: 'PIX',      icon: Smartphone },
  { key: 'debito',   label: 'Débito',   icon: CreditCard },
  { key: 'credito',  label: 'Crédito',  icon: CreditCard },
  { key: 'outro',    label: 'Outro',    icon: Receipt    },
];

const DEFAULT_FEES = { dinheiro: 0, pix: 0, debito: 1.5, credito: 2.99, outro: 0 };

function loadFees() {
  try { return { ...DEFAULT_FEES, ...JSON.parse(localStorage.getItem('cashregister_fees') || '{}') }; }
  catch { return { ...DEFAULT_FEES }; }
}

function saveFees(fees) {
  try { localStorage.setItem('cashregister_fees', JSON.stringify(fees)); } catch {}
}

export default function FinancialSettings() {
  const [fees, setFees] = useState(loadFees);

  const set = k => e => setFees(f => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  const handleSave = () => {
    saveFees(fees);
    toast('Configurações salvas!', 'success');
  };

  const handleReset = () => {
    setFees({ ...DEFAULT_FEES });
    saveFees({ ...DEFAULT_FEES });
    toast('Taxas restauradas para o padrão.', 'success');
  };

  return (
    <div className="space-y-6 max-w-lg">

      {/* Taxas por método */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Percent size={15} className="text-brand-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Taxas por forma de pagamento</h2>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Define a taxa cobrada por cada método. Aplicada automaticamente ao registrar entradas no caixa.
          </p>
        </div>

        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {PAYMENT_METHODS.map(pm => {
            const rate    = fees[pm.key] ?? 0;
            const example = (100 * rate / 100).toFixed(2);
            return (
              <div key={pm.key} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <pm.icon size={15} className="text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{pm.label}</p>
                  {rate > 0 && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Ex: R$100,00 bruto → taxa R${example} → líquido R${(100 - parseFloat(example)).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number" min="0" max="100" step="0.01"
                    value={rate}
                    onChange={set(pm.key)}
                    className="w-20 px-2.5 py-1.5 text-sm text-right border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-colors"
                  />
                  <span className="text-sm text-gray-400 w-4">%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline underline-offset-2"
          >
            Restaurar padrões
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Salvar configurações
          </button>
        </div>
      </div>

    </div>
  );
}
