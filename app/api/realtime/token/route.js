import 'server-only';
import { auth } from '@/auth';
import jwt from 'jsonwebtoken';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return Response.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
    }

    const secret = process.env.AUTH_SOCKET_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        return Response.json({ ok: false, error: 'Missing secret' }, { status: 500 });
    }

    const payload = {
        uid: session.user.id,
        roleId: session.user.roleId || null
    };

    const token = jwt.sign(payload, secret, { expiresIn: '2m' });

    return Response.json({ ok: true, token, uid: payload.uid, roleId: payload.roleId });
}
