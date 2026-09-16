import type { AppEvent } from '@/types/event-type';
import { ImagePlus, Upload } from 'lucide-react';
import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FormField, Input, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { useUser } from '@/hooks/use-user';
import { photoService } from '@/services/photo.service';

/** Acima disso, a compressão do cliente já não salva o upload em rede móvel. */
const MAX_FILE_MB = 25;
const MAX_FILES = 12;

export function PhotoUpload({
  events,
  onUploaded,
}: {
  events: AppEvent[];
  onUploaded: () => void;
}) {
  const { member } = useUser();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [eventId, setEventId] = useState('');
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  if (!member)
    return null;

  const handleSelect = (selected: FileList | null) => {
    if (!selected)
      return;

    const chosen = Array.from(selected).slice(0, MAX_FILES);

    // Valida TUDO antes de subir qualquer coisa: melhor recusar o lote inteiro
    // do que deixar metade das fotos no mural e a outra metade num erro.
    const tooLarge = chosen.find(file => file.size > MAX_FILE_MB * 1024 * 1024);
    if (tooLarge) {
      toast.error(`"${tooLarge.name}" passa de ${MAX_FILE_MB} MB. Reduza a foto e tente de novo.`);
      return;
    }

    const notImage = chosen.find(file => !file.type.startsWith('image/'));
    if (notImage) {
      toast.error(`"${notImage.name}" não é uma imagem.`);
      return;
    }

    setFiles(chosen);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Escolha ao menos uma foto.');
      return;
    }

    const selectedEvent = events.find(event => event.id === eventId);
    setProgress({ done: 0, total: files.length });

    let failures = 0;

    for (const [index, file] of files.entries()) {
      try {
        await photoService.uploadPhoto({
          file,
          eventId,
          eventTitle: selectedEvent?.title ?? '',
          caption,
          uploadedBy: member.uid,
          uploadedByName: member.displayName,
        });
      }
      catch (error) {
        failures += 1;
        console.error('[PhotoUpload] falha no envio', { file: file.name, error });
      }
      setProgress({ done: index + 1, total: files.length });
    }

    setProgress(null);

    if (failures === 0)
      toast.success(files.length === 1 ? 'Foto publicada no mural.' : `${files.length} fotos publicadas.`);
    else
      toast.error(`${failures} de ${files.length} fotos não foram enviadas.`);

    setFiles([]);
    setCaption('');
    setOpen(false);
    onUploaded();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ImagePlus className="h-4 w-4" />
        Adicionar fotos
      </Button>

      <Modal open={open} onClose={() => !progress && setOpen(false)} title="Publicar no mural">
        <div className="flex flex-col gap-4">
          <FormField label="Fotos" hint={`Até ${MAX_FILES} imagens por vez. Elas são comprimidas antes do envio.`}>
            <Input type="file" accept="image/*" multiple onChange={event => handleSelect(event.target.files)} />
          </FormField>

          {files.length > 0 && (
            <p className="text-muted text-xs">
              {files.length}
              {' '}
              arquivo(s) selecionado(s).
            </p>
          )}

          <FormField label="Encontro" hint="Opcional. Associa as fotos a um encontro da agenda.">
            <Select value={eventId} onChange={event => setEventId(event.target.value)}>
              <option value="">Sem encontro específico</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Legenda (opcional)">
            <Input value={caption} onChange={event => setCaption(event.target.value)} maxLength={140} />
          </FormField>

          {progress && (
            <p className="text-muted text-sm">
              Enviando
              {' '}
              {progress.done}
              {' de '}
              {progress.total}
              …
            </p>
          )}

          <Button onClick={handleUpload} loading={Boolean(progress)} size="lg">
            <Upload className="h-4 w-4" />
            Publicar
          </Button>
        </div>
      </Modal>
    </>
  );
}
