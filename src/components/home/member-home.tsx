import { Building2, CalendarDays, Camera } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { CompanyExplorer } from '@/components/home/company-explorer';
import { EventPhotoCarousel } from '@/components/home/event-photo-carousel';
import { NextEventHighlight } from '@/components/home/next-event-highlight';
import { Button } from '@/components/ui/button';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { formatShortDate } from '@/helpers/date';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { eventDetailsPath, routes } from '@/routes/routes';
import { eventService } from '@/services/event.service';
import { memberService } from '@/services/member.service';
import { photoService } from '@/services/photo.service';

/** Fotos na faixa do último encontro. O mural inteiro fica no /mural. */
const CAROUSEL_LIMIT = 12;

/**
 * A tela inicial de quem já é da turma: o próximo encontro, o último encontro
 * em fotos e as empresas do grupo.
 *
 * Fica separada da apresentação pública porque nada aqui é legível sem estar
 * liberado — as regras do Firestore recusam a leitura de `events`, `photos` e
 * `members` para quem não é membro aprovado. Renderizar estes blocos para um
 * visitante não vazaria dado; renderizaria três erros de permissão.
 */
export function MemberHome() {
  const navigate = useNavigate();

  const nextEvent = useAsyncResource(() => eventService.getNextEvent());
  const lastEvent = useAsyncResource(() => eventService.getLastHeldEvent());
  const members = useAsyncResource(() => memberService.listMembers());

  // Só depois de saber qual foi o último encontro dá para pedir as fotos
  // dele; enquanto isso a leitura resolve vazia e refaz quando o id chega.
  const photos = useAsyncResource(
    () => (lastEvent.data ? photoService.listByEvent(lastEvent.data.id) : Promise.resolve([])),
    [lastEvent.data?.id],
  );

  const photosLoading = lastEvent.loading || photos.loading;
  const photosError = lastEvent.error ?? photos.error;

  return (
    <div className="flex flex-col gap-12">
      <Section
        title="Próximo encontro"
        action={(
          <Link to={routes.agenda.path} className="eyebrow text-accent underline underline-offset-4">
            Ver a agenda
          </Link>
        )}
      >
        {nextEvent.loading && <Spinner label="Buscando o próximo encontro…" />}

        {/* Erro antes de vazio: uma leitura que caiu não é "nenhum encontro
            marcado" — uma pede tentar de novo, a outra pede esperar. */}
        {!nextEvent.loading && nextEvent.error && (
          <ResourceError message="Não foi possível carregar o próximo encontro." onRetry={nextEvent.reload} />
        )}

        {!nextEvent.loading && !nextEvent.error && !nextEvent.data && (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum encontro agendado"
            description="Assim que a organização publicar a próxima data, ela aparece aqui."
            action={(
              <Button variant="outline" onClick={() => navigate(routes.agenda.path)}>
                Ver os encontros anteriores
              </Button>
            )}
          />
        )}

        {!nextEvent.loading && !nextEvent.error && nextEvent.data && (
          <NextEventHighlight event={nextEvent.data} />
        )}
      </Section>

      <Section
        title="Último encontro"
        description={lastEvent.data
          ? `${lastEvent.data.title} · ${formatShortDate(lastEvent.data.startsAt)}`
          : undefined}
        action={(
          <Link to={routes.mural.path} className="eyebrow text-accent underline underline-offset-4">
            Ver o mural
          </Link>
        )}
      >
        {photosLoading && <Spinner label="Carregando as fotos…" />}

        {!photosLoading && photosError && (
          <ResourceError
            message="Não foi possível carregar as fotos do último encontro."
            onRetry={lastEvent.error ? lastEvent.reload : photos.reload}
          />
        )}

        {!photosLoading && !photosError && !lastEvent.data && (
          <EmptyState
            icon={Camera}
            title="O primeiro encontro ainda está por vir"
            description="Quando a turma se encontrar, as fotos do dia ficam por aqui."
          />
        )}

        {!photosLoading && !photosError && lastEvent.data && photos.data && photos.data.length === 0 && (
          <EmptyState
            icon={Camera}
            title="Sem fotos deste encontro"
            description="Ninguém publicou o registro do último encontro ainda. Se você tirou fotos, suba para a turma."
            action={(
              <Button variant="accent" onClick={() => navigate(routes.mural.path)}>
                Publicar no mural
              </Button>
            )}
          />
        )}

        {!photosLoading && !photosError && lastEvent.data && photos.data && photos.data.length > 0 && (
          <EventPhotoCarousel
            // Remontar ao trocar de encontro zera a rolagem e remede as bordas.
            key={lastEvent.data.id}
            photos={photos.data.slice(0, CAROUSEL_LIMIT)}
            detailsPath={eventDetailsPath(lastEvent.data.id)}
            label={`Fotos do encontro ${lastEvent.data.title}`}
          />
        )}
      </Section>

      <Section
        title="Empresas da turma"
        description="Procure por empresa, mercado ou qualquer palavra que alguém tenha escrito sobre o próprio negócio."
      >
        {members.loading && <Spinner label="Carregando as empresas…" />}

        {!members.loading && members.error && (
          <ResourceError message="Não foi possível carregar as empresas da turma." onRetry={members.reload} />
        )}

        {!members.loading && !members.error && (members.data?.length ?? 0) === 0 && (
          <EmptyState
            icon={Building2}
            title="Nenhuma empresa liberada ainda"
            description="Os perfis aparecem aqui conforme a organização libera os cadastros."
          />
        )}

        {!members.loading && !members.error && (members.data?.length ?? 0) > 0 && (
          <CompanyExplorer members={members.data ?? []} />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="display-type accent-rule text-2xl sm:text-3xl">{title}</h2>
          {description && <p className="text-muted mt-3 max-w-2xl text-sm">{description}</p>}
        </div>
        {action}
      </div>

      {children}
    </section>
  );
}
