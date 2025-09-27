// lib/realtime/socket-client.js
// --- THAY THẾ TOÀN BỘ FILE CỦA BẠN BẰNG FILE NÀY ---

import { io } from 'socket.io-client';

let socket = null;
let tokenRefreshTimeout = null;

/**
 * Hàm gọi API route của Next.js để lấy token ngắn hạn.
 * @returns {Promise<{token: string, exp: number}>}
 */
async function fetchSocketToken() {
    // API Route này bạn đã tạo ở phần trước
    const res = await fetch('/api/rt/socket-token');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch socket token');
    }
    return res.json();
}

/**
 * Lên lịch làm mới token trước khi nó hết hạn.
 * @param {number} exp - Thời gian hết hạn của token (tính bằng giây).
 */
function scheduleTokenRefresh(exp) {
    if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresInSec = exp - nowSec;

    // Làm mới token khi còn 80% thời gian sống để tránh race condition
    const refreshInMs = Math.max(expiresInSec * 0.8 * 1000, 0);

    console.log(`[Socket Token] Token sẽ được làm mới sau ${(refreshInMs / 1000).toFixed(0)} giây.`);

    tokenRefreshTimeout = setTimeout(async () => {
        try {
            console.log('[Socket Token] Đang chủ động làm mới token...');
            const { token: newToken, exp: newExp } = await fetchSocketToken();

            // Cập nhật token cho các lần kết nối/kết nối lại trong tương lai
            if (socket) {
                socket.auth.token = newToken;
            }

            console.log('[Socket Token] Đã làm mới token thành công.');
            scheduleTokenRefresh(newExp); // Lên lịch cho lần làm mới tiếp theo
        } catch (error) {
            console.error('[Socket Token] Lỗi khi tự động làm mới token:', error);
        }
    }, refreshInMs);
}

/**
 * Khởi tạo và kết nối socket.
 * Hàm này sẽ tự động quản lý token.
 */
export async function connectSocket() {
    if (socket && socket.connected) {
        console.log('[Socket Client] Socket đã được kết nối.');
        return socket;
    }

    try {
        console.log('[Socket Client] Bắt đầu quá trình kết nối...');
        const { token, exp } = await fetchSocketToken();

        if (!socket) {
            const URL = process.env.NEXT_PUBLIC_REALTIME_URL;
            socket = io(URL, {
                path: '/socket.io',
                transports: ['websocket'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 3000,
                autoConnect: false, // Chúng ta sẽ quản lý kết nối thủ công
                auth: { token },
            });

            // Gắn các listener một lần duy nhất khi khởi tạo
            socket.on('connect', () => {
                console.log(`[Socket] Kết nối thành công với ID: ${socket.id}`);
            });

            socket.on('disconnect', (reason) => {
                console.warn(`[Socket] Mất kết nối: ${reason}`);
                if (tokenRefreshTimeout) clearTimeout(tokenRefreshTimeout);
            });

            socket.on('connect_error', async (err) => {
                console.error(`[Socket] Lỗi kết nối: ${err.message}`);
                if (err.message.includes('Invalid token') || err.message.includes('jwt expired')) {
                    console.log('[Socket Token] Lỗi do token. Đang lấy token mới...');
                    try {
                        const { token: newToken, exp: newExp } = await fetchSocketToken();
                        socket.auth.token = newToken;
                        console.log('[Socket Token] Đã có token mới, socket sẽ tự động thử kết nối lại.');
                        scheduleTokenRefresh(newExp);
                    } catch (fetchErr) {
                        console.error('[Socket Token] Không thể lấy token mới:', fetchErr);
                    }
                }
            });
        } else {
            // Nếu socket đã tồn tại nhưng chưa kết nối, cập nhật token
            socket.auth.token = token;
        }

        // Bắt đầu kết nối
        socket.connect();

        // Bắt đầu chu trình làm mới token
        scheduleTokenRefresh(exp);

        return socket;

    } catch (error) {
        console.error('[Socket Client] Không thể kết nối socket:', error);
        throw error;
    }
}

/**
 * Trả về instance socket đã được khởi tạo.
 * @returns {import('socket.io-client').Socket}
 */
export const getSocket = () => {
    if (!socket) {
        // Có thể throw lỗi hoặc chỉ log warning tuỳ theo yêu cầu của bạn
        console.warn("Cảnh báo: getSocket() được gọi trước khi connectSocket() hoàn tất.");
    }
    return socket;
};


/**
 * Ngắt kết nối và dọn dẹp instance socket.
 */
export const disconnectSocket = () => {
    if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout);
        tokenRefreshTimeout = null;
    }
    if (socket) {
        console.log('[Socket Client] Ngắt kết nối và dọn dẹp socket.');
        socket.disconnect();
        socket = null;
    }
};