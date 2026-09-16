import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AppShell } from '@/components/layout/app-shell';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserProvider } from '@/context/user-context';
import {
  Admin,
  Agenda,
  Conexoes,
  ConfirmPresence,
  EventDetails,
  Home,
  Login,
  Membros,
  Mural,
  NotFound,
  PendingApproval,
  Perfil,
  Vitrine,
} from '@/pages';
import { ProtectedRoute } from '@/routes/protected-route';
import { routes } from '@/routes/routes';

/** Envolve uma página com o guardião de rota. */
function Protected({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  return <ProtectedRoute adminOnly={adminOnly}>{children}</ProtectedRoute>;
}

export function App() {
  return (
    <UserProvider>
      <Toaster richColors position="top-center" closeButton />
      <AppShell>
        <ErrorBoundary>
          <Routes>
            {/* Públicas */}
            <Route path={routes.home.path} element={<Home />} />
            <Route path={routes.login.path} element={<Login />} />
            <Route path={routes.pendingApproval.path} element={<PendingApproval />} />

            {/* Exclusivas de membros liberados */}
            <Route path={routes.agenda.path} element={<Protected><Agenda /></Protected>} />
            <Route path={routes.eventDetails.path} element={<Protected><EventDetails /></Protected>} />
            <Route path={routes.confirmPresence.path} element={<Protected><ConfirmPresence /></Protected>} />
            <Route path={routes.mural.path} element={<Protected><Mural /></Protected>} />
            <Route path={routes.showcase.path} element={<Protected><Vitrine /></Protected>} />
            <Route path={routes.connections.path} element={<Protected><Conexoes /></Protected>} />
            <Route path={routes.members.path} element={<Protected><Membros /></Protected>} />
            <Route path={routes.profile.path} element={<Protected><Perfil /></Protected>} />

            {/* Administração */}
            <Route path={routes.admin.path} element={<Protected adminOnly><Admin /></Protected>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
    </UserProvider>
  );
}
