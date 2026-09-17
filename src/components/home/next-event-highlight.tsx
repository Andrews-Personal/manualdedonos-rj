import type { AppEvent } from '@/types/event-type';

import { ArrowRight, CalendarCheck, CalendarDays, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatFullDate, formatRelative, formatTimeRange } from '@/helpers/date';
import { eventDetailsPath, routes } from '@/routes/routes';

/**
 * O próximo encontro, em destaque na tela inicial.
 *
 * Mostra data, hora e local já no fuso de Brasília e leva direto para a
 * confirmação de presença: é a ação que o membro abre o app para fazer, e ela
 * não deve custar um clique no menu e um scroll até achar qual é o próximo da
 * agenda.
 */
export function NextEventHighlight({ event }: { event: AppEvent }) {
  const navigate = useNavigate();
  const address = [event.location.name, event.location.address].filter(Boolean).join(', ');

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[1.35fr_1fr]">
        <CardContent className="flex flex-col gap-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">
              <CalendarCheck className="h-3 w-3" />
              Próximo encontro
            </Badge>
            <span className="text-muted text-xs">{formatRelative(event.startsAt)}</span>
          </div>

          <div>
            <h3 className="display-type text-2xl leading-[0.95] sm:text-3xl">{event.title}</h3>
            {event.topic && <p className="text-accent mt-2 text-sm font-bold">{event.topic}</p>}
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-center gap-2">
              <CalendarDays className="text-accent h-4 w-4 shrink-0" />
              <span className="first-letter:uppercase">{formatFullDate(event.startsAt)}</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="text-accent h-4 w-4 shrink-0" />
              {formatTimeRange(event.startsAt, event.durationMinutes)}
            </li>
            {address && (
              <li className="flex items-start gap-2">
                <MapPin className="text-accent mt-0.5 h-4 w-4 shrink-0" />
                <span>{address}</span>
              </li>
            )}
          </ul>

          {event.description && <p className="text-muted line-clamp-3 text-sm">{event.description}</p>}

          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <Button variant="accent" onClick={() => navigate(routes.confirmPresence.path)}>
              Confirmar presença
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate(eventDetailsPath(event.id))}>
              Ver detalhes
            </Button>
          </div>
        </CardContent>

        {/* A capa só entra onde há largura para ela: no celular a coluna de
            texto já ocupa a tela, e a imagem empurraria a confirmação de
            presença para baixo da dobra. */}
        {event.coverUrl && (
          <img
            src={event.coverUrl}
            alt=""
            className="hidden h-full min-h-56 w-full object-cover md:block"
            loading="lazy"
          />
        )}
      </div>
    </Card>
  );
}
