import type { Photo } from '@/types/photo-type';
import { Camera, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { formatRelative } from '@/helpers/date';
import { friendlyError } from '@/helpers/errors';
import { useUser } from '@/hooks/use-user';
import { photoService } from '@/services/photo.service';

export function PhotoGrid({
  photos,
  onChanged,
  emptyMessage = 'O mural ainda está vazio.',
}: {
  photos: Photo[];
  onChanged: () => void;
  emptyMessage?: string;
}) {
  const { member, isAdmin } = useUser();
  const [preview, setPreview] = useState<Photo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="Sem fotos por aqui"
        description={emptyMessage}
      />
    );
  }

  const canDelete = (photo: Photo) => isAdmin || photo.uploadedBy === member?.uid;

  const handleDelete = async (photo: Photo) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Remover esta foto do mural? A ação não pode ser desfeita.'))
      return;

    setDeletingId(photo.id);

    try {
      await photoService.deletePhoto(photo);
      toast.success('Foto removida.');
      setPreview(null);
      onChanged();
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível remover a foto.'));
    }
    finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map(photo => (
          <figure key={photo.id} className="surface-card group relative overflow-hidden rounded-xl">
            <button type="button" onClick={() => setPreview(photo)} className="block w-full">
              <img
                src={photo.downloadUrl}
                alt={photo.caption || 'Foto do encontro'}
                className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </button>

            {(photo.caption || photo.uploadedByName) && (
              <figcaption className="px-3 py-2">
                {photo.caption && <p className="line-clamp-2 text-xs">{photo.caption}</p>}
                <p className="text-muted mt-0.5 text-[11px]">
                  {photo.uploadedByName}
                  {photo.createdAt ? ` · ${formatRelative(photo.createdAt)}` : ''}
                </p>
              </figcaption>
            )}

            {canDelete(photo) && (
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                disabled={deletingId === photo.id}
                className="absolute right-2 top-2 rounded-md bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                aria-label="Remover foto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </figure>
        ))}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            onClick={() => setPreview(null)}
            className="absolute right-4 top-4 rounded-md bg-white/10 p-2 text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <figure className="max-h-full max-w-4xl" onClick={event => event.stopPropagation()}>
            <img src={preview.downloadUrl} alt={preview.caption || ''} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            <figcaption className="mt-3 text-center text-sm text-white/90">
              {preview.caption}
              <span className="block text-xs text-white/60">
                {preview.eventTitle ? `${preview.eventTitle} · ` : ''}
                {preview.uploadedByName}
              </span>
            </figcaption>

            {canDelete(preview) && (
              <div className="mt-4 flex justify-center">
                <Button variant="danger" size="sm" onClick={() => handleDelete(preview)} loading={deletingId === preview.id}>
                  <Trash2 className="h-4 w-4" />
                  Remover do mural
                </Button>
              </div>
            )}
          </figure>
        </div>
      )}
    </>
  );
}
