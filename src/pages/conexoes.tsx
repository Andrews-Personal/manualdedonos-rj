import type { MatchResult } from '@/types/match-type';
import { ArrowRight, Handshake, Info, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, Input } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ResourceError, Spinner } from '@/components/ui/states';
import { formatRelative } from '@/helpers/date';
import { friendlyError } from '@/helpers/errors';
import { useAsyncResource } from '@/hooks/use-async-resource';
import { useUser } from '@/hooks/use-user';
import { routes } from '@/routes/routes';
import { matchmakingService } from '@/services/matchmaking.service';

function scoreTone(score: number) {
  if (score >= 75)
    return 'success' as const;
  if (score >= 50)
    return 'accent' as const;
  return 'neutral' as const;
}

export function Conexoes() {
  const { member } = useUser();
  const navigate = useNavigate();
  const [focus, setFocus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [fresh, setFresh] = useState<MatchResult | null>(null);

  const cached = useAsyncResource(
    () => (member ? matchmakingService.getCached(member.uid) : Promise.resolve(null)),
    [member?.uid],
  );

  if (!member)
    return null;

  const result = fresh ?? cached.data;

  // Perfil vazio produz sugestão genérica — pior do que nenhuma, porque parece
  // uma resposta. Melhor barrar antes de gastar uma chamada ao modelo.
  const profileReady = Boolean(
    member.company.name.trim() && (member.offers.length > 0 || member.needs.length > 0),
  );

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const generated = await matchmakingService.generate(member.uid, focus);
      setFresh(generated);

      if (!generated || generated.matches.length === 0)
        toast.info('A análise rodou, mas não encontrou encaixes claros desta vez.');
      else
        toast.success(`${generated.matches.length} conexões sugeridas.`);
    }
    catch (error) {
      toast.error(friendlyError(error, 'Não foi possível gerar as sugestões agora.'));
    }
    finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Conexões de negócio"
        description="O Gemini lê os perfis da turma e aponta onde há encaixe real entre as empresas — fornecimento, parceria, indicação ou cliente."
      />

      {!profileReady && (
        <Card className="mb-6 border-amber-500/40">
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Complete seu perfil primeiro</p>
                <p className="text-muted text-sm">
                  Sem o nome da empresa e ao menos um item em "oferece" ou "procura",
                  a análise só consegue devolver generalidades.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate(routes.profile.path)}>
              Editar perfil
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="text-accent h-4 w-4" />
            Nova análise
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <FormField
              label="Foco desta busca (opcional)"
              htmlFor="focus"
              hint="Ex.: quero fornecedores de embalagem, ou quero parceiros para vender no B2B."
            >
              <Input
                id="focus"
                value={focus}
                onChange={event => setFocus(event.target.value)}
                maxLength={200}
                placeholder="Deixe em branco para uma análise geral"
              />
            </FormField>
          </div>

          <Button onClick={handleGenerate} loading={generating} disabled={!profileReady} size="lg">
            <Sparkles className="h-4 w-4" />
            Analisar o grupo
          </Button>
        </CardContent>
      </Card>

      {cached.loading && <Spinner label="Carregando sua última análise…" />}
      {!cached.loading && cached.error && <ResourceError onRetry={cached.reload} />}

      {!cached.loading && !cached.error && !result && (
        <EmptyState
          icon={Handshake}
          title="Nenhuma análise ainda"
          description="Rode a primeira análise para ver quem no grupo tem encaixe com a sua empresa."
        />
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted text-xs">
              Gerado
              {' '}
              {formatRelative(result.generatedAt)}
              {result.model && ` · ${result.model}`}
              {result.focus && ` · foco: "${result.focus}"`}
            </p>
          </div>

          {result.summary && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </CardContent>
            </Card>
          )}

          {result.matches.length === 0
            ? (
                <EmptyState
                  icon={Handshake}
                  title="Sem encaixes claros nesta rodada"
                  description="Tente descrever melhor o que você oferece e procura no perfil, ou refaça a análise com um foco específico."
                />
              )
            : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {result.matches.map(match => (
                    <Card key={match.memberUid}>
                      <CardContent className="flex flex-col gap-3 pt-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold">{match.memberName}</h3>
                            {match.company && <p className="text-muted text-xs">{match.company}</p>}
                          </div>
                          <Badge tone={scoreTone(match.score)}>
                            {match.score}
                            % de encaixe
                          </Badge>
                        </div>

                        {match.opportunityType && <Badge tone="accent" className="w-fit">{match.opportunityType}</Badge>}

                        {match.rationale && <p className="text-sm leading-relaxed">{match.rationale}</p>}

                        {match.suggestedApproach && (
                          <div className="rounded-lg bg-[var(--surface-sunken)] p-3">
                            <p className="text-muted mb-1 text-[11px] uppercase tracking-wide">Como abordar</p>
                            <p className="text-sm">{match.suggestedApproach}</p>
                          </div>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-fit"
                          onClick={() => navigate(routes.members.path)}
                        >
                          Ver contato no diretório
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

          <p className="text-muted text-xs">
            As sugestões são geradas por IA a partir dos perfis declarados pelos
            próprios membros. Trate-as como ponto de partida para uma conversa,
            não como due diligence.
          </p>
        </div>
      )}
    </div>
  );
}
