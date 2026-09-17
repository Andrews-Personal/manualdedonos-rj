import { Component } from 'react';

import { Button } from './button';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Último anteparo antes da tela branca.
 *
 * Um erro de render em qualquer página desmonta a árvore inteira do React —
 * incluindo o cabeçalho e o menu — e o membro fica sem nem o caminho de volta.
 * Aqui ele pelo menos recebe uma tela com um botão.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('[ErrorBoundary] erro não tratado', { error, info });
  }

  render() {
    if (!this.state.error)
      return this.props.children;

    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="display-type text-3xl">Algo deu errado</h1>
        <p className="text-muted max-w-md text-sm">
          A página encontrou um erro inesperado. Recarregar costuma resolver; se
          persistir, avise a organização.
        </p>
        <Button onClick={() => window.location.reload()}>Recarregar página</Button>
      </div>
    );
  }
}
