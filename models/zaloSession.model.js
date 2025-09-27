// models/ZaloSession.model.js
import mongoose from 'mongoose';

const ZaloSessionSchema = new mongoose.Schema({
    // --- Liên kết và Định danh ---
    /**
     * ID của người dùng trong hệ thống của bạn (từ model Account).
     * Giúp xác định ai là chủ sở hữu của phiên Zalo này.
     * @required
     */
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },

    /**
     * User ID của tài khoản Zalo (do Zalo cung cấp).
     * Dùng để định danh duy nhất tài khoản Zalo, hữu ích khi cần upsert.
     */
    zaloId: { type: String, index: true },

    // --- Thông tin hiển thị ---
    /**
     * Tên hiển thị của tài khoản Zalo.
     * Dùng để hiển thị cho người dùng biết họ đang thao tác trên tài khoản nào.
     * @required
     */
    name: { type: String, required: true },

    /**
     * URL ảnh đại diện của tài khoản Zalo.
     */
    avatar: String,

    // --- Dữ liệu xác thực để duy trì đăng nhập (Sensitive) ---
    /**
     * Lưu trữ toàn bộ Cookie Jar dưới dạng JSON.
     * Đây là "chìa khóa" để khôi phục phiên đăng nhập mà không cần quét lại QR.
     * `select: false` để trường này không được trả về trong các câu lệnh find() thông thường, tăng bảo mật.
     */
    cookies: { type: mongoose.Schema.Types.Mixed, select: false },

    /**
     * Mã IMEI giả lập, cần thiết cho một số phiên bản API để đăng nhập.
     * `select: false` vì đây là thông tin nhạy cảm.
     */
    imei: { type: String, select: false },

    /**
     * Chuỗi User-Agent của trình duyệt/thiết bị đã dùng để đăng nhập.
     * `select: false` vì đây là thông tin nhạy cảm.
     */
    userAgent: { type: String, select: false },

    // --- Trạng thái ---
    /**
     * Trạng thái kết nối của phiên Zalo.
     * - `online`: Đang hoạt động, kết nối websocket thành công.
     * - `offline`: Tạm thời mất kết nối hoặc đã logout.
     * - `expired`: Cookie hết hạn, cần đăng nhập lại bằng QR.
     */
    status: { type: String, enum: ['online', 'offline', 'expired'], default: 'offline' },

    /**
     * Thời điểm đăng nhập hoặc khôi phục phiên thành công gần nhất.
     */
    lastLoginAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Đảm bảo mỗi người dùng trong hệ thống chỉ liên kết với một tài khoản Zalo duy nhất.
ZaloSessionSchema.index({ user: 1, zaloId: 1 }, { unique: true, sparse: true });

export default mongoose.models.ZaloSession || mongoose.model('ZaloSession', ZaloSessionSchema);