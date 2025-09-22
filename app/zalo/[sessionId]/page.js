// app/(chat)/mes/[sessionId]/page.js
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/db';
import ZaloSession from '@/models/zaloSession.model';
import ZaloChatClient from './ZaloChatClient';

// Trang chi tiết chat của 1 tài khoản Zalo (UI giống Zalo cơ bản)
export default async function ZaloChatPage({ params }) {
    params = await params
    const session = await auth();
    if (!session?.user) redirect('/login');

    const sessionId = params.sessionId; // ✅ sửa đúng tham số động
    await connectToDB();
    const zaloSession = await ZaloSession.findById(sessionId);
    if (!zaloSession || zaloSession.user.toString() !== session.user.id) {
        return (
            <div className="p-8 text-center text-red-600">
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>You do not have permission to view this chat.</p>
            </div>
        );
    }

    return (
        <div className="h-full">
            {/* Truyền thông tin cơ bản cho client (không chứa cookies) */}
            <ZaloChatClient
                sessionId={sessionId}
                account={{ name: zaloSession.name || 'Zalo', avatar: zaloSession.avatar || '', status: zaloSession.status }}
            />
        </div>
    );
}
