import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { routes } from '@/routes/routes';

/**
 * Tela de espera entre o cadastro e a liberação pelo admin.
 *
 * O perfil é assinado em tempo real no `UserProvider`, então no momento em que
 * o admin aprova, este componente deixa de ser renderizado sozinho — o membro
 * não precisa recarregar nada. O botão de atualizar existe só para quem
 * prefere não confiar nisso.
 */
export function PendingApproval() {
  const { isAuthenticated, isActiveMember, isAdmin, member, logout, loading } = useUser();

  if (loading)
    return null;

  if (!isAuthenticated)
    return <Navigate to={routes.login.path} replace />;

  if (isActiveMember || isAdmin)
    return <Navigate to={routes.agenda.path} replace />;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-10">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
            <Clock className="h-7 w-7" />
          </span>

          <div>
            <h1 className="display-type text-3xl">Cadastro em análise</h1>
            <p className="text-muted mt-2 text-sm">
              Olá
              {' '}
              {member?.displayName?.split(' ')[0] || 'empresário'}
              ! Seu cadastro foi recebido e está aguardando a liberação da
              organização do Manual de Donos. Assim que for aprovado, esta tela
              dá lugar à área de membros automaticamente.
            </p>
          </div>

          <div className="w-full rounded-lg bg-[var(--surface-sunken)] p-4 text-left text-xs">
            <p className="text-muted">
              Conta:
              {' '}
              <strong className="text-[var(--text-strong)]">{member?.email}</strong>
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="ghost" className="flex-1" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
