// app/(admin)/roles/actions.js
"use server";

import { revalidatePath } from 'next/cache';
import { dbConnect } from "@/lib/db";
import Role from "@/models/role.model";
import Permission from "@/models/permission.model";
import { getServerSession, assertPerm } from "@/lib/authz";
import { emitSocket } from "@/lib/realtime/emit";

/**
 * Tạo mới vai trò
 */
export async function createRoleAction(prevState, formData) {
    const session = await getServerSession();
    assertPerm(session, "role:create");

    const name = formData.get('name')?.toString().trim();
    if (!name) {
        return { ok: false, message: "Tên vai trò là bắt buộc." };
    }

    try {
        await dbConnect();
        const existing = await Role.findOne({ name });
        if (existing) {
            return { ok: false, message: "Tên vai trò đã tồn tại." };
        }
        await Role.create({ name });
        revalidatePath('/roles');
        return { ok: true, message: 'Tạo vai trò thành công!' };
    } catch (e) {
        console.error(e);
        return { ok: false, message: "Đã có lỗi xảy ra." };
    }
}

/**
 * Cập nhật quyền cho một vai trò
 */
export async function updateRolePermissionsAction(input) {
    const session = await getServerSession();
    assertPerm(session, "role:update");

    const roleId = input?.roleId;
    const permissionIds = input?.permissionIds || [];
    if (!roleId) return { ok: false, error: "Missing roleId" };

    const bindings = permissionIds.map(pid => ({ permission: pid }));

    await dbConnect();
    await Role.findByIdAndUpdate(roleId, { permissions: bindings });

    // Thông báo cho tất cả người dùng thuộc vai trò này để làm mới session
    await emitSocket({
        target: { room: `role:${roleId}` },
        event: "auth:refresh",
        payload: { reason: "role-permissions-updated" }
    });

    revalidatePath('/roles');
    return { ok: true };
}

/**
 * Xóa một vai trò
 */
export async function deleteRoleAction(roleId) {
    const session = await getServerSession();
    assertPerm(session, "role:delete");

    try {
        await dbConnect();
        // Thêm kiểm tra: không cho xóa nếu đang có user sử dụng
        const userWithRole = await User.findOne({ role: roleId });
        if (userWithRole) {
            return { ok: false, message: 'Không thể xóa vai trò đang được gán cho người dùng.' };
        }

        await Role.findByIdAndDelete(roleId);
        revalidatePath('/roles');
        return { ok: true };
    } catch (e) {
        console.error(e);
        return { ok: false, message: 'Đã có lỗi xảy ra.' };
    }
}