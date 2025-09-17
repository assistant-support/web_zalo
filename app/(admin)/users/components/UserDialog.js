// app/(admin)/users/components/UserDialog.js
'use client';

import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { upsertUserAction } from '../actions';

// Nút submit với trạng thái pending
function SubmitButton({ isEdit }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Đang lưu...' : (isEdit ? 'Cập nhật' : 'Tạo mới')}
        </button>
    );
}

// Dialog thêm/sửa người dùng
export default function UserDialog({ isOpen, onClose, user }) {
    const [state, formAction] = useActionState(upsertUserAction, { ok: false, message: '' });

    useEffect(() => {
        if (state.ok === true) {
            alert(state.message);
            onClose();
        } else if (state.ok === false && state.message) {
            alert(state.message);
        }
    }, [state, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">{user ? 'Chỉnh sửa Người dùng' : 'Tạo mới Người dùng'}</h2>
                <form action={formAction}>
                    <input type="hidden" name="id" value={user?._id || ''} />
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium">Tên</label>
                            <input type="text" name="name" id="name" defaultValue={user?.name || ''} className="input w-full mt-1" required />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium">Email</label>
                            <input type="email" name="email" id="email" defaultValue={user?.email || ''} className="input w-full mt-1" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium">
                                Mật khẩu {user ? '(để trống nếu không đổi)' : ''}
                            </label>
                            <input type="password" name="password" id="password" className="input w-full mt-1" required={!user} />
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium">Trạng thái</label>
                            <select name="status" id="status" defaultValue={user?.status || 'active'} className="input w-full mt-1">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Hủy</button>
                        <SubmitButton isEdit={!!user} />
                    </div>
                </form>
            </div>
        </div>
    );
}