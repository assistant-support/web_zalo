// web-next/components/realtime/SocketBridge.js (Phiên bản đã sửa lỗi)
'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getSocket, disconnectAndDestroySocket } from '@/lib/realtime/socket-client';
import { logout } from '@/app/actions/auth-actions';

export default function SocketBridge() {
    const { data: session, status } = useSession();
    // Dùng useRef để đảm bảo socket chỉ được khởi tạo và quản lý một cách nhất quán
    const socketRef = useRef(null);

    useEffect(() => {
        // Nếu người dùng đã xác thực và có token
        if (status === 'authenticated' && session?.realtimeToken) {
            // Lấy instance của socket, hàm getSocket đã được tối ưu để chỉ tạo mới khi cần
            const socket = getSocket(session.realtimeToken);
            socketRef.current = socket;

            // --- Định nghĩa các hàm xử lý sự kiện ---
            const onConnect = () => {
                console.log(`[SocketBridge] Connected to Socket.IO with ID: ${socket.id}`);
            };

            const onDisconnect = (reason) => {
                console.log('[SocketBridge] Disconnected from Socket.IO:', reason);
            };

            const onConnectError = (err) => {
                console.error(`[SocketBridge] Connection error: ${err.message}`);
            };

            const onSessionUpdate = () => {
                console.log('[SocketBridge] Received "session:update" event. Forcing logout.');
                socket.disconnect();
                logout();
            };

            // --- Gắn listener ---
            // Gỡ bỏ các listener cũ trước để tránh gắn trùng lặp
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('connect_error', onConnectError);
            socket.off('session:update', onSessionUpdate);

            // Gắn listener mới
            socket.on('connect', onConnect);
            socket.on('disconnect', onDisconnect);
            socket.on('connect_error', onConnectError);
            socket.on('session:update', onSessionUpdate);

            // Chỉ kết nối nếu socket chưa được kết nối
            if (!socket.connected) {
                console.log('[SocketBridge] Attempting to connect...');
                socket.connect();
            }
        } else if (status === 'unauthenticated') {
            // Nếu người dùng không còn xác thực, đảm bảo socket được ngắt kết nối
            if (socketRef.current) {
                console.log('[SocketBridge] User is unauthenticated. Disconnecting and destroying socket.');
                disconnectAndDestroySocket();
                socketRef.current = null;
            }
        }

        // --- Hàm dọn dẹp ---
        // Sẽ chạy khi component unmount
        return () => {
            console.log('[SocketBridge] Cleanup on component unmount.');
            // Khi component bị hủy (ví dụ chuyển trang), chúng ta không ngắt kết nối
            // mà chỉ gỡ bỏ listener để tránh memory leak.
            // Việc ngắt kết nối toàn bộ chỉ nên xảy ra khi logout (đã xử lý ở trên).
            if (socketRef.current) {
                socketRef.current.off('connect');
                socketRef.current.off('disconnect');
                socketRef.current.off('connect_error');
                socketRef.current.off('session:update');
            }
        };
    }, [session, status]); // Effect sẽ chạy lại khi session hoặc status thay đổi

    return null;
}