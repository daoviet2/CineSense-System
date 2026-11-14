import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Route Guard Middleware (Decision D11)
 *
 * Checks if the httpOnly cookie `access_token` exists to protect authenticated routes.
 *
 * Security Note:
 * - This is a UX-level route guard for immediate redirection in the edge runtime.
 * - True cryptographic authentication & authorization is enforced at the backend API layer.
 *
 * Guards profile and Phase 3 activity routes. The backend remains the security boundary.
 * TODO: Thêm /recommendations vào guard khi trang đó được tạo ở Giai đoạn 4.
 */

const PROTECTED_ROUTES = ['/profile', '/history', '/watchlist'];
const AUTH_ROUTES = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessToken = request.cookies.has('access_token');

  // Guard for protected routes: redirect unauthenticated users to /login
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !hasAccessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Guard for auth routes: redirect already authenticated users away to /
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isAuthRoute && hasAccessToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static public assets with extensions (.svg, .png, .jpg, .jpeg, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
