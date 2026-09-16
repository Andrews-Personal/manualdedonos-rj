import { useState } from 'react';

import { AttendancePanel } from '@/components/admin/attendance-panel';
import { EventsPanel } from '@/components/admin/events-panel';
import { MembersPanel } from '@/components/admin/members-panel';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

const PANELS = [
  { key: 'encontros', label: 'Encontros', render: () => <EventsPanel /> },
  { key: 'membros', label: 'Membros', render: () => <MembersPanel /> },
  { key: 'presencas', label: 'Presenças', render: () => <AttendancePanel /> },
] as const;

type PanelKey = (typeof PANELS)[number]['key'];

export function Admin() {
  const [panel, setPanel] = useState<PanelKey>('encontros');
  const active = PANELS.find(item => item.key === panel) ?? PANELS[0];

  return (
    <div>
      <PageHeader
        title="Administração"
        description="Publicar encontros, liberar cadastros e acompanhar as confirmações de presença."
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg bg-[var(--surface-sunken)] p-1">
        {PANELS.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPanel(item.key)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              panel === item.key ? 'bg-[var(--surface-raised)] shadow-sm' : 'text-muted',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {active.render()}
    </div>
  );
}
