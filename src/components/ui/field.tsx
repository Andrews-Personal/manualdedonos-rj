import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

// O campo fica no tom rebaixado do contexto, não no elevado: dentro de um
// cartão branco um input branco sumiria, sobrando só a borda para marcá-lo.
const controlClasses
  = 'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 text-sm '
    + 'text-[var(--text-strong)] placeholder:text-[var(--text-muted)] transition-colors '
    + 'focus:border-[var(--accent)] disabled:opacity-60';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('eyebrow text-[var(--text-strong)]', className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, 'h-11', className)} {...props} />;
}

export function FormField({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <span className="text-muted text-xs">{hint}</span>}
    </div>
  );
}
