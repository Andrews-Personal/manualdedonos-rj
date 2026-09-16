import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from './button';

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <Loader2 className="h-7 w-7 animate-spin text-gold-500" aria-hidden />
      <span className="text-muted text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
      {Icon && <Icon className="h-10 w-10 text-gold-500" />}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-muted max-w-md text-sm">{description}</p>}
      {action}
    </div>
  );
}

/**
 * Erro de leitura, com botão de tentar de novo.
 *
 * Existe para que uma falha nunca seja renderizada como "não há nada aqui".
 * Um mural vazio porque a leitura caiu e um mural vazio porque ninguém postou
 * pedem ações opostas de quem está olhando.
 */
export function ResourceError({
  message = 'Não foi possível carregar estas informações.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center">
      <AlertTriangle className="h-9 w-9 text-amber-500" aria-hidden />
      <p className="text-sm font-medium">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
