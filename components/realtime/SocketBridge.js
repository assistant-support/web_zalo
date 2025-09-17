// components/realtime/SocketBridge.js
'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { connectSocket, getSocket } from '@/lib/realtime/socket-client';

export default function SocketBridge() {
    const { data: session, update } = useSession();
    // Dùng ref để đảm bảo logic chỉ chạy một lần mỗi khi component được mount
    const initialized = useRef(false);

    useEffect(() => {
        if (!session?.user?.id || initialized.current) {
            return;
        }
        initialized.current = true;
        console.log('[SocketBridge] Session is ready for user:', session.user.id);

        let sock;

        // Hàm lấy token từ API của Next.js
        async function fetchSocketToken() {
            console.log('[SocketBridge] Fetching socket token...');
            const r = await fetch('/api/realtime/token', { cache: 'no-store' });
            if (!r.ok) {
                console.error('[SocketBridge] Failed to fetch token, status:', r.status);
                throw new Error('cannot get socket token');
            }
            const body = await r.json();
            if (!body?.ok) {
                console.error('[SocketBridge] API returned an error:', body?.error);
                throw new Error(body?.error || 'token error');
            }
            console.log('[SocketBridge] Successfully fetched socket token.');
            return body.token;
        }

        // Hàm xử lý khi nhận được sự kiện 'auth:refresh'
        const onAuthRefresh = async (payload) => {
            console.log('%c[SocketBridge] Received "auth:refresh"!', 'color: lime; font-weight: bold;', payload);
            try {
                await update();
                console.log('%c[SocketBridge] Session updated successfully!', 'color: lime; font-weight: bold;');

                // Sau khi update, token cũ có thể chứa role cũ, cần lấy token mới và kết nối lại
                // (Đây là logic phức tạp, tạm thời có thể bỏ qua để test bước update)
                // const newToken = await fetchSocketToken();
                // sock.auth.token = newToken;
                // sock.disconnect().connect();
            } catch (e) {
                console.error('[SocketBridge] Error during session update:', e);
            }
        };

        // Hàm kết nối và lắng nghe
        async function initializeSocket() {
            try {
                console.log('[SocketBridge] Connecting to socket server...');
                sock = await connectSocket(fetchSocketToken);

                sock.on('connect', () => {
                    console.log(`[SocketBridge] Socket connected with ID: ${sock.id}`);
                });
                sock.on('disconnect', (reason) => {
                    console.log(`[SocketBridge] Socket disconnected, reason: ${reason}`);
                });

                // Lắng nghe sự kiện quan trọng
                sock.on('auth:refresh', onAuthRefresh);

            } catch (e) {
                console.error('[SocketBridge] Failed to initialize socket:', e);
                initialized.current = false; // Reset để có thể thử lại
            }
        }

        initializeSocket();

        // Hàm dọn dẹp
        return () => {
            console.log('[SocketBridge] Cleaning up socket connection.');
            const s = getSocket();
            if (s) {
                s.off('auth:refresh', onAuthRefresh);
                s.disconnect();
            }
            initialized.current = false;
        };
    }, [session?.user?.id, update]);

    return null;
}