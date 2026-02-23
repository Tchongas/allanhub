import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';
import { getActiveUserProduct } from '@/lib/supabase/db';
import { createHubToken, generateNonce } from '@/lib/hub/jwt';
import {
  buildFestaCallbackRedirectUrl,
  buildFestaHandoffResumePath,
  buildHubMembersErrorUrl,
  validateFestaHandoffRequest,
} from '@/lib/festa-handoff';

function redirectToHubMembersWithError(request: NextRequest, errorCode: string) {
  return NextResponse.redirect(buildHubMembersErrorUrl(request.nextUrl.origin, errorCode));
}

function buildGoogleResumeRedirect(request: NextRequest, params: { product: string; returnTo: string; redirectTo: string | null }) {
  const resumePath = buildFestaHandoffResumePath(params);
  const googleAuthUrl = new URL('/api/auth/google', request.url);
  googleAuthUrl.searchParams.set('redirect_to', resumePath);
  return NextResponse.redirect(googleAuthUrl);
}

function logFestaHandoffStart(params: { product?: string; returnTo?: string | null; redirectTo?: string | null; authenticated: boolean }) {
  console.info('festa_handoff_start', {
    product: params.product || null,
    return_to: params.returnTo || null,
    has_redirect_to: Boolean(params.redirectTo),
    authenticated: params.authenticated,
  });
}

function logFestaHandoffDenied(params: { reason: string; userId?: string; product?: string }) {
  console.warn('festa_handoff_denied', {
    reason: params.reason,
    user_id: params.userId || null,
    product: params.product || null,
  });
}

function logFestaHandoffSuccess(params: { userId: string; product: string }) {
  console.info('festa_handoff_success', {
    user_id: params.userId,
    product: params.product,
  });
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateFestaHandoffRequest(request.nextUrl.searchParams);

    if (!validation.ok || !validation.params) {
      logFestaHandoffDenied({ reason: validation.error || 'festa_invalid_request' });
      return redirectToHubMembersWithError(request, validation.error || 'festa_invalid_request');
    }

    const { product, returnTo, redirectTo } = validation.params;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('hub_session')?.value;

    if (!sessionToken) {
      logFestaHandoffStart({ product, returnTo, redirectTo, authenticated: false });
      return buildGoogleResumeRedirect(request, validation.params);
    }

    const supabase = createServiceRoleClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(sessionToken);

    if (authError || !user) {
      logFestaHandoffStart({ product, returnTo, redirectTo, authenticated: false });
      return buildGoogleResumeRedirect(request, validation.params);
    }

    const sessionProvider = String(user.app_metadata?.provider || '').toLowerCase();
    if (sessionProvider !== 'google') {
      logFestaHandoffDenied({ reason: 'non_google_session', product });
      return buildGoogleResumeRedirect(request, validation.params);
    }

    logFestaHandoffStart({ product, returnTo, redirectTo, authenticated: true });

    const hubUser = await ensureHubUserForAuthUser(user);

    if (!user.email) {
      logFestaHandoffDenied({ reason: 'missing_email', userId: hubUser.id, product });
      return redirectToHubMembersWithError(request, 'festa_missing_email');
    }

    const activeAccess = await getActiveUserProduct(hubUser.id, product);
    if (!activeAccess) {
      logFestaHandoffDenied({ reason: 'no_access', userId: hubUser.id, product });
      return redirectToHubMembersWithError(request, 'festa_no_access');
    }

    const token = await createHubToken({
      sub: hubUser.id,
      email: String(user.email).trim().toLowerCase(),
      name: hubUser.name || (user.user_metadata?.name as string | undefined),
      product,
      nonce: generateNonce(),
    });

    logFestaHandoffSuccess({ userId: hubUser.id, product });

    return NextResponse.redirect(
      buildFestaCallbackRedirectUrl({
        returnTo,
        token,
        redirectTo,
      })
    );
  } catch (error) {
    console.error('festa_handoff_error', {
      message: error instanceof Error ? error.message : 'Unknown handoff error',
    });
    return redirectToHubMembersWithError(request, 'festa_handoff_failed');
  }
}
