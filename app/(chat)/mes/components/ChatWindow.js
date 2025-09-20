// app/chat/components/ChatWindow.js
'use client';
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/realtime/socket-client";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import { getMessages } from "../actions"; // Import Server Action
import { toast } from "sonner";

const CONVERSATION_ID = "general"; // ID phòng chat chung

export default function ChatWindow() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Hàm để tải thêm tin nhắn cũ
    const loadMoreMessages = useCallback(async () => {
        if (!hasMore || isLoadingMore) return;

        console.log('[Chat] Loading more messages, page:', page + 1);
        setIsLoadingMore(true);
        toast.loading("Đang tải tin nhắn cũ...");

        try {
            const nextPage = page + 1;
            const data = await getMessages(CONVERSATION_ID, nextPage);

            if (data.messages.length > 0) {
                // Thêm tin nhắn cũ vào *đầu* danh sách hiện tại
                setMessages((prevMessages) => [...data.messages, ...prevMessages]);
                setPage(nextPage);
            }

            // Cập nhật lại cờ `hasMore`
            setHasMore(data.hasMore);
        } catch (error) {
            console.error("[Chat] Failed to load more messages:", error);
            toast.error("Không thể tải thêm tin nhắn.");
        } finally {
            setIsLoadingMore(false);
            toast.dismiss();
        }
    }, [page, hasMore, isLoadingMore]);

    // Tải 10 tin nhắn đầu tiên khi component được mount
    useEffect(() => {
        getMessages(CONVERSATION_ID, 1).then((data) => {
            setMessages(data.messages);
            setHasMore(data.hasMore);
            setPage(1);
        });
    }, []);

    // Lắng nghe tin nhắn mới từ socket
    useEffect(() => {
        if (!session) return;

        const socket = getSocket();
        socket.emit('chat:join', CONVERSATION_ID);

        const handleNewMessage = (newMessage) => {
            console.log('[Chat] Received new message via socket:', newMessage);
            setMessages((prev) => [...prev, newMessage]);
        };

        socket.on('chat:new_message', handleNewMessage);

        return () => {
            socket.off('chat:new_message', handleNewMessage);
        };
    }, [session]);

    if (!session) {
        return <div className="p-4">Đang xác thực...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <MessageList
                messages={messages}
                currentUserId={session.user.id}
                onLoadMore={loadMoreMessages}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
            />
            <ChatInput conversationId={CONVERSATION_ID} />
        </div>
    );
}