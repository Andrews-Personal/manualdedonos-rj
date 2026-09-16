import type { User } from 'firebase/auth';

import type { Member, MemberFormInput, MemberRoleValue } from '@/types/member-type';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { stripUndefined, toMillis } from '@/helpers/firestore';
import { memberSchema } from '@/types/member-type';

const membersCollection = collection(db, 'members');

function parseMember(id: string, data: Record<string, unknown> | undefined): Member | null {
  if (!data)
    return null;

  const result = memberSchema.safeParse({
    ...data,
    uid: id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  });

  if (!result.success) {
    console.error('[memberService] perfil fora do schema', { uid: id, issues: result.error.issues });
    return null;
  }

  return result.data;
}

export const memberService = {
  /**
   * Cria o perfil do recém-cadastrado, sempre como visitante não aprovado.
   *
   * As regras do Firestore exigem exatamente `role: 0` e `approved: false` na
   * criação. Isso é o que impede alguém de se cadastrar já como admin
   * mandando o payload direto pelo SDK — o formulário não é a fronteira de
   * segurança, a regra é.
   */
  async createProfile(user: User, displayName: string): Promise<void> {
    await setDoc(doc(db, 'members', user.uid), {
      uid: user.uid,
      email: user.email ?? '',
      displayName: displayName.trim() || user.displayName || '',
      photoURL: user.photoURL ?? '',
      phone: user.phoneNumber ?? '',
      role: 0,
      approved: false,
      bio: '',
      company: { name: '', segment: '', position: '', site: '', revenueRange: '', headcount: '', city: '' },
      offers: [],
      needs: [],
      linkedin: '',
      instagram: '',
      aiOptOut: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Cria o perfil só se ainda não existir — o login com Google passa por aqui
   *  toda vez, e um `setDoc` cego apagaria o perfil já preenchido.
   */
  async ensureProfile(user: User, displayName = ''): Promise<void> {
    const existing = await getDoc(doc(db, 'members', user.uid));
    if (existing.exists())
      return;
    await this.createProfile(user, displayName);
  },

  async getMember(uid: string): Promise<Member | null> {
    const snapshot = await getDoc(doc(db, 'members', uid));
    return parseMember(snapshot.id, snapshot.data());
  },

  /**
   * Assina o perfil do próprio usuário. A aprovação pelo admin passa a valer
   *  na hora, sem o membro precisar recarregar a página.
   */
  subscribeToMember(uid: string, onChange: (member: Member | null) => void, onError: (error: Error) => void) {
    return onSnapshot(
      doc(db, 'members', uid),
      snapshot => onChange(parseMember(snapshot.id, snapshot.data())),
      error => onError(error),
    );
  },

  async listMembers(): Promise<Member[]> {
    const snapshot = await getDocs(query(membersCollection, orderBy('displayName')));
    return snapshot.docs
      .map(document => parseMember(document.id, document.data()))
      .filter((member): member is Member => member !== null);
  },

  async updateProfile(uid: string, input: Partial<MemberFormInput>): Promise<void> {
    await updateDoc(doc(db, 'members', uid), {
      ...stripUndefined(input as Record<string, unknown>),
      updatedAt: serverTimestamp(),
    });
  },

  async updatePhoto(uid: string, photoURL: string): Promise<void> {
    await updateDoc(doc(db, 'members', uid), { photoURL, updatedAt: serverTimestamp() });
  },

  /** Somente admins passam nas regras. Aprovar promove Visitante → Membro. */
  async setApproval(uid: string, approved: boolean, role: MemberRoleValue): Promise<void> {
    await updateDoc(doc(db, 'members', uid), { approved, role, updatedAt: serverTimestamp() });
  },

  async setRole(uid: string, role: MemberRoleValue): Promise<void> {
    await updateDoc(doc(db, 'members', uid), { role, updatedAt: serverTimestamp() });
  },
};
