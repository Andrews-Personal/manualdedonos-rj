import type { Rsvp, RsvpStatus } from '@/types/rsvp-type';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { toMillis } from '@/helpers/firestore';
import { rsvpId, rsvpSchema } from '@/types/rsvp-type';

const rsvpsCollection = collection(db, 'rsvps');

function parseRsvp(id: string, data: Record<string, unknown> | undefined): Rsvp | null {
  if (!data)
    return null;

  const result = rsvpSchema.safeParse({ ...data, id, updatedAt: toMillis(data.updatedAt) });

  if (!result.success) {
    console.error('[rsvpService] confirmação fora do schema', { id, issues: result.error.issues });
    return null;
  }

  return result.data;
}

export type RsvpInput = {
  eventId: string;
  uid: string;
  memberName: string;
  memberCompany: string;
  status: RsvpStatus;
  guests: number;
  note: string;
};

export type AttendanceSummary = {
  confirmados: number;
  talvez: number;
  ausentes: number;
  /** Confirmados + convidados que eles trazem. É este o número da sala. */
  totalPessoas: number;
};

export const rsvpService = {
  /**
   * Grava a confirmação em um ID derivado (`{eventId}_{uid}`) com `setDoc`,
   * não `addDoc`. Confirmar duas vezes sobrescreve a mesma linha em vez de
   * criar uma segunda — o que mantém a contagem do anfitrião honesta mesmo se
   * o membro clicar duas vezes ou abrir o app em dois aparelhos.
   */
  async saveRsvp(input: RsvpInput): Promise<void> {
    await setDoc(
      doc(db, 'rsvps', rsvpId(input.eventId, input.uid)),
      { ...input, updatedAt: serverTimestamp() },
      { merge: true },
    );
  },

  async getRsvp(eventId: string, uid: string): Promise<Rsvp | null> {
    const snapshot = await getDoc(doc(db, 'rsvps', rsvpId(eventId, uid)));
    return parseRsvp(snapshot.id, snapshot.data());
  },

  async listByEvent(eventId: string): Promise<Rsvp[]> {
    const snapshot = await getDocs(query(rsvpsCollection, where('eventId', '==', eventId)));
    return snapshot.docs
      .map(document => parseRsvp(document.id, document.data()))
      .filter((rsvp): rsvp is Rsvp => rsvp !== null)
      // Ordenado no cliente: são dezenas de linhas por encontro, e um índice
      // composto no Firestore custaria mais do que esse sort.
      .sort((a, b) => a.memberName.localeCompare(b.memberName));
  },

  async removeRsvp(eventId: string, uid: string): Promise<void> {
    await deleteDoc(doc(db, 'rsvps', rsvpId(eventId, uid)));
  },

  summarize(rsvps: Rsvp[]): AttendanceSummary {
    const confirmed = rsvps.filter(rsvp => rsvp.status === 'confirmado');
    return {
      confirmados: confirmed.length,
      talvez: rsvps.filter(rsvp => rsvp.status === 'talvez').length,
      ausentes: rsvps.filter(rsvp => rsvp.status === 'ausente').length,
      totalPessoas: confirmed.reduce((total, rsvp) => total + 1 + rsvp.guests, 0),
    };
  },
};
