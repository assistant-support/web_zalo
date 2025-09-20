// app/chat/layout.js
import { logout } from "@/app/actions/auth-actions";
import Link from "next/link";
import { MessageSquare, Users } from "lucide-react";

// Layout này sẽ bao bọc tất cả các trang trong group (admin)
export default function AppLayout({ children }) {
    return (
        <div className="flex h-screen">
            <aside className="w-64 bg-gray-800 text-white flex flex-col p-4">
                <div>
                    <h2 className="text-xl font-bold mb-6">Zalo App</h2>
                    <nav>
                        <ul>
                            <li>
                                <Link href="/chat" className="flex items-center gap-3 py-2 px-4 rounded hover:bg-gray-700">
                                    <MessageSquare size={20} />
                                    <span>Chat</span>
                                </Link>
                            </li>
                            <li>
                                <Link href="/admin/users" className="flex items-center gap-3 py-2 px-4 rounded hover:bg-gray-700">
                                    <Users size={20} />
                                    <span>Admin</span>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
                <div className="mt-auto">
                    <form action={logout}>
                        <button className="w-full text-left py-2 px-4 rounded bg-red-600 hover:bg-red-700">Sign Out</button>
                    </form>
                </div>
            </aside>
            <main className="flex-1 bg-gray-100 flex flex-col">
                {children}
            </main>
        </div>
    );
}