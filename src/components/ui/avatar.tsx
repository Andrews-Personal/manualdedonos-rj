import { cn } from '@/lib/utils';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0)
    return '?';
  if (parts.length === 1)
    return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string;
  className?: string;
}) {
  const base = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full '
    + 'bg-navy-900 text-white dark:bg-gold-400 dark:text-navy-950 h-10 w-10 text-sm font-semibold',
    className,
  );

  if (src)
    return <img src={src} alt={name} className={cn(base, 'object-cover')} loading="lazy" />;

  return <span className={base} aria-hidden>{initials(name)}</span>;
}
