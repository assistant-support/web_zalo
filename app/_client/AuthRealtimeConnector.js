// app/_client/AuthRealtimeConnector.js
'use client';

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/realtime/socket-client"; // Đảm bảo đường dẫn này đúng

export default function AuthRealtimeConnector() {
    const { data: session, update } = useSession();

    useEffect(() => {
        // Nếu không có session, không làm gì cả
        if (!session?.user?.id) {
            console.log('[AuthConnector] No session, skipping socket logic.');
            return;
        }

        console.log('[AuthConnector] Session detected for user:', session.user.id, '. Initializing socket listeners.');
        const s = getSocket();

        const onConnect = () => {
            console.log(`[AuthConnector] Socket connected! ID: ${s.id}.`);
        };

        const onDisconnect = (reason) => {
            console.log(`[AuthConnector] Socket disconnected. Reason: ${reason}`);
        };

        // Lắng nghe sự kiện 'auth:refresh' từ server
        const onRefresh = async (payload) => {
            console.log('%c[AuthConnector] Received "auth:refresh"!', 'color: lime; font-weight: bold;', payload);
            try {
                console.log('[AuthConnector] Calling session.update()...');
                await update();
                console.log('%c[AuthConnector] session.update() finished!', 'color: lime; font-weight: bold;');
            } catch (e) {
                console.error('[AuthConnector] Failed to update session:', e);
            }
        };

        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);
        s.on('auth:refresh', onRefresh);

        // Hàm dọn dẹp khi component unmount hoặc session thay đổi
        return () => {
            console.log('[AuthConnector] Cleaning up listeners for user:', session.user.id);
            s.off('connect', onConnect);
            s.off('disconnect', onDisconnect);
            s.off('auth:refresh', onRefresh);
        };
    }, [session?.user?.id, update]); // Chỉ chạy lại khi user ID thay đổi

    return null; // Component này không render ra UI
}