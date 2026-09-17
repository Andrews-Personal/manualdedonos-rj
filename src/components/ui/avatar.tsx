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
    // Mostarda em qualquer contexto: o disco precisa aparecer tanto sobre o
    // papel branco quanto sobre a barra preta do cabeçalho.
    'display-type flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden '
    + 'rounded-full bg-[var(--accent)] text-sm text-[var(--accent-contrast)]',
    className,
  );

  if (src)
    return <img src={src} alt={name} className={cn(base, 'object-cover')} loading="lazy" />;

  return <span className={base} aria-hidden>{initials(name)}</span>;
}
