// app/(admin)/users/page.js
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getUsers, getRoles } from './actions';
import UsersTable from './components/UsersTable';

export default async function UsersPage() {
    // 1. Lấy session của người dùng hiện tại
    const session = await auth();
    if (!session?.user) redirect('/login');

    const currentUser = session.user;
    const userPermissions = currentUser.perms || [];

    // 2. Kiểm tra quyền truy cập trang (dành cho cả admin và người có quyền)
    const canViewPage = currentUser.isAdmin || userPermissions.includes('users:read');
    if (!canViewPage) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                <p>You do not have permission to view this page.</p>
            </div>
        );
    }

    // 3. Chuẩn bị đối tượng permissions để truyền xuống client component
    //    Nếu là admin, tất cả các quyền đều là true.
    const permissions = {
        canChangeRole: currentUser.isAdmin || userPermissions.includes('users:role'),
        canEdit: currentUser.isAdmin || userPermissions.includes('users:edit'),
        canDelete: currentUser.isAdmin || userPermissions.includes('users:delete'),
        canCreate: currentUser.isAdmin || userPermissions.includes('users:create'),
    };

    // 4. Lấy dữ liệu cần thiết cho trang
    const users = await getUsers();
    const roles = await getRoles();

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">User Management</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <UsersTable
                    initialUsers={users}
                    initialRoles={roles}
                    permissions={permissions}
                    currentUserId={currentUser.id}
                />
            </div>
        </div>
    );
}