// app/(admin)/users/actions.js
'use server';

import { revalidatePath } from 'next/cache';
import { connectToDB } from '@/lib/db';
import { triggerSessionUpdate } from '@/lib/realtime/emit';
import Account from '@/models/account.model';
import Role from '@/models/role.model';
import { auth } from '@/auth';

// Hàm lấy tất cả người dùng (không cần kiểm tra quyền ở đây)
export async function getUsers() {
    try {
        await connectToDB();
        const users = await Account.find({}).populate('role').lean();
        return JSON.parse(JSON.stringify(users));
    } catch (error) {
        console.error('[Action Error] Failed to fetch users:', error);
        return [];
    }
}

// Hàm lấy tất cả các vai trò (không cần kiểm tra quyền ở đây)
export async function getRoles() {
    try {
        await connectToDB();
        const roles = await Role.find({}).lean();
        return JSON.parse(JSON.stringify(roles));
    } catch (error) {
        console.error('[Action Error] Failed to fetch roles:', error);
        return [];
    }
}

// Action để thay đổi vai trò của người dùng
export async function updateUserRole(userId, newRoleId) {
    console.log(`[Action] Updating role for user ${userId} to ${newRoleId}`);
    const session = await auth();

    // --- PHẦN CẬP NHẬT LOGIC QUAN TRỌNG ---
    // Kiểm tra quyền: Cho phép nếu người dùng là admin HOẶC có quyền 'users:role'.
    const canUpdateRole = session?.user?.isAdmin || session?.user?.perms.includes('users:role');

    if (!canUpdateRole) {
        console.warn(`[Action Denied] User ${session?.user?.email} does not have permission to update roles.`);
        return { success: false, message: 'Permission denied.' };
    }
    // --- KẾT THÚC PHẦN CẬP NHẬT ---

    try {
        await connectToDB();
        const userToUpdate = await Account.findByIdAndUpdate(userId, { role: newRoleId }, { new: true });
        if (!userToUpdate) {
            return { success: false, message: 'User not found.' };
        }

        // Kích hoạt cập nhật session real-time cho người dùng bị ảnh hưởng
        await triggerSessionUpdate(userId, { roleId: newRoleId });

        revalidatePath('/admin/users'); // Làm mới cache của trang users
        return { success: true, message: 'User role updated successfully!' };
    } catch (error) {
        console.error('[Action Error] Failed to update user role:', error);
        return { success: false, message: 'An error occurred.' };
    }
}