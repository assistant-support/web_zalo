// models/ZaloContact.model.js
import mongoose from 'mongoose';

const ZaloContactSchema = new mongoose.Schema({
    // --- Liên kết và Định danh ---
    /**
     * ID của người dùng trong hệ thống của bạn (chủ sở hữu).
     * @required
     */
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true,
    },
    /**
     * ID của phiên Zalo (ZaloSession) sở hữu liên hệ này.
     * Giúp phân biệt danh bạ của các tài khoản Zalo khác nhau.
     * @required
     */
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ZaloSession',
        required: true,
        index: true,
    },

    // --- Thông tin định danh Zalo ---
    /**
     * User ID của người liên hệ trên Zalo (còn gọi là peerId).
     * Đây là định danh quan trọng nhất để gửi tin nhắn.
     */
    uid: { type: String, index: true },
    globalId: { type: String, index: true },

    // --- Thông tin liên lạc ---
    /**
     * Số điện thoại đã được chuẩn hóa về dạng local (0xxxxxxxxx).
     * Dùng để tra cứu và tránh trùng lặp.
     */
    phoneLocal: { type: String, index: true },
    /**
     * Số điện thoại gốc mà người dùng đã nhập để tìm kiếm.
     */
    phoneRaw: { type: String },

    // --- Thông tin hiển thị ---
    name: String,        // Tên chung
    zaloName: String,    // Tên trên Zalo
    displayName: String, // Tên hiển thị (có thể do người dùng của bạn đặt)
    avatar: String,      // URL ảnh đại diện

    // --- Dữ liệu thô ---
    /**
     * Lưu trữ toàn bộ object JSON gốc trả về từ API Zalo.
     * Hữu ích cho việc gỡ lỗi hoặc nâng cấp sau này mà không cần gọi lại API.
     */
    extra: { type: mongoose.Schema.Types.Mixed },

    // --- Metadata ---
    lastSearchAt: { type: Date, default: Date.now }, // Lần cuối tìm kiếm/cập nhật thông tin liên hệ này
    lastSeenAt: { type: Date }, // Lần cuối thấy hoạt động (mở rộng sau)
}, { timestamps: true });

// Đảm bảo trong cùng 1 session, mỗi người (uid) chỉ được lưu 1 lần.
ZaloContactSchema.index({ owner: 1, session: 1, uid: 1 }, { unique: true, sparse: true });
// Tương tự, mỗi số điện thoại cũng là duy nhất.
ZaloContactSchema.index({ owner: 1, session: 1, phoneLocal: 1 }, { unique: true, sparse: true });

export default mongoose.models.ZaloContact || mongoose.model('ZaloContact', ZaloContactSchema);