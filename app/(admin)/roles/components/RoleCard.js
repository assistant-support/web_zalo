// app/(admin)/roles/components/RoleCard.js
'use client';

import { useState, useTransition } from 'react';
import { updateRolePermissionsAction, deleteRoleAction } from '../actions';

export default function RoleCard({ role, groupedPermissions, allPermissions, userPermissions }) {
    const [currentPermissionIds, setCurrentPermissionIds] = useState(
        role.permissions.map(p => p.permission?._id).filter(Boolean)
    );
    const [isPending, startTransition] = useTransition();

    const handleToggle = (permissionId) => {
        if (!userPermissions.canUpdate) return;
        setCurrentPermissionIds(prev =>
            prev.includes(permissionId)
                ? prev.filter(id => id !== permissionId)
                : [...prev, permissionId]
        );
    };

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateRolePermissionsAction({
                roleId: role._id,
                permissionIds: currentPermissionIds
            });
            if (result.ok) alert('Cập nhật thành công!');
        });
    };

    const handleDelete = () => {
        if (window.confirm(`Bạn có chắc muốn xóa vai trò "${role.name}" không?`)) {
            startTransition(async () => {
                const result = await deleteRoleAction(role._id);
                if (!result.ok) alert(result.message);
            });
        }
    };

    return (
        <div className="rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold">{role.name}</h3>
                <div className="flex gap-2">
                    {userPermissions.canUpdate && (
                        <button onClick={handleSave} className="btn btn-sm btn-primary" disabled={isPending}>
                            {isPending ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    )}
                    {userPermissions.canDelete && (
                        <button onClick={handleDelete} className="btn btn-sm btn-danger" disabled={isPending}>
                            Xóa
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                    <div key={group}>
                        <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">{group}</h4>
                        <div className="space-y-2">
                            {perms.map(p => (
                                <label key={p._id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentPermissionIds.includes(p._id)}
                                        onChange={() => handleToggle(p._id)}
                                        disabled={!userPermissions.canUpdate || isPending}
                                        className="checkbox"
                                    />
                                    <span className="text-sm">{p.label || p.action}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}