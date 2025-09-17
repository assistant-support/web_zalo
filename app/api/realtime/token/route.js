// app/api/realtime/token/route.js
import { auth } from '@/auth';
import jwt from 'jsonwebtoken';

// Chỉ sử dụng duy nhất AUTH_SECRET
const AUTH_SECRET = process.env.AUTH_SECRET;

export async function GET() {
    if (!AUTH_SECRET) {
        console.error('[API/realtime] Lỗi nghiêm trọng: Biến môi trường AUTH_SECRET chưa được thiết lập!');
        return Response.json({ ok: false, error: 'Server misconfigured' }, { status: 500 });
    }

    const session = await auth();
    if (!session?.user) {
        return Response.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
    }

    const { user } = session;
    const payload = {
        uid: user.id,
        name: user.name,
        roleId: user.roleId,
    };
    console.log(AUTH_SECRET,1);
    const token = jwt.sign(payload, AUTH_SECRET, { expiresIn: '1h' });
    return Response.json({ ok: true, token });
}