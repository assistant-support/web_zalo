// app/chat/components/MessageList.js
'use client';
import { useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

export default function MessageList({ messages, currentUserId, onLoadMore, hasMore, isLoadingMore }) {
    const endOfMessagesRef = useRef(null);

    // Tự động cuộn xuống cuối khi có tin nhắn mới
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex-1 p-4 overflow-y-auto">
            {/* Nút tải thêm */}
            <div className="text-center mb-4">
                {hasMore && (
                    <button
                        onClick={onLoadMore}
                        disabled={isLoadingMore}
                        className="text-sm text-blue-600 hover:underline disabled:text-gray-500 disabled:cursor-wait flex items-center gap-2 mx-auto"
                    >
                        {isLoadingMore && <Loader2 className="animate-spin" size={16} />}
                        {isLoadingMore ? 'Đang tải...' : 'Tải thêm tin nhắn cũ'}
                    </button>
                )}
            </div>

            <ul className="space-y-4">
                {messages.map((msg, index) => {
                    const isCurrentUser = msg.sender._id === currentUserId;
                    return (
                        <li key={msg._id || index} className={clsx("flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
                            {!isCurrentUser && (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" title={msg.sender.name}>
                                    {/* Có thể hiển thị avatar ở đây: <img src={msg.sender.avatar} /> */}
                                </div>
                            )}
                            <div className={clsx(
                                "max-w-xs md:max-w-md p-3 rounded-lg",
                                isCurrentUser ? "bg-blue-500 text-white" : "bg-white shadow-sm"
                            )}>
                                {!isCurrentUser && <p className="text-xs font-bold mb-1 text-gray-600">{msg.sender.name}</p>}
                                <p className="text-sm">{msg.content}</p>
                                <p className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString()}</p>
                            </div>
                        </li>
                    );
                })}
                <div ref={endOfMessagesRef} />
            </ul>
        </div>
    );
}