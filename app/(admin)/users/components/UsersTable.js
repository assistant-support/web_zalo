// app/(admin)/users/components/UsersTable.js
'use client';
import { useState } from 'react';
import { updateUserRole } from '../actions';
import { toast } from 'sonner';
// import UserDialog from './UserDialog'; // Sẽ dùng khi có chức năng Add/Edit

export default function UsersTable({ initialUsers, initialRoles, permissions, currentUserId }) {
    const [users, setUsers] = useState(initialUsers);

    const handleRoleChange = async (event, userId) => {
        const newRoleId = event.target.value;

        if (userId === currentUserId) {
            toast.error("Bạn không thể tự thay đổi vai trò của chính mình.");
            // Phục hồi lại giá trị cũ của dropdown
            event.target.value = users.find(u => u._id === userId).role._id;
            return;
        }

        console.log(`[UI] Attempting to change role for user ${userId} to ${newRoleId}`);
        toast.loading('Updating user role...');
        const result = await updateUserRole(userId, newRoleId);

        toast.dismiss(); // Tắt thông báo loading
        if (result.success) {
            toast.success(result.message);
            // Cập nhật lại UI ở client để phản hồi ngay lập tức
            setUsers(currentUsers => currentUsers.map(u =>
                u._id === userId ? { ...u, role: initialRoles.find(r => r._id === newRoleId) } : u
            ));
        } else {
            toast.error(result.message);
            event.target.value = users.find(u => u._id === userId).role._id; // Trả về giá trị cũ nếu thất bại
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="py-3 px-4 border-b text-left font-semibold text-gray-600">Name</th>
                        <th className="py-3 px-4 border-b text-left font-semibold text-gray-600">Email</th>
                        <th className="py-3 px-4 border-b text-left font-semibold text-gray-600">Role</th>
                        {/* Thêm cột Actions nếu có quyền Edit/Delete */}
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {users.map(user => (
                        <tr key={user._id} className="hover:bg-gray-50">
                            <td className="py-3 px-4 border-b">{user.name}</td>
                            <td className="py-3 px-4 border-b">{user.email}</td>
                            <td className="py-3 px-4 border-b">
                                {permissions.canChangeRole ? (
                                    <select
                                        defaultValue={user.role?._id || ''}
                                        onChange={(e) => handleRoleChange(e, user._id)}
                                        disabled={user._id === currentUserId}
                                        className="p-2 border rounded-md disabled:bg-gray-200 disabled:cursor-not-allowed"
                                    >
                                        {initialRoles.map(role => (
                                            <option key={role._id} value={role._id}>{role.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    user.role?.name || 'N/A'
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}