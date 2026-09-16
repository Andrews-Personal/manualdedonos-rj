import { Loader2, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, Input } from '@/components/ui/field';
import { friendlyError } from '@/helpers/errors';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { routes } from '@/routes/routes';

type Mode = 'entrar' | 'cadastrar';

export function Login() {
  const { isAuthenticated, isActiveMember, isAdmin, loading, signIn, signUp, signInWithGoogle, resetPassword } = useUser();
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (loading)
    return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin text-gold-500" />;

  // Já logado: manda para onde ele tentava ir, ou para a agenda.
  if (isAuthenticated) {
    if (!isActiveMember && !isAdmin)
      return <Navigate to={routes.pendingApproval.path} replace />;

    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;
    return <Navigate to={from ?? routes.agenda.path} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === 'entrar') {
        await signIn(email.trim(), password);
        toast.success('Bem-vindo de volta.');
      }
      else {
        await signUp(email.trim(), password, displayName);
        toast.success('Cadastro enviado. Aguarde a liberação da organização.');
      }
      navigate(routes.agenda.path, { replace: true });
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível concluir. Tente novamente.'));
    }
    finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate(routes.agenda.path, { replace: true });
    }
    catch (error) {
      toast.error(friendlyError(error, 'Login com Google não concluído.'));
    }
    finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) {
      toast.error('Informe seu e-mail primeiro para receber o link de redefinição.');
      return;
    }

    try {
      await resetPassword(email.trim());
      // Mensagem propositalmente neutra: confirmar que o e-mail existe é
      // entregar a lista de membros para quem estiver testando endereços.
      toast.success('Se existir uma conta com este e-mail, o link de redefinição foi enviado.');
    }
    catch (error) {
      toast.error(friendlyError(error));
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-8">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-500 text-navy-950">
          <LockKeyhole className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold">Área de membros</h1>
        <p className="text-muted mt-1 text-sm">
          Manual de Donos — Empresários do Rio
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-[var(--surface-sunken)] p-1">
            {(['entrar', 'cadastrar'] as Mode[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={cn(
                  'rounded-md py-2 text-sm font-medium capitalize transition-colors',
                  mode === option ? 'bg-[var(--surface-raised)] shadow-sm' : 'text-muted',
                )}
              >
                {option === 'entrar' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {mode === 'cadastrar' && (
              <FormField label="Nome completo" htmlFor="displayName">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </FormField>
            )}

            <FormField label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </FormField>

            <FormField
              label="Senha"
              htmlFor="password"
              hint={mode === 'cadastrar' ? 'Mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.' : undefined}
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
                required
              />
            </FormField>

            <Button type="submit" loading={submitting} size="lg">
              {mode === 'entrar' ? 'Entrar' : 'Criar minha conta'}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
            <span className="text-muted text-xs">ou</span>
            <span className="h-px flex-1 bg-[var(--border-subtle)]" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={submitting}>
            Continuar com Google
          </Button>

          {mode === 'entrar' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-muted mt-4 w-full text-center text-xs underline"
            >
              Esqueci minha senha
            </button>
          )}
        </CardContent>
      </Card>

      <p className="text-muted text-center text-xs">
        O acesso é liberado manualmente pela organização da master class após a
        confirmação da sua participação na turma.
      </p>
    </div>
  );
}
