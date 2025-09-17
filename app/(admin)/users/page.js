// app/(admin)/users/page.js
export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import User from '@/models/account.model';
import Role from '@/models/role.model';
import { hasPerm } from '@/lib/authz';
import UsersTable from './components/UsersTable';
import { getSessionAction } from '@/app/actions/auth-actions';

export default async function UsersPage() {
    const session = await getSessionAction();
    console.log(session);
    
    if (!session?.user) {
        return <div className="p-6">Bạn cần đăng nhập.</div>;
    }

    if (!hasPerm(session, 'user:list')) {
        return <div className="p-6 text-red-600">Bạn không có quyền xem danh sách người dùng.</div>;
    }

    await dbConnect();
    // Dùng JSON.parse(JSON.stringify(...)) để đảm bảo object an toàn khi truyền từ Server Component sang Client Component
    const users = JSON.parse(JSON.stringify(
        await User.find({}).select('name email username role status avatar createdAt').sort({ createdAt: -1 }).lean()
    ));
    const roles = JSON.parse(JSON.stringify(
        await Role.find({}).sort({ name: 1 }).lean()
    ));

    const permissions = {
        canCreateUser: hasPerm(session, 'user:create'),
        canUpdateUser: hasPerm(session, 'user:update'),
        canDeleteUser: hasPerm(session, 'user:delete'),
        canSetRole: hasPerm(session, 'user:role:update')
    };

    return (
        <main className="p-6 space-y-8">
            <h1 className="text-2xl font-semibold">Quản lý Người dùng</h1>
            <UsersTable
                users={users}
                roles={roles}
                permissions={permissions}
            />
        </main>
    );
}