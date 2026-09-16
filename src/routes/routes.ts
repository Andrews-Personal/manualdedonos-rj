/**
 * Catálogo único de rotas.
 *
 * Caminho e rótulo no mesmo lugar porque o menu, o título da página e o
 * `<Route>` leem daqui — mudar um caminho em três arquivos diferentes é como
 * um link do menu acaba apontando para uma tela que não existe mais.
 */
type AppRoute = {
  label: string;
  path: string;
};

export const routes = {
  home: { label: 'Início', path: '/' },
  login: { label: 'Entrar', path: '/entrar' },
  pendingApproval: { label: 'Cadastro em análise', path: '/aguardando-liberacao' },
  agenda: { label: 'Agenda', path: '/agenda' },
  eventDetails: { label: 'Encontro', path: '/agenda/:eventId' },
  confirmPresence: { label: 'Confirmar presença', path: '/confirmar-presenca' },
  mural: { label: 'Mural de fotos', path: '/mural' },
  showcase: { label: 'Vitrine de serviços', path: '/vitrine' },
  connections: { label: 'Conexões (IA)', path: '/conexoes' },
  members: { label: 'Membros', path: '/membros' },
  profile: { label: 'Meu perfil', path: '/perfil' },
  admin: { label: 'Administração', path: '/admin' },
} as const satisfies Record<string, AppRoute>;

export type RouteKey = keyof typeof routes;

/** Monta o caminho do detalhe de um encontro. */
export function eventDetailsPath(eventId: string): string {
  return routes.eventDetails.path.replace(':eventId', eventId);
}

/** Itens do menu principal, na ordem em que aparecem. */
export const MAIN_NAV: RouteKey[] = [
  'agenda',
  'confirmPresence',
  'mural',
  'showcase',
  'connections',
  'members',
];
