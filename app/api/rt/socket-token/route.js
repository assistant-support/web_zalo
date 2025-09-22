// app/api/rt/socket-token/route.js
// CẤP "socket token" ngắn hạn cho Socket.IO client.
// - YÊU CẦU: người dùng đã đăng nhập NextAuth (v5)
// - KÝ JWT bằng SOCKET_JWT_SECRET (server-side) => KHÔNG lộ ra client
// - TTL cấu hình qua SOCKET_TOKEN_TTL_SEC (mặc định 600 giây)
//
// TEST nhanh:
// 1) Khi đã đăng nhập web, mở /api/rt/socket-token trong trình duyệt => phải trả { token, exp }.
// 2) Nếu 401 => chưa đăng nhập (hoặc file này chưa dùng đúng auth()).
// 3) Nếu 500 => thiếu SOCKET_JWT_SECRET trong .env.production của web_zalo.

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { auth } from '@/auth'; // ✅ NextAuth v5: dùng auth() thay vì getServerSession

export async function GET() {
    // Lấy session đăng nhập hiện tại
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Ký token cho socket
    const SECRET = process.env.AUTH_SECRET; // CHỈ server-side, không NEXT_PUBLIC
    if (!SECRET) {
        return NextResponse.json({ error: 'server_misconfigured: SOCKET_JWT_SECRET missing' }, { status: 500 });
    }

    const ttlSec = Number(process.env.SOCKET_TOKEN_TTL_SEC || 600);
    const nowSec = Math.floor(Date.now() / 1000);

    const payload = {
        uid: String(session.user.id), // sẽ được đọc ở server_socket.io trong authMiddleware
        ver: 1,
        iat: nowSec,
        exp: nowSec + ttlSec,
    };

    const token = jwt.sign(payload, SECRET);
    return NextResponse.json({ token, exp: payload.exp });
}
