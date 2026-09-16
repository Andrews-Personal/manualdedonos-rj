import type { AppEvent } from '@/types/event-type';
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { toast } from 'sonner';

import { EventForm } from '@/components/admin/event-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { formatShortDate, formatTime } from '@/helpers/date';
import { friendlyError } from '@/helpers/errors';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { eventService } from '@/services/event.service';

export function EventsPanel() {
  const { data, loading, error, reload } = useAsyncResource(() => eventService.listEvents());
  const [editing, setEditing] = useState<AppEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const openForm = (target: AppEvent | null) => {
    setEditing(target);
    setFormOpen(true);
  };

  const handleDelete = async (event: AppEvent) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Excluir "${event.title}"? As confirmações de presença deste encontro deixam de aparecer.`))
      return;

    try {
      await eventService.deleteEvent(event.id);
      toast.success('Encontro excluído.');
      reload();
    }
    catch (caught) {
      toast.error(friendlyError(caught, 'Não foi possível excluir o encontro.'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm(null)}>
          <CalendarPlus className="h-4 w-4" />
          Novo encontro
        </Button>
      </div>

      {loading && <Spinner label="Carregando encontros…" />}
      {!loading && error && <ResourceError onRetry={reload} />}

      {!loading && !error && (data?.length ?? 0) === 0 && (
        <EmptyState title="Nenhum encontro cadastrado" description="Publique o primeiro módulo da turma." />
      )}

      {!loading && !error && (data ?? []).map(event => (
        <Card key={event.id}>
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone={event.status === 'cancelado' ? 'danger' : event.status === 'realizado' ? 'neutral' : 'brand'}>
                  {event.status}
                </Badge>
                {event.topic && <Badge tone="gold">{event.topic}</Badge>}
              </div>
              <h3 className="truncate text-sm font-semibold">{event.title}</h3>
              <p className="text-muted text-xs">
                {formatShortDate(event.startsAt)}
                {' às '}
                {formatTime(event.startsAt)}
                {event.location.name && ` · ${event.location.name}`}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={() => openForm(event)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(event)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <EventForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={reload} event={editing} />
    </div>
  );
}
