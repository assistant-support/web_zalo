export const dynamic = 'force-dynamic';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { Users, Network, Settings2, ShieldCheck, Gauge } from 'lucide-react';

export default async function LoginPage({ searchParams }) {
    const session = await auth();
    if (session?.user) redirect('/');

    const params = await searchParams;
    const callbackUrl = typeof params?.callbackUrl === 'string' ? params.callbackUrl : '/users';

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-[var(--surface-2)]">
            {/* Form */}
            <section className="flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-[var(--text)]">Đăng nhập</h1>
                        <p className="mt-1 text-sm text-[var(--muted)]">Truy cập bảng điều khiển</p>
                    </div>
                    <LoginForm callbackUrl={callbackUrl} />
                </div>
            </section>

            {/* Hero (giữ đơn giản) */}
            <section className="relative hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-800)]" />
                <div
                    className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'radial-gradient(closest-side, rgba(255,255,255,.6), transparent 65%)', backgroundSize: '24px 24px' }}
                />
                <div className="relative h-full w-full flex items-center justify-center p-10">
                    <div className="max-w-xl text-white">
                        <h2 className="text-3xl font-semibold leading-snug">Quản trị người dùng realtime</h2>
                        <ul className="mt-6 space-y-3 text-white/85 text-sm">
                            <li className="flex items-start gap-3"><Users className="mt-0.5 h-5 w-5" /><span>Đăng nhập an toàn</span></li>
                            <li className="flex items-start gap-3"><Network className="mt-0.5 h-5 w-5" /><span>Kết nối realtime ổn định</span></li>
                            <li className="flex items-start gap-3"><Settings2 className="mt-0.5 h-5 w-5" /><span>Cập nhật quyền tức thì</span></li>
                            <li className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5" /><span>Bảo vệ tất cả trang</span></li>
                            <li className="flex items-start gap-3"><Gauge className="mt-0.5 h-5 w-5" /><span>Trải nghiệm mượt mà</span></li>
                        </ul>
                    </div>
                </div>
            </section>
        </main>
    );
}
