import type { AppEvent, EventFormInput } from '@/types/event-type';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '@/config/firebase';
import { todayStartsAtBoundary } from '@/helpers/date';
import { toMillis } from '@/helpers/firestore';
import { appEventSchema } from '@/types/event-type';

const eventsCollection = collection(db, 'events');

function parseEvent(id: string, data: Record<string, unknown> | undefined): AppEvent | null {
  if (!data)
    return null;

  const result = appEventSchema.safeParse({
    ...data,
    id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  });

  if (!result.success) {
    console.error('[eventService] evento fora do schema', { id, issues: result.error.issues });
    return null;
  }

  return result.data;
}

function parseAll(documents: { id: string; data: () => Record<string, unknown> }[]): AppEvent[] {
  return documents
    .map(document => parseEvent(document.id, document.data()))
    .filter((event): event is AppEvent => event !== null);
}

export const eventService = {
  /** Toda a agenda, do mais próximo ao mais distante. */
  async listEvents(): Promise<AppEvent[]> {
    const snapshot = await getDocs(query(eventsCollection, orderBy('startsAt', 'asc')));
    return parseAll(snapshot.docs);
  },

  /**
   * Próximos encontros ainda agendados.
   *
   * O corte é o início do dia de HOJE em Brasília, não o instante atual: um
   * encontro que começou às 19h ainda é "o próximo encontro" para quem abre o
   * app às 19h30 a caminho dele.
   */
  async listUpcoming(max = 10): Promise<AppEvent[]> {
    const snapshot = await getDocs(query(
      eventsCollection,
      where('status', '==', 'agendado'),
      orderBy('startsAt', 'asc'),
      limit(max),
    ));

    const boundary = todayStartsAtBoundary();
    return parseAll(snapshot.docs).filter(event => event.startsAt >= boundary);
  },

  /**
   * O encontro mais recente que já aconteceu — é o mural dele que a tela
   * inicial mostra.
   *
   * O corte é o mesmo `todayStartsAtBoundary()` do `listUpcoming`, e não o
   * instante atual: no dia do encontro ele é "o próximo", nunca "o último".
   * Sem essa fronteira compartilhada, os dois blocos da tela inicial
   * mostrariam o mesmo encontro durante o dia inteiro.
   *
   * Lê alguns documentos em vez de um: o cancelado não vale como último
   * encontro, e filtrar `status` no servidor exigiria um índice composto só
   * para isto.
   */
  async getLastHeldEvent(scanned = 5): Promise<AppEvent | null> {
    const snapshot = await getDocs(query(
      eventsCollection,
      where('startsAt', '<', todayStartsAtBoundary()),
      orderBy('startsAt', 'desc'),
      limit(scanned),
    ));

    return parseAll(snapshot.docs).find(event => event.status !== 'cancelado') ?? null;
  },

  /** O próximo encontro — é ele que a tela de confirmação de presença abre. */
  async getNextEvent(): Promise<AppEvent | null> {
    const upcoming = await this.listUpcoming(1);
    return upcoming[0] ?? null;
  },

  async getEvent(id: string): Promise<AppEvent | null> {
    const snapshot = await getDoc(doc(db, 'events', id));
    return parseEvent(snapshot.id, snapshot.data());
  },

  async createEvent(input: EventFormInput): Promise<string> {
    const reference = await addDoc(eventsCollection, {
      ...input,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return reference.id;
  },

  async updateEvent(id: string, input: Partial<EventFormInput>): Promise<void> {
    await updateDoc(doc(db, 'events', id), { ...input, updatedAt: serverTimestamp() });
  },

  async deleteEvent(id: string): Promise<void> {
    await deleteDoc(doc(db, 'events', id));
  },
};
