import type { MemberService, ServiceCategory } from '@/types/service-type';
import { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { FormField, Input, Select, Textarea } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { friendlyError } from '@/helpers/errors';
import { useUser } from '@/hooks/use-user';
import { showcaseService } from '@/services/showcase.service';
import { SERVICE_CATEGORIES } from '@/types/service-type';

type Draft = {
  title: string;
  description: string;
  category: ServiceCategory;
  memberBenefit: string;
  priceHint: string;
  whatsapp: string;
  email: string;
  site: string;
  coverUrl: string;
  active: boolean;
};

function draftFrom(service: MemberService | null, fallbackEmail: string): Draft {
  return {
    title: service?.title ?? '',
    description: service?.description ?? '',
    category: service?.category ?? 'Outros',
    memberBenefit: service?.memberBenefit ?? '',
    priceHint: service?.priceHint ?? '',
    whatsapp: service?.whatsapp ?? '',
    email: service?.email ?? fallbackEmail,
    site: service?.site ?? '',
    coverUrl: service?.coverUrl ?? '',
    active: service?.active ?? true,
  };
}

export function ServiceForm({
  open,
  onClose,
  onSaved,
  service,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  service: MemberService | null;
}) {
  const { member } = useUser();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(service, member?.email ?? ''));
  const [saving, setSaving] = useState(false);

  // Remonta o rascunho quando o modal reabre para outro anúncio: sem isso, o
  // formulário reaproveitaria os campos do anúncio editado anteriormente.
  const [lastServiceId, setLastServiceId] = useState(service?.id ?? '');
  if ((service?.id ?? '') !== lastServiceId) {
    setLastServiceId(service?.id ?? '');
    setDraft(draftFrom(service, member?.email ?? ''));
  }

  if (!member)
    return null;

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(current => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!draft.title.trim()) {
      toast.error('Dê um título ao serviço.');
      return;
    }

    setSaving(true);

    try {
      if (service) {
        await showcaseService.updateService(service.id, draft);
      }
      else {
        await showcaseService.createService({
          ...draft,
          ownerUid: member.uid,
          ownerName: member.displayName,
          ownerCompany: member.company.name,
        });
      }

      toast.success(service ? 'Anúncio atualizado.' : 'Serviço publicado na vitrine.');
      onSaved();
      onClose();
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível salvar o anúncio.'));
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={service ? 'Editar anúncio' : 'Divulgar um serviço'}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField label="O que você oferece" htmlFor="title">
          <Input
            id="title"
            value={draft.title}
            onChange={event => update('title', event.target.value)}
            placeholder="Ex.: Consultoria tributária para o Simples Nacional"
            maxLength={90}
            required
          />
        </FormField>

        <FormField label="Categoria" htmlFor="category">
          <Select
            id="category"
            value={draft.category}
            onChange={event => update('category', event.target.value as ServiceCategory)}
          >
            {SERVICE_CATEGORIES.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Descrição" htmlFor="description" hint="Para quem serve, o que entrega, como funciona.">
          <Textarea
            id="description"
            value={draft.description}
            onChange={event => update('description', event.target.value)}
            rows={4}
            maxLength={800}
          />
        </FormField>

        <FormField
          label="Condição para membros do grupo"
          htmlFor="memberBenefit"
          hint="É o motivo de a vitrine existir. Ex.: 20% de desconto, diagnóstico gratuito."
        >
          <Input
            id="memberBenefit"
            value={draft.memberBenefit}
            onChange={event => update('memberBenefit', event.target.value)}
            maxLength={120}
          />
        </FormField>

        <FormField label="Faixa de investimento (opcional)" htmlFor="priceHint">
          <Input
            id="priceHint"
            value={draft.priceHint}
            onChange={event => update('priceHint', event.target.value)}
            placeholder="Ex.: a partir de R$ 2.500/mês"
            maxLength={60}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="WhatsApp" htmlFor="whatsapp">
            <Input
              id="whatsapp"
              value={draft.whatsapp}
              onChange={event => update('whatsapp', event.target.value)}
              placeholder="21999998888"
              inputMode="tel"
            />
          </FormField>

          <FormField label="E-mail de contato" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={event => update('email', event.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Site ou portfólio" htmlFor="site">
          <Input
            id="site"
            value={draft.site}
            onChange={event => update('site', event.target.value)}
            placeholder="https://"
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={event => update('active', event.target.checked)}
            className="h-4 w-4"
          />
          Anúncio visível na vitrine
        </label>

        <Button type="submit" loading={saving} size="lg">
          {service ? 'Salvar alterações' : 'Publicar na vitrine'}
        </Button>
      </form>
    </Modal>
  );
}
