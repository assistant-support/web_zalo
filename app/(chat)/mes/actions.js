// app/chat/actions.js
'use server'; // Đánh dấu đây là một Server Action Module

import { connectToDB } from "@/lib/db";
import Message from "@/models/message.model.js"; // Giả sử bạn đã có model này
import Account from "@/models/account.model.js"; // Cần để populate thông tin người gửi

/**
 * Lấy tin nhắn của một cuộc hội thoại với phân trang.
 * @param {string} conversationId - ID của cuộc hội thoại.
 * @param {number} page - Số trang cần lấy (bắt đầu từ 1).
 * @param {number} limit - Số lượng tin nhắn trên mỗi trang.
 * @returns {Promise<{messages: Array, hasMore: boolean}>} - Một object chứa danh sách tin nhắn và cờ báo hiệu còn tin nhắn cũ hơn không.
 */
export async function getMessages(conversationId, page = 1, limit = 10) {
    try {
        console.log(`[Chat Action] Fetching messages for conversation '${conversationId}', page ${page}, limit ${limit}`);
        await connectToDB();

        // Tính toán số lượng tin nhắn cần bỏ qua (skip)
        const skip = (page - 1) * limit;

        // Lấy tổng số tin nhắn trong cuộc hội thoại để tính toán `hasMore`
        const totalMessages = await Message.countDocuments({ conversationId });

        // Truy vấn để lấy tin nhắn:
        // - Sắp xếp theo thời gian tạo giảm dần (tin nhắn mới nhất ở đầu)
        // - Bỏ qua (skip) các tin nhắn của các trang trước
        // - Giới hạn (limit) số lượng tin nhắn cần lấy
        // - Populate thông tin 'sender' (chỉ lấy tên và avatar)
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: 'sender',
                model: Account,
                select: 'name avatar' // Chỉ lấy các trường cần thiết
            })
            .lean(); // .lean() để trả về plain JavaScript objects

        // Đảo ngược mảng tin nhắn để có thứ tự đúng (tin nhắn cũ nhất ở đầu)
        const reversedMessages = messages.reverse();

        // Kiểm tra xem còn tin nhắn cũ hơn để tải không
        const hasMore = (skip + messages.length) < totalMessages;

        console.log(`[Chat Action] Found ${messages.length} messages. Has more: ${hasMore}`);

        // Trả về dữ liệu đã được xử lý an toàn
        return {
            messages: JSON.parse(JSON.stringify(reversedMessages)),
            hasMore
        };

    } catch (error) {
        console.error('[Chat Action] Error fetching messages:', error);
        return { messages: [], hasMore: false };
    }
}