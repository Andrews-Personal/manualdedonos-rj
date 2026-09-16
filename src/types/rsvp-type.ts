import { z } from 'zod';

export const RSVP_STATUS = ['confirmado', 'talvez', 'ausente'] as const;
export type RsvpStatus = (typeof RSVP_STATUS)[number];

export const RSVP_STATUS_LABEL: Record<RsvpStatus, string> = {
  confirmado: 'Vou participar',
  talvez: 'Talvez',
  ausente: 'Não vou',
};

export const rsvpSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  uid: z.string(),
  /**
   * Nome e empresa ficam desnormalizados aqui para a lista de presença do
   *  anfitrião não precisar de N leituras em `members` para renderizar.
   */
  memberName: z.string().default(''),
  memberCompany: z.string().default(''),
  status: z.enum(RSVP_STATUS),
  /** Convidados que o membro traz junto — conta na lotação da sala. */
  guests: z.number().min(0).max(10).default(0),
  note: z.string().default(''),
  updatedAt: z.number().nullable().default(null),
});

export type Rsvp = z.infer<typeof rsvpSchema>;

/**
 * O ID do RSVP é derivado, nunca sorteado: um `addDoc` deixaria o mesmo membro
 * confirmar o mesmo encontro várias vezes e a contagem do anfitrião passaria a
 * mentir. As regras do Firestore exigem exatamente este formato.
 */
export function rsvpId(eventId: string, uid: string): string {
  return `${eventId}_${uid}`;
}
