import { X } from 'lucide-react';
import { useEffect } from 'react';

import { cn } from '@/lib/utils';

/**
 * Diálogo modal simples (sem dependência de biblioteca de overlay).
 *
 * Trava o scroll do body e fecha no Esc — sem isso, no celular a página de
 * trás continua rolando atrás do formulário, que é o bug clássico de modal
 * feito à mão.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open)
      return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open)
    return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={cn(
          'surface-card max-h-[92vh] w-full overflow-y-auto rounded-t-2xl sm:max-w-lg sm:rounded-2xl',
          className,
        )}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] p-5">
          <h2 className="display-type text-xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted rounded-md p-1 hover:bg-[var(--surface-sunken)]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
