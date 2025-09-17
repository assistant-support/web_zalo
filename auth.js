// auth.js
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// KHÔNG import Mongoose models hoặc dbConnect ở đây

const DEBUG_AUTH = process.env.DEBUG_AUTH === '1';
const log = (...args) => DEBUG_AUTH && console.log('[AUTH]', ...args);

/**
 * Xây dựng các thông tin (claims) về vai trò và quyền hạn cho user.
 * Hàm này CHỈ được gọi bên trong môi trường Node.js.
 * @param {object} userDoc - Dữ liệu người dùng từ MongoDB.
 * @returns {object} - Một object chứa roleId, roleName, isAdmin, và danh sách perms.
 */
async function buildRoleClaims(userDoc) {
    if (!userDoc?.role) {
        return { roleId: null, roleName: null, isAdmin: false, perms: [] };
    }

    // Import động các model cần thiết
    const { default: Role } = await import("@/models/role.model.js");
    const { default: Permission } = await import("@/models/permission.model.js");

    try {
        const role = await Role.findById(userDoc.role)
            .populate({
                path: "permissions.permission",
                model: Permission,
                select: "action group description label tags"
            })
            .lean();

        if (!role) {
            return { roleId: null, roleName: null, isAdmin: false, perms: [] };
        }

        const roleName = role.name;
        const isAdmin = roleName === "admin";
        const perms = (role.permissions || [])
            .map(p => {
                if (!p.permission) return null;
                return {
                    action: p.permission.action || "",
                    label: p.permission.label || p.permission.action || "",
                    group: p.permission.group || "",
                    tags: Array.isArray(p.permission.tags) ? p.permission.tags : [],
                    conditions: p.conditions || {},
                    allowedFields: Array.isArray(p.allowedFields) ? p.allowedFields : [],
                };
            })
            .filter(Boolean);

        return { roleId: String(role._id), roleName, isAdmin, perms };
    } catch (error) {
        console.error('[AUTH] Error building role claims:', error);
        return { roleId: null, roleName: null, isAdmin: false, perms: [] };
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.AUTH_SECRET,
    session: { strategy: "jwt" },
    trustHost: true,
    pages: { signIn: "/login" },

    providers: [
        Credentials({
            // ... (phần authorize giữ nguyên như cũ, nó cũng chỉ chạy ở môi trường Node.js)
            async authorize({ email, password }) {
                if (!email || !password) return null;

                // Import động DB và Model
                const { dbConnect } = await import("@/lib/db.js");
                const { default: User } = await import("@/models/account.model.js");
                await dbConnect();

                const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
                if (!user || user.status !== "active") return null;

                const isPasswordCorrect = await bcrypt.compare(password, user.password || "");
                if (!isPasswordCorrect) return null;

                return {
                    id: String(user._id),
                    name: user.name,
                    email: user.email,
                    image: user.avatar,
                    username: user.username,
                };
            },
        }),
    ],

    callbacks: {
        // Callback này an toàn cho Edge Runtime vì nó không truy cập DB.
        authorized: ({ auth }) => !!auth?.user,

        async signIn() {
            return true;
        },

        // Callback này chỉ chạy trên server Node.js, KHÔNG chạy trong middleware.
        async jwt({ token, user, trigger }) {
            log(`JWT callback triggered. Reason: ${trigger}, User present: ${!!user}`);

            // Chỉ truy cập DB khi đăng nhập hoặc có yêu cầu update.
            if (user || trigger === "update") {
                try {
                    // Import động DB và Model ngay khi cần dùng
                    const { dbConnect } = await import("@/lib/db.js");
                    const { default: User } = await import("@/models/account.model.js");
                    await dbConnect();

                    const userDoc = await User.findById(token.uid || user.id).lean();

                    if (userDoc) {
                        log('Updating JWT from userDoc', userDoc._id);
                        token.uid = String(userDoc._id);
                        token.username = userDoc.username ?? null;
                        token.status = userDoc.status ?? "active";
                        token.email = userDoc.email?.toLowerCase() ?? null;

                        const claims = await buildRoleClaims(userDoc);
                        token.roleId = claims.roleId;
                        token.roleName = claims.roleName;
                        token.isAdmin = claims.isAdmin;
                        token.perms = claims.perms;
                    } else {
                        log('User not found in DB during JWT update. Invalidating token.');
                        return { ...token, status: 'inactive', perms: [], roleId: null, roleName: null, isAdmin: false };
                    }
                } catch (error) {
                    console.error('[AUTH] Error in JWT callback:', error);
                    return token;
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.uid;
                session.user.username = token.username ?? null;
                session.user.status = token.status ?? "active";
                session.user.roleId = token.roleId ?? null;
                session.user.roleName = token.roleName ?? null;
                session.user.isAdmin = !!token.isAdmin;
                session.user.perms = Array.isArray(token.perms) ? token.perms : [];
            }
            return session;
        },
    },
});