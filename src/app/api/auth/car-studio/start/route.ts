import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { ensureHubUserForAuthUser } from '@/lib/hub-user';
import { createHubToken } from '@/lib/hub/jwt';
import {
  buildCarStudioCallbackRedirectUrl,
  buildCarStudioHandoffResumePath,
  buildHubMembersErrorUrlForCarStudio,
  validateCarStudioHandoffRequest,
} from '@/lib/car-studio-handoff';

function redirectToHubMembersWithError(request: NextRequest, errorCode: string) {
  return NextResponse.redirect(buildHubMembersErrorUrlForCarStudio(request.nextUrl.origin, errorCode));
}

function buildGoogleResumeRedirect(
  request: NextRequest,
  params: { product: string; returnTo: string; nonce: string; redirectTo: string | null }
) {
  const resumePath = buildCarStudioHandoffResumePath(params);
  const googleAuthUrl = new URL('/api/auth/google', request.url);
  googleAuthUrl.searchParams.set('redirect_to', resumePath);
  return NextResponse.redirect(googleAuthUrl);
}

function logCarStudioHandoffStart(params: { product?: string; returnTo?: string | null; redirectTo?: string | null; authenticated: boolean }) {
  console.info('car_studio_handoff_start', {
    product: params.product || null,
    return_to: params.returnTo || null,
    has_redirect_to: Boolean(params.redirectTo),
    authenticated: params.authenticated,
  });
}

function logCarStudioHandoffDenied(params: { reason: string; userId?: string; product?: string }) {
  console.warn('car_studio_handoff_denied', {
    reason: params.reason,
    user_id: params.userId || null,
    product: params.product || null,
  });
}

function logCarStudioHandoffSuccess(params: { userId: string; product: string }) {
  console.info('car_studio_handoff_success', {
    user_id: params.userId,
    product: params.product,
  });
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateCarStudioHandoffRequest(request.nextUrl.searchParams);

    if (!validation.ok || !validation.params) {
      logCarStudioHandoffDenied({ reason: validation.error || 'car_studio_invalid_request' });
      return redirectToHubMembersWithError(request, validation.error || 'car_studio_invalid_request');
    }

    const { product, returnTo, nonce, redirectTo } = validation.params;

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('hub_session')?.value;

    if (!sessionToken) {
      logCarStudioHandoffStart({ product, returnTo, redirectTo, authenticated: false });
      return buildGoogleResumeRedirect(request, validation.params);
    }

    const supabase = createServiceRoleClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(sessionToken);

    if (authError || !user) {
      logCarStudioHandoffStart({ product, returnTo, redirectTo, authenticated: false });
      return buildGoogleResumeRedirect(request, validation.params);
    }

    const sessionProvider = String(user.app_metadata?.provider || '').toLowerCase();
    if (sessionProvider !== 'google') {
      logCarStudioHandoffDenied({ reason: 'non_google_session', product });
      return buildGoogleResumeRedirect(request, validation.params);
    }

    logCarStudioHandoffStart({ product, returnTo, redirectTo, authenticated: true });

    const hubUser = await ensureHubUserForAuthUser(user);

    if (!user.email) {
      logCarStudioHandoffDenied({ reason: 'missing_email', userId: hubUser.id, product });
      return redirectToHubMembersWithError(request, 'car_studio_missing_email');
    }

    const token = await createHubToken({
      sub: hubUser.id,
      email: String(user.email).trim().toLowerCase(),
      name: hubUser.name || (user.user_metadata?.name as string | undefined),
      product,
      nonce,
    });

    logCarStudioHandoffSuccess({ userId: hubUser.id, product });

    return NextResponse.redirect(
      buildCarStudioCallbackRedirectUrl({
        returnTo,
        token,
        redirectTo,
      })
    );
  } catch (error) {
    console.error('car_studio_handoff_error', {
      message: error instanceof Error ? error.message : 'Unknown handoff error',
    });
    return redirectToHubMembersWithError(request, 'car_studio_handoff_failed');
  }
}
