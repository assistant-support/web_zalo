// app/(admin)/roles/page.js
export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { dbConnect } from '@/lib/db';
import Role from '@/models/role.model';
import Permission from '@/models/permission.model';
import { hasPerm } from '@/lib/authz';
import RoleCard from './components/RoleCard';
import RoleDialog from './components/RoleDialog';

export default async function RolesPage() {
    const session = await auth();
    if (!session?.user) {
        return <div className="p-6">Bạn cần đăng nhập.</div>;
    }
    if (!hasPerm(session, 'role:list')) {
        return <div className="p-6 text-red-600">Bạn không có quyền xem danh sách vai trò.</div>;
    }

    await dbConnect();
    const roles = JSON.parse(JSON.stringify(
        await Role.find({}).populate('permissions.permission').sort({ name: 1 }).lean()
    ));
    const permissions = JSON.parse(JSON.stringify(
        await Permission.find({}).sort({ group: 1, action: 1 }).lean()
    ));

    const userPermissions = {
        canCreate: hasPerm(session, 'role:create'),
        canUpdate: hasPerm(session, 'role:update'),
        canDelete: hasPerm(session, 'role:delete')
    };

    // Gom nhóm permissions theo group để hiển thị
    const groupedPermissions = permissions.reduce((acc, p) => {
        const group = p.group || 'Chung';
        if (!acc[group]) acc[group] = [];
        acc[group].push(p);
        return acc;
    }, {});

    return (
        <main className="p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">Quản lý Vai trò & Phân quyền</h1>
                {userPermissions.canCreate && <RoleDialog />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {roles.map(role => (
                    <RoleCard
                        key={role._id}
                        role={role}
                        groupedPermissions={groupedPermissions}
                        allPermissions={permissions}
                        userPermissions={userPermissions}
                    />
                ))}
            </div>
        </main>
    );
}