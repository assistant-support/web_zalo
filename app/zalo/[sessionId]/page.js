// app/(chat)/mes/[sessionId]/page.js
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDB } from '@/lib/db';
import ZaloSession from '@/models/zaloSession.model';
import ZaloChatClient from './ZaloChatClient';

export default async function ZaloChatPage({ params }) {
    // yêu cầu: id lấy từ params phải có await
    const { sessionId } = await Promise.resolve(params);

    const session = await auth();
    if (!session?.user) redirect('/login');

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
                sessionId={String(sessionId)}
                account={{
                    name: zaloSession.name || 'Zalo',
                    avatar: zaloSession.avatar || '',
                    status: zaloSession.status || 'offline'
                }}
            />
        </div>
    );
}
