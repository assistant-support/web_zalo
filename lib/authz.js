import 'server-only';
import { auth } from '@/auth';

export async function getServerSession() {
    const session = await auth();
    return session;
}

export function hasPerm(session, action) {
    const perms = session?.user?.perms;
    if (!Array.isArray(perms)) return false;
    return perms.some(p => p?.action === action || p === action);
}

export function assertPerm(session, action) {
    if (!hasPerm(session, action)) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }
}
