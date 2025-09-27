import { NextResponse } from 'next/server';
import { Zalo, ThreadType } from 'zca-js';            // Thư viện Zalo (unofficial)
import { HttpProxyAgent } from 'http-proxy-agent';    // Hỗ trợ tạo agent proxy cho Node.js
import nodefetch from 'node-fetch';                   // Polyfill fetch cho Node (vì fetch gốc không hỗ trợ proxy)
import { auth } from '@/auth';                        // ✅ Import hàm auth để lấy thông tin người dùng hiện tại
import { connectToDB } from '@/lib/db';               // ✅ Import hàm kết nối cơ sở dữ liệu
import ZaloSession from '@/models/zaloSession.model'; // ✅ Import model ZaloSession để lưu trạng thái đăng nhập

// Đọc URL proxy từ biến môi trường (.env) nếu có (định dạng: http://user:pass@host:port)
const proxyUrl = process.env.ZALO_PROXY;
const zalo = new Zalo({
    agent: proxyUrl ? new HttpProxyAgent(proxyUrl) : undefined,  // Sử dụng proxy nếu được cấu hình
    polyfill: nodefetch,     // Dùng node-fetch làm fetch() cho thư viện
    selfListen: true,        // Lắng nghe cả sự kiện do chính tài khoản mình gửi (mặc định false)
    checkUpdate: true,       // Kiểm tra bản cập nhật (mặc định true)
    logging: true            // Bật log của thư viện (mặc định true)
});

// Bản đồ quản lý các phiên đăng nhập Zalo theo người dùng (cho phép nhiều tài khoản một lúc)
const sessions = {};

// API GET /api/zalo/login - Đăng nhập Zalo bằng QR code (hoặc cookie nếu có)
export async function GET(req) {
    // 1. Xác thực người dùng
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ ok: false, error: 'Chưa đăng nhập người dùng.' }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Nếu người dùng này đã có phiên Zalo đang hoạt động, trả về thông báo
    if (sessions[userId]?.api) {
        return NextResponse.json({ ok: true, message: 'Tài khoản Zalo đã đăng nhập và đang hoạt động.' });
    }

    try {
        await connectToDB(); // Kết nối DB để tìm phiên lưu trước đó
        // 3. Kiểm tra xem có phiên Zalo lưu cookie cho user này không (để đăng nhập lại không cần quét QR)
        const existingSession = await ZaloSession.findOne({ user: userId, status: 'offline', cookies: { $exists: true, $ne: '' } }).select('+cookies').lean();
        let api;
        if (existingSession) {
            console.log('🔄 Tìm thấy cookie phiên cũ, thử đăng nhập lại bằng cookie...');
            // Thử đăng nhập bằng cookie đã lưu
            if (typeof zalo.loginViaCookie === 'function') {
                api = await zalo.loginViaCookie(existingSession.cookies);
            } else if (typeof zalo.loginCookie === 'function') {
                api = await zalo.loginCookie(existingSession.cookies);
            } else {
                throw new Error('Thư viện Zalo thiếu hàm loginViaCookie/loginCookie');
            }
        } else {
            // 4. Thực hiện đăng nhập Zalo thông qua quét mã QR nếu không có cookie
            console.log('⚡ Không có cookie lưu sẵn, tiến hành đăng nhập qua QR.');
            api = await zalo.loginQR();               // Chờ người dùng quét QR trên ứng dụng Zalo
        }

        // 5. Bắt đầu lắng nghe sự kiện realtime (tin nhắn, phản ứng, ...)
        await api.listener.start();

        // 6. Lấy thông tin tài khoản sau khi đăng nhập thành công
        const selfUid = api.getContext()?.uid || (typeof api.getOwnId === 'function' ? await api.getOwnId() : '');
        let profile = {};
        try {
            profile = typeof api.fetchAccountInfo === 'function'
                ? await api.fetchAccountInfo()
                : (selfUid && typeof api.getUserInfo === 'function' ? await api.getUserInfo(selfUid) : {});
        } catch { }
        const zaloId = profile.id || profile.uid || selfUid || '';
        const name = profile.displayName || profile.name || 'Zalo User';
        const avatar = profile.avatarUrl || profile.avatar || '';

        // 7. Lưu/ cập nhật phiên đăng nhập vào cơ sở dữ liệu
        const doc = await ZaloSession.findOneAndUpdate(
            { user: userId, zaloId },
            { user: userId, zaloId, name, avatar, cookies: (await api.getCookie()) || '', status: 'online', lastLoginAt: new Date() },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();
        const sessionId = String(doc._id);
        console.log('✅ Đăng nhập Zalo thành công cho user', userId, '→ sessionId:', sessionId);

        // 8. Lưu phiên vào bộ nhớ để tái sử dụng nhanh trong quá trình hoạt động
        sessions[userId] = { api, sessionId };

        // 9. Phản hồi kết quả đăng nhập
        if (existingSession) {
            return NextResponse.json({ ok: true, message: 'Đã đăng nhập Zalo bằng cookie (không cần quét QR).', sessionId });
        } else {
            return NextResponse.json({ ok: true, message: 'Đã tạo mã QR trong file `qr.png` - hãy quét bằng ứng dụng Zalo để đăng nhập.', sessionId });
        }
    } catch (error) {
        console.error('❌ Lỗi đăng nhập Zalo:', error);
        return NextResponse.json({ ok: false, error: error.message });
    }
}

// 📌 Gỡ bỏ cơ chế lắng nghe tin nhắn cũ qua API emit (chuyển sang cơ chế realtime qua WebSocket ở server_socket.io)
// Nếu cần lắng nghe tin nhắn để debug tại server, có thể bật lại đoạn dưới:
/*
zalo.listener.on('message', (message) => {
   console.log('📨 [Zalo] Nhận tin nhắn:', message.data.content, 'từ', message.sender?.name);
   // (Bỏ qua gửi payload qua INTERNAL_REALTIME_API_URL vì đã có server_socket.io xử lý realtime)
});
*/
