import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Public paths
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    if (token) {
      // If authenticated, redirect to appropriate dashboard
      try {
        const decoded: any = jwtDecode(token);
        const role = decoded.role?.toLowerCase();
        
        if (role === 'driver') return NextResponse.redirect(new URL('/driver', request.url));
        if (role === 'farmer') return NextResponse.redirect(new URL('/farmer', request.url));
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch (e) {
        // Invalid token, allow access to login
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // Protected paths
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Role-based access control
  try {
    const decoded: any = jwtDecode(token);
    const role = decoded.role?.toLowerCase();

    if (pathname.startsWith('/driver') && role !== 'driver') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (pathname.startsWith('/farmer') && role !== 'farmer') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (pathname.startsWith('/dashboard') && role !== 'depot_manager' && role !== 'admin') {
      // Assuming depot_manager or admin can access dashboard
      // If role is strictly depot_manager, then:
      if (role !== 'depot_manager') return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (e) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
