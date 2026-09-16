import { useCallback, useEffect, useRef, useState } from 'react';

export type AsyncResource<T> = {
  data: T | null;
  loading: boolean;
  /**
   * Distinto de `data === null`: uma coleção vazia e uma leitura que falhou
   *  são coisas diferentes, e a tela precisa dizer qual das duas aconteceu.
   */
  error: Error | null;
  reload: () => void;
  setData: (value: T | null) => void;
};

/**
 * Executa uma leitura assíncrona expondo `loading`, `error` e `reload`.
 *
 * O detalhe que justifica o hook: uma leitura do Firestore não aceita
 * AbortSignal e o SDK tenta de novo sozinho, com backoff longo. Sem tratar o
 * erro explicitamente, uma falha de rede deixa a tela no esqueleto para
 * sempre, e uma coleção vazia fica indistinguível de uma que não carregou —
 * "nenhum encontro na agenda" quando na verdade a leitura morreu.
 */
export function useAsyncResource<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Guarda contra a resposta de uma leitura antiga sobrescrever a atual quando
  // as dependências mudam mais rápido do que o Firestore responde.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestIdRef.current;
    let active = true;

    // eslint-disable-next-line react/set-state-in-effect -- marcar 'carregando' antes de disparar a leitura é justamente o objetivo deste efeito.
    setLoading(true);
    // eslint-disable-next-line react/set-state-in-effect -- marcar 'carregando' antes de disparar a leitura é justamente o objetivo deste efeito.
    setError(null);

    loader()
      .then((result) => {
        if (!active || currentRequest !== requestIdRef.current)
          return;
        setData(result);
      })
      .catch((caught: unknown) => {
        if (!active || currentRequest !== requestIdRef.current)
          return;
        const normalized = caught instanceof Error ? caught : new Error(String(caught));
        console.error('[useAsyncResource] leitura falhou', normalized);
        setError(normalized);
      })
      .finally(() => {
        if (!active || currentRequest !== requestIdRef.current)
          return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react/exhaustive-deps -- `deps` é repassado pelo chamador de propósito.
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken(token => token + 1), []);

  return { data, loading, error, reload, setData };
}
