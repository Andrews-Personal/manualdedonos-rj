import type { MemberService } from '@/types/service-type';
import { Globe, Mail, MessageCircle, Pencil, Trash2 } from 'lucide-react';

import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { friendlyError } from '@/helpers/errors';
import { useUser } from '@/hooks/use-user';
import { showcaseService } from '@/services/showcase.service';

/** Normaliza o número para o formato do link do WhatsApp (DDI 55 + DDD). */
function whatsappLink(raw: string, title: string): string {
  const digits = raw.replace(/\D/g, '');
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  const message = encodeURIComponent(
    `Olá! Vi seu anúncio "${title}" na vitrine do Manual de Donos e gostaria de conversar.`,
  );
  return `https://wa.me/${withCountry}?text=${message}`;
}

export function ServiceCard({
  service,
  onEdit,
  onChanged,
}: {
  service: MemberService;
  onEdit?: (service: MemberService) => void;
  onChanged?: () => void;
}) {
  const { member, isAdmin } = useUser();
  const canManage = isAdmin || service.ownerUid === member?.uid;

  const handleDelete = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Remover este anúncio da vitrine?'))
      return;

    try {
      await showcaseService.deleteService(service.id);
      toast.success('Anúncio removido.');
      onChanged?.();
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível remover o anúncio.'));
    }
  };

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">{service.category}</Badge>
          {!service.active && <Badge tone="neutral">Oculto</Badge>}
        </div>

        <h3 className="text-base font-semibold leading-snug">{service.title}</h3>

        <p className="text-muted text-xs">
          {service.ownerName}
          {service.ownerCompany && ` · ${service.ownerCompany}`}
        </p>

        {service.description && (
          <p className="text-muted line-clamp-4 text-sm">{service.description}</p>
        )}

        {service.memberBenefit && (
          <p className="rounded-lg bg-gold-500/10 px-3 py-2 text-xs font-medium text-gold-700 dark:text-gold-300">
            Para o grupo:
            {' '}
            {service.memberBenefit}
          </p>
        )}

        {service.priceHint && <p className="text-muted text-xs">{service.priceHint}</p>}

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {service.whatsapp && (
            <a
              href={whatsappLink(service.whatsapp, service.title)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          )}
          {service.email && (
            <a
              href={`mailto:${service.email}?subject=${encodeURIComponent(service.title)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-medium"
            >
              <Mail className="h-3.5 w-3.5" />
              E-mail
            </a>
          )}
          {service.site && (
            <a
              href={service.site.startsWith('http') ? service.site : `https://${service.site}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-3 py-1.5 text-xs font-medium"
            >
              <Globe className="h-3.5 w-3.5" />
              Site
            </a>
          )}
        </div>

        {canManage && (
          <div className="flex gap-2 border-t border-[var(--border-subtle)] pt-3">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(service)}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
