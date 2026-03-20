export const CAR_STUDIO_PRODUCT_ID = 'car-studio';

const DEFAULT_CALLBACK_PATH = '/api/auth/callback';
const DEFAULT_CALLBACK_PATHS = [DEFAULT_CALLBACK_PATH, '/auth/callback/google'];
const ALLOWLIST_ENV_KEYS = ['CAR_STUDIO_CALLBACK_ALLOWLIST', 'CAR_STUDIO_HANDOFF_ALLOWLIST'];

export type CarStudioHandoffValidationError =
  | 'car_studio_invalid_product'
  | 'car_studio_invalid_return_to'
  | 'car_studio_invalid_redirect_to';

export interface CarStudioHandoffParams {
  product: string;
  returnTo: string;
  redirectTo: string | null;
}

export interface CarStudioHandoffValidationResult {
  ok: boolean;
  error?: CarStudioHandoffValidationError;
  params?: CarStudioHandoffParams;
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

function isValidRelativeRedirectPath(redirectTo: string): boolean {
  if (!redirectTo.startsWith('/')) return false;
  if (redirectTo.startsWith('//')) return false;

  try {
    const parsed = new URL(redirectTo, 'https://hub.local');
    return parsed.origin === 'https://hub.local';
  } catch {
    return false;
  }
}

export function getAllowedCarStudioReturnToList(env: NodeJS.ProcessEnv = process.env): string[] {
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

  const carStudioBaseUrlCandidates = [
    String(env.CAR_STUDIO_URL || '').trim(),
    String(env.CAR_STUDIO_URLS || '').trim(),
  ];

  for (const rawCandidate of carStudioBaseUrlCandidates) {
    if (!rawCandidate) continue;

    for (const value of rawCandidate.split(',')) {
      const carStudioBaseUrl = String(value || '').trim();
      if (!carStudioBaseUrl) continue;

      for (const callbackPath of DEFAULT_CALLBACK_PATHS) {
        try {
          const callbackUrl = new URL(callbackPath, carStudioBaseUrl).toString();
          const normalized = normalizeAbsoluteHttpUrl(callbackUrl);
          if (normalized) {
            allowlist.add(normalized);
          }
        } catch {
          // Ignore malformed Car Studio URL values and rely on other allowlist entries.
        }
      }
    }
  }

  return Array.from(allowlist);
}

export function validateCarStudioHandoffRequest(
  searchParams: URLSearchParams,
  allowedReturnToList: string[] = getAllowedCarStudioReturnToList()
): CarStudioHandoffValidationResult {
  const product = String(searchParams.get('product') || '').trim();
  if (product !== CAR_STUDIO_PRODUCT_ID) {
    return { ok: false, error: 'car_studio_invalid_product' };
  }

  const normalizedReturnTo = normalizeAbsoluteHttpUrl(searchParams.get('return_to') || '');
  if (!normalizedReturnTo || !allowedReturnToList.includes(normalizedReturnTo)) {
    return { ok: false, error: 'car_studio_invalid_return_to' };
  }

  const redirectToRaw = searchParams.get('redirect_to');
  let redirectTo: string | null = null;

  if (redirectToRaw !== null) {
    const value = String(redirectToRaw).trim();
    if (!value || !isValidRelativeRedirectPath(value)) {
      return { ok: false, error: 'car_studio_invalid_redirect_to' };
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

export function buildCarStudioHandoffResumePath(params: CarStudioHandoffParams): string {
  const query = new URLSearchParams({
    product: params.product,
    return_to: params.returnTo,
  });

  if (params.redirectTo) {
    query.set('redirect_to', params.redirectTo);
  }

  return `/api/auth/car-studio/start?${query.toString()}`;
}

export function buildCarStudioCallbackRedirectUrl(params: {
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

export function buildHubMembersErrorUrlForCarStudio(origin: string, errorCode: string): string {
  const errorUrl = new URL('/', origin);
  errorUrl.searchParams.set('error', errorCode);
  errorUrl.searchParams.set('product', CAR_STUDIO_PRODUCT_ID);
  return errorUrl.toString();
}
