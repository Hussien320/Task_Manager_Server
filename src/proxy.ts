// src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { auth_service } from "./services/auth_service";
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
        const currentpath = req.nextUrl.pathname;
        
        // ============================================
        // STEP 2: Skip public routes
        // ============================================
        if (publicRoutes.some(route => currentpath === route || currentpath.startsWith(`${route}/`))) {
            return NextResponse.next();
        }

        // ============================================
        // STEP 3: Only protect /api routes
        // ============================================
        if (!currentpath.startsWith('/api/')) {
            return NextResponse.next();
        }

        // ============================================
        // STEP 4: Extract tokens from cookies
        // ============================================
        const auth_token = req.cookies.get('auth_token')?.value;
        const refresh_token = req.cookies.get('refresh_token')?.value;

        // ============================================
        // STEP 5: Try Access Token
        // ============================================
        if (auth_token) {
            try {
                const payload = await auth_service.validateAccesToken(auth_token);
                const user_id=payload.user_id;
                const user_role=payload.user_role            
                // ✅ Token valid - add user to headers
                const requestHeaders = new Headers(req.headers);
                requestHeaders.set('x-user-id', payload.user_id);
                 requestHeaders.set('x-user-role', user_role); 
                console.log (`[Middleware] Access token valid for user: ${payload.user_id}`);
                
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
        if (refresh_token) {
            try {
                // ✅ Call refresh
                const { new_acces, new_refresh } = await auth_service.refresh(refresh_token);
                
                const response = NextResponse.next();
                
                // ✅ FIX: Set correct cookies (was setting new_acces for both)
                auth_service.setAccessCookie(response, new_acces);   // ← Access token
                auth_service.setRefreshCookie(response, new_refresh); // ← Refresh token (FIXED!)
                
                // ✅ Get user from new access token
                const payload = auth_service.validateAccesToken(new_acces);
                const user_id=payload.user_id;
                const user_role=payload.user_role
                
                // ✅ Add user to headers
                const requestHeaders = new Headers(req.headers);
                requestHeaders.set('x-user-id', payload.user_id);
                   requestHeaders.set('x-user-role', user_role); 
                
                console.log(`[Middleware] Tokens refreshed for user: ${payload.user_id}`);
                
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
                auth_service.clearAuthCookies(response);
                return response;
            }
        }

        // ============================================
        // STEP 7: No valid tokens
        // ============================================
        console.log(`[Middleware] No valid tokens for: ${currentpath}`);
        
        const response = NextResponse.json(
            { 
                success: false, 
                message: 'Authentication required' 
            },
            { status: 401 }
        );
        auth_service.clearAuthCookies(response);
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
        auth_service.clearAuthCookies(response);
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