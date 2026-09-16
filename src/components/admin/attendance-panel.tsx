import { Download, Users } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/field';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { formatShortDate } from '@/helpers/date';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { eventService } from '@/services/event.service';
import { rsvpService } from '@/services/rsvp.service';

const STATUS_TONE = {
  confirmado: 'success',
  talvez: 'warning',
  ausente: 'danger',
} as const;

/** Exporta a lista em CSV — é o formato que o anfitrião cola no controle da portaria. */
function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // BOM (U+FEFF) na frente do conteúdo: sem ele, o Excel em português abre o
  // CSV como Latin-1 e todo acento vira caractere quebrado.
  const bom = String.fromCharCode(0xFEFF);
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AttendancePanel() {
  const [eventId, setEventId] = useState('');
  const events = useAsyncResource(() => eventService.listEvents());
  const rsvps = useAsyncResource(
    () => (eventId ? rsvpService.listByEvent(eventId) : Promise.resolve([])),
    [eventId],
  );

  const selectedEvent = (events.data ?? []).find(event => event.id === eventId);
  const summary = rsvps.data ? rsvpService.summarize(rsvps.data) : null;

  const handleExport = () => {
    if (!selectedEvent || !rsvps.data)
      return;

    downloadCsv(
      `presencas-${formatShortDate(selectedEvent.startsAt).replace(/\s/g, '-')}.csv`,
      [
        ['Nome', 'Empresa', 'Resposta', 'Convidados', 'Observação'],
        ...rsvps.data.map(rsvp => [
          rsvp.memberName,
          rsvp.memberCompany,
          rsvp.status,
          String(rsvp.guests),
          rsvp.note,
        ]),
      ],
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-md">
        <Select value={eventId} onChange={event => setEventId(event.target.value)} aria-label="Escolher encontro">
          <option value="">Escolha um encontro…</option>
          {(events.data ?? []).map(event => (
            <option key={event.id} value={event.id}>
              {formatShortDate(event.startsAt)}
              {' — '}
              {event.title}
            </option>
          ))}
        </Select>
      </div>

      {events.error && <ResourceError onRetry={events.reload} />}

      {!eventId && (
        <EmptyState icon={Users} title="Selecione um encontro" description="A lista de presença aparece aqui." />
      )}

      {eventId && rsvps.loading && <Spinner label="Carregando confirmações…" />}
      {eventId && rsvps.error && <ResourceError onRetry={rsvps.reload} />}

      {eventId && !rsvps.loading && !rsvps.error && summary && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">
              {summary.confirmados}
              {' confirmados · '}
              {summary.totalPessoas}
              {' pessoas na sala'}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={(rsvps.data ?? []).length === 0}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </CardHeader>

          <CardContent>
            {(rsvps.data ?? []).length === 0
              ? <p className="text-muted text-sm">Ninguém respondeu ainda.</p>
              : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {(rsvps.data ?? []).map(rsvp => (
                      <li key={rsvp.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {rsvp.memberName}
                            {rsvp.guests > 0 && (
                              <span className="text-muted">
                                {' '}
                                +
                                {rsvp.guests}
                              </span>
                            )}
                          </p>
                          <p className="text-muted truncate text-xs">
                            {rsvp.memberCompany}
                            {rsvp.note && ` · ${rsvp.note}`}
                          </p>
                        </div>
                        <Badge tone={STATUS_TONE[rsvp.status]}>{rsvp.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
