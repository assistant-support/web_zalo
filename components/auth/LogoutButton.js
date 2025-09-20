'use client';
import { logout } from '@/app/actions/auth-actions';

export default function LogoutButton() {
    return (
        <form action={logout}>
            <button type="submit" className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">
                Đăng xuất
            </button>
        </form>
    );
}