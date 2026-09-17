import { ArrowRight, CalendarDays, Camera, Handshake, Sparkles, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { MemberHome } from '@/components/home/member-home';
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

/**
 * Duas telas iniciais no mesmo caminho.
 *
 * Para quem ainda não foi liberado, a apresentação da master class — é a única
 * coisa que existe para mostrar, já que o conteúdo do grupo é privado por
 * regra do Firestore. Para quem é da turma, o painel do encontro: próximo
 * encontro, últimas fotos e as empresas do grupo.
 */
export function Home() {
  const { isAuthenticated, isActiveMember, isAdmin, member } = useUser();
  const navigate = useNavigate();

  const memberView = isActiveMember || isAdmin;
  const firstName = member?.displayName.trim().split(/\s+/)[0] ?? '';

  const entryPath = memberView
    ? routes.agenda.path
    : isAuthenticated ? routes.pendingApproval.path : routes.login.path;

  return (
    <div className="flex flex-col gap-12 py-6">
      {memberView
        ? (
            // Cabeçalho curto: quem já está dentro veio para o painel, não para
            // a apresentação — o discurso de venda empurraria o próximo
            // encontro para baixo da dobra.
            <section className="flex flex-col gap-2 pt-2">
              <span className="eyebrow text-accent">Master class · Rio de Janeiro</span>
              <h1 className="display-type text-4xl leading-[0.9] sm:text-5xl">
                {firstName ? `Bom te ver, ${firstName}` : 'Manual de Donos'}
              </h1>
              <p className="text-muted max-w-2xl text-sm">
                O que está acontecendo na turma agora.
              </p>
            </section>
          )
        : (
            <section className="flex flex-col items-start gap-6 pt-2">
              <span className="eyebrow rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-[var(--accent-contrast)]">
                Master class · Rio de Janeiro
              </span>

              {/* Nome empilhado, uma palavra por linha, como o cartaz: a quebra é
                  parte do desenho, não consequência da largura da tela. */}
              <h1 className="display-type max-w-4xl text-5xl leading-[0.88] sm:text-7xl">
                <span className="block">Manual</span>
                <span className="block">de Donos</span>
                <span className="mt-3 block text-2xl text-[var(--accent)] sm:text-4xl">
                  Empresários do Rio
                </span>
              </h1>

              <p className="text-muted max-w-2xl text-base sm:text-lg">
                A área privada da turma: agenda dos encontros, confirmação de presença,
                registro em fotos, vitrine de serviços entre os membros e o cruzamento
                de oportunidades de negócio feito por IA.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button size="lg" variant="accent" onClick={() => navigate(entryPath)}>
                  {isAuthenticated ? 'Ir para a área de membros' : 'Entrar na área de membros'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </section>
          )}

      {memberView
        ? <MemberHome />
        : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {PILLARS.map(pillar => (
                  <Card key={pillar.title}>
                    <CardContent className="flex flex-col gap-3 pt-5">
                      <span className="text-accent flex h-10 w-10 items-center justify-center rounded-md bg-[var(--surface-sunken)]">
                        <pillar.icon className="h-5 w-5" />
                      </span>
                      <h2 className="display-type text-lg">{pillar.title}</h2>
                      <p className="text-muted text-sm">{pillar.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </section>

              <section className="surface-card rounded-2xl p-6 sm:p-10">
                <h2 className="display-type accent-rule text-2xl sm:text-3xl">Acesso restrito aos participantes</h2>
                <p className="text-muted mt-4 max-w-2xl text-sm">
                  O conteúdo desta área (contatos, fotos dos encontros e dados das
                  empresas) é visível apenas para quem faz parte da turma. Cadastre-se
                  com o e-mail que você usou na inscrição; a organização libera o acesso
                  manualmente.
                </p>
              </section>
            </>
          )}
    </div>
  );
}
