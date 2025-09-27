// models/ZaloMessage.model.js
import mongoose from 'mongoose';

// Định nghĩa một cấu trúc con cho file đính kèm
const AttachmentSchema = new mongoose.Schema({
    /**
     * Loại file: 'image', 'video', 'file', 'audio'.
     */
    type: { type: String, required: true },
    /**
     * ID của file lưu trên dịch vụ của bạn (VD: Google Drive ID, S3 Key).
     * @required
     */
    driveFileId: { type: String, required: true },
    /**
     * Tên file gốc để hiển thị cho người dùng.
     */
    fileName: { type: String },
    /**
     * Kích thước file (bytes).
     */
    fileSize: { type: Number },
    /**
     * Kiểu MIME của file (VD: 'image/jpeg', 'application/pdf').
     */
    mimeType: { type: String },
    /**
     * URL xem trước (thumbnail) cho ảnh/video.
     */
    thumbnailUrl: { type: String },
}, { _id: false }); // _id: false để không tự tạo ObjectId cho mỗi file đính kèm

const ZaloMessageSchema = new mongoose.Schema(
    {
        // --- Ngữ cảnh của tin nhắn (CỰC KỲ QUAN TRỌNG) ---
        /**
         * Người dùng hệ thống sở hữu tin nhắn này.
         * @required
         */
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
        /**
         * Tài khoản Zalo (ZaloSession) đã gửi hoặc nhận tin nhắn này.
         * @required
         */
        session: { type: mongoose.Schema.Types.ObjectId, ref: 'ZaloSession', required: true, index: true },
        /**
         * ID của người đang trò chuyện cùng (bạn bè, khách hàng).
         * Kết hợp `owner`, `session`, và `peerId` tạo thành một cuộc trò chuyện duy nhất.
         * @required
         */
        peerId: { type: String, required: true, index: true },

        // --- Nội dung tin nhắn ---
        /**
         * Hướng của tin nhắn:
         * - `in`: Tin nhắn nhận được.
         * - `out`: Tin nhắn gửi đi.
         * @required
         */
        direction: { type: String, enum: ['in', 'out'], required: true },
        /**
         * Nội dung văn bản của tin nhắn.
         */
        text: { type: String, default: '' },
        /**
         * Mảng chứa các file đính kèm.
         * Sử dụng cấu trúc AttachmentSchema để dữ liệu đồng nhất.
         */
        attachments: [AttachmentSchema],
        /**
         * Dấu thời gian (timestamp) của tin nhắn, tính bằng mili-giây.
         * Lấy từ Zalo để đồng bộ thời gian, nếu không có thì dùng Date.now().
         * @required
         */
        ts: { type: Number, required: true, index: true },

        // --- Trạng thái (có thể nâng cấp sau) ---
        status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    },
    { timestamps: true }
);

// Index để tối ưu việc truy vấn lịch sử chat của một cuộc trò chuyện cụ thể, sắp xếp theo thời gian mới nhất.
ZaloMessageSchema.index({ owner: 1, session: 1, peerId: 1, ts: -1 });

export default mongoose.models.ZaloMessage || mongoose.model('ZaloMessage', ZaloMessageSchema);