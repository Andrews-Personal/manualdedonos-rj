import type { Member, MemberRoleValue } from '@/types/member-type';
import { Check, ShieldCheck, UserX } from 'lucide-react';
import { useState } from 'react';

import { toast } from 'sonner';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/field';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { friendlyError } from '@/helpers/errors';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useUser } from '@/hooks/use-user';
import { memberService } from '@/services/member.service';
import { MEMBER_ROLE, roleLabel } from '@/types/member-type';

export function MembersPanel() {
  const { member: currentUser } = useUser();
  const { data, loading, error, reload } = useAsyncResource(() => memberService.listMembers());
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const pending = (data ?? []).filter(member => !member.approved);
  const active = (data ?? []).filter(member => member.approved);

  const handleApprove = async (member: Member, approved: boolean) => {
    setBusyUid(member.uid);

    try {
      // Aprovar promove Visitante → Membro. Revogar mantém o papel atual se já
      // for admin: tirar o acesso de um admin é uma decisão separada, feita no
      // seletor de papel, não um efeito colateral de um clique em "revogar".
      const nextRole: MemberRoleValue = approved
        ? (member.role >= MEMBER_ROLE.Membro ? member.role : MEMBER_ROLE.Membro)
        : member.role;

      await memberService.setApproval(member.uid, approved, nextRole);
      toast.success(approved ? `${member.displayName} liberado.` : 'Acesso revogado.');
      reload();
    }
    catch (caught) {
      toast.error(friendlyError(caught, 'Não foi possível alterar o acesso.'));
    }
    finally {
      setBusyUid(null);
    }
  };

  const handleRole = async (member: Member, role: MemberRoleValue) => {
    setBusyUid(member.uid);

    try {
      await memberService.setRole(member.uid, role);
      toast.success(`${member.displayName} agora é ${roleLabel(role)}.`);
      reload();
    }
    catch (caught) {
      toast.error(friendlyError(caught, 'Não foi possível alterar o papel.'));
    }
    finally {
      setBusyUid(null);
    }
  };

  if (loading)
    return <Spinner label="Carregando membros…" />;

  if (error)
    return <ResourceError onRetry={reload} />;

  const renderRow = (member: Member) => {
    // O admin não muda o próprio papel por aqui: rebaixar a si mesmo por
    // engano deixa o projeto sem ninguém que consiga promover de volta.
    const isSelf = member.uid === currentUser?.uid;

    return (
      <Card key={member.uid}>
        <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={member.displayName} src={member.photoURL || undefined} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {member.displayName || '(sem nome)'}
                {isSelf && <span className="text-muted ml-2 text-xs">você</span>}
              </p>
              <p className="text-muted truncate text-xs">
                {member.email}
                {member.company.name && ` · ${member.company.name}`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Badge tone={member.approved ? 'success' : 'warning'}>
              {member.approved ? roleLabel(member.role) : 'pendente'}
            </Badge>

            {member.approved && !isSelf && (
              <Select
                className="h-9 w-40 text-xs"
                value={member.role}
                disabled={busyUid === member.uid}
                onChange={event => handleRole(member, Number(event.target.value) as MemberRoleValue)}
                aria-label={`Papel de ${member.displayName}`}
              >
                {Object.entries(MEMBER_ROLE)
                  .filter(([, value]) => value >= MEMBER_ROLE.Membro)
                  .map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
              </Select>
            )}

            {!member.approved
              ? (
                  <Button size="sm" loading={busyUid === member.uid} onClick={() => handleApprove(member, true)}>
                    <Check className="h-3.5 w-3.5" />
                    Liberar
                  </Button>
                )
              : !isSelf && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busyUid === member.uid}
                    onClick={() => handleApprove(member, false)}
                  >
                    <UserX className="h-3.5 w-3.5" />
                    Revogar
                  </Button>
                )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="eyebrow text-muted mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Aguardando liberação (
          {pending.length}
          )
        </h3>

        {pending.length === 0
          ? <EmptyState title="Nenhum cadastro pendente" description="Todos os cadastros recebidos já foram analisados." />
          : <div className="flex flex-col gap-3">{pending.map(renderRow)}</div>}
      </section>

      <section>
        <h3 className="eyebrow text-muted mb-3">
          Membros liberados (
          {active.length}
          )
        </h3>
        <div className="flex flex-col gap-3">{active.map(renderRow)}</div>
      </section>
    </div>
  );
}
