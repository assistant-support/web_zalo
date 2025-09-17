import { io } from 'socket.io-client';

let socket = null;
let listenersAttached = false;

const url = process.env.NEXT_PUBLIC_SOCKET_URL;

function attachCommonListeners(s) {
    if (listenersAttached) return;
    s.on('connect', () => console.log('[socket] connect', s.id));
    s.on('disconnect', (r) => console.log('[socket] disconnect', r));
    s.on('connect_error', (e) => console.warn('[socket] error', e?.message));
    listenersAttached = true;
}

export async function connectSocket(getToken) {
    if (socket && socket.connected) return socket;

    const token = await getToken();
    socket = io(url, {
        path: '/socket.io',
        transports: ['websocket'],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        auth: { token }
    });

    attachCommonListeners(socket);
    return socket;
}

export async function refreshSocketAuth(getToken) {
    if (!socket) return;
    const token = await getToken();
    socket.auth = { token };
    socket.disconnect();
    socket.connect();
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listenersAttached = false;
}
