import { Building2, Instagram, Linkedin, Mail, Phone, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { memberService } from '@/services/member.service';
import { isActiveMember } from '@/types/member-type';

export function Membros() {
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useAsyncResource(() => memberService.listMembers());

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (data ?? [])
      // Cadastros pendentes não aparecem no diretório: enquanto o admin não
      // liberou, a pessoa não é parte da turma.
      .filter(member => isActiveMember(member))
      .filter((member) => {
        if (!term)
          return true;

        return [
          member.displayName,
          member.company.name,
          member.company.segment,
          member.bio,
          ...member.offers,
          ...member.needs,
        ].join(' ').toLowerCase().includes(term);
      });
  }, [data, search]);

  return (
    <div>
      <PageHeader
        title="Membros da turma"
        description="Quem está no grupo, o que cada um entrega e o que está procurando."
      />

      <div className="relative mb-6 max-w-md">
        <Search className="text-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar por nome, empresa, segmento ou necessidade…"
          className="pl-9"
          aria-label="Buscar membros"
        />
      </div>

      {loading && <Spinner label="Carregando membros…" />}
      {!loading && error && <ResourceError onRetry={reload} />}

      {!loading && !error && visible.length === 0 && (
        <EmptyState icon={Users} title="Nenhum membro encontrado" description="Ajuste a busca ou aguarde novas liberações." />
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(member => (
            <Card key={member.uid}>
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="flex items-center gap-3">
                  <Avatar name={member.displayName} src={member.photoURL || undefined} className="h-12 w-12" />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{member.displayName}</h3>
                    {member.company.position && (
                      <p className="text-muted truncate text-xs">{member.company.position}</p>
                    )}
                  </div>
                </div>

                {member.company.name && (
                  <p className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 shrink-0 text-gold-500" />
                    <span className="truncate">{member.company.name}</span>
                  </p>
                )}

                {member.company.segment && <Badge tone="gold" className="w-fit">{member.company.segment}</Badge>}

                {member.bio && <p className="text-muted line-clamp-3 text-sm">{member.bio}</p>}

                {member.offers.length > 0 && (
                  <div>
                    <p className="text-muted mb-1 text-[11px] uppercase tracking-wide">Oferece</p>
                    <div className="flex flex-wrap gap-1">
                      {member.offers.slice(0, 4).map(offer => (
                        <Badge key={offer} tone="neutral">{offer}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {member.needs.length > 0 && (
                  <div>
                    <p className="text-muted mb-1 text-[11px] uppercase tracking-wide">Procura</p>
                    <div className="flex flex-wrap gap-1">
                      {member.needs.slice(0, 4).map(need => (
                        <Badge key={need} tone="success">{need}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-muted mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-3 text-xs">
                  {member.email && (
                    <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      E-mail
                    </a>
                  )}
                  {member.phone && (
                    <a href={`tel:${member.phone.replace(/\D/g, '')}`} className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Telefone
                    </a>
                  )}
                  {member.linkedin && (
                    <a href={member.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                  {member.instagram && (
                    <a href={member.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                      <Instagram className="h-3.5 w-3.5" />
                      Instagram
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
