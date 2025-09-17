'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { connectSocket, refreshSocketAuth, getSocket } from '@/lib/realtime/socket-client';

export default function SocketBridge() {
    const { data: session, update } = useSession();
    const initedRef = useRef(false);

    async function fetchSocketToken() {
        const r = await fetch('/api/realtime/token', { cache: 'no-store' });
        if (!r.ok) throw new Error('cannot get socket token');
        const body = await r.json();
        if (!body?.ok) throw new Error(body?.error || 'token error');
        return body.token;
    }

    useEffect(() => {
        if (!session?.user?.id) return;
        if (initedRef.current) return;
        initedRef.current = true;

        (async () => {
            const sock = await connectSocket(fetchSocketToken);
            sock.on('hello', (d) => console.log('[socket] hello', d));
            sock.on('auth:refresh', async () => {
                try {
                    await update(); // làm mới JWT/session
                    await refreshSocketAuth(fetchSocketToken); // xin token mới và reconnect
                } catch (e) {
                    console.warn('[socket] refresh error', e?.message);
                }
            });
        })();

        return () => {
            const s = getSocket();
            if (s) {
                s.off('hello');
                s.off('auth:refresh');
            }
        };
    }, [session?.user?.id, update]);

    return null;
}
