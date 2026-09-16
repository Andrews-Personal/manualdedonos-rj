import { z } from 'zod';

export const SERVICE_CATEGORIES = [
  'Consultoria & Gestão',
  'Contabilidade & Fiscal',
  'Jurídico',
  'Marketing & Vendas',
  'Tecnologia & Software',
  'Financeiro & Crédito',
  'RH & Recrutamento',
  'Logística & Operações',
  'Indústria & Fornecimento',
  'Imobiliário & Construção',
  'Saúde & Bem-estar',
  'Educação & Treinamento',
  'Outros',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const serviceSchema = z.object({
  id: z.string(),
  ownerUid: z.string(),
  ownerName: z.string().default(''),
  ownerCompany: z.string().default(''),
  title: z.string(),
  description: z.string().default(''),
  category: z.enum(SERVICE_CATEGORIES).catch('Outros'),
  /** Condição especial oferecida a quem é do grupo — o motivo da vitrine existir. */
  memberBenefit: z.string().default(''),
  priceHint: z.string().default(''),
  whatsapp: z.string().default(''),
  email: z.string().default(''),
  site: z.string().default(''),
  coverUrl: z.string().default(''),
  active: z.boolean().default(true),
  createdAt: z.number().nullable().default(null),
  updatedAt: z.number().nullable().default(null),
});

export type MemberService = z.infer<typeof serviceSchema>;
export type ServiceFormInput = Omit<
  MemberService,
  'id' | 'ownerUid' | 'ownerName' | 'ownerCompany' | 'createdAt' | 'updatedAt'
>;
