import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from "jwt-decode";

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Redirect authenticated users away from Login/Public pages
  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const role = decoded.role?.toUpperCase(); // Force Uppercase to match DB Enums

        if (role === 'DRIVER') return NextResponse.redirect(new URL('/driver', request.url));
        if (role === 'FARMER') return NextResponse.redirect(new URL('/farmer', request.url));
        if (role === 'DEPOT_MANAGER') return NextResponse.redirect(new URL('/dashboard', request.url));
        
      } catch (e) {
        // Token is garbage? Let them login.
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // 2. Protect Private Routes (No Token = Kick out)
  if (!token) {
    // If trying to access protected route, kick to login
    if (pathname.startsWith('/driver') || pathname.startsWith('/farmer') || pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 3. Role-Based Security (Stop Drivers from seeing Farmer pages)
  try {
    const decoded: any = jwtDecode(token);
    const role = decoded.role?.toUpperCase();

    if (pathname.startsWith('/driver') && role !== 'DRIVER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (pathname.startsWith('/farmer') && role !== 'FARMER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (pathname.startsWith('/dashboard') && role !== 'DEPOT_MANAGER') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (e) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// CRITICAL: This prevents the middleware from running on images/css
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}