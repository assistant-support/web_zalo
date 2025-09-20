// components/realtime/SocketBridge.js
'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getSocket, disconnectAndDestroySocket } from '@/lib/realtime/socket-client';
import { logout } from '@/app/actions/auth-actions';

export default function SocketBridge() {
    const { data: session } = useSession();

    // --- PHẦN LOGIC MỚI QUAN TRỌNG ---
    // Effect này chỉ chạy một lần duy nhất khi component được mount lần đầu
    useEffect(() => {
        const reloadKey = 'justLoggedIn';
        // Kiểm tra xem có cờ "vừa đăng nhập" không
        if (sessionStorage.getItem(reloadKey) === 'true') {
            console.log('[SocketBridge] Fresh login detected. Performing a hard reload to ensure clean state.');
            // Xóa cờ đi để tránh reload lặp lại
            sessionStorage.removeItem(reloadKey);
            // Thực hiện reload trang
            window.location.reload();
        }
    }, []);
    // --- KẾT THÚC PHẦN LOGIC MỚI ---

    useEffect(() => {
        if (!session) {
            disconnectAndDestroySocket();
            return;
        }

        const socket = getSocket(session.realtimeToken);

        // Định nghĩa các hàm xử lý sự kiện
        const onConnect = () => console.log('[SocketBridge] Connected to Socket.IO server.');
        const onDisconnect = (reason) => console.log('[SocketBridge] Disconnected from Socket.IO:', reason);
        const onConnectError = (err) => console.error(`[SocketBridge] Connection error: ${err.message}`);
        const onSessionUpdate = () => {
            console.log('[SocketBridge] Received session:update event. Forcing logout.');
            sessionStorage.setItem('sessionUpdateRequired', 'true');
            socket.disconnect();
            logout();
        };

        // Gắn và gỡ listener một cách an toàn
        socket.off('connect', onConnect).on('connect', onConnect);
        socket.off('disconnect', onDisconnect).on('disconnect', onDisconnect);
        socket.off('connect_error', onConnectError).on('connect_error', onConnectError);
        socket.off('session:update', onSessionUpdate).on('session:update', onSessionUpdate);

        // Quản lý kết nối
        if (session.realtimeToken && !socket.connected) {
            socket.connect();
        }

        // Hàm dọn dẹp
        return () => {
            console.log('[SocketBridge] Cleanup running.');
            // Gỡ bỏ listener khi component unmount
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('session:update', onSessionUpdate);
        };
    }, [session]);

    return null;
}