import { z } from 'zod';

export const photoSchema = z.object({
  id: z.string(),
  /** Encontro a que a foto pertence; vazio = foto avulsa do grupo. */
  eventId: z.string().default(''),
  eventTitle: z.string().default(''),
  caption: z.string().default(''),
  downloadUrl: z.string(),
  /**
   * Caminho no Storage. É o que permite apagar o arquivo junto com o doc —
   *  sem ele sobra um objeto no bucket que ninguém mais consegue endereçar.
   */
  storagePath: z.string(),
  uploadedBy: z.string(),
  uploadedByName: z.string().default(''),
  createdAt: z.number().nullable().default(null),
});

export type Photo = z.infer<typeof photoSchema>;
