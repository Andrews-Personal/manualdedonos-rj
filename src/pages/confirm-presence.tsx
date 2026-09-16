import { CalendarCheck, CalendarDays, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { RsvpPanel } from '@/components/agenda/rsvp-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { formatFullDate, formatTimeRange } from '@/helpers/date';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { eventDetailsPath, routes } from '@/routes/routes';
import { eventService } from '@/services/event.service';
import { rsvpService } from '@/services/rsvp.service';

/**
 * Tela dedicada ao próximo encontro.
 *
 * Existe separada da agenda porque é a ação mais frequente do membro: abrir o
 * app na véspera e dizer se vai. Não deve custar dois cliques e um scroll até
 * achar qual é o próximo da lista.
 */
export function ConfirmPresence() {
  const navigate = useNavigate();
  const upcoming = useAsyncResource(() => eventService.listUpcoming(5));

  const next = upcoming.data?.[0] ?? null;
  const others = (upcoming.data ?? []).slice(1);

  const rsvps = useAsyncResource(
    () => (next ? rsvpService.listByEvent(next.id) : Promise.resolve([])),
    [next?.id],
  );

  if (upcoming.loading)
    return <Spinner label="Buscando o próximo encontro…" />;

  if (upcoming.error)
    return <ResourceError onRetry={upcoming.reload} />;

  if (!next) {
    return (
      <div>
        <PageHeader title="Confirmar presença" />
        <EmptyState
          icon={CalendarDays}
          title="Nenhum encontro agendado"
          description="Assim que a organização publicar a próxima data, a confirmação abre por aqui."
          action={(
            <Button variant="outline" onClick={() => navigate(routes.agenda.path)}>
              Ver a agenda
            </Button>
          )}
        />
      </div>
    );
  }

  const summary = rsvps.data ? rsvpService.summarize(rsvps.data) : null;

  return (
    <div>
      <PageHeader
        title="Confirmar presença"
        description="Sua resposta define quantos lugares o anfitrião prepara. Dá para mudar até o dia do encontro."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <Badge tone="brand" className="w-fit">
                <CalendarCheck className="h-3 w-3" />
                Próximo encontro
              </Badge>
              <CardTitle className="mt-2 text-xl">{next.title}</CardTitle>
              {next.topic && <p className="text-muted text-sm">{next.topic}</p>}
            </CardHeader>

            <CardContent className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-sm capitalize">
                <CalendarDays className="h-4 w-4 text-gold-500" />
                {formatFullDate(next.startsAt)}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gold-500" />
                {formatTimeRange(next.startsAt, next.durationMinutes)}
              </p>
              {next.location.name && (
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gold-500" />
                  {[next.location.name, next.location.address].filter(Boolean).join(' — ')}
                </p>
              )}

              {summary && (
                <p className="text-muted mt-2 text-sm">
                  {summary.confirmados}
                  {' '}
                  {summary.confirmados === 1 ? 'membro confirmado' : 'membros confirmados'}
                  {summary.totalPessoas !== summary.confirmados && ` · ${summary.totalPessoas} pessoas na sala`}
                </p>
              )}

              <Button variant="outline" size="sm" className="w-fit" onClick={() => navigate(eventDetailsPath(next.id))}>
                Ver detalhes do encontro
              </Button>
            </CardContent>
          </Card>

          {others.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Próximos encontros</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {others.map(event => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => navigate(eventDetailsPath(event.id))}
                    className="flex flex-col rounded-lg px-3 py-2 text-left hover:bg-[var(--surface-sunken)]"
                  >
                    <span className="text-sm font-medium">{event.title}</span>
                    <span className="text-muted text-xs capitalize">{formatFullDate(event.startsAt)}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <aside>
          <RsvpPanel event={next} onSaved={rsvps.reload} />
        </aside>
      </div>
    </div>
  );
}
