import { FileText, Construction } from 'lucide-react';

export default function Invoices() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FileText size={24} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Notas Fiscais</h2>
      <p className="text-sm text-gray-400 max-w-sm mx-auto">
        Modulo de notas fiscais em desenvolvimento. Esta area estara disponivel em breve para integracao com sistemas de NF-e / NFC-e.
      </p>
      <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-amber-500">
        <Construction size={14} />
        Em breve
      </div>
    </div>
  );
}
