import { NextResponse } from 'next/server';
import { Zalo, ThreadType } from 'zca-js';            // Thư viện Zalo (unofficial):contentReference[oaicite:0]{index=0}
import { HttpProxyAgent } from 'http-proxy-agent';    // Hỗ trợ tạo agent proxy cho Node.js
import nodefetch from 'node-fetch';                   // Polyfill fetch cho Node (vì fetch gốc không hỗ trợ proxy):contentReference[oaicite:1]{index=1}

// Đọc URL proxy từ biến môi trường (.env) nếu có (định dạng: http://user:pass@host:port)
const proxyUrl = process.env.ZALO_PROXY;
const zalo = new Zalo({
    agent: proxyUrl ? new HttpProxyAgent(proxyUrl) : undefined,  // Sử dụng proxy nếu được cấu hình:contentReference[oaicite:2]{index=2}
    polyfill: nodefetch,     // Dùng node-fetch làm fetch() cho thư viện:contentReference[oaicite:3]{index=3}
    selfListen: true,        // Lắng nghe cả sự kiện do chính tài khoản mình gửi (mặc định false)
    checkUpdate: true,       // Kiểm tra bản cập nhật (mặc định true)
    logging: true            // Bật log của thư viện (mặc định true)
});
// Biến giữ trạng thái đăng nhập Zalo (để tránh đăng nhập lại nhiều lần)
let zaloApi = null;

/**
 * API GET /api/zalo/login - Đăng nhập Zalo bằng QR code.
 * Gọi API này sẽ tạo file QR code để quét đăng nhập, và thiết lập lắng nghe sự kiện Zalo.
 */
export async function GET(req) {
    if (zaloApi) {
        return NextResponse.json({ ok: true, message: 'Đã đăng nhập Zalo (đang hoạt động).' });
    }
    try {
        // Thực hiện đăng nhập Zalo thông qua quét mã QR
        zaloApi = await zalo.loginQR();               // Chờ người dùng quét QR trên ứng dụng Zalo:contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5}
        await zaloApi.listener.start();               // Bắt đầu lắng nghe sự kiện tin nhắn, phản ứng...:contentReference[oaicite:6]{index=6}

        // Ghi nhật ký và phản hồi khi đăng nhập thành công
        console.log('✅ Đăng nhập Zalo thành công!');
        return NextResponse.json({
            ok: true,
            message: 'Đã tạo mã QR trong file `qr.png` - hãy quét bằng ứng dụng Zalo để đăng nhập.'
        });
    } catch (error) {
        console.error('❌ Lỗi đăng nhập Zalo:', error);
        return NextResponse.json({ ok: false, error: error.message });
    }
}

zalo.listener.on('message', (message) => {
    console.log('📨 [Zalo] Nhận tin nhắn:', message.data.content, 'từ', message.sender?.name);
    // Chuẩn bị payload gọn nhẹ gửi cho frontend qua socket
    const payload = {
        from: { id: message.sender.id, name: message.sender.name },   // thông tin người gửi
        content: message.data.content,                               // nội dung tin nhắn (text)
        isSelf: message.isSelf,                                      // có phải do chính tài khoản bot gửi không
        time: message.time                                           // timestamp
    };
    
    // Gửi sự kiện `zalo:message` đến room "zalo" thông qua API emit của Socket.IO server:contentReference[oaicite:12]{index=12}
    nodefetch(process.env.INTERNAL_REALTIME_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ADMIN_API_KEY          // dùng API key để xác thực request emit:contentReference[oaicite:13]{index=13}:contentReference[oaicite:14]{index=14}
        },
        body: JSON.stringify({
            target: { room: 'zalo' },                       // gửi đến tất cả client trong room "zalo"
            event: 'zalo:message',                         // tên sự kiện bên frontend sẽ lắng nghe
            payload                                        // dữ liệu tin nhắn gửi kèm
        })
    }).catch(err => console.error('Lỗi emit Socket:', err));
});