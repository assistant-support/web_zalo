// middleware.js
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    console.log(`[Middleware] Route: ${nextUrl.pathname}, Logged In: ${isLoggedIn}`);

    const isApiAuthRoute = nextUrl.pathname.startsWith('/api/auth');
    const isLoginPage = nextUrl.pathname.startsWith('/login');

    if (isApiAuthRoute) return NextResponse.next();

    if (isLoggedIn && isLoginPage) {
        console.log('[Middleware] Đã đăng nhập, chuyển hướng từ /login về /');
        return NextResponse.redirect(new URL('/', nextUrl));
    }

    if (!isLoggedIn && !isLoginPage) {
        console.log('[Middleware] Chưa đăng nhập, chuyển hướng về /login');
        return NextResponse.redirect(new URL('/login', nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};