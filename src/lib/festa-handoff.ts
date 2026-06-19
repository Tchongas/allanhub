/**
 * Validação e construção do handoff seguro Hub → Festa Mágica.
 *
 * Regras de segurança:
 * - `product` deve ser `festa-magica`.
 * - `return_to` deve estar na allowlist (envs `FESTA_CALLBACK_ALLOWLIST` ou fallback por `FESTA_MAGICA_URL`).
 * - `redirect_to` só é aceito se for caminho relativo (evita open redirect).
 *
 * Usado em `/api/auth/festa-magica/start`.
 */
export const FESTA_PRODUCT_ID = 'festa-magica';

const DEFAULT_CALLBACK_PATH = '/api/auth/callback';
const DEFAULT_CALLBACK_PATHS = [DEFAULT_CALLBACK_PATH, '/auth/callback/google'];
const ALLOWLIST_ENV_KEYS = ['FESTA_CALLBACK_ALLOWLIST', 'FESTA_HANDOFF_ALLOWLIST'];

export type FestaHandoffValidationError =
  | 'festa_invalid_product'
  | 'festa_invalid_return_to'
  | 'festa_invalid_redirect_to';

export interface FestaHandoffParams {
  product: string;
  returnTo: string;
  redirectTo: string | null;
}

export interface FestaHandoffValidationResult {
  ok: boolean;
  error?: FestaHandoffValidationError;
  params?: FestaHandoffParams;
}

function normalizeAbsoluteHttpUrl(value: string): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.hash) return null;
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export function isValidRelativeRedirectPath(redirectTo: string): boolean {
  if (!redirectTo.startsWith('/')) return false;
  if (redirectTo.startsWith('//')) return false;

  try {
    const parsed = new URL(redirectTo, 'https://hub.local');
    return parsed.origin === 'https://hub.local';
  } catch {
    return false;
  }
}

export function getAllowedFestaReturnToList(env: NodeJS.ProcessEnv = process.env): string[] {
  const allowlist = new Set<string>();

  for (const key of ALLOWLIST_ENV_KEYS) {
    const raw = String(env[key] || '').trim();
    if (!raw) continue;

    for (const value of raw.split(',')) {
      const normalized = normalizeAbsoluteHttpUrl(value);
      if (normalized) {
        allowlist.add(normalized);
      }
    }
  }

  const festaBaseUrlCandidates = [
    String(env.FESTA_MAGICA_URL || '').trim(),
    String(env.FESTA_MAGICA_URLS || '').trim(),
  ];

  for (const rawCandidate of festaBaseUrlCandidates) {
    if (!rawCandidate) continue;

    for (const value of rawCandidate.split(',')) {
      const festaBaseUrl = String(value || '').trim();
      if (!festaBaseUrl) continue;

      for (const callbackPath of DEFAULT_CALLBACK_PATHS) {
        try {
          const callbackUrl = new URL(callbackPath, festaBaseUrl).toString();
          const normalized = normalizeAbsoluteHttpUrl(callbackUrl);
          if (normalized) {
            allowlist.add(normalized);
          }
        } catch {
          // Ignore malformed Festa URL values and rely on other allowlist entries.
        }
      }
    }
  }

  return Array.from(allowlist);
}

export function validateFestaHandoffRequest(
  searchParams: URLSearchParams,
  allowedReturnToList: string[] = getAllowedFestaReturnToList()
): FestaHandoffValidationResult {
  const product = String(searchParams.get('product') || '').trim();
  if (product !== FESTA_PRODUCT_ID) {
    return { ok: false, error: 'festa_invalid_product' };
  }

  const normalizedReturnTo = normalizeAbsoluteHttpUrl(searchParams.get('return_to') || '');
  if (!normalizedReturnTo || !allowedReturnToList.includes(normalizedReturnTo)) {
    return { ok: false, error: 'festa_invalid_return_to' };
  }

  const redirectToRaw = searchParams.get('redirect_to');
  let redirectTo: string | null = null;

  if (redirectToRaw !== null) {
    const value = String(redirectToRaw).trim();
    if (!value || !isValidRelativeRedirectPath(value)) {
      return { ok: false, error: 'festa_invalid_redirect_to' };
    }
    redirectTo = value;
  }

  return {
    ok: true,
    params: {
      product,
      returnTo: normalizedReturnTo,
      redirectTo,
    },
  };
}

export function buildFestaHandoffResumePath(params: FestaHandoffParams): string {
  const query = new URLSearchParams({
    product: params.product,
    return_to: params.returnTo,
  });

  if (params.redirectTo) {
    query.set('redirect_to', params.redirectTo);
  }

  return `/api/auth/festa-magica/start?${query.toString()}`;
}

export function buildFestaCallbackRedirectUrl(params: {
  returnTo: string;
  token: string;
  redirectTo?: string | null;
}): string {
  const redirectUrl = new URL(params.returnTo);
  redirectUrl.searchParams.set('token', params.token);

  if (params.redirectTo) {
    redirectUrl.searchParams.set('redirect_to', params.redirectTo);
  }

  return redirectUrl.toString();
}

export function buildHubMembersErrorUrl(origin: string, errorCode: string): string {
  const errorUrl = new URL('/', origin);
  errorUrl.searchParams.set('error', errorCode);
  errorUrl.searchParams.set('product', FESTA_PRODUCT_ID);
  return errorUrl.toString();
}
