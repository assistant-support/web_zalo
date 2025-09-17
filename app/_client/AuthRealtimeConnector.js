// app/_client/AuthRealtimeConnector.js
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { getSocket } from "@/lib/realtime/socket-client";

export default function AuthRealtimeConnector() {
    const { data: session, update } = useSession();

    useEffect(() => {
        const s = getSocket();
        const uid = session?.user?.id || null;
        const roleId = session?.user?.roleId || null;

        // Bind vào các room RBAC theo user/role
        s.emit("auth:bind", { uid, roleId });

        const onRefresh = async () => {
            // Server bắn 'auth:refresh' => refresh JWT (callbacks.jwt(trigger='update'))
            await update();
            // Sau update, effect sẽ chạy lại do session thay đổi => bind role mới tự động
        };

        s.on("auth:refresh", onRefresh);
        return () => {
            s.off("auth:refresh", onRefresh);
            // (tuỳ chọn) s.emit("auth:unbind");
        };
    }, [session?.user?.id, session?.user?.roleId, update]);

    return null;
}
