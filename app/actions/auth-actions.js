// my-app/app/actions/auth-actions.js
'use server';

import { getServerSession } from '@/lib/authz';

/**
 * Lấy session ở server trả về client (chỉ các trường cần thiết)
 * Bạn có thể dùng ở client qua form action hoặc useActionState.
 */
export async function getSessionAction() {
    const session = await getServerSession();
    if (!session?.user) return { ok: false, user: null };
    const { user } = session;
    // Chỉ trả về dữ liệu serializable cần dùng ở UI
    return {
        ok: true,
        user: {
            id: user.id,
            email: user.email || null,
            username: user.username || null,
            roleId: user.roleId || null,
            roleName: user.roleName || null,
            isAdmin: !!user.isAdmin,
            perms: Array.isArray(user.perms) ? user.perms : []
        }
    };
}

/**
 * (Tùy chọn) Yêu cầu refresh session cho chính mình từ server
 * Sẽ bắn socket 'auth:refresh' tới u:<uid> và client sẽ gọi session.update()
 */
import { emitSocket } from '@/lib/realtime/emit';
export async function requestMySessionRefreshAction() {
    const session = await getServerSession();
    if (!session?.user?.id) return { ok: false, error: 'Unauthenticated' };
    await emitSocket({
        target: { room: `u:${session.user.id}` },
        event: 'auth:refresh',
        payload: { reason: 'manual' }
    });
    return { ok: true };
}
