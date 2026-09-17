import { ArrowLeft, CalendarDays, Clock, MapPin, Mic2, Users } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { RsvpPanel } from '@/components/agenda/rsvp-panel';
import { PhotoGrid } from '@/components/mural/photo-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { formatFullDate, formatTimeRange } from '@/helpers/date';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useUser } from '@/hooks/use-user';
import { routes } from '@/routes/routes';
import { eventService } from '@/services/event.service';
import { photoService } from '@/services/photo.service';
import { rsvpService } from '@/services/rsvp.service';

export function EventDetails() {
  const { eventId = '' } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUser();

  const event = useAsyncResource(() => eventService.getEvent(eventId), [eventId]);
  const rsvps = useAsyncResource(() => rsvpService.listByEvent(eventId), [eventId]);
  const photos = useAsyncResource(() => photoService.listByEvent(eventId), [eventId]);

  const reloadRsvps = useCallback(() => rsvps.reload(), [rsvps]);

  if (event.loading)
    return <Spinner label="Carregando o encontro…" />;

  if (event.error)
    return <ResourceError onRetry={event.reload} />;

  if (!event.data)
    return <EmptyState icon={CalendarDays} title="Encontro não encontrado" description="Este endereço não corresponde a nenhum encontro da agenda." />;

  const current = event.data;
  const summary = rsvps.data ? rsvpService.summarize(rsvps.data) : null;

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => navigate(routes.agenda.path)}>
        <ArrowLeft className="h-4 w-4" />
        Voltar para a agenda
      </Button>

      {current.coverUrl && (
        <img src={current.coverUrl} alt="" className="h-56 w-full rounded-xl object-cover sm:h-72" />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone={current.status === 'cancelado' ? 'danger' : 'brand'}>{current.status}</Badge>
              {current.topic && <Badge tone="accent">{current.topic}</Badge>}
            </div>
            <h1 className="display-type text-3xl sm:text-4xl">{current.title}</h1>
            {current.description && (
              <p className="text-muted mt-3 whitespace-pre-line text-sm leading-relaxed">{current.description}</p>
            )}
          </div>

          <Card>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
              <Detail icon={CalendarDays} label="Data" value={formatFullDate(current.startsAt)} capitalize />
              <Detail icon={Clock} label="Horário" value={formatTimeRange(current.startsAt, current.durationMinutes)} />
              {current.location.name && (
                <Detail
                  icon={MapPin}
                  label="Local"
                  value={[current.location.name, current.location.address].filter(Boolean).join(', ')}
                  href={current.location.mapsUrl || undefined}
                />
              )}
              {current.speaker && <Detail icon={Mic2} label="Condução" value={current.speaker} />}
            </CardContent>
          </Card>

          <section>
            <h2 className="display-type mb-3 text-xl">Fotos deste encontro</h2>
            {photos.loading && <Spinner label="Carregando fotos…" />}
            {!photos.loading && photos.error && <ResourceError onRetry={photos.reload} />}
            {!photos.loading && !photos.error && (
              <PhotoGrid photos={photos.data ?? []} onChanged={photos.reload} emptyMessage="Ainda não há fotos deste encontro." />
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <RsvpPanel event={current} onSaved={reloadRsvps} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="text-accent h-4 w-4" />
                Confirmações
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {rsvps.loading && <span className="text-muted text-sm">Carregando…</span>}
              {rsvps.error && <span className="text-muted text-sm">Não foi possível carregar a lista.</span>}

              {summary && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Stat label="Confirmados" value={summary.confirmados} />
                    <Stat label="Talvez" value={summary.talvez} />
                    <Stat label="Na sala" value={summary.totalPessoas} />
                  </div>

                  <ul className="flex flex-col gap-1.5">
                    {(rsvps.data ?? [])
                      .filter(rsvp => rsvp.status === 'confirmado')
                      .map(rsvp => (
                        <li key={rsvp.id} className="text-sm">
                          {rsvp.memberName}
                          {rsvp.guests > 0 && (
                            <span className="text-muted">
                              {' '}
                              +
                              {rsvp.guests}
                            </span>
                          )}
                          {rsvp.memberCompany && (
                            <span className="text-muted">
                              {' '}
                              ·
                              {rsvp.memberCompany}
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>

                  {isAdmin && summary.confirmados === 0 && (
                    <p className="text-muted text-xs">Nenhuma confirmação até agora.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  href,
  capitalize = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="text-accent mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-muted text-xs uppercase tracking-wide">{label}</p>
        {href
          ? (
              <a href={href} target="_blank" rel="noreferrer" className="text-sm underline">
                {value}
              </a>
            )
          : <p className={capitalize ? 'text-sm capitalize' : 'text-sm'}>{value}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--surface-sunken)] px-2 py-3">
      <p className="display-type text-2xl">{value}</p>
      <p className="text-muted text-[11px] uppercase tracking-wide">{label}</p>
    </div>
  );
}
