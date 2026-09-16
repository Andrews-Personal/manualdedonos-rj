import type { Auth, User } from 'firebase/auth';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';

/**
 * Singleton em volta do Firebase Auth.
 *
 * O ponto de ter uma classe aqui não é abstração por abstração: é garantir que
 * a política de senha e o tratamento de erro fiquem em UM lugar. Espalhar
 * `createUserWithEmailAndPassword` por três formulários é como a validação de
 * senha acaba existindo em duas versões diferentes.
 */
class AuthService {
  private static instance: AuthService | null = null;
  private readonly auth: Auth;

  private constructor(auth: Auth) {
    this.auth = auth;
  }

  static getInstance(auth: Auth): AuthService {
    if (!AuthService.instance)
      AuthService.instance = new AuthService(auth);
    return AuthService.instance;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    this.assertPasswordStrength(password);
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);

    if (displayName.trim())
      await updateProfile(credential.user, { displayName: displayName.trim() });

    return credential.user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    return credential.user;
  }

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(this.auth, provider);
    return credential.user;
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * O Firebase aceita qualquer senha com 6 caracteres. Esta é a lista de
   * contatos e o faturamento declarado de um grupo de empresários — a régua
   * sobe aqui, antes da chamada, para o erro chegar no formulário e não no
   * servidor.
   */
  private assertPasswordStrength(password: string): void {
    const strong = password.length >= 8
      && /[A-Z]/.test(password)
      && /[a-z]/.test(password)
      && /\d/.test(password)
      && /[^A-Z0-9]/i.test(password);

    if (!strong) {
      const error = new Error(
        'A senha precisa ter ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.',
      ) as Error & { code?: string };
      error.code = 'auth/weak-password';
      throw error;
    }
  }
}

export const authService = AuthService.getInstance;
