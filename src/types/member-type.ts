import { z } from 'zod';

// Papéis são numéricos e comparados por `>=` nas regras do Firestore. Números
// (e não strings) porque a regra precisa dizer "é admin ou acima" em uma
// comparação só, sem manter uma lista de labels sincronizada em dois lugares.
export const MEMBER_ROLE = {
  Visitante: 0,
  Membro: 1,
  Admin: 90,
  SuperAdmin: 99,
} as const;

export type MemberRoleLabel = keyof typeof MEMBER_ROLE;
export type MemberRoleValue = (typeof MEMBER_ROLE)[MemberRoleLabel];

export const memberRoleSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(90),
  z.literal(99),
]);

export function roleLabel(role: MemberRoleValue): MemberRoleLabel {
  const entry = (Object.entries(MEMBER_ROLE) as [MemberRoleLabel, MemberRoleValue][])
    .find(([, value]) => value === role);
  return entry?.[0] ?? 'Visitante';
}

export const companySchema = z.object({
  name: z.string().trim().default(''),
  /** Segmento/setor — é o que a IA usa para agrupar cadeias de fornecimento. */
  segment: z.string().trim().default(''),
  /** Cargo do membro na própria empresa (sócio, CEO, diretor...). */
  position: z.string().trim().default(''),
  site: z.string().trim().default(''),
  /** Faixa de faturamento declarada, opcional e sempre autodeclarada. */
  revenueRange: z.string().trim().default(''),
  /** Número aproximado de funcionários, autodeclarado. */
  headcount: z.string().trim().default(''),
  city: z.string().trim().default(''),
});

export const memberSchema = z.object({
  uid: z.string(),
  email: z.string(),
  displayName: z.string().default(''),
  photoURL: z.string().nullish().transform(value => value ?? ''),
  phone: z.string().default(''),
  role: memberRoleSchema.default(0),
  /** Liberado por um admin. Enquanto false, o app só mostra a tela de espera. */
  approved: z.boolean().default(false),
  bio: z.string().default(''),
  company: companySchema.default({
    name: '',
    segment: '',
    position: '',
    site: '',
    revenueRange: '',
    headcount: '',
    city: '',
  }),
  /** O que este membro entrega — insumo do cruzamento de negócios. */
  offers: z.array(z.string()).default([]),
  /** O que este membro procura — o outro lado do mesmo cruzamento. */
  needs: z.array(z.string()).default([]),
  linkedin: z.string().default(''),
  instagram: z.string().default(''),
  /** Liberdade de consulta: opt-out do cruzamento por IA. */
  aiOptOut: z.boolean().default(false),
  createdAt: z.number().nullable().default(null),
  updatedAt: z.number().nullable().default(null),
});

export type Company = z.infer<typeof companySchema>;
export type Member = z.infer<typeof memberSchema>;

export type MemberFormInput = Pick<
  Member,
  'displayName' | 'phone' | 'bio' | 'company' | 'offers' | 'needs' | 'linkedin' | 'instagram' | 'aiOptOut'
>;

export function isAdminRole(role: MemberRoleValue | undefined): boolean {
  return (role ?? 0) >= MEMBER_ROLE.Admin;
}

/** Membro liberado: aprovado por um admin E com papel de membro ou acima. */
export function isActiveMember(member: Member | null): boolean {
  return Boolean(member?.approved && member.role >= MEMBER_ROLE.Membro);
}
