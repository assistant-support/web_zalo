// app/(admin)/users/components/UsersTable.js
'use client';

import { useState } from 'react';
import { setUserRoleAction, deleteUserAction } from '../actions';
import UserDialog from './UserDialog';

export default function UsersTable({ users, roles, permissions }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const handleEdit = (user) => {
        setCurrentUser(user);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setCurrentUser(null);
        setIsDialogOpen(true);
    };

    const handleDelete = async (user) => {
        if (window.confirm(`Bạn có chắc muốn xóa người dùng "${user.name}" không?`)) {
            await deleteUserAction(user._id);
        }
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                {permissions.canCreateUser && (
                    <button onClick={handleAddNew} className="btn btn-primary">Thêm mới</button>
                )}
            </div>

            <UserDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                user={currentUser}
            />

            <section className="rounded-xl border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                            <th className="p-3 text-left">User</th>
                            <th className="p-3 text-left">Email</th>
                            <th className="p-3 text-left">Role</th>
                            <th className="p-3 text-left">Trạng thái</th>
                            <th className="p-3 text-left">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id} className="border-t dark:border-gray-700">
                                <td className="p-3 font-medium">{u.name}</td>
                                <td className="p-3">{u.email}</td>
                                <td className="p-3">
                                    {permissions.canSetRole ? (
                                        <form action={setUserRoleAction}>
                                            <input type="hidden" name="userId" value={String(u._id)} />
                                            <select
                                                name="roleId"
                                                defaultValue={u.role ? String(u.role) : ''}
                                                className="input w-48"
                                                onChange={(e) => e.target.form.requestSubmit()}
                                            >
                                                <option value="">-- None --</option>
                                                {roles.map(r => (
                                                    <option key={r._id} value={r._id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </form>
                                    ) : (
                                        roles.find(r => String(r._id) === String(u.role))?.name || <i>None</i>
                                    )}
                                </td>
                                <td className="p-3">
                                    <span className={u.status === 'active' ? 'text-green-500' : 'text-amber-500'}>
                                        {u.status}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        {permissions.canUpdateUser && <button onClick={() => handleEdit(u)} className="btn btn-sm btn-outline">Sửa</button>}
                                        {permissions.canDeleteUser && <button onClick={() => handleDelete(u)} className="btn btn-sm btn-danger">Xóa</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </>
    );
}