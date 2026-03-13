import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

let toastFn = null;

export function toast(msg, type = 'success') {
  toastFn?.(msg, type);
}

export function Toaster() {
  const [items, setItems] = useState([]);

  toastFn = useCallback((msg, type) => {
    const id = Date.now();
    setItems(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 3500);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {items.map(item => (
        <div
          key={item.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-fade-up pointer-events-auto',
            item.type === 'success'
              ? 'bg-white dark:bg-gray-900 border-green-100 dark:border-green-900 text-gray-800 dark:text-gray-200'
              : 'bg-white dark:bg-gray-900 border-red-100 dark:border-red-900 text-gray-800 dark:text-gray-200',
          )}
        >
          {item.type === 'success'
            ? <CheckCircle size={16} className="text-green-500 shrink-0" />
            : <XCircle    size={16} className="text-red-500   shrink-0" />}
          {item.msg}
          <button
            onClick={() => setItems(p => p.filter(i => i.id !== item.id))}
            className="ml-1 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
