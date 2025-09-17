export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/account.model';
import Role from '@/models/role.model';

function hasPerm(session, action) {
    const perms = session?.user?.perms || [];
    return perms.some(p => (typeof p === 'string' ? p === action : p?.action === action));
}

export default async function UsersPage() {
    const session = await auth();
    if (!session?.user) return <div className="p-6">Bạn cần đăng nhập.</div>;

    if (!hasPerm(session, 'user:list')) {
        return <div className="p-6 text-red-600">Bạn không có quyền xem danh sách người dùng.</div>;
    }

    await dbConnect();
    const [users, roles] = await Promise.all([
        User.find({}).select('name email username role status avatar createdAt').sort({ createdAt: -1 }).lean(),
        Role.find({}).sort({ name: 1 }).lean(),
    ]);

    const canSetRole = hasPerm(session, 'user:role:update');

    return (
        <main className="p-6 space-y-8">
            <h1 className="text-2xl font-semibold">Quản lý quyền người dùng</h1>

            <section className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-[var(--surface-2)]">
                        <tr>
                            <th className="p-3 text-left">User</th>
                            <th className="p-3 text-left">Email</th>
                            <th className="p-3 text-left">Username</th>
                            <th className="p-3 text-left">Role</th>
                            <th className="p-3 text-left">Trạng thái</th>
                            <th className="p-3 text-left">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const currentRole = roles.find(r => String(r._id) === String(u.role));
                            return (
                                <tr key={u._id} className="border-t align-top">
                                    <td className="p-3">
                                        <div className="font-medium">{u.name}</div>
                                        <div className="text-xs text-[var(--muted)]">ID: {String(u._id)}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="break-all">{u.email}</div>
                                    </td>
                                    <td className="p-3">{u.username || '-'}</td>
                                    <td className="p-3">{currentRole ? currentRole.name : <i className="text-[var(--muted)]">None</i>}</td>
                                    <td className="p-3">
                                        <span className={u.status === 'active' ? 'text-green-600' : 'text-amber-600'}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        {canSetRole ? (
                                            <form action={async (formData) => {
                                                'use server';
                                                const { setUserRoleAction } = await import('./actions');
                                                return setUserRoleAction(formData);
                                            }} className="flex gap-2">
                                                <input type="hidden" name="userId" value={String(u._id)} />
                                                <select name="roleId" defaultValue={u.role ? String(u.role) : ''} className="input w-48">
                                                    <option value="">-- None --</option>
                                                    {roles.map(r => (
                                                        <option key={r._id} value={r._id}>{r.name}</option>
                                                    ))}
                                                </select>
                                                <button className="btn btn-outline">Đổi</button>
                                            </form>
                                        ) : (
                                            <span className="text-[var(--muted)]">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>
        </main>
    );
}
