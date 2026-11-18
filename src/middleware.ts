import { NextResponse, type NextRequest } from 'next/server';

// Las páginas internas del panel docente requieren cookie de sesión; la validación real ocurre en cada API.
export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin/') && !req.cookies.get('sqld_admin')) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path+'] };
