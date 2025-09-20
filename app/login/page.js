// app/login/page.js
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Users, Network, ShieldCheck } from 'lucide-react';
import LoginForm from '@/components/auth/LoginForm'; // Import Client Component

export default async function LoginPage() {
    const session = await auth();
    // Nếu đã đăng nhập, chuyển hướng ngay về trang chủ
    if (session?.user) {
        redirect('/');
    }

    return (
        <main className="min-h-screen grid lg:grid-cols-2 bg-gray-100">
            {/* Cột Form: Render Client Component LoginForm để xử lý tương tác */}
            <section className="flex items-center justify-center p-6">
                <LoginForm />
            </section>

            {/* Cột Hero: Hiển thị thông tin quảng bá, giữ nguyên UI của bạn */}
            <section className="relative hidden lg:block bg-gray-900">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-800" />
                <div
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(closest-side, rgba(255,255,255,.6), transparent 65%)', backgroundSize: '24px 24px' }}
                />
                <div className="relative h-full w-full flex items-center justify-center p-10">
                    <div className="max-w-xl text-white">
                        <h2 className="text-3xl font-semibold leading-snug">Quản lý nhiều tài khoản Zalo trong một trình duyệt</h2>
                        <p className="mt-3 text-sm text-white/85">
                            Tách phiên an toàn, gán <b>proxy riêng</b> cho từng tài khoản, hạn chế dấu vết trình duyệt và tối ưu hiệu suất gửi/nhận.
                        </p>
                        <ul className="mt-6 space-y-4">
                            <li className="flex items-start gap-3">
                                <Users className="mt-0.5 h-5 w-5 text-white/90 flex-shrink-0" />
                                <div>
                                    <div className="font-medium">Multi-account, multi-session</div>
                                    <p className="text-sm text-white/80">Tạo và chuyển nhanh giữa nhiều Zalo, session tách biệt.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <Network className="mt-0.5 h-5 w-5 text-white/90 flex-shrink-0" />
                                <div>
                                    <div className="font-medium">Proxy riêng cho từng tài khoản</div>
                                    <p className="text-sm text-white/80">HTTP/SOCKS5, có auth; thay đổi IP theo tài khoản.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <ShieldCheck className="mt-0.5 h-5 w-5 text-white/90 flex-shrink-0" />
                                <div>
                                    <div className="font-medium">Cách ly & bảo mật</div>
                                    <p className="text-sm text-white/80">Mỗi tài khoản là một sandbox, giảm rủi ro khoá chéo.</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>
        </main>
    );
}