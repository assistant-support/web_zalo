// app/(chat)/mes/[sessionId]/ZaloChatClient.js
'use client';

// UI chat cơ bản theo phong cách Zalo: trái (danh sách hội thoại + tìm kiếm), giữa (khung chat), phải (tùy chọn trong tương lai)
// TẤT CẢ tương tác realtime qua Socket.IO; preload danh sách & tin nhắn dùng REST http của server_socket.io.
// BẢO VỆ REST: dùng socket token (Authorization: Bearer <token>) giống cơ chế kết nối socket.

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { getSocket } from '@/lib/realtime/socket-client';

// Lấy token giống socket để gọi REST từ server_socket.io
async function fetchSocketToken() {
    const res = await fetch('/api/rt/socket-token', { method: 'GET', credentials: 'include' });
    if (!res.ok) throw new Error('cannot get socket token');
    const data = await res.json();
    return data.token;
}

const BASE = process.env.NEXT_PUBLIC_SOCKET_URL; // ví dụ http://localhost:5001

export default function ZaloChatClient({ sessionId, account }) {
    const socket = useMemo(() => getSocket(), []);
    const [token, setToken] = useState(null);

    // Danh sách hội thoại & lựa chọn hiện tại
    const [convs, setConvs] = useState([]);                // [{peerId, name, avatar, lastMessageAt, unread}]
    const [activePeer, setActivePeer] = useState(null);    // peerId đang mở
    const [messages, setMessages] = useState([]);          // tin nhắn của peer đang mở
    const messagesRef = useRef(messages);
    const [input, setInput] = useState('');
    const [search, setSearch] = useState('');
    const [found, setFound] = useState([]);                // kết quả tìm kiếm số/ username

    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // Lấy token lần đầu để gọi REST
    useEffect(() => {
        (async () => {
            try { setToken(await fetchSocketToken()); } catch (e) { console.error(e); }
        })();
    }, []);

    // Preload danh sách hội thoại từ server khi có token
    useEffect(() => {
        if (!token) return;
        (async () => {
            try {
                const res = await fetch(`${BASE}/api/zalo/${sessionId}/conversations`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                });
                const data = await res.json();
                if (Array.isArray(data.items)) setConvs(data.items);
            } catch (e) { console.error('[ChatClient] preload conversations failed', e); }
        })();
    }, [token, sessionId]);

    // Khi chọn 1 hội thoại → tải lịch sử tin nhắn
    const loadMessages = async (peerId) => {
        if (!token || !peerId) return;
        try {
            const res = await fetch(`${BASE}/api/zalo/${sessionId}/messages?peerId=${encodeURIComponent(peerId)}`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });
            const data = await res.json();
            setMessages(Array.isArray(data.items) ? data.items : []);
        } catch (e) {
            console.error('[ChatClient] load messages failed', e);
            setMessages([]);
        }
    };

    // Lắng nghe tin nhắn realtime
    useEffect(() => {
        const onIn = (payload) => {
            if (!payload || payload.sessionId !== sessionId) return;
            const m = payload.message;
            // Cập nhật UI hội thoại (sắp xếp lại)
            setConvs((prev) => {
                const next = [...prev];
                const idx = next.findIndex(x => x.peerId === m.peerId);
                if (idx === -1) next.unshift({ peerId: m.peerId, name: m.peerName || 'Unknown', avatar: m.peerAvatar || '', lastMessageAt: m.ts, unread: (activePeer === m.peerId ? 0 : 1) });
                else {
                    next[idx] = { ...next[idx], name: m.peerName || next[idx].name, avatar: m.peerAvatar || next[idx].avatar, lastMessageAt: m.ts, unread: (activePeer === m.peerId ? 0 : (next[idx].unread + (m.direction === 'in' ? 1 : 0))) };
                    // đẩy hội thoại vừa có tin lên đầu
                    next.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
                }
                return next;
            });
            // Nếu đang mở đúng peer → thêm vào khung chat
            if (activePeer === m.peerId) {
                setMessages((prev) => [...prev, m]);
                // scroll xuống cuối
                setTimeout(() => { document.getElementById('chat-scroller')?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, 50);
            }
        };
        const onOut = (payload) => {
            if (!payload || payload.sessionId !== sessionId) return;
            const m = payload.message;
            if (activePeer === m.peerId) {
                setMessages((prev) => [...prev, m]);
                setTimeout(() => { document.getElementById('chat-scroller')?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, 50);
            }
        };
        socket.on('zalo:msg_in', onIn);
        socket.on('zalo:msg_out', onOut);
        return () => {
            socket.off('zalo:msg_in', onIn);
            socket.off('zalo:msg_out', onOut);
        };
    }, [socket, sessionId, activePeer]);

    // Chọn 1 cuộc hội thoại
    const openConv = async (peerId) => {
        setActivePeer(peerId);
        await loadMessages(peerId);
        setConvs(prev => prev.map(x => x.peerId === peerId ? { ...x, unread: 0 } : x));
        setTimeout(() => { document.getElementById('chat-scroller')?.scrollTo({ top: 1e9, behavior: 'smooth' }); }, 50);
    };

    // Gửi tin nhắn qua socket
    const sendText = () => {
        if (!input.trim() || !activePeer) return;
        const text = input.trim();
        socket.timeout(10_000).emit('zalo:send_message', { sessionId, peerId: activePeer, text }, (ack) => {
            // ack trả về { ok, message? }
            // UI sẽ nhận 'zalo:msg_out' ngay sau khi server push store + emit
        });
        setInput('');
    };

    // Tìm kiếm số/ bạn bè
    const doSearch = async () => {
        if (!token || !search.trim()) { setFound([]); return; }
        try {
            const res = await fetch(`${BASE}/api/zalo/${sessionId}/search?q=${encodeURIComponent(search.trim())}`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });
            const data = await res.json();
            setFound(Array.isArray(data.items) ? data.items : []);
        } catch (e) {
            setFound([]);
        }
    };

    // Render
    return (
        <div className="h-[calc(100vh-2rem)] grid grid-cols-[320px,1fr,280px] gap-4 p-4 bg-[#111827] text-white">
            {/* CỘT TRÁI: Tìm kiếm + Hội thoại */}
            <aside className="bg-[#0F172A] rounded-xl p-3 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                    {account.avatar ? (
                        <Image src={account.avatar} alt={account.name} width={36} height={36} className="rounded-full" />
                    ) : <div className="w-9 h-9 rounded-full bg-gray-600" />}
                    <div className="leading-tight">
                        <div className="font-semibold">{account.name}</div>
                        <div className="text-xs opacity-70">{account.status === 'online' ? 'Online' : 'Offline'}</div>
                    </div>
                </div>
                {/* Tìm kiếm số/ tên */}
                <div className="mb-3">
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-[#1F2937] rounded px-3 py-2 text-sm outline-none"
                            placeholder="Tìm kiếm số điện thoại hoặc tên…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                        />
                        <button onClick={doSearch} className="px-3 py-2 bg-indigo-600 rounded hover:bg-indigo-700 text-sm">Tìm</button>
                    </div>
                    {found.length > 0 && (
                        <div className="mt-2 max-h-56 overflow-auto border border-gray-700 rounded">
                            {found.map(u => (
                                <div key={u.peerId} className="p-2 hover:bg-gray-800 cursor-pointer flex items-center gap-2"
                                    onClick={() => openConv(u.peerId)}>
                                    {u.avatar ? <Image src={u.avatar} alt={u.name} width={28} height={28} className="rounded-full" /> : <div className="w-7 h-7 rounded-full bg-gray-600" />}
                                    <div className="text-sm">{u.name} <span className="opacity-60">({u.peerId})</span></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-xs uppercase opacity-60 mb-2">Tất cả</div>
                <div className="flex-1 overflow-auto divide-y divide-gray-800">
                    {convs.map(c => (
                        <div key={c.peerId}
                            onClick={() => openConv(c.peerId)}
                            className={`p-3 cursor-pointer hover:bg-gray-800 flex items-center gap-3 ${activePeer === c.peerId ? 'bg-gray-800' : ''}`}>
                            {c.avatar ? <Image src={c.avatar} alt={c.name} width={36} height={36} className="rounded-full" /> : <div className="w-9 h-9 rounded-full bg-gray-600" />}
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium truncate max-w-[160px]">{c.name}</div>
                                    <div className="text-[11px] opacity-60">{c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString() : ''}</div>
                                </div>
                                <div className="text-xs opacity-70">{c.peerId}</div>
                            </div>
                            {c.unread > 0 && <div className="text-[11px] bg-red-600 rounded-full px-2 py-[2px]">{c.unread}</div>}
                        </div>
                    ))}
                    {convs.length === 0 && <div className="p-4 text-sm opacity-60">Chưa có hội thoại. Hãy tìm số và mở chat.</div>}
                </div>
            </aside>

            {/* CỘT GIỮA: Khung chat */}
            <section className="bg-[#0B1220] rounded-xl flex flex-col">
                {/* Header */}
                <div className="h-14 border-b border-gray-800 flex items-center px-4 gap-3">
                    {activePeer ? (
                        <>
                            <div className="font-semibold">Chat với: {convs.find(x => x.peerId === activePeer)?.name || activePeer}</div>
                            <div className="text-xs opacity-60">({activePeer})</div>
                        </>
                    ) : <div className="opacity-60">Chọn 1 hội thoại bên trái để bắt đầu</div>}
                </div>

                {/* Messages */}
                <div id="chat-scroller" className="flex-1 overflow-auto p-4 space-y-2">
                    {activePeer ? messages.map(m => (
                        <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${m.direction === 'out' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                <div className="whitespace-pre-wrap text-sm">{m.text || <i>(empty)</i>}</div>
                                <div className="text-[10px] opacity-70 mt-1 text-right">{new Date(m.ts).toLocaleString()}</div>
                            </div>
                        </div>
                    )) : null}
                </div>

                {/* Composer */}
                <div className="h-16 border-t border-gray-800 px-3 flex items-center gap-2">
                    <input
                        className="flex-1 bg-[#121A2C] rounded px-3 py-2 text-sm outline-none"
                        placeholder="Nhập tin nhắn…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendText(); }}
                        disabled={!activePeer}
                    />
                    <button onClick={sendText} disabled={!activePeer || !input.trim()} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-600">Gửi</button>
                </div>
            </section>

            {/* CỘT PHẢI: để trống/ bổ sung sau (thông tin user/ file/ ghi chú...) */}
            <aside className="bg-[#0F172A] rounded-xl p-4">
                <div className="font-semibold mb-2">Chi tiết</div>
                {activePeer ? (
                    <div className="text-sm opacity-80">
                        <div>Peer ID: {activePeer}</div>
                        <div>Tên: {convs.find(x => x.peerId === activePeer)?.name || '-'}</div>
                    </div>
                ) : <div className="text-sm opacity-60">Chọn 1 hội thoại để xem chi tiết</div>}
            </aside>
        </div>
    );
}
