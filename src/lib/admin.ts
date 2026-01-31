// Admin emails that have access to admin features
const ADMIN_EMAILS: string[] = [
  // Add admin emails here
 'tchongass1@gmail.com'
];

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}
