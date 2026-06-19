/**
 * Controle de acesso administrativo.
 *
 * Os emails abaixo são considerados administradores do Hub.
 * Altere esta lista antes de publicar em produção.
 *
 * Uso: `isAdmin(email)` é chamado em todas as rotas `/api/admin/*` e
 * na página `/admin` para proteger o painel.
 */
const ADMIN_EMAILS: string[] = [
  'tchongass1@gmail.com',
  'allanfulcher@gmail.com'
];

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}
