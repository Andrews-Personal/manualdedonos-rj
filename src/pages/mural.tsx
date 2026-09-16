import { useMemo, useState } from 'react';

import { PhotoGrid } from '@/components/mural/photo-grid';
import { PhotoUpload } from '@/components/mural/photo-upload';
import { Select } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { ResourceError, Spinner } from '@/components/ui/states';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { eventService } from '@/services/event.service';
import { photoService } from '@/services/photo.service';

export function Mural() {
  const [eventFilter, setEventFilter] = useState('');
  const photos = useAsyncResource(() => photoService.listPhotos());
  const events = useAsyncResource(() => eventService.listEvents());

  const visible = useMemo(() => {
    const all = photos.data ?? [];
    return eventFilter ? all.filter(photo => photo.eventId === eventFilter) : all;
  }, [photos.data, eventFilter]);

  return (
    <div>
      <PageHeader
        title="Mural de fotos"
        description="O registro dos encontros da turma. Qualquer membro pode publicar; cada um pode remover as próprias fotos."
        actions={<PhotoUpload events={events.data ?? []} onUploaded={photos.reload} />}
      />

      {(events.data?.length ?? 0) > 0 && (
        <div className="mb-6 max-w-xs">
          <Select value={eventFilter} onChange={event => setEventFilter(event.target.value)}>
            <option value="">Todos os encontros</option>
            {(events.data ?? []).map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </Select>
        </div>
      )}

      {photos.loading && <Spinner label="Carregando o mural…" />}
      {!photos.loading && photos.error && <ResourceError onRetry={photos.reload} />}
      {!photos.loading && !photos.error && (
        <PhotoGrid
          photos={visible}
          onChanged={photos.reload}
          emptyMessage={eventFilter
            ? 'Nenhuma foto associada a este encontro ainda.'
            : 'Seja o primeiro a publicar uma foto de um encontro.'}
        />
      )}
    </div>
  );
}
