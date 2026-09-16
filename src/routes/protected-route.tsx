import type { PropsWithChildren } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/ui/states';
import { useUser } from '@/hooks/use-user';

import { routes } from './routes';

/**
 * Guarda de rota com três portões, nesta ordem:
 *
 *   1. sessão resolvida?  → senão, spinner (não redireciona: no primeiro frame
 *      após um F5 o Firebase ainda não restaurou a sessão, e redirecionar aqui
 *      joga para fora um membro que está logado);
 *   2. autenticado?       → senão, vai para o login guardando de onde veio;
 *   3. aprovado por um admin? → senão, tela de espera.
 *
 * Esconder o link do menu só impede a descoberta. É este componente que
 * impede a URL digitada à mão.
 */
export function ProtectedRoute({ children, adminOnly = false }: PropsWithChildren<{ adminOnly?: boolean }>) {
  const { loading, isAuthenticated, isActiveMember, isAdmin } = useUser();
  const location = useLocation();

  if (loading)
    return <Spinner label="Verificando seu acesso…" />;

  if (!isAuthenticated)
    return <Navigate to={routes.login.path} state={{ from: location }} replace />;

  if (!isActiveMember && !isAdmin)
    return <Navigate to={routes.pendingApproval.path} replace />;

  if (adminOnly && !isAdmin)
    return <Navigate to={routes.agenda.path} replace />;

  return <>{children}</>;
}
