import { cn } from '../../utils/cn';

export default function Spinner({ className, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  return (
    <span className={cn(
      'inline-block border-2 border-brand-500 border-t-transparent rounded-full animate-spin',
      sizes[size],
      className,
    )} />
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <Spinner size="lg" />
    </div>
  );
}
