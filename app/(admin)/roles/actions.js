// app/(admin)/roles/actions.js
"use server";

import { dbConnect } from "@/lib/db";
import Role from "@/models/role.model";
import { getServerSession, assertPerm } from "@/lib/authz";
import { emitSocket } from "@/lib/realtime/emit";

export async function updateRolePermissionsAction(input) {
    const roleId = input?.get ? input.get("roleId") : input.roleId;
    const bindingsJson = input?.get ? input.get("bindings") : input.bindings;
    if (!roleId) return { ok: false, error: "Missing roleId" };

    let bindings;
    try {
        bindings = typeof bindingsJson === "string" ? JSON.parse(bindingsJson) : bindingsJson;
    } catch {
        return { ok: false, error: "Invalid bindings" };
    }

    const session = await getServerSession();
    if (!session?.user) return { ok: false, error: "Unauthenticated", status: 401 };
    assertPerm(session, "role:update");

    await dbConnect();
    await Role.findByIdAndUpdate(roleId, { permissions: bindings }, { new: true });

    await emitSocket({ target: { room: `role:${roleId}` }, event: "auth:refresh", payload: { reason: "role-permissions-updated" } });

    return { ok: true };
}
