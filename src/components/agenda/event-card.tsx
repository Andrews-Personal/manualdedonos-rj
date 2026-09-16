import type { AppEvent } from '@/types/event-type';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatFullDate, formatTimeRange, isUpcoming } from '@/helpers/date';
import { eventDetailsPath } from '@/routes/routes';

const STATUS_TONE = {
  agendado: 'brand',
  realizado: 'neutral',
  cancelado: 'danger',
} as const;

export function EventCard({ event }: { event: AppEvent }) {
  const navigate = useNavigate();
  const upcoming = event.status === 'agendado' && isUpcoming(event.startsAt);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(eventDetailsPath(event.id))}
    >
      {event.coverUrl && (
        <img
          src={event.coverUrl}
          alt=""
          className="h-40 w-full rounded-t-xl object-cover"
          loading="lazy"
        />
      )}

      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[event.status]}>
            {event.status === 'agendado' && upcoming ? 'Próximo' : event.status}
          </Badge>
          {event.topic && <Badge tone="gold">{event.topic}</Badge>}
        </div>

        <h3 className="text-base font-semibold leading-snug">{event.title}</h3>

        <ul className="text-muted flex flex-col gap-1.5 text-sm">
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="capitalize">{formatFullDate(event.startsAt)}</span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            {formatTimeRange(event.startsAt, event.durationMinutes)}
          </li>
          {event.location.name && (
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="line-clamp-1">{event.location.name}</span>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
