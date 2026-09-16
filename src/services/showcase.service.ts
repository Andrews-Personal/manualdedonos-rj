import type { MemberService, ServiceFormInput } from '@/types/service-type';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { toMillis } from '@/helpers/firestore';
import { serviceSchema } from '@/types/service-type';

const servicesCollection = collection(db, 'services');

function parseService(id: string, data: Record<string, unknown> | undefined): MemberService | null {
  if (!data)
    return null;

  const result = serviceSchema.safeParse({
    ...data,
    id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  });

  if (!result.success) {
    console.error('[showcaseService] anúncio fora do schema', { id, issues: result.error.issues });
    return null;
  }

  return result.data;
}

export type CreateServiceInput = ServiceFormInput & {
  ownerUid: string;
  ownerName: string;
  ownerCompany: string;
};

export const showcaseService = {
  /** Vitrine pública para o grupo: só anúncios ativos. */
  async listActive(): Promise<MemberService[]> {
    const snapshot = await getDocs(query(
      servicesCollection,
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
    ));
    return snapshot.docs
      .map(document => parseService(document.id, document.data()))
      .filter((service): service is MemberService => service !== null);
  },

  /** Inclui os desativados — é a lista que o dono gerencia no próprio perfil. */
  async listByOwner(ownerUid: string): Promise<MemberService[]> {
    const snapshot = await getDocs(query(servicesCollection, where('ownerUid', '==', ownerUid)));
    return snapshot.docs
      .map(document => parseService(document.id, document.data()))
      .filter((service): service is MemberService => service !== null)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  },

  async createService(input: CreateServiceInput): Promise<string> {
    const reference = await addDoc(servicesCollection, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return reference.id;
  },

  async updateService(id: string, input: Partial<ServiceFormInput>): Promise<void> {
    await updateDoc(doc(db, 'services', id), { ...input, updatedAt: serverTimestamp() });
  },

  async deleteService(id: string): Promise<void> {
    await deleteDoc(doc(db, 'services', id));
  },
};
