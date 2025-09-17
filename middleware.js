export { auth as middleware } from "@/auth";

export const config = {
    matcher: [
        '/((?!login|api/auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|assets|images|fonts|.*\\.(?:png|jpg|jpeg|gif|webp|svg)$).*)',
    ],
};
