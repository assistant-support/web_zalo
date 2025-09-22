// lib/realtime/emit.js
'use server'; // Đánh dấu đây là một module chỉ chạy ở phía server

import { sign } from 'jsonwebtoken';

/**
 * Gửi một sự kiện đến một phòng cụ thể thông qua API /api/emit của server Socket.IO.
 * @param {string} room - Tên phòng cần gửi đến (ví dụ: 'user:someUserId').
 * @param {string} event - Tên của sự kiện (ví dụ: 'session:update').
 * @param {object} payload - Dữ liệu đi kèm.
 */
async function emitEvent(room, event, payload) {
    // Lấy URL và API key từ biến môi trường
    const realtimeApiUrl = process.env.INTERNAL_REALTIME_API_URL;
    const apiKey = process.env.ADMIN_API_KEY;
    console.log(realtimeApiUrl, apiKey);
    
    if (!realtimeApiUrl || !apiKey) {
        console.error('[Emit Helper] Realtime API URL or Admin API Key is not configured.');
        return;
    }

    console.log(`[Emit Helper] Emitting event "${event}" to room "${room}"...`);

    try {
        // Gọi đến API của server socket bằng fetch
        const response = await fetch(realtimeApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey, // Gửi kèm API key để xác thực
            },
            body: JSON.stringify({
                target: { room },
                event,
                payload,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[Emit Helper] Failed to emit event:', errorData);
        } else {
            console.log(`[Emit Helper] Event "${event}" emitted successfully.`);
        }
    } catch (error) {
        console.error('[Emit Helper] Error emitting event:', error.message);
    }
}

/**
 * Hàm tiện ích để cập nhật session của một người dùng cụ thể.
 * Nó sẽ tạo token mới và gửi sự kiện 'session:update'.
 * @param {string} userId - ID của người dùng cần cập nhật.
 * @param {object} updatedUserData - Dữ liệu người dùng đã được cập nhật (ví dụ: { roleId: newRoleId }).
 */
export async function triggerSessionUpdate(userId, updatedUserData) {
    // 1. Tạo một payload mới cho realtimeToken
    const newPayload = {
        uid: userId,
        roleId: updatedUserData.roleId,
    };

    // 2. Ký một realtimeToken mới
    const newRealtimeToken = sign(newPayload, process.env.AUTH_SECRET, { expiresIn: '1h' });

    // 3. Gửi sự kiện 'session:update' đến phòng riêng của người dùng đó
    await emitEvent(`user:${userId}`, 'session:update', {
        user: updatedUserData, // Dữ liệu để client cập nhật UI (nếu cần)
        realtimeToken: newRealtimeToken, // Token mới để client kết nối lại
    });
}