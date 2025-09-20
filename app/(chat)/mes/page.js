// app/chat/page.js
import ChatWindow from "./components/ChatWindow";

export const dynamic = 'force-dynamic';

export default function ChatPage() {
    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b bg-white shadow-sm">
                <h1 className="text-xl font-semibold">General Chat Room</h1>
            </header>
            <ChatWindow />
        </div>
    );
}