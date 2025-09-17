// app/(admin)/users/actions.js
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/account.model';
import Role from '@/models/role.model';
import { emitSocket } from '@/lib/realtime/emit';
import { assertPerm } from '@/lib/authz';
import bcrypt from 'bcryptjs';

const safeStr = v => (v || '').toString().trim();

/**
 * Tạo mới hoặc cập nhật người dùng
 */
export async function upsertUserAction(prevState, formData) {
    const session = await auth();
    assertPerm(session, 'user:create'); // Giả sử quyền create và update dùng chung

    const id = safeStr(formData.get('id'));
    const name = safeStr(formData.get('name'));
    const email = safeStr(formData.get('email')).toLowerCase();
    const password = safeStr(formData.get('password'));
    const status = safeStr(formData.get('status'));

    if (!name || !email) {
        return { ok: false, message: 'Tên và Email là bắt buộc.' };
    }
    if (!id && !password) {
        return { ok: false, message: 'Mật khẩu là bắt buộc cho người dùng mới.' };
    }

    try {
        await dbConnect();

        // Kiểm tra email tồn tại
        const existingUser = await User.findOne({ email: email, _id: { $ne: id } });
        if (existingUser) {
            return { ok: false, message: 'Email đã được sử dụng.' };
        }

        const userData = {
            name,
            email,
            status: status || 'active'
        };

        if (password) {
            userData.password = await bcrypt.hash(password, 10);
        }

        if (id) {
            // Cập nhật
            assertPerm(session, 'user:update');
            await User.findByIdAndUpdate(id, userData);
        } else {
            // Tạo mới
            assertPerm(session, 'user:create');
            await User.create(userData);
        }

        revalidatePath('/users');
        return { ok: true, message: id ? 'Cập nhật thành công!' : 'Tạo mới thành công!' };

    } catch (e) {
        console.error(e);
        return { ok: false, message: 'Đã có lỗi xảy ra.' };
    }
}

/**
 * Gán vai trò cho người dùng
 */
export async function setUserRoleAction(formData) {
    const session = await auth();
    assertPerm(session, 'user:role:update');

    const userId = safeStr(formData.get('userId'));
    const roleId = safeStr(formData.get('roleId'));

    if (!userId) return { ok: false, error: 'Missing userId' };

    await dbConnect();

    // Cho phép bỏ role (None)
    if (!roleId) {
        await User.findByIdAndUpdate(userId, { role: undefined });
        await emitSocket({
            target: { room: `u:${userId}` },
            event: 'auth:refresh',
            payload: { reason: 'role-removed' }
        });
    } else {
        const role = await Role.findById(roleId).lean();
        if (!role) return { ok: false, error: 'Role không tồn tại' };

        await User.findByIdAndUpdate(userId, { role: roleId });
        await emitSocket({
            target: { room: `u:${userId}` },
            event: 'auth:refresh',
            payload: { reason: 'role-changed', roleId: String(roleId) }
        });
    }

    revalidatePath('/users');
    return { ok: true };
}

/**
 * Xóa người dùng
 */
export async function deleteUserAction(userId) {
    const session = await auth();
    assertPerm(session, 'user:delete');

    try {
        await dbConnect();
        await User.findByIdAndDelete(userId);
        revalidatePath('/users');
        return { ok: true };
    } catch (e) {
        console.error(e);
        return { ok: false, message: 'Không thể xóa người dùng.' };
    }
}