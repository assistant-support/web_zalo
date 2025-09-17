// lib/authz.js
import { auth } from "@/auth";

export async function getServerSession() {
    return auth();
}

/**
 * Kiểm tra xem session có một quyền cụ thể hay không.
 * **Admin (isAdmin === true) sẽ luôn có quyền.**
 * @param {object} session - Đối tượng session người dùng từ next-auth.
 * @param {string} action - Tên quyền cần kiểm tra (ví dụ: 'user:create').
 * @returns {boolean} - True nếu người dùng có quyền, ngược lại là false.
 */
export function hasPerm(session, action) {
    // Nếu user.isAdmin là true, luôn trả về true
    if (session?.user?.isAdmin) {
        return true;
    }

    // Nếu không phải admin, kiểm tra quyền như bình thường
    const perms = session?.user?.perms || [];
    return perms.some(p => (typeof p === 'string' ? p === action : p?.action === action));
}

/**
 * Khẳng định session phải có một quyền cụ thể. Sẽ throw lỗi nếu không có.
 * **Admin (isAdmin === true) sẽ luôn vượt qua kiểm tra này.**
 * @param {object} session - Đối tượng session người dùng từ next-auth.
 * @param {string} action - Tên quyền cần khẳng định.
 */
export function assertPerm(session, action) {
    // Nếu user.isAdmin là true, bỏ qua và không làm gì cả
    if (session?.user?.isAdmin) {
        return;
    }

    // Nếu không phải admin, kiểm tra quyền như bình thường
    const perms = session?.user?.perms || [];
    const ok = perms.some(p => (typeof p === 'string' ? p === action : p?.action === action));

    if (!ok) {
        const err = new Error(`Forbidden: Lacking permission for "${action}"`);
        err.status = 403;
        throw err;
    }
}