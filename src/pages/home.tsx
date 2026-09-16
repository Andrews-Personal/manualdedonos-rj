import { ArrowRight, CalendarDays, Camera, Handshake, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { routes } from '@/routes/routes';

const PILLARS = [
  {
    icon: CalendarDays,
    title: 'Agenda dos encontros',
    description: 'Datas, local e tema de cada master class, sempre no horário de Brasília.',
  },
  {
    icon: Handshake,
    title: 'Confirmação de presença',
    description: 'Um clique confirma sua vaga e diz ao anfitrião quantos lugares preparar.',
  },
  {
    icon: Camera,
    title: 'Mural de fotos',
    description: 'O registro de cada encontro, reunido em um único lugar.',
  },
  {
    icon: Sparkles,
    title: 'Conexões com IA',
    description: 'O Gemini cruza os perfis do grupo e aponta negócios possíveis entre membros.',
  },
  {
    icon: Users,
    title: 'Vitrine de serviços',
    description: 'O que cada empresa entrega e a condição especial para quem é da turma.',
  },
];

export function Home() {
  const { isAuthenticated, isActiveMember, isAdmin } = useUser();
  const navigate = useNavigate();
  const entryPath = isActiveMember || isAdmin
    ? routes.agenda.path
    : isAuthenticated ? routes.pendingApproval.path : routes.login.path;

  return (
    <div className="flex flex-col gap-12 py-6">
      <section className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-700 dark:text-gold-300">
          Master class · Rio de Janeiro
        </span>

        <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Manual de Donos
          <span className="block text-gold-600 dark:text-gold-400">Empresários do Rio</span>
        </h1>

        <p className="text-muted max-w-2xl text-base sm:text-lg">
          A área privada da turma: agenda dos encontros, confirmação de presença,
          registro em fotos, vitrine de serviços entre os membros e o cruzamento
          de oportunidades de negócio feito por IA.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => navigate(entryPath)}>
            {isAuthenticated ? 'Ir para a área de membros' : 'Entrar na área de membros'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map(pillar => (
          <Card key={pillar.title}>
            <CardContent className="flex flex-col gap-3 pt-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-sunken)] text-gold-600 dark:text-gold-400">
                <pillar.icon className="h-5 w-5" />
              </span>
              <h2 className="text-base font-semibold">{pillar.title}</h2>
              <p className="text-muted text-sm">{pillar.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="surface-card rounded-2xl p-6 sm:p-10">
        <h2 className="text-xl font-semibold">Acesso restrito aos participantes</h2>
        <p className="text-muted mt-2 max-w-2xl text-sm">
          O conteúdo desta área — contatos, fotos dos encontros e dados das
          empresas — é visível apenas para quem faz parte da turma. Cadastre-se
          com o e-mail que você usou na inscrição; a organização libera o acesso
          manualmente.
        </p>
      </section>
    </div>
  );
}
