// components/realtime/SocketBridge.js
// --- THAY THẾ TOÀN BỘ FILE CỦA BẠN BẰNG FILE NÀY ---

'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { connectSocket, disconnectSocket } from '@/lib/realtime/socket-client';

export default function SocketBridge() {
    const { status } = useSession();

    useEffect(() => {
        if (status === 'authenticated') {
            // Khi người dùng đăng nhập, khởi tạo kết nối
            console.log('[SocketBridge] Người dùng đã xác thực, đang khởi tạo kết nối socket...');
            connectSocket().catch(err => {
                console.error("[SocketBridge] Không thể khởi tạo kết nối socket:", err);
            });
        } else if (status === 'unauthenticated') {
            // Khi người dùng đăng xuất, ngắt kết nối và dọn dẹp
            console.log('[SocketBridge] Người dùng chưa xác thực, đang dọn dẹp socket...');
            disconnectSocket();
        }

        // Dọn dẹp khi component unmount (ví dụ khi đóng tab)
        return () => {
            disconnectSocket();
        };
    }, [status]); // Chỉ chạy lại khi trạng thái session thay đổi

    return null; // Component này không render gì ra giao diện
}