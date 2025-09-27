// app/(chat)/mes/[sessionId]/ZaloChatClient.jsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
// ✅ THAY ĐỔI: Import các hàm mới để quản lý kết nối
import { connectSocket, disconnectSocket } from '@/lib/realtime/socket-client';
import { toast } from 'sonner';
// (Thêm các import icon nếu cần)
import { Send, Search as SearchIcon, X } from 'lucide-react';


export default function ZaloChatClient({ sessionId, account }) {
    // ✅ THAY ĐỔI: Dùng state để lưu instance socket thay vì ref
    const [socket, setSocket] = useState(null);
    const [connStatus, setConnStatus] = useState('connecting'); // connecting | connected | disconnected | error

    // Các state khác giữ nguyên
    const [threads, setThreads] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [recent, setRecent] = useState([]);
    const [phone, setPhone] = useState('');
    const [results, setResults] = useState([]);
    const [draft, setDraft] = useState('');

    const messagesEndRef = useRef(null); // Ref để tự động cuộn xuống tin nhắn mới

    // ========= BƯỚC 1: useEffect quản lý vòng đời kết nối socket =========
    // Hook này chịu trách nhiệm KẾT NỐI khi component mount và NGẮT KẾT NỐI khi unmount.
    useEffect(() => {
        // Hàm để khởi tạo kết nối
        const initializeSocket = async () => {
            try {
                setConnStatus('connecting');
                const socketInstance = await connectSocket();
                setSocket(socketInstance); // Lưu instance vào state khi thành công
            } catch (error) {
                setConnStatus('error');
                toast.error("Lỗi kết nối real-time. Vui lòng tải lại trang.");
                console.error("[Chat Socket Init] Lỗi:", error);
            }
        };

        initializeSocket();

        // Hàm dọn dẹp: sẽ được gọi khi component unmount
        return () => {
            disconnectSocket();
            setSocket(null);
        };
    }, []); // Mảng rỗng đảm bảo nó chỉ chạy một lần khi component mount

    // ========= BƯỚC 2: useEffect lắng nghe sự kiện & tải dữ liệu ban đầu =========
    // Hook này chỉ chạy KHI `socket` đã sẵn sàng (không còn là null).
    useEffect(() => {
        if (!socket) return; // Nếu chưa có socket, không làm gì cả

        // --- Tải dữ liệu ban đầu ngay khi có kết nối ---
        // 1. Đảm bảo session Zalo phía server đang active
        socket.emit('zalo:ensure_active', { sessionId }, (ack) => {
            if (ack?.success) {
                setConnStatus('connected');
                // 2. Nếu active thành công, tải danh sách hội thoại
                socket.emit('zalo:list_threads', { sessionId }, (ackThreads) => {
                    if (ackThreads?.success) {
                        setThreads(ackThreads.data || []);
                    } else {
                        toast.error("Không thể tải danh sách hội thoại.");
                    }
                });
            } else {
                setConnStatus('error');
                toast.error(ack?.error || "Session Zalo không hợp lệ hoặc đã hết hạn.");
            }
        });

        // --- Định nghĩa các hàm xử lý sự kiện tin nhắn ---
        const onMsgIn = ({ sessionId: sid, message }) => {
            // Chỉ cập nhật nếu tin nhắn thuộc session và thread đang xem
            if (sid === sessionId && message?.peerId === selected?.peerId) {
                setMessages((prev) => [...prev, message]);
            }
            // Cập nhật last message cho thread list (sẽ làm ở bước tối ưu sau)
        };
        const onMsgOut = ({ sessionId: sid, message }) => {
            if (sid === sessionId && message?.peerId === selected?.peerId) {
                setMessages((prev) => [...prev, message]);
            }
        };

        // --- Đăng ký lắng nghe ---
        socket.on('zalo:msg_in', onMsgIn);
        socket.on('zalo:msg_out', onMsgOut);

        // --- Dọn dẹp: Hủy lắng nghe khi component unmount hoặc socket thay đổi ---
        return () => {
            socket.off('zalo:msg_in', onMsgIn);
            socket.off('zalo:msg_out', onMsgOut);
        };
    }, [socket, sessionId, selected?.peerId]); // Chạy lại nếu socket, sessionId, hoặc người đang chat thay đổi

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    const canSend = useMemo(() => Boolean(sessionId && selected && draft.trim() && connStatus === 'connected'), [sessionId, selected, draft, connStatus]);

    // ========= Cập nhật các hàm hành động để dùng `socket` từ state =========

    const openSearch = () => {
        setShowSearch(true);
        setResults([]);
        if (!socket) return; // Kiểm tra socket trước khi emit
        socket.emit('zalo:recent_searches', { sessionId }, (ack) => {
            if (ack?.success) setRecent(ack.data || []);
        });
    };

    const doSearch = () => {
        if (!socket) return;
        setResults([]);
        socket.emit('zalo:search_user', { sessionId, phone }, (ack) => {
            if (ack?.success) setResults(ack.data || []);
        });
    };

    const loadThread = (t) => {
        setSelected({ peerId: t.peerId, name: t.name, avatar: t.avatar });
        setMessages([]);
        if (!socket) return;
        socket.emit('zalo:get_messages', { sessionId, peerId: t.peerId, limit: 50 }, (ack) => {
            if (ack?.success) setMessages(ack.data || []);
        });
        socket.emit('zalo:mark_read', { sessionId, peerId: t.peerId }, () => { });
    };

    const onSend = () => {
        if (!socket || !selected || !canSend) return;
        const text = draft.trim();
        socket.emit('zalo:send_message', { sessionId, peerId: selected.peerId, text }, (ack) => {
            if (!ack?.success) {
                toast.error(ack?.error || "Gửi tin nhắn thất bại.");
                return;
            }
            // Không cần thêm vào message list ở đây vì đã có listener 'zalo:msg_out' xử lý
            setDraft('');
            // Tải lại danh sách threads để cập nhật tin nhắn cuối và thời gian
            socket.emit('zalo:list_threads', { sessionId }, (ack2) => {
                if (ack2?.success) setThreads(ack2.data || []);
            });
        });
    };

    // (Toàn bộ phần JSX giữ nguyên)
    return (
        <div className="h-[calc(100vh-4rem)] grid grid-cols-12 gap-4 p-4 bg-gray-50">
            {/* Sidebar: Threads */}
            <aside className="col-span-3 bg-white border rounded-2xl overflow-hidden flex flex-col">
                <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={account?.avatar || 'https://placehold.co/28'} alt={account?.name} className="w-7 h-7 rounded-full" />
                        <div className="text-sm font-medium">{account?.name || 'Zalo'}</div>
                    </div>
                    <button className="btn btn-sm btn-outline gap-1" onClick={openSearch}><SearchIcon size={14} /> Tìm</button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {threads.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500">Chưa có hội thoại.</div>
                    ) : threads.map(t => (
                        <button
                            key={t.peerId}
                            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 border-b hover:bg-gray-50 transition-colors duration-150 ${selected?.peerId === t.peerId ? 'bg-blue-50' : ''}`}
                            onClick={() => loadThread(t)}
                        >
                            <img src={t.avatar || 'https://placehold.co/36'} alt={t.name} className="w-9 h-9 rounded-full" />
                            <div className="flex-1 overflow-hidden">
                                <div className="text-sm font-medium truncate">{t.name}</div>
                                <div className="text-xs text-gray-500 truncate">{t.lastMessageText || ''}</div>
                            </div>
                            {t.unread > 0 && <span className="text-xs bg-blue-600 text-white rounded-full px-2 py-0.5 font-semibold">{t.unread}</span>}
                        </button>
                    ))}
                </div>

                <div className="px-3 py-2 text-[11px] text-gray-400 border-t">
                    Trạng thái: {connStatus}
                </div>
            </aside>

            {/* Chat panel */}
            <main className="col-span-9 border bg-white rounded-2xl flex flex-col">
                {/* Header */}
                <div className="px-4 py-3 border-b flex items-center gap-3">
                    {selected ? (
                        <>
                            <img src={selected.avatar || 'https://placehold.co/28'} alt={selected.name} className="w-8 h-8 rounded-full" />
                            <div className="font-medium">{selected.name || selected.peerId}</div>
                        </>
                    ) : (
                        <div className="font-semibold">Multi-Zalo for Sales</div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                    {!selected ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                            <div className="text-xl font-semibold">Kết nối & quản lý nhiều tài khoản Zalo</div>
                            <div className="text-sm text-gray-500">Tìm nhanh, nhắn tin realtime, đồng bộ nhiều account — tối ưu cho đội sale.</div>
                            <button className="mt-3 btn btn-outline" onClick={openSearch}>Bắt đầu bằng cách tìm số điện thoại</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {messages.map(m => (
                                <div key={m.id} className={`flex items-end gap-2 ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl border ${m.direction === 'out' ? 'bg-blue-500 text-white rounded-br-lg' : 'bg-gray-200 text-gray-800 rounded-bl-lg'}`}>
                                        <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                                        {/* <div className="text-[10px] opacity-60 mt-1">{new Date(m.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div> */}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Composer */}
                <div className="p-3 border-t flex gap-2">
                    <input
                        className="input flex-1"
                        placeholder={selected ? 'Nhập tin nhắn...' : 'Chọn người để bắt đầu chat'}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && canSend) onSend(); }}
                        disabled={!selected || connStatus !== 'connected'}
                    />
                    <button className="btn btn-primary" disabled={!canSend} onClick={onSend}>
                        <Send size={16} />
                    </button>
                </div>
            </main>

            {/* Search modal */}
            {showSearch && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-white w-[520px] rounded-2xl p-4 space-y-4 flex flex-col animate-pop">
                        <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold">Tìm người dùng Zalo</div>
                            <button className="icon-btn" onClick={() => setShowSearch(false)}><X size={20} /></button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                className="input flex-1"
                                placeholder="Nhập số điện thoại (vd: 0833...)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                            />
                            <button className="btn btn-primary" onClick={doSearch}>Tìm</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 pt-2">
                            {/* Search results */}
                            {results.length > 0 && (
                                <div>
                                    <div className="text-sm font-medium mb-2 text-gray-500">Kết quả tìm kiếm</div>
                                    <div className="space-y-2">
                                        {results.map(u => (
                                            <button key={`res-${u.peerId}`} onClick={() => { setShowSearch(false); loadThread(u); }} className="w-full text-left p-2 rounded-xl border hover:bg-gray-100 flex items-center gap-3">
                                                <img src={u.avatar || 'https://placehold.co/36'} alt={u.name} className="w-9 h-9 rounded-full" />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{u.name}</div>
                                                    <div className="text-xs text-gray-500">{u.phone || ''}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Recent */}
                            <div>
                                <div className="text-sm font-medium mb-2 text-gray-500">Tìm gần đây</div>
                                {recent.length === 0 ? (
                                    <div className="text-sm text-gray-400">Chưa có lịch sử.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {recent.map(u => (
                                            <button key={`rec-${u.peerId}`} onClick={() => { setShowSearch(false); loadThread(u); }} className="w-full text-left p-2 rounded-xl border hover:bg-gray-100 flex items-center gap-3">
                                                <img src={u.avatar || 'https://placehold.co/36'} alt={u.name} className="w-9 h-9 rounded-full" />
                                                <div className="flex-1">
                                                    <div className="text-sm font-medium">{u.name}</div>
                                                    <div className="text-xs text-gray-500">{u.phone}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}