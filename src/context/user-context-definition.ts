import type { User } from 'firebase/auth';

import type { Member } from '@/types/member-type';

import { createContext } from 'react';

export type UserContextValue = {
  /** Sessão do Firebase Auth. Existe assim que o login resolve. */
  firebaseUser: User | null;
  /** Perfil em `members/{uid}`. Pode ser null por um instante após o cadastro. */
  member: Member | null;
  /** `true` enquanto a sessão OU o perfil ainda estão sendo resolvidos. */
  loading: boolean;
  /** Falha ao ler o perfil — distinta de "não tem perfil". */
  error: Error | null;
  isAuthenticated: boolean;
  /** Autenticado E aprovado por um admin. É esta a permissão que libera o app. */
  isActiveMember: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const UserContext = createContext<UserContextValue | undefined>(undefined);
