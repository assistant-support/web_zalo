'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/account.model';
import Role from '@/models/role.model';
import { emitSocket } from '@/lib/realtime/emit';

function assertPerm(session, action) {
    const perms = session?.user?.perms || [];
    const ok = perms.some(p => (typeof p === 'string' ? p === action : p?.action === action));
    if (!ok) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }
}
const safeStr = v => (v || '').toString().trim();

export async function setUserRoleAction(formData) {
    const session = await auth();
    if (!session?.user) return { ok: false, error: 'Unauthenticated', status: 401 };
    assertPerm(session, 'user:role:update');

    await dbConnect();

    const userId = safeStr(formData.get('userId'));
    const roleId = safeStr(formData.get('roleId'));
    if (!userId) return { ok: false, error: 'Missing userId' };

    // Cho phép bỏ role (None)
    if (!roleId) {
        const user = await User.findByIdAndUpdate(userId, { role: undefined }, { new: true }).lean();
        if (!user) return { ok: false, error: 'User không tồn tại' };
        await emitSocket({
            target: { room: `u:${userId}` },
            event: 'auth:refresh',
            payload: { reason: 'role-removed' }
        });
        revalidatePath('/users');
        return { ok: true };
    }

    const role = await Role.findById(roleId).lean();
    if (!role) return { ok: false, error: 'Role không tồn tại' };

    const user = await User.findByIdAndUpdate(userId, { role: roleId }, { new: true }).lean();
    if (!user) return { ok: false, error: 'User không tồn tại' };

    // ✅ chỉ bắn tới user đó
    await emitSocket({
        target: { room: `u:${userId}` },
        event: 'auth:refresh',
        payload: { reason: 'role-changed', roleId: String(roleId) }
    });

    revalidatePath('/users');
    return { ok: true };
}
