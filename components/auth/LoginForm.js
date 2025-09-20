// components/auth/LoginForm.js
'use client';

// Import các hook cần thiết
import { useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { login } from '@/app/actions/auth-actions';
import { LogIn, Mail, Lock } from 'lucide-react';

// Component con cho nút Submit
function SubmitButton() {
    const { pending } = useFormStatus();

    // Sử dụng useEffect để theo dõi khi nào form bắt đầu được gửi đi
    useEffect(() => {
        // Khi form bắt đầu được gửi đi (pending = true)
        if (pending) {
            console.log('[LoginForm] Form submission started. Setting reload flag...');
            // Đặt cờ vào sessionStorage để báo cho trang sau biết cần reload.
            sessionStorage.setItem('justLoggedIn', 'true');
        }
    }, [pending]);

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex justify-center items-center gap-2 px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
        >
            <LogIn className="h-4 w-4" aria-hidden />
            {pending ? 'Đang xử lý...' : 'Đăng nhập'}
        </button>
    );
}

export default function LoginForm() {
    const [state, formAction] = useActionState(login, undefined);

    // Logic kiểm tra và hiển thị thông báo khi bị buộc đăng xuất
    useEffect(() => {
        const updateRequired = sessionStorage.getItem('sessionUpdateRequired');
        if (updateRequired === 'true') {
            toast.info("Quyền hạn của bạn đã được cập nhật. Vui lòng đăng nhập lại.");
            sessionStorage.removeItem('sessionUpdateRequired');
        }
    }, []);

    return (
        <div className="w-full max-w-md">
            <div className="mb-8 text-center">
                <h1 className="text-2xl font-semibold text-gray-900">Đăng nhập</h1>
                <p className="mt-1 text-sm text-gray-600">Truy cập bảng điều khiển Zalo multi-account</p>
            </div>

            {state?.error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                </div>
            )}

            <form action={formAction} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="relative">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                    <Mail className="absolute left-3 top-9 h-4 w-4 text-gray-400" aria-hidden />
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full px-3 py-2 mt-1 pl-10 border border-gray-300 rounded-md shadow-sm"
                        placeholder="you@example.com"
                    />
                </div>
                <div className="relative">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                    <Lock className="absolute left-3 top-9 h-4 w-4 text-gray-400" aria-hidden />
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="w-full px-3 py-2 mt-1 pl-10 border border-gray-300 rounded-md shadow-sm"
                        placeholder="••••••••"
                    />
                </div>
                <SubmitButton />
            </form>

            <p className="mt-6 text-center text-xs text-gray-500">
                Bằng việc tiếp tục, bạn đồng ý với các điều khoản sử dụng.
            </p>
        </div>
    );
}