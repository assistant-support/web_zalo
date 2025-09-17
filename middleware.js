// middleware.js
import { auth } from '@/auth';

export default auth;

export const config = {
    /**
     * Match all request paths except for the ones starting with:
     * - api/auth: NextAuth.js internal routes
     * - api/realtime: Our custom API for socket tokens
     * - _next/static: static files
     * - _next/image: image optimization files
     * - favicon.ico: favicon file
     */
    matcher: ['/((?!api/auth|api/realtime|_next/static|_next/image|favicon.ico).*)'],
};