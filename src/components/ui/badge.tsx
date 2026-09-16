import type { VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-[var(--surface-sunken)] text-[var(--text-muted)]',
        brand: 'bg-navy-900 text-white dark:bg-gold-400 dark:text-navy-950',
        gold: 'bg-gold-500/15 text-gold-700 dark:text-gold-300',
        success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
        danger: 'bg-red-500/15 text-red-700 dark:text-red-300',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
