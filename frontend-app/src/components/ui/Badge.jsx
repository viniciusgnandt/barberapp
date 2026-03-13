import { cn } from '../../utils/cn';

const variants = {
  agendado:  'bg-blue-50  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300  border-blue-200  dark:border-blue-800',
  concluido: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  'concluído':'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  cancelado: 'bg-red-50   dark:bg-red-900/30   text-red-700   dark:text-red-300   border-red-200   dark:border-red-800',
  admin:     'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800',
  barbeiro:  'bg-gray-50  dark:bg-gray-800     text-gray-600  dark:text-gray-300  border-gray-200  dark:border-gray-700',
};

const labels = {
  agendado:   'Agendado',
  concluido:  'Concluído',
  'concluído':'Concluído',
  cancelado:  'Cancelado',
  admin:      'Admin',
  barbeiro:   'Barbeiro',
};

export default function Badge({ variant, children, className }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      variants[variant] || 'bg-gray-100 text-gray-600 border-gray-200',
      className,
    )}>
      {children ?? labels[variant] ?? variant}
    </span>
  );
}
