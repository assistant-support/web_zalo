// app/(chat)/mes/accounts/ZaloAccountsManager.js
'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getSocket } from '@/lib/realtime/socket-client';
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
    // Sử dụng trực tiếp initialAccounts và thêm unreadCount (có thể thay bằng dữ liệu thật sau này)
    const [accounts, setAccounts] = useState(
        (initialAccounts || []).map(acc => ({ ...acc, unreadCount: acc.unreadCount || 5 })) // Gán giá trị mặc định cho tin nhắn chưa đọc
    );
    const [qrCode, setQrCode] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const accountsRef = useRef(accounts);

    useEffect(() => {
        accountsRef.current = accounts;
    }, [accounts]);

    // ... (Toàn bộ phần logic xử lý socket của bạn không thay đổi)
    useEffect(() => {
        if (status !== 'authenticated') return;
        const socket = getSocket();

        const handleQr = (payload) => {
            toast.dismiss();
            if (payload.image) {
                setQrCode(payload.image);
            }
            setIsScanning(true);
        };

        const handleLoginSuccess = (payload) => {
            setAccounts(prevAccounts => {
                const payloadWithUnread = { ...payload, unreadCount: 0 };
                const newAccounts = [...prevAccounts];
                const idx = newAccounts.findIndex(acc => acc._id === payload._id);
                if (idx !== -1) {
                    newAccounts[idx] = { ...newAccounts[idx], ...payloadWithUnread };
                } else {
                    newAccounts.push(payloadWithUnread);
                }
                newAccounts.sort((a, b) => new Date(b.lastLoginAt) - new Date(a.lastLoginAt));
                return newAccounts;
            });
            setQrCode('');
            setIsScanning(false);
            const name = payload.name || 'tài khoản Zalo';
            toast.success(`Đã đăng nhập ${name} thành công!`);
        };

        const handleLoginError = (payload) => {
            setQrCode('');
            setIsScanning(false);
            const msg = payload?.message || 'Đăng nhập Zalo thất bại.';
            toast.dismiss();
            toast.error(msg);
        };

        const handleLoggedOut = (payload) => {
            const sessionId = payload.id;
            setAccounts(prevAccounts => {
                return prevAccounts.map(acc =>
                    acc._id === sessionId ? { ...acc, status: 'offline' } : acc
                );
            });
            const acc = accountsRef.current.find(acc => acc._id === sessionId);
            const name = acc ? acc.name : 'tài khoản Zalo';
            toast.success(`Đã đăng xuất ${name}.`);
        };

        const handleSessionExpired = (payload) => {
            const sessionId = payload.id;
            setAccounts(prevAccounts => {
                return prevAccounts.map(acc =>
                    acc._id === sessionId ? { ...acc, status: 'offline' } : acc
                );
            });
            const acc = accountsRef.current.find(acc => acc._id === sessionId);
            const name = acc ? acc.name : 'tài khoản Zalo';
            toast.error(`Phiên đăng nhập của ${name} đã hết hạn. Vui lòng đăng nhập lại.`);
        };

        socket.on('zalo:qr', handleQr);
        socket.on('zalo:login_success', handleLoginSuccess);
        socket.on('zalo:login_error', handleLoginError);
        socket.on('zalo:logged_out', handleLoggedOut);
        socket.on('zalo:session_expired', handleSessionExpired);

        return () => {
            socket.off('zalo:qr', handleQr);
            socket.off('zalo:login_success', handleLoginSuccess);
            socket.off('zalo:login_error', handleLoginError);
            socket.off('zalo:logged_out', handleLoggedOut);
            socket.off('zalo:session_expired', handleSessionExpired);
        };
    }, [status]);

    const handleLoginRequest = (sessionId) => {
        if (!session) return;
        const socket = getSocket();
        socket.emit('zalo:login_request', sessionId ? { sessionId } : {});
        toast.loading('Đang tạo mã QR...');
        setIsScanning(true);
    };

    const handleAddAccount = () => {
        if (isScanning) return;
        handleLoginRequest();
    };

    const handleLogout = (sessionId) => {
        if (!sessionId) return;
        const socket = getSocket();
        socket.emit('zalo:logout', { sessionId });
    };

    const handleRelogin = (sessionId) => {
        if (isScanning) return;
        handleLoginRequest(sessionId);
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            {/* Thanh tác vụ: Tìm kiếm và nút thêm tài khoản */}
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
                    <span className='text-sm cursor-pointer'>Add Account</span>
                </button>
            </div>

            {/* Lưới hiển thị các thẻ tài khoản */}
            <div className='flex-1 overflow-y-auto'>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {filteredAccounts.map(acc => (
                        <div key={acc._id} className="card flex flex-col justify-between p-4 elev-1 animate-fadeInUp">
                            {/* Phần header */}
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

                            {/* Phần thân */}
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

                            {/* Phần footer */}
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
            </div>

            {/* Thông báo không có kết quả */}
            {filteredAccounts.length === 0 && (
                <div className="text-center py-10 col-span-full">
                    <p className="text-muted">
                        {searchQuery ? `Không tìm thấy tài khoản nào phù hợp với "${searchQuery}".` : "Chưa có tài khoản Zalo nào được thêm."}
                    </p>
                </div>
            )}

            {/* Modal hiển thị QR Code */}
            {qrCode && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    <div className="absolute inset-0 bg-black opacity-50" onClick={() => { setQrCode(''); setIsScanning(false); toast.dismiss(); }}>
                    </div>
                    <div className="bg-white p-4 rounded-lg relative flex flex-col items-center animate-pop card">
                        <img src={`data:image/png;base64,${qrCode}`} alt="Zalo QR Code" className="w-64 h-64 rounded-md" />
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