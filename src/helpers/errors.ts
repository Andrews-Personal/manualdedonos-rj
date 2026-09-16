/**
 * Traduz o erro cru do Firebase para uma frase que o membro consegue agir em
 * cima. Mensagens do SDK vêm em inglês e com código embutido
 * ("Firebase: Error (auth/invalid-credential)."), o que não ajuda ninguém.
 */
const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta foi desativada. Fale com a organização.',
  'auth/user-not-found': 'Não encontramos uma conta com este e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Já existe uma conta com este e-mail.',
  'auth/weak-password': 'A senha precisa ter ao menos 8 caracteres, com maiúscula, minúscula, número e símbolo.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir o login.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique sua internet.',
  'permission-denied': 'Seu acesso ainda não foi liberado para esta área.',
  'unauthenticated': 'Sua sessão expirou. Entre novamente.',
  'resource-exhausted': 'Você atingiu o limite de uso por enquanto. Tente mais tarde.',
  'failed-precondition': 'Complete seu perfil antes de usar esta função.',
};

export function friendlyError(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const code = (error as { code?: string })?.code;

  if (code && AUTH_MESSAGES[code])
    return AUTH_MESSAGES[code];

  // HttpsError das Cloud Functions chega com `message` já em português —
  // escrito por nós, do outro lado. Aproveita.
  const message = (error as { message?: string })?.message;
  if (message && !message.startsWith('Firebase:') && !message.includes('INTERNAL'))
    return message;

  return fallback;
}
