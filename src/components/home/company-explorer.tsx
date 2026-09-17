import type { SegmentCount } from '@/components/home/segment-badges';

import type { Member } from '@/types/member-type';
import { Building2, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { SegmentBadges } from '@/components/home/segment-badges';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/field';
import { APP_LOCALE } from '@/config/locale';
import { matchesSearch, normalizeText } from '@/helpers/search';
import { routes } from '@/routes/routes';
import { isActiveMember } from '@/types/member-type';

/** Quantas empresas cabem na tela inicial antes de virar rolagem infinita. */
const VISIBLE_LIMIT = 6;

/**
 * Agrupa as empresas por mercado.
 *
 * A chave é o segmento normalizado: "Logística" e "logistica" são o mesmo
 * mercado escrito por duas pessoas diferentes, e dois chips para a mesma
 * coisa fariam a turma parecer mais espalhada do que é. O rótulo exibido é a
 * primeira grafia encontrada.
 */
function countBySegment(members: Member[]): SegmentCount[] {
  const counts = new Map<string, SegmentCount>();

  for (const member of members) {
    const label = member.company.segment.trim();

    // Perfil sem segmento não vira um chip "sem segmento": ele continua
    // aparecendo na busca, só não representa um mercado da turma.
    if (!label)
      continue;

    const key = normalizeText(label);
    const existing = counts.get(key);

    if (existing)
      existing.total += 1;
    else
      counts.set(key, { key, label, total: 1 });
  }

  return [...counts.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label, APP_LOCALE));
}

/**
 * Busca por empresa e navegação por mercado, na tela inicial.
 *
 * O campo procura em tudo que o membro escreveu sobre o próprio negócio —
 * nome, segmento, cargo, cidade, bio, o que oferece e o que procura — porque
 * quem busca "embalagem" não sabe (nem precisa saber) em qual campo do perfil
 * a palavra foi parar.
 */
export function CompanyExplorer({ members }: { members: Member[] }) {
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');

  // Cadastro pendente não é parte da turma: enquanto um admin não liberou, a
  // empresa não entra na contagem dos mercados nem nos resultados.
  const companies = useMemo(() => members.filter(member => isActiveMember(member)), [members]);
  const counts = useMemo(() => countBySegment(companies), [companies]);

  const results = useMemo(() => {
    return companies
      .filter((member) => {
        if (segment && normalizeText(member.company.segment.trim()) !== segment)
          return false;

        return matchesSearch([
          member.displayName,
          member.company.name,
          member.company.segment,
          member.company.position,
          member.company.city,
          member.company.site,
          member.bio,
          ...member.offers,
          ...member.needs,
        ], search);
      })
      .sort((a, b) => (a.company.name || a.displayName).localeCompare(b.company.name || b.displayName, APP_LOCALE));
  }, [companies, search, segment]);

  const hidden = results.length - VISIBLE_LIMIT;

  return (
    <div className="flex flex-col gap-5">
      <div className="relative max-w-md">
        <Search className="text-muted pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar empresa, mercado ou palavra-chave…"
          className="pl-9"
          aria-label="Buscar empresas da turma"
          type="search"
        />
      </div>

      <SegmentBadges
        counts={counts}
        selected={segment}
        onSelect={setSegment}
        totalCompanies={companies.length}
      />

      {results.length === 0
        ? (
            <p className="text-muted text-sm">
              Nenhuma empresa encontrada com esses termos. Tente outra palavra ou
              limpe o filtro de mercado.
            </p>
          )
        : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.slice(0, VISIBLE_LIMIT).map(member => (
                  <CompanyCard key={member.uid} member={member} />
                ))}
              </div>

              <p className="text-muted text-sm">
                {hidden > 0 && `Mais ${hidden} ${hidden === 1 ? 'empresa' : 'empresas'} no diretório. `}
                <Link to={routes.members.path} className="text-accent font-bold underline underline-offset-4">
                  Ver todos os membros
                </Link>
              </p>
            </>
          )}
    </div>
  );
}

function CompanyCard({ member }: { member: Member }) {
  // Sem empresa cadastrada, o título do cartão já é o nome do membro: repeti-lo
  // na linha de baixo ocuparia espaço sem dizer nada.
  const subtitle = [member.company.name ? member.displayName : '', member.company.position]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="surface-card flex flex-col gap-3 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar name={member.displayName} src={member.photoURL || undefined} className="h-10 w-10" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold">{member.company.name || member.displayName}</h3>
          {subtitle && <p className="text-muted truncate text-xs">{subtitle}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {member.company.segment && <Badge tone="accent">{member.company.segment}</Badge>}
        {member.company.city && (
          <span className="text-muted flex items-center gap-1 text-xs">
            <MapPin className="h-3 w-3" />
            {member.company.city}
          </span>
        )}
      </div>

      {member.offers.length > 0
        ? (
            <div className="flex flex-wrap gap-1">
              {member.offers.slice(0, 3).map(offer => (
                <Badge key={offer} tone="neutral">{offer}</Badge>
              ))}
            </div>
          )
        : member.bio && <p className="text-muted line-clamp-2 text-xs">{member.bio}</p>}

      {!member.company.name && (
        <p className="text-muted flex items-center gap-1.5 text-xs">
          <Building2 className="h-3 w-3" />
          Empresa ainda não informada
        </p>
      )}
    </article>
  );
}
