import { X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from './badge';
import { Input } from './field';

/**
 * Lista de termos curtos (o que a empresa oferece / o que procura).
 *
 * É texto livre de propósito: um seletor de categorias fixas empobreceria
 * justamente o insumo do cruzamento por IA, que trabalha melhor com
 * "logística refrigerada para o Norte fluminense" do que com "Logística".
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  max = 12,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const term = draft.trim();
    if (!term)
      return;

    if (value.length >= max)
      return;

    if (value.some(existing => existing.toLowerCase() === term.toLowerCase())) {
      setDraft('');
      return;
    }

    onChange([...value, term]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // Enter adiciona sem submeter o formulário inteiro em volta.
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        maxLength={60}
      />

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(term => (
            <Badge key={term} tone="neutral" className="gap-1.5 py-1">
              {term}
              <button
                type="button"
                onClick={() => onChange(value.filter(item => item !== term))}
                aria-label={`Remover ${term}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
