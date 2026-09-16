import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EventCard } from '@/components/agenda/event-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { isUpcoming } from '@/helpers/date';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { cn } from '@/lib/utils';
import { eventService } from '@/services/event.service';

type Filter = 'proximos' | 'realizados' | 'todos';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'proximos', label: 'Próximos' },
  { key: 'realizados', label: 'Já realizados' },
  { key: 'todos', label: 'Todos' },
];

export function Agenda() {
  const [filter, setFilter] = useState<Filter>('proximos');
  const { data: events, loading, error, reload } = useAsyncResource(() => eventService.listEvents());

  const visible = useMemo(() => {
    if (!events)
      return [];

    if (filter === 'todos')
      return events;

    if (filter === 'proximos') {
      return events.filter(event => event.status === 'agendado' && isUpcoming(event.startsAt));
    }

    // "Já realizados" inclui o que passou da data mesmo sem alguém ter trocado
    // o status na mão — é o que a agenda mostra na prática.
    return events
      .filter(event => event.status === 'realizado' || !isUpcoming(event.startsAt))
      .reverse();
  }, [events, filter]);

  return (
    <div>
      <PageHeader
        title="Agenda de encontros"
        description="Os próximos módulos da master class, com data, horário e local. Todos os horários são de Brasília."
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-[var(--surface-sunken)] p-1">
        {FILTERS.map(option => (
          <button
            key={option.key}
            type="button"
            onClick={() => setFilter(option.key)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              filter === option.key ? 'bg-[var(--surface-raised)] shadow-sm' : 'text-muted',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading && <Spinner label="Carregando a agenda…" />}

      {/* Erro antes de vazio: uma leitura que falhou não é "nenhum encontro". */}
      {!loading && error && <ResourceError onRetry={reload} />}

      {!loading && !error && visible.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum encontro nesta visão"
          description="Quando a organização publicar o próximo módulo, ele aparece aqui."
        />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
}
