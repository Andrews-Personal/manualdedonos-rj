import type { AppEvent, EventFormInput, EventStatus } from '@/types/event-type';
import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FormField, Input, Select, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { fromStartsAt, toStartsAt } from '@/helpers/date';
import { friendlyError } from '@/helpers/errors';
import { eventService } from '@/services/event.service';
import { EVENT_STATUS } from '@/types/event-type';

type Draft = Omit<EventFormInput, 'startsAt'> & { date: string; time: string };

function draftFrom(event: AppEvent | null): Draft {
  const { date, time } = event
    ? fromStartsAt(event.startsAt)
    : { date: '', time: '19:00' };

  return {
    title: event?.title ?? '',
    description: event?.description ?? '',
    date,
    time,
    durationMinutes: event?.durationMinutes ?? 120,
    location: event?.location ?? { name: '', address: '', mapsUrl: '' },
    topic: event?.topic ?? '',
    speaker: event?.speaker ?? '',
    coverUrl: event?.coverUrl ?? '',
    capacity: event?.capacity ?? null,
    status: event?.status ?? 'agendado',
  };
}

export function EventForm({
  open,
  onClose,
  onSaved,
  event,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  event: AppEvent | null;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(event));
  const [saving, setSaving] = useState(false);
  const [lastEventId, setLastEventId] = useState(event?.id ?? '');

  if ((event?.id ?? '') !== lastEventId) {
    setLastEventId(event?.id ?? '');
    setDraft(draftFrom(event));
  }

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(current => ({ ...current, [key]: value }));

  const handleSubmit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault();

    if (!draft.title.trim() || !draft.date) {
      toast.error('Título e data são obrigatórios.');
      return;
    }

    setSaving(true);

    const { date, time, ...rest } = draft;
    // A data sai do formulário como dois campos e entra no Firestore como UM
    // instante com o offset de Brasília — a conversão acontece só aqui.
    const payload: EventFormInput = { ...rest, startsAt: toStartsAt(date, time) };

    try {
      if (event)
        await eventService.updateEvent(event.id, payload);
      else
        await eventService.createEvent(payload);

      toast.success(event ? 'Encontro atualizado.' : 'Encontro publicado na agenda.');
      onSaved();
      onClose();
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível salvar o encontro.'));
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={event ? 'Editar encontro' : 'Novo encontro'}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField label="Título" htmlFor="title">
          <Input id="title" value={draft.title} onChange={e => update('title', e.target.value)} required />
        </FormField>

        <FormField label="Tema / módulo" htmlFor="topic">
          <Input id="topic" value={draft.topic} onChange={e => update('topic', e.target.value)} placeholder="Ex.: Gestão de Caixa (Módulo 3)" />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Data" htmlFor="date">
            <Input id="date" type="date" value={draft.date} onChange={e => update('date', e.target.value)} required />
          </FormField>

          <FormField label="Início" htmlFor="time">
            <Input id="time" type="time" value={draft.time} onChange={e => update('time', e.target.value)} required />
          </FormField>

          <FormField label="Duração (min)" htmlFor="duration">
            <Input
              id="duration"
              type="number"
              min={15}
              step={15}
              value={draft.durationMinutes}
              onChange={e => update('durationMinutes', Number(e.target.value) || 120)}
            />
          </FormField>
        </div>

        <FormField label="Descrição" htmlFor="description">
          <Textarea id="description" value={draft.description} onChange={e => update('description', e.target.value)} rows={4} />
        </FormField>

        <FormField label="Local" htmlFor="locationName">
          <Input
            id="locationName"
            value={draft.location.name}
            onChange={e => update('location', { ...draft.location, name: e.target.value })}
            placeholder="Ex.: Sede do grupo (Botafogo)"
          />
        </FormField>

        <FormField label="Endereço" htmlFor="address">
          <Input
            id="address"
            value={draft.location.address}
            onChange={e => update('location', { ...draft.location, address: e.target.value })}
          />
        </FormField>

        <FormField label="Link do Google Maps" htmlFor="mapsUrl">
          <Input
            id="mapsUrl"
            value={draft.location.mapsUrl}
            onChange={e => update('location', { ...draft.location, mapsUrl: e.target.value })}
            placeholder="https://maps.app.goo.gl/…"
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Condução / palestrante" htmlFor="speaker">
            <Input id="speaker" value={draft.speaker} onChange={e => update('speaker', e.target.value)} />
          </FormField>

          <FormField label="Capacidade" htmlFor="capacity" hint="Deixe vazio se não houver limite.">
            <Input
              id="capacity"
              type="number"
              min={1}
              value={draft.capacity ?? ''}
              onChange={e => update('capacity', e.target.value ? Number(e.target.value) : null)}
            />
          </FormField>
        </div>

        <FormField label="URL da imagem de capa" htmlFor="coverUrl">
          <Input id="coverUrl" value={draft.coverUrl} onChange={e => update('coverUrl', e.target.value)} placeholder="https://" />
        </FormField>

        <FormField label="Situação" htmlFor="status">
          <Select id="status" value={draft.status} onChange={e => update('status', e.target.value as EventStatus)}>
            {EVENT_STATUS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </Select>
        </FormField>

        <Button type="submit" loading={saving} size="lg">
          {event ? 'Salvar alterações' : 'Publicar encontro'}
        </Button>
      </form>
    </Modal>
  );
}
