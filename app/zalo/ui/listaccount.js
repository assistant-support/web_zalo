// app/(chat)/mes/accounts/ZaloAccountsManager.js
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
// ✅ THAY ĐỔI: Import các hàm mới từ socket-client
import { connectSocket, getSocket, disconnectSocket } from '@/lib/realtime/socket-client';
import { toast } from 'sonner';
import {
    Plus,
    Clock,
    MessageSquareText,
    LogOut,
    LogIn,
    Power,
    ChevronRight,
    Search
} from 'lucide-react';

export default function ZaloAccountsManager({ initialAccounts }) {
    const { data: session, status } = useSession();

    // ✅ THÊM MỚI: State để lưu instance socket sau khi kết nối thành công
    const [socket, setSocket] = useState(null);

    // Các state khác giữ nguyên
    const [accounts, setAccounts] = useState(
        (initialAccounts || []).map((acc) => ({
            ...acc,
            unreadCount: typeof acc.unreadCount === 'number' ? acc.unreadCount : 0
        }))
    );
    const [qrCode, setQrCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const accountsRef = useRef(accounts);
    useEffect(() => {
        accountsRef.current = accounts;
    }, [accounts]);

    // ========= BƯỚC 1: useEffect quản lý vòng đời kết nối socket =========
    useEffect(() => {
        // Nếu đã đăng nhập, bắt đầu kết nối
        if (status === 'authenticated') {
            const initializeSocket = async () => {
                try {
                    const socketInstance = await connectSocket();
                    setSocket(socketInstance); // Lưu vào state khi kết nối thành công
                } catch (error) {
                    toast.error("Không thể khởi tạo kết nối real-time.");
                    console.error("[Socket Init] Lỗi:", error);
                }
            };
            initializeSocket();
        }

        // Dọn dẹp khi component unmount hoặc user đăng xuất
        return () => {
            disconnectSocket();
            setSocket(null);
        };
    }, [status]); // Chỉ chạy lại khi trạng thái đăng nhập thay đổi

    // ========= BƯỚC 2: useEffect quản lý việc lắng nghe sự kiện =========
    // useEffect này sẽ chỉ chạy khi instance socket đã sẵn sàng (không còn là null)
    useEffect(() => {
        // Nếu chưa có socket, không làm gì cả
        if (!socket) return;

        // --- Các hàm xử lý sự kiện (giữ nguyên logic) ---
        const upsertAccount = (payload) => {
            setAccounts((prev) => {
                const idx = prev.findIndex((a) => a._id === payload._id);
                const merged = { ...payload, unreadCount: payload.unreadCount ?? (prev[idx]?.unreadCount ?? 0) };
                if (idx === -1) {
                    const next = [...prev, merged];
                    next.sort((a, b) => new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0));
                    return next;
                } else {
                    const next = [...prev];
                    next[idx] = { ...next[idx], ...merged };
                    next.sort((a, b) => new Date(b.lastLoginAt || 0) - new Date(a.lastLoginAt || 0));
                    return next;
                }
            });
        };

        const handleQr = (payload) => {
            toast.dismiss();
            const img = payload?.image || '';
            if (!img) {
                setQrCode('');
                setIsScanning(false);
                toast.error('Không nhận được mã QR từ server.');
                return;
            }
            const isDataUrl = img.startsWith('data:image/');
            setQrCode(isDataUrl ? img : `data:image/png;base64,${img}`);
            setIsScanning(true);
        };

        const handleLoginSuccess = (payload) => {
            setQrCode('');
            setIsScanning(false);
            upsertAccount({ ...payload, status: 'online', unreadCount: 0 });
            toast.success(`Đã đăng nhập ${payload?.name || 'tài khoản Zalo'} thành công!`);
        };

        const handleLoginError = (payload) => {
            setQrCode('');
            setIsScanning(false);
            toast.dismiss();
            const msg = payload?.message || 'Đăng nhập Zalo thất bại.';
            toast.error(msg);
        };

        const handleLoggedOut = (payload) => {
            const sessionId = payload?.id;
            if (!sessionId) return;
            setAccounts((prev) =>
                prev.map((a) => (a._id === sessionId ? { ...a, status: 'offline' } : a))
            );
            const acc = accountsRef.current.find((a) => a._id === sessionId);
            toast.success(`Đã đăng xuất ${acc?.name || 'tài khoản Zalo'}.`);
        };

        const handleSessionExpired = (payload) => {
            const sessionId = payload?.id;
            if (!sessionId) return;
            setAccounts((prev) =>
                prev.map((a) => (a._id === sessionId ? { ...a, status: 'offline' } : a))
            );
            const acc = accountsRef.current.find((a) => a._id === sessionId);
            toast.error(`Phiên đăng nhập của ${acc?.name || 'tài khoản Zalo'} đã hết hạn. Vui lòng đăng nhập lại.`);
        };

        // Đăng ký lắng nghe các sự kiện Zalo
        socket.on('zalo:qr', handleQr);
        socket.on('zalo:login_success', handleLoginSuccess);
        socket.on('zalo:login_error', handleLoginError);
        socket.on('zalo:logged_out', handleLoggedOut);
        socket.on('zalo:session_expired', handleSessionExpired);

        // Huỷ lắng nghe khi component unmount hoặc socket thay đổi
        return () => {
            socket.off('zalo:qr', handleQr);
            socket.off('zalo:login_success', handleLoginSuccess);
            socket.off('zalo:login_error', handleLoginError);
            socket.off('zalo:logged_out', handleLoggedOut);
            socket.off('zalo:session_expired', handleSessionExpired);
        };
    }, [socket]); // Chỉ chạy lại khi `socket` thay đổi (từ null -> instance)

    // ========= Hành động từ UI (sử dụng socket từ state) =========

    const handleLoginRequest = (sessionId) => {
        // ✅ THAY ĐỔI: Dùng socket từ state, và kiểm tra sự tồn tại của nó
        if (!socket) {
            toast.error("Kết nối real-time chưa sẵn sàng, vui lòng thử lại.");
            return;
        }
        socket.emit('zalo:login', sessionId ? { sessionId } : {});
        toast.loading('Đang tạo mã QR...');
        setIsScanning(true);
    };

    const handleAddAccount = () => {
        if (isScanning) return;
        handleLoginRequest();
    };

    const handleLogout = (sessionId) => {
        if (!socket) {
            toast.error("Kết nối real-time chưa sẵn sàng, vui lòng thử lại.");
            return;
        }
        if (!sessionId) return;
        socket.emit('zalo:logout', { sessionId });
    };

    const handleRelogin = (sessionId) => {
        if (isScanning) return;
        handleLoginRequest(sessionId);
    };

    // Phần JSX và logic lọc không thay đổi
    const filteredAccounts = accounts.filter((acc) =>
        (acc.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Thanh tác vụ: Tìm kiếm + Thêm tài khoản */}
            <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="relative flex-1 max-w-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={18} className="text-muted" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm tài khoản theo tên..."
                        className="input w-full pl-10"
                    />
                </div>
                <button
                    onClick={handleAddAccount}
                    disabled={isScanning}
                    className="btn btn-primary gap-2 flex-shrink-0"
                >
                    <Plus size={18} />
                    <span className="text-sm cursor-pointer">Add Account</span>
                </button>
            </div>

            {/* Lưới tài khoản (Toàn bộ phần JSX này không đổi) */}
            <div className="flex-1 overflow-y-auto pt-6">
                {filteredAccounts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {filteredAccounts.map((acc) => (
                            <div key={acc._id} className="card flex flex-col justify-between p-4 elev-1 animate-fadeInUp">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {acc.avatar ? (
                                            <img src={acc.avatar} alt={acc.name} className="w-12 h-12 rounded-full" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center font-bold text-lg text-primary-700">
                                                {acc.name?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-text truncate">{acc.name}</p>
                                            <div className="flex items-center gap-1.5 text-xs">
                                                {acc.status === 'online' ? (
                                                    <>
                                                        <Power size={12} className="text-success-600" />
                                                        <span className="text-success-600 font-medium">Online</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Power size={12} className="text-muted" />
                                                        <span className="text-muted">Offline</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Body */}
                                <div className="my-4 space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted">
                                        <MessageSquareText size={16} />
                                        <span className="flex-1">Tin nhắn chưa đọc:</span>
                                        <span className="font-medium text-text bg-primary-100 px-2 py-0.5 rounded-full">
                                            {acc.unreadCount || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted">
                                        <Clock size={16} />
                                        <span className="flex-1">Đăng nhập gần nhất:</span>
                                        <span className="font-medium text-text">
                                            {acc.lastLoginAt ? new Date(acc.lastLoginAt).toLocaleString('vi-VN') : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                {/* Footer */}
                                <div className="flex items-center gap-2 mt-2">
                                    <Link href={`/zalo/${acc._id}`} className="btn btn-primary flex-1 gap-1 text-sm">
                                        <span>Vào Chat</span>
                                        <ChevronRight size={16} />
                                    </Link>
                                    {acc.status === 'online' ? (
                                        <button onClick={() => handleLogout(acc._id)} className="icon-btn" title="Đăng xuất">
                                            <LogOut size={18} className="text-danger-700" />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleRelogin(acc._id)} className="icon-btn" title="Đăng nhập lại">
                                            <LogIn size={18} className="text-primary-600" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted">
                            {searchQuery
                                ? `Không tìm thấy tài khoản nào phù hợp với "${searchQuery}".`
                                : 'Chưa có tài khoản Zalo nào được thêm.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal QR (Không đổi) */}
            {qrCode && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setQrCode(''); setIsScanning(false); toast.dismiss(); }} />
                    <div className="bg-white p-4 rounded-lg relative flex flex-col items-center animate-pop card">
                        <img src={qrCode} alt="Zalo QR Code" className="w-64 h-64 rounded-md" />
                        <div className="mt-3 text-center">
                            <p className="font-semibold text-primary-700">Dùng Zalo để quét mã</p>
                            <p className="text-sm text-muted">để đăng nhập ngay</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}