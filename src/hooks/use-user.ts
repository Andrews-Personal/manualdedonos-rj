import { use } from 'react';

import { UserContext } from '@/context/user-context-definition';

export function useUser() {
  const context = use(UserContext);

  if (!context)
    throw new Error('useUser precisa estar dentro de <UserProvider>.');

  return context;
}
