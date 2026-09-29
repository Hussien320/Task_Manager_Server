// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from './services/AuthService';
import {
  AuthenticationException,
  ExpiredTokenException,
  InvalidTokenException,
  TokenNotFoundException,
} from './utils/exceptions/http/AuthenticationException';

// ============================================
// STEP 1: Define public routes
// ============================================

// Public API routes — no auth needed
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-reset',

];

// Public frontend pages — no auth needed
const publicPages = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
    '/logout'
];

// ============================================
// MAIN MIDDLEWARE
// ============================================
export async function proxy(req: NextRequest) {
  try {
    const currentPath = req.nextUrl.pathname;

    // ────────────────────────────────────────
    // Skip public API routes
    // ────────────────────────────────────────
    if (
      publicApiRoutes.some(
        (route) => currentPath === route || currentPath.startsWith(`${route}/`)
      )
    ) {
      return NextResponse.next();
    }

    // ────────────────────────────────────────
    // Skip public pages
    // ────────────────────────────────────────
    if (
      publicPages.some(
        (page) => currentPath === page || currentPath.startsWith(`${page}/`)
      )
    ) {
      return NextResponse.next();
    }

    // ────────────────────────────────────────
    // Determine route type
    // ────────────────────────────────────────
    const isApiRoute = currentPath.startsWith('/api/');

    // ────────────────────────────────────────
    // Extract tokens
    // ────────────────────────────────────────
    const authToken = req.cookies.get('auth_token')?.value;
    const refreshToken = req.cookies.get('refresh_token')?.value;

    // ────────────────────────────────────────
    // Try Access Token
    // ────────────────────────────────────────
    if (authToken) {
      try {
        const payload = await authService.validateAccessToken(authToken);

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', payload.userId);
        requestHeaders.set('x-user-role', payload.userRole);

        console.log(`[Middleware] ✅ Access token valid for ${currentPath}`);

        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      } catch (err) {
        if (err instanceof AuthenticationException) {
          console.log('[Middleware] Access token invalid, trying refresh...');
        } else {
          throw err;
        }
      }
    }

    // ────────────────────────────────────────
    // Try Refresh Token
    // ────────────────────────────────────────
    if (refreshToken) {
      try {
        const { newAccessToken, newRefreshToken } = await authService.refresh(refreshToken);

        const response = NextResponse.next();

        authService.setAccessCookie(response, newAccessToken);
        authService.setRefreshCookie(response, newRefreshToken);

        const payload = authService.validateAccessToken(newAccessToken);

        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', payload.userId);
        requestHeaders.set('x-user-role', payload.userRole);

        console.log(`[Middleware] ✅ Tokens refreshed for ${currentPath}`);

        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      } catch (err) {
        if (err instanceof TokenNotFoundException) {
          console.log('[Middleware] Token not found');
        } else if (err instanceof ExpiredTokenException) {
          console.log('[Middleware] EXPIRED TOKEN');
        } else if (err instanceof InvalidTokenException) {
          console.log('[Middleware] Invalid token');
        } else {
          console.log('[Middleware] Refresh error:', err);
        }
        // Fall through to "no valid tokens"
      }
    }

    // ────────────────────────────────────────
    // No valid tokens — DIFFERENT behavior
    // ────────────────────────────────────────
    console.log(`[Middleware] ❌ No auth for ${currentPath} (API: ${isApiRoute})`);

    // ═══════ API ROUTE → JSON 401 ═══════
    if (isApiRoute) {
      const response = NextResponse.json(
        {
          success: false,
          message: 'Authentication required',
        },
        { status: 401 }
      );
      authService.clearAuthCookies(response);
      return response;
    }

    // ═══════ FRONTEND PAGE → redirect to /login ═══════
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', currentPath);
    loginUrl.searchParams.set('message', 'Please login first');

    const response = NextResponse.redirect(loginUrl);
    authService.clearAuthCookies(response);
    return response;

  } catch (err) {
    console.log('[Middleware] Unexpected error:', err);

    const currentPath = req.nextUrl.pathname;
    const isApiRoute = currentPath.startsWith('/api/');

    if (isApiRoute) {
      const response = NextResponse.json(
        { success: false, message: 'Authentication error' },
        { status: 401 }
      );
      authService.clearAuthCookies(response);
      return response;
    }

    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('message', 'Please login first');
    const response = NextResponse.redirect(loginUrl);
    authService.clearAuthCookies(response);
    return response;
  }
}

// ============================================
// Matcher — API + protected frontend routes
// ============================================
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/products/:path*',
    '/suppliers/:path*',
    '/settings/:path*',
  ],
};