// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { authService } from "./services/AuthService";
import {
    AuthenticationException,
    ExpiredTokenException,
    InvalidTokenException,
    TokenNotFoundException
} from "./utils/exceptions/http/AuthenticationException";


// ============================================
// STEP 1: Define public routes
// ============================================
const publicRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/verify-reset'
];

// ============================================
// MAIN MIDDLEWARE
// ============================================
export async function proxy(req: NextRequest) {
    try {
        const currentPath = req.nextUrl.pathname;

        // ============================================
        // STEP 2: Skip public routes
        // ============================================
        if (publicRoutes.some(route => currentPath === route || currentPath.startsWith(`${route}/`))) {
            return NextResponse.next();
        }

        // ============================================
        // STEP 3: Only protect /api routes
        // ============================================
        if (!currentPath.startsWith('/api/')) {
            return NextResponse.next();
        }

        // ============================================
        // STEP 4: Extract tokens from cookies
        // ============================================
        const authToken = req.cookies.get('auth_token')?.value;
        const refreshToken = req.cookies.get('refresh_token')?.value;

        // ============================================
        // STEP 5: Try Access Token
        // ============================================
        if (authToken) {
            try {
                const payload = await authService.validateAccessToken(authToken);
                const userRole = payload.userRole
                // ✅ Token valid - add user to headers
                const requestHeaders = new Headers(req.headers);
                requestHeaders.set('x-user-id', payload.userId);
                 requestHeaders.set('x-user-role', userRole);
                console.log (`[Middleware] Access token valid for user: ${payload.userId}`);

                return NextResponse.next({

                    request: {
                        headers: requestHeaders,
                    },
                });

            } catch (err) {
                if (err instanceof AuthenticationException) {
                    console.log ('[Middleware] Access token invalid, trying refresh...');

                    // ✅ Continue to refresh
                } else {
                    // Unexpected error - re-throw
                    throw err;
                }
            }
        }

        // ============================================
        // STEP 6: Try Refresh Token
        // ============================================
        if (refreshToken) {
            try {
                // ✅ Call refresh
                const { newAccessToken, newRefreshToken } = await authService.refresh(refreshToken);

                const response = NextResponse.next();

                // ✅ FIX: Set correct cookies (was setting newAccessToken for both)
                authService.setAccessCookie(response, newAccessToken);   // ← Access token
                authService.setRefreshCookie(response, newRefreshToken); // ← Refresh token (FIXED!)

                // ✅ Get user from new access token
                const payload = authService.validateAccessToken(newAccessToken);
                const userRole = payload.userRole

                // ✅ Add user to headers
                const requestHeaders = new Headers(req.headers);
                requestHeaders.set('x-user-id', payload.userId);
                   requestHeaders.set('x-user-role', userRole);

                console.log(`[Middleware] Tokens refreshed for user: ${payload.userId}`);

                return NextResponse.next({
                    request: {
                        headers: requestHeaders,
                    },
                });

            } catch (err) {
                // ✅ Handle specific refresh errors
                if (err instanceof TokenNotFoundException) {
                    console.log('[Middleware] Token not found');
                } else if (err instanceof ExpiredTokenException) {
                    console.log('[Middleware] EXPIRED TOKEN');
                } else if (err instanceof InvalidTokenException) {
                    console.log('[Middleware] Invalid token');
                } else {
                     console.log('[Middleware] Refresh error:', err);
                }

                // ✅ Clear invalid cookies and return 401
                const response = NextResponse.json(
                    {
                        success: false,
                        message: 'Session expired. Please login again.'
                    },
                    { status: 401 }
                );
                authService.clearAuthCookies(response);
                return response;
            }
        }

        // ============================================
        // STEP 7: No valid tokens
        // ============================================
        console.log(`[Middleware] No valid tokens for: ${currentPath}`);

        const response = NextResponse.json(
            {
                success: false,
                message: 'Authentication required'
            },
            { status: 401 }
        );
        authService.clearAuthCookies(response);
        return response;

    } catch (err) {
        // ============================================
        // STEP 8: Global error handler
        // ============================================
        console.log('[Middleware] Unexpected error:', err);

        const response = NextResponse.json(
            {
                success: false,
                message: 'Authentication error'
            },
            { status: 401 }
        );
        authService.clearAuthCookies(response);
        return response;
    }
}

// ============================================
// STEP 9: Matcher - Only run on API routes
// ============================================
export const config = {
    matcher: [
        '/api/:path*',
    ],
};
