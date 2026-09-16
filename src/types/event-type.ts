import { z } from 'zod';

export const EVENT_STATUS = ['agendado', 'realizado', 'cancelado'] as const;
export type EventStatus = (typeof EVENT_STATUS)[number];

export const eventLocationSchema = z.object({
  name: z.string().default(''),
  address: z.string().default(''),
  mapsUrl: z.string().default(''),
});

export const appEventSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  description: z.string().default(''),
  /**
   * ISO 8601 COM o offset de Brasília, ex.: `2026-10-15T19:30:00-03:00`.
   *
   * Nunca uma data "solta" (`2026-10-15T19:30:00`). O Cloud Functions roda em
   * UTC e o navegador de um membro em viagem roda no fuso dele: uma string sem
   * offset é lida como um horário diferente em cada um deles. Com o offset
   * fixo (o Brasil não tem mais horário de verão), a ordenação lexicográfica
   * da string também coincide com a ordem cronológica, o que deixa o
   * `orderBy('startsAt')` do Firestore correto sem nenhuma conversão.
   */
  startsAt: z.string(),
  /** Duração em minutos; usada só para exibir o horário de término. */
  durationMinutes: z.number().default(120),
  location: eventLocationSchema.default({ name: '', address: '', mapsUrl: '' }),
  /** Tema/módulo da master class tratado no encontro. */
  topic: z.string().default(''),
  speaker: z.string().default(''),
  coverUrl: z.string().default(''),
  capacity: z.number().nullable().default(null),
  status: z.enum(EVENT_STATUS).default('agendado'),
  createdAt: z.number().nullable().default(null),
  updatedAt: z.number().nullable().default(null),
});

export type AppEvent = z.infer<typeof appEventSchema>;
export type EventLocation = z.infer<typeof eventLocationSchema>;
export type EventFormInput = Omit<AppEvent, 'id' | 'createdAt' | 'updatedAt'>;
