import type { VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'display-type inline-flex items-center justify-center gap-2 rounded-lg tracking-[0.01em] '
  + 'transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--brand)] text-[var(--brand-contrast)] hover:bg-[var(--brand-hover)]',
        accent: 'bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]',
        // Contorno grosso na cor do texto do contexto: sobre a parede verde
        // sai branco, sobre o papel sai preto, sem variante por superfície.
        outline: 'border-2 border-current bg-transparent hover:bg-[var(--surface-sunken)]',
        ghost: 'bg-transparent hover:bg-[var(--surface-sunken)]',
        danger: 'bg-red-700 text-white hover:bg-red-800',
      },
      size: {
        sm: 'h-9 px-3.5 text-xs',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
  & VariantProps<typeof buttonVariants>
  & { loading?: boolean };

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
