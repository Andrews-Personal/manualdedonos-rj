import type { MemberService } from '@/types/service-type';
import { Plus, Store } from 'lucide-react';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { ServiceCard } from '@/components/vitrine/service-card';
import { ServiceForm } from '@/components/vitrine/service-form';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useUser } from '@/hooks/use-user';
import { showcaseService } from '@/services/showcase.service';
import { SERVICE_CATEGORIES } from '@/types/service-type';

export function Vitrine() {
  const { member } = useUser();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<MemberService | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // A vitrine mostra só os anúncios ativos. Os próprios anúncios do membro,
  // inclusive os ocultos, vêm em uma segunda leitura para ele poder
  // reativá-los sem precisar lembrar de onde estão.
  const services = useAsyncResource(() => showcaseService.listActive());
  const mine = useAsyncResource(
    () => (member ? showcaseService.listByOwner(member.uid) : Promise.resolve([])),
    [member?.uid],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (services.data ?? []).filter((service) => {
      if (category && service.category !== category)
        return false;

      if (!term)
        return true;

      return [service.title, service.description, service.ownerName, service.ownerCompany, service.memberBenefit]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [services.data, search, category]);

  const reloadAll = () => {
    services.reload();
    mine.reload();
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (service: MemberService) => {
    setEditing(service);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Vitrine de serviços"
        description="O que cada empresa do grupo entrega e a condição especial para quem é da turma."
        actions={(
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Divulgar serviço
          </Button>
        )}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_240px]">
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar por serviço, empresa ou membro…"
          aria-label="Buscar na vitrine"
        />
        <Select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {SERVICE_CATEGORIES.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </Select>
      </div>

      {(mine.data?.length ?? 0) > 0 && (
        <section className="mb-8">
          <h2 className="eyebrow text-muted mb-3">Meus anúncios</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(mine.data ?? []).map(service => (
              <ServiceCard key={service.id} service={service} onEdit={openEdit} onChanged={reloadAll} />
            ))}
          </div>
        </section>
      )}

      {services.loading && <Spinner label="Carregando a vitrine…" />}
      {!services.loading && services.error && <ResourceError onRetry={services.reload} />}

      {!services.loading && !services.error && visible.length === 0 && (
        <EmptyState
          icon={Store}
          title={search || category ? 'Nenhum serviço para este filtro' : 'A vitrine ainda está vazia'}
          description="Publique o que sua empresa entrega e a condição que você oferece a quem é do grupo."
          action={<Button variant="outline" onClick={openNew}>Divulgar meu serviço</Button>}
        />
      )}

      {!services.loading && !services.error && visible.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(service => (
            <ServiceCard key={service.id} service={service} onEdit={openEdit} onChanged={reloadAll} />
          ))}
        </div>
      )}

      <ServiceForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={reloadAll}
        service={editing}
      />
    </div>
  );
}
