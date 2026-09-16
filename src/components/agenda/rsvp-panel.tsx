import type { AppEvent } from '@/types/event-type';
import type { Rsvp, RsvpStatus } from '@/types/rsvp-type';
import { Check, HelpCircle, Users, X } from 'lucide-react';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, Input, Textarea } from '@/components/ui/field';
import { Spinner } from '@/components/ui/states';
import { friendlyError } from '@/helpers/errors';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { rsvpService } from '@/services/rsvp.service';

const OPTIONS: { status: RsvpStatus; label: string; icon: typeof Check }[] = [
  { status: 'confirmado', label: 'Vou participar', icon: Check },
  { status: 'talvez', label: 'Talvez', icon: HelpCircle },
  { status: 'ausente', label: 'Não vou', icon: X },
];

/**
 * Painel de confirmação de presença de um encontro.
 *
 * É o mesmo componente na página do encontro e na tela dedicada de
 * "Confirmar presença" — duas portas para a mesma ação, e uma única
 * implementação da gravação (que depende do ID determinístico do RSVP para
 * não duplicar confirmação).
 */
export function RsvpPanel({ event, onSaved }: { event: AppEvent; onSaved?: () => void }) {
  const { member } = useUser();
  const [current, setCurrent] = useState<Rsvp | null>(null);
  const [status, setStatus] = useState<RsvpStatus | null>(null);
  const [guests, setGuests] = useState(0);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!member)
      return;

    let active = true;
    // eslint-disable-next-line react/set-state-in-effect -- marcar 'carregando' antes de disparar a leitura é justamente o objetivo deste efeito.
    setLoading(true);

    rsvpService.getRsvp(event.id, member.uid)
      .then((existing) => {
        if (!active)
          return;
        setCurrent(existing);
        setStatus(existing?.status ?? null);
        setGuests(existing?.guests ?? 0);
        setNote(existing?.note ?? '');
      })
      .catch(error => console.error('[RsvpPanel] falha ao ler a confirmação', error))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [event.id, member]);

  if (!member)
    return null;

  if (loading)
    return <Spinner label="Carregando sua confirmação…" />;

  const closed = event.status !== 'agendado';

  const handleSave = async () => {
    if (!status) {
      toast.error('Escolha uma das opções antes de confirmar.');
      return;
    }

    setSaving(true);

    try {
      await rsvpService.saveRsvp({
        eventId: event.id,
        uid: member.uid,
        memberName: member.displayName,
        memberCompany: member.company.name,
        status,
        // Convidado só faz sentido para quem vai. Guardar acompanhante de um
        // "não vou" é o tipo de dado que depois aparece na contagem da sala.
        guests: status === 'confirmado' ? guests : 0,
        note: note.trim(),
      });

      setCurrent({
        id: `${event.id}_${member.uid}`,
        eventId: event.id,
        uid: member.uid,
        memberName: member.displayName,
        memberCompany: member.company.name,
        status,
        guests: status === 'confirmado' ? guests : 0,
        note: note.trim(),
        updatedAt: Date.now(),
      });

      toast.success(status === 'confirmado' ? 'Presença confirmada!' : 'Resposta registrada.');
      onSaved?.();
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível registrar sua resposta.'));
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gold-500" />
          Sua presença
        </CardTitle>
        {current && (
          <Badge tone={current.status === 'confirmado' ? 'success' : current.status === 'talvez' ? 'warning' : 'danger'} className="w-fit">
            Resposta atual:
            {' '}
            {current.status}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {closed
          ? (
              <p className="text-muted text-sm">
                Este encontro está
                {' '}
                {event.status}
                {' '}
                — as confirmações estão encerradas.
              </p>
            )
          : (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  {OPTIONS.map(option => (
                    <button
                      key={option.status}
                      type="button"
                      onClick={() => setStatus(option.status)}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors',
                        status === option.status
                          ? 'border-gold-500 bg-gold-500/10 text-gold-700 dark:text-gold-300'
                          : 'border-[var(--border-subtle)] text-muted hover:bg-[var(--surface-sunken)]',
                      )}
                      aria-pressed={status === option.status}
                    >
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </button>
                  ))}
                </div>

                {status === 'confirmado' && (
                  <FormField
                    label="Convidados que vou levar"
                    htmlFor="guests"
                    hint="Conta na lotação da sala. Deixe 0 se for sozinho."
                  >
                    <Input
                      id="guests"
                      type="number"
                      min={0}
                      max={10}
                      value={guests}
                      onChange={event_ => setGuests(Math.max(0, Math.min(10, Number(event_.target.value) || 0)))}
                    />
                  </FormField>
                )}

                <FormField label="Observação (opcional)" htmlFor="note" hint="Restrição alimentar, chegada mais tarde, etc.">
                  <Textarea id="note" value={note} onChange={event_ => setNote(event_.target.value)} rows={2} />
                </FormField>

                <Button onClick={handleSave} loading={saving} size="lg">
                  {current ? 'Atualizar resposta' : 'Enviar resposta'}
                </Button>
              </>
            )}
      </CardContent>
    </Card>
  );
}
