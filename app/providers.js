'use client';
import { SessionProvider } from 'next-auth/react';
import SocketBridge from '@/components/realtime/SocketBridge';

export function Providers({ children }) {
    return (
        <SessionProvider>
            {children}
            <SocketBridge />
        </SessionProvider>
    );
}