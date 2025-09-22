// lib/realtime/socket-client.js
import { io } from 'socket.io-client';

// Biến này sẽ giữ instance của socket để tái sử dụng trong cùng một phiên đăng nhập.
let socket = null;

/**
 * Khởi tạo và trả về một instance của socket client.
 * Nếu đã có instance, sẽ trả về instance đó.
 * @param {string} token - JWT token để xác thực với server socket.
 * @returns {Socket} - Instance của Socket.IO client.
 */
export const getSocket = (token) => {
    // Nếu chưa có socket hoặc socket đã bị hủy, hãy tạo một instance hoàn toàn mới.
    if (!socket) {
        const URL = process.env.NEXT_PUBLIC_REALTIME_URL;
        console.log(`[Socket Client] Creating a new socket instance to connect to ${URL}`);
        
        socket = io(URL, {
            autoConnect: false, // Chúng ta sẽ quản lý kết nối thủ công
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });
    }

    // Cập nhật token xác thực mỗi lần hàm này được gọi
    if (token) {
        socket.auth = { token };
    }

    return socket;
};

/**
 * Ngắt kết nối và HỦY HOÀN TOÀN instance socket hiện tại.
 * Điều này đảm bảo lần đăng nhập tiếp theo sẽ là một khởi đầu mới.
 */
export const disconnectAndDestroySocket = () => {
    if (socket) {
        console.log('[Socket Client] Disconnecting and destroying socket instance.');
        socket.disconnect();
        socket = null; // Hủy instance
    }
};