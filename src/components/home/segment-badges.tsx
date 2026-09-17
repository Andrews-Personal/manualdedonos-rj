import { Badge } from '@/components/ui/badge';

export type SegmentCount = {
  /** Chave normalizada — é por ela que a seleção compara. */
  key: string;
  /** Rótulo como o primeiro membro daquele mercado escreveu. */
  label: string;
  total: number;
};

/**
 * Os mercados representados na turma, cada um com quantas empresas tem.
 *
 * Funciona como filtro da busca logo acima: o número é a informação (quem
 * está em quê) e o clique é o atalho (só essas empresas).
 */
export function SegmentBadges({
  counts,
  selected,
  onSelect,
  totalCompanies,
}: {
  counts: SegmentCount[];
  /** Chave selecionada, ou string vazia para "todos". */
  selected: string;
  onSelect: (key: string) => void;
  totalCompanies: number;
}) {
  const options = [
    { key: '', label: 'Todos', total: totalCompanies },
    ...counts,
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.key === selected;

        return (
          <button
            key={option.key || 'todos'}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(active ? '' : option.key)}
            className="rounded-full"
          >
            {/* Um chip ativo em papel branco no meio da parede verde herdaria
                o texto claro do contexto de fora e sumiria. O acento resolve
                em qualquer superfície — é por isso que não há variante de
                fundo aqui. */}
            <Badge tone={active ? 'accent' : 'neutral'} className="gap-1.5">
              {option.label}
              <span className={active ? 'opacity-70' : 'text-accent'}>{option.total}</span>
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
