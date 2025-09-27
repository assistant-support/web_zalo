// app/(chat)/mes/accounts/page.js
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/db';
import ZaloSession from '@/models/zaloSession.model';
import ZaloAccountsManager from './ui/listaccount'; // Client component quản lý tài khoản Zalo

// Trang quản lý các tài khoản Zalo đã đăng nhập cho người dùng hiện tại
export default async function ZaloAccountsPage() {
    // 1. Kiểm tra đăng nhập
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }
    const currentUserId = session.user.id;

    // 2. Kết nối DB và lấy danh sách tài khoản Zalo thuộc về user hiện tại
    await connectToDB();
    const accounts = await ZaloSession.find({ user: currentUserId })
        .select('name avatar lastLoginAt status') 
        .lean();
    const accountsData = JSON.parse(JSON.stringify(accounts)); 

    return (
        <div className="p-2 w-full">
            <div className="bg-white p-2 rounded-md border h-full flex flex-col gap-2" style={{ borderColor: 'var(--border)' }}>
                <ZaloAccountsManager initialAccounts={accountsData} />
            </div>
        </div>
    );
}
