import type { User } from 'firebase/auth';
import type { PropsWithChildren } from 'react';

import type { Member } from '@/types/member-type';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { auth } from '@/config/firebase';
import { authService } from '@/libs/authorization';
import { memberService } from '@/services/member.service';
import { isActiveMember as checkActiveMember, isAdminRole } from '@/types/member-type';

import { UserContext } from './user-context-definition';

export function UserProvider({ children }: PropsWithChildren) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [profileResolved, setProfileResolved] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const service = useMemo(() => authService(auth), []);

  useEffect(() => {
    return service.onAuthStateChange((user) => {
      setFirebaseUser(user);
      setAuthResolved(true);

      if (!user) {
        setMember(null);
        setProfileResolved(true);
      }
      else {
        // Sessão nova: o perfil ainda não chegou. Sem este reset, a tela
        // reaproveitaria por um frame o perfil do usuário anterior.
        setProfileResolved(false);
      }
    });
  }, [service]);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }

    // eslint-disable-next-line react/set-state-in-effect -- marcar 'carregando' antes de disparar a leitura é justamente o objetivo deste efeito.
    setError(null);

    // Assinatura em tempo real, e não uma leitura única: quando o admin
    // aprova o cadastro, o membro que está com a tela de espera aberta entra
    // no app sozinho, sem precisar deslogar e logar de novo.
    const unsubscribe = memberService.subscribeToMember(
      firebaseUser.uid,
      (profile) => {
        setMember(profile);
        setProfileResolved(true);
      },
      (readError) => {
        console.error('[UserProvider] falha ao ler o perfil', readError);
        setError(readError);
        setProfileResolved(true);
      },
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    await service.signIn(email, password);
  }, [service]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const user = await service.signUp(email, password, displayName);
    await memberService.createProfile(user, displayName);
  }, [service]);

  const signInWithGoogle = useCallback(async () => {
    const user = await service.signInWithGoogle();
    // Primeiro login com Google não passa pelo formulário de cadastro, então
    // o perfil é criado aqui — e só se ainda não existir.
    await memberService.ensureProfile(user, user.displayName ?? '');
  }, [service]);

  const resetPassword = useCallback(async (email: string) => {
    await service.resetPassword(email);
  }, [service]);

  const logout = useCallback(async () => {
    await service.logout();
  }, [service]);

  const value = useMemo(() => ({
    firebaseUser,
    member,
    loading: !authResolved || !profileResolved,
    error,
    isAuthenticated: Boolean(firebaseUser),
    isActiveMember: checkActiveMember(member),
    isAdmin: isAdminRole(member?.role),
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    logout,
  }), [
    firebaseUser,
    member,
    authResolved,
    profileResolved,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    logout,
  ]);

  return <UserContext value={value}>{children}</UserContext>;
}
