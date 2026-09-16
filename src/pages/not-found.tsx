import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { routes } from '@/routes/routes';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-5xl font-semibold text-gold-500">404</span>
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-muted max-w-sm text-sm">
        O endereço acessado não existe nesta área de membros.
      </p>
      <Button variant="outline" onClick={() => navigate(routes.home.path)}>
        Voltar ao início
      </Button>
    </div>
  );
}
