import { LogOut, Menu, Shield, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { MAIN_NAV, routes } from '@/routes/routes';

/**
 * Assinatura tipográfica, não um logotipo.
 *
 * O nome é composto na própria fonte de display — bloco de mostarda com as
 * iniciais, "Manual de" miúdo e "Donos" pesado logo abaixo. Nada de arte
 * importada: a marca é o tipo, e o tipo já está no projeto.
 */
function BrandMark() {
  return (
    <Link
      to={routes.home.path}
      className="flex items-center gap-3"
      aria-label="Manual de Donos, Empresários do Rio"
    >
      <span className="display-type flex h-10 w-10 items-center justify-center rounded-md bg-[var(--accent)] text-base text-[var(--accent-contrast)]">
        MD
      </span>
      <span className="hidden flex-col gap-0.5 sm:flex">
        <span className="eyebrow text-accent">Manual de</span>
        <span className="display-type text-xl leading-[0.85]">Donos</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isActiveMember, isAdmin, member, logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const showNav = isActiveMember || isAdmin;

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    toast.success('Você saiu da sua conta.');
    navigate(routes.home.path);
  };

  const navItems = MAIN_NAV.map(key => routes[key]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="surface-ink sticky top-0 z-40 border-b-2 border-b-[var(--accent)]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <BrandMark />

          {showNav && (
            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map(route => (
                <NavLink
                  key={route.path}
                  to={route.path}
                  className={({ isActive }) => cn(
                    'rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors',
                    isActive
                      ? 'bg-[var(--surface-sunken)] text-[var(--accent-text)]'
                      : 'text-muted hover:bg-[var(--surface-sunken)] hover:text-[var(--text-strong)]',
                  )}
                >
                  {route.label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to={routes.admin.path}
                  className={({ isActive }) => cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors',
                    isActive
                      ? 'bg-[var(--surface-sunken)] text-[var(--accent-text)]'
                      : 'text-muted hover:bg-[var(--surface-sunken)] hover:text-[var(--text-strong)]',
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </NavLink>
              )}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {isAuthenticated
              ? (
                  <>
                    <Link to={routes.profile.path} className="hidden items-center gap-2 sm:flex">
                      <Avatar name={member?.displayName || 'Membro'} src={member?.photoURL || undefined} className="h-9 w-9" />
                    </Link>
                    <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                )
              : (
                  // Mostarda, não a cor primária: o primário é preto sobre
                  // papel, e a barra do cabeçalho já é preta.
                  <Button variant="accent" size="sm" onClick={() => navigate(routes.login.path)}>
                    Entrar
                  </Button>
                )}

            {showNav && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMenuOpen(open => !open)}
                aria-label="Abrir menu"
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>

        {showNav && menuOpen && (
          <nav className="border-t border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-2 lg:hidden">
            {[...navItems, routes.profile, ...(isAdmin ? [routes.admin] : [])].map(route => (
              <NavLink
                key={route.path}
                to={route.path}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => cn(
                  'block rounded-md px-3 py-2.5 text-xs font-bold uppercase tracking-[0.08em]',
                  isActive ? 'bg-[var(--surface-sunken)] text-[var(--accent-text)]' : 'text-muted',
                )}
              >
                {route.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">{children}</main>

      <footer className="surface-ink">
        <div className="text-muted mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="eyebrow">Manual de Donos · Empresários do Rio</span>
          <span className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {member?.displayName || 'Visitante'}
          </span>
        </div>
      </footer>
    </div>
  );
}
