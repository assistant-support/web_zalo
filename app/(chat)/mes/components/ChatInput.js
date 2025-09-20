'use client';
import { useState } from 'react';
import { getSocket } from '@/lib/realtime/socket-client';
import { Send } from 'lucide-react';

export default function ChatInput({ conversationId }) {
    const [message, setMessage] = useState('');

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const socket = getSocket();

        console.log(`[Chat] Sending message to conversation ${conversationId}:`, message);
        // Gửi sự kiện 'chat:message' lên server
        socket.emit('chat:message', {
            conversationId: conversationId,
            content: message,
            type: 'text'
        });

        setMessage('');
    };

    return (
        <div className="p-4 bg-white border-t">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoComplete="off"
                />
                <button type="submit" className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600">
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}