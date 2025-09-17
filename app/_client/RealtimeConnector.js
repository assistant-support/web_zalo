"use client";
import { useEffect } from "react";
import { getSocket, disconnectSocket } from "@/lib/realtime/socket-client";
export default function RealtimeConnector() {
    useEffect(() => {
        const s = getSocket();
        s.on("hello", (m) => console.log("[hello]", m));
        s.on("system", (m) => console.log("[system]", m));
        s.on("chat:message", (m) => console.log("[chat]", m));
        return () => { s.off("hello"); s.off("system"); s.off("chat:message"); disconnectSocket(); };
    }, []);
    return null;
}
