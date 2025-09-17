// app/(admin)/roles/components/RoleDialog.js
'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createRoleAction } from '../actions';

function SubmitButton() {
    const { pending } = useFormStatus();
    return <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'Đang tạo...' : 'Tạo'}</button>;
}

export default function RoleDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [state, formAction] = useFormState(createRoleAction, { ok: false, message: '' });

    useEffect(() => {
        if (state.ok === true) {
            alert(state.message);
            setIsOpen(false);
        } else if (state.ok === false && state.message) {
            alert(state.message);
        }
    }, [state]);

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="btn btn-primary">Tạo vai trò</button>
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Tạo vai trò mới</h2>
                        <form action={formAction}>
                            <label htmlFor="name" className="block text-sm font-medium">Tên vai trò</label>
                            <input type="text" name="name" id="name" className="input w-full mt-1" required />
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost">Hủy</button>
                                <SubmitButton />
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}