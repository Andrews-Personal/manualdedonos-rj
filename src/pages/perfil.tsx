import type { MemberFormInput } from '@/types/member-type';
import imageCompression from 'browser-image-compression';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Camera, Save } from 'lucide-react';
import { useState } from 'react';

import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, Input, Textarea } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { Spinner } from '@/components/ui/states';
import { TagInput } from '@/components/ui/tag-input';
import { storage } from '@/config/firebase';
import { friendlyError } from '@/helpers/errors';
import { useUser } from '@/hooks/use-user';
import { memberService } from '@/services/member.service';
import { roleLabel } from '@/types/member-type';

export function Perfil() {
  const { member, loading } = useUser();
  const [draft, setDraft] = useState<MemberFormInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (loading)
    return <Spinner label="Carregando seu perfil…" />;

  if (!member)
    return null;

  // Inicializa o rascunho na primeira renderização com o perfil já carregado.
  const current: MemberFormInput = draft ?? {
    displayName: member.displayName,
    phone: member.phone,
    bio: member.bio,
    company: member.company,
    offers: member.offers,
    needs: member.needs,
    linkedin: member.linkedin,
    instagram: member.instagram,
    aiOptOut: member.aiOptOut,
  };

  const update = <K extends keyof MemberFormInput>(key: K, value: MemberFormInput[K]) =>
    setDraft({ ...current, [key]: value });

  const updateCompany = <K extends keyof MemberFormInput['company']>(
    key: K,
    value: MemberFormInput['company'][K],
  ) => setDraft({ ...current, company: { ...current.company, [key]: value } });

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      await memberService.updateProfile(member.uid, current);
      toast.success('Perfil atualizado.');
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível salvar o perfil.'));
    }
    finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file)
      return;

    setUploadingPhoto(true);

    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.4, maxWidthOrHeight: 600, useWebWorker: true });
      const objectRef = ref(storage, `members/${member.uid}/avatar-${Date.now()}`);
      await uploadBytes(objectRef, compressed, { contentType: compressed.type || file.type });
      const url = await getDownloadURL(objectRef);
      await memberService.updatePhoto(member.uid, url);
      toast.success('Foto atualizada.');
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível enviar a foto.'));
    }
    finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Meu perfil"
        description="Estes dados alimentam o diretório de membros e o cruzamento de negócios por IA. Quanto mais específico, melhor a sugestão."
      />

      <form className="flex flex-col gap-6" onSubmit={handleSave}>
        <Card>
          <CardContent className="flex flex-col items-start gap-4 pt-5 sm:flex-row sm:items-center">
            <Avatar name={member.displayName} src={member.photoURL || undefined} className="h-20 w-20 text-lg" />

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {member.email}
                <span className="text-muted ml-2 text-xs">{roleLabel(member.role)}</span>
              </p>

              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-sm">
                <Camera className="h-4 w-4" />
                {uploadingPhoto ? 'Enviando…' : 'Trocar foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto}
                  onChange={event => handlePhoto(event.target.files?.[0])}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados pessoais</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nome completo" htmlFor="displayName">
              <Input id="displayName" value={current.displayName} onChange={event => update('displayName', event.target.value)} />
            </FormField>

            <FormField label="Telefone / WhatsApp" htmlFor="phone">
              <Input id="phone" value={current.phone} onChange={event => update('phone', event.target.value)} inputMode="tel" />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Bio" htmlFor="bio" hint="Uma apresentação curta: o que você faz e a que veio no grupo.">
                <Textarea id="bio" value={current.bio} onChange={event => update('bio', event.target.value)} rows={3} maxLength={500} />
              </FormField>
            </div>

            <FormField label="LinkedIn" htmlFor="linkedin">
              <Input id="linkedin" value={current.linkedin} onChange={event => update('linkedin', event.target.value)} placeholder="https://linkedin.com/in/…" />
            </FormField>

            <FormField label="Instagram" htmlFor="instagram">
              <Input id="instagram" value={current.instagram} onChange={event => update('instagram', event.target.value)} placeholder="https://instagram.com/…" />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Minha empresa</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nome da empresa" htmlFor="companyName">
              <Input id="companyName" value={current.company.name} onChange={event => updateCompany('name', event.target.value)} />
            </FormField>

            <FormField label="Segmento" htmlFor="segment" hint="Ex.: logística refrigerada, clínicas odontológicas, food service.">
              <Input id="segment" value={current.company.segment} onChange={event => updateCompany('segment', event.target.value)} />
            </FormField>

            <FormField label="Seu cargo" htmlFor="position">
              <Input id="position" value={current.company.position} onChange={event => updateCompany('position', event.target.value)} />
            </FormField>

            <FormField label="Cidade" htmlFor="city">
              <Input id="city" value={current.company.city} onChange={event => updateCompany('city', event.target.value)} />
            </FormField>

            <FormField label="Site" htmlFor="site">
              <Input id="site" value={current.company.site} onChange={event => updateCompany('site', event.target.value)} placeholder="https://" />
            </FormField>

            <FormField label="Nº de funcionários" htmlFor="headcount">
              <Input id="headcount" value={current.company.headcount} onChange={event => updateCompany('headcount', event.target.value)} placeholder="Ex.: 12" />
            </FormField>

            <div className="sm:col-span-2">
              <FormField
                label="Faixa de faturamento (opcional)"
                htmlFor="revenueRange"
                hint="Autodeclarado. Visível apenas para membros liberados da turma."
              >
                <Input id="revenueRange" value={current.company.revenueRange} onChange={event => updateCompany('revenueRange', event.target.value)} placeholder="Ex.: R$ 5–10 mi/ano" />
              </FormField>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oportunidades</CardTitle>
            <p className="text-muted text-sm">
              É daqui que sai o cruzamento de negócios. Escreva com as palavras
              que você usaria numa conversa, não em categorias genéricas.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <FormField label="O que minha empresa oferece" hint="Enter ou vírgula adiciona cada item.">
              <TagInput
                value={current.offers}
                onChange={value => update('offers', value)}
                placeholder="Ex.: armazenagem refrigerada em Duque de Caxias"
              />
            </FormField>

            <FormField label="O que estou procurando" hint="Fornecedores, parceiros, canais, talentos, clientes.">
              <TagInput
                value={current.needs}
                onChange={value => update('needs', value)}
                placeholder="Ex.: representante comercial para o interior"
              />
            </FormField>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={current.aiOptOut}
                onChange={event => update('aiOptOut', event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Não quero que meu perfil seja usado nas sugestões de negócio geradas por IA.
                <span className="text-muted block text-xs">
                  Você continua vendo as suas próprias sugestões; seu perfil é que deixa de aparecer nas dos outros.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">
            <Save className="h-4 w-4" />
            Salvar perfil
          </Button>
        </div>
      </form>
    </div>
  );
}
