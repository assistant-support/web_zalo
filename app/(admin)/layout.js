// app/(admin)/layout.js
import SocketBridge from "@/components/realtime/SocketBridge"; // <-- Đảm bảo đường dẫn này đúng

export default function AdminLayout({ children }) {
    return (
        <div>
            {/* Component này sẽ chạy ngầm và lắng nghe sự kiện cho tất cả các trang admin */}
            <SocketBridge />

            <main>{children}</main>
        </div>
    );
}