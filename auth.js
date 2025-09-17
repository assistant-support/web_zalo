import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const DBG = process.env.DEBUG_AUTH === '1';
const L = (...a) => DBG && console.log('[AUTH]', ...a);

async function buildRoleClaims(userDoc) {
    const [{ default: Role }] = await Promise.all([
        import("./models/role.model.js"),
        import("./models/permission.model.js"),
    ]);

    if (!userDoc?.role) return { roleId: null, roleName: null, isAdmin: false, perms: [] };

    const role = await Role.findById(userDoc.role)
        .populate({
            path: "permissions.permission",
            select: "action group description label tags"
        })
        .lean();

    if (!role) return { roleId: null, roleName: null, isAdmin: false, perms: [] };

    const roleName = role.name;
    const isAdmin = roleName === "admin";
    const perms = (role.permissions || [])
        .map(p => ({
            action: p?.permission?.action || "",
            label: p?.permission?.label || p?.permission?.action || "",
            group: p?.permission?.group || "",
            tags: Array.isArray(p?.permission?.tags) ? p.permission.tags : [],
            conditions: p?.conditions || {},
            allowedFields: Array.isArray(p?.allowedFields) ? p.allowedFields : [],
        }))
        .filter(p => p.action);

    return { roleId: String(role._id), roleName, isAdmin, perms };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SOCKET_SECRET,
    session: { strategy: "jwt" },
    trustHost: true,
    pages: { signIn: "/login" },

    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize({ email, password }) {
                if (!email || !password) return null;

                // ✅ CHỈ dùng DB trong authorize (Node runtime)
                const [{ dbConnect }, { default: User }] = await Promise.all([
                    import("./lib/db.js"),
                    import("./models/account.model.js"),
                ]);
                await dbConnect();

                const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
                if (!user) return null;
                if (user.provider && user.provider !== "credentials") return null;
                if (user.status !== "active") return null;

                const ok = await bcrypt.compare(password, user.password || "");
                if (!ok) return null;

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
        // Middleware sẽ đọc cờ này từ token – KHÔNG chạm DB ở đây
        authorized: ({ auth }) => !!auth?.user,

        async signIn() {
            return true;
        },

        async jwt({ token, user, trigger }) {
            // ❗❗ QUAN TRỌNG:
            // - middleware chạy qua đây rất nhiều lần -> TUYỆT ĐỐI KHÔNG import DB/Mongoose mặc định
            // - chỉ chạm DB khi có 'user' (đăng nhập thành công) hoặc 'trigger === "update"' (session.update())

            // 1) Lần đăng nhập đầu tiên: có 'user' -> build claims từ DB
            if (user?.email) {
                const [{ dbConnect }, { default: User }] = await Promise.all([
                    import("./lib/db.js"),
                    import("./models/account.model.js"),
                ]);
                await dbConnect();

                const userDoc = await User.findOne({ email: user.email.toLowerCase() }).lean();
                token.uid = String(userDoc?._id);
                token.username = userDoc?.username ?? null;
                token.status = userDoc?.status ?? "active";
                const claims = await buildRoleClaims(userDoc);
                token.roleId = claims.roleId;
                token.roleName = claims.roleName;
                token.isAdmin = claims.isAdmin;
                token.perms = claims.perms;
                token.email = user.email.toLowerCase();
                return token;
            }

            // 2) Refresh theo yêu cầu từ client (session.update()) -> cập nhật claims mới nhất
            if (trigger === "update") {
                L('jwt update', { tokenEmail: token.email, uid: token.uid });
                const [{ dbConnect }, { default: User }] = await Promise.all([
                    import("./lib/db.js"),
                    import("./models/account.model.js"),
                ]);
                await dbConnect();

                let userDoc = null;
                if (token.email) userDoc = await User.findOne({ email: token.email }).lean();
                if (!userDoc && token.uid) userDoc = await User.findById(token.uid).lean();

                if (userDoc) {
                    token.uid = String(userDoc._id);
                    token.username = userDoc.username ?? null;
                    token.status = userDoc.status ?? "active";
                    const claims = await buildRoleClaims(userDoc);
                    token.roleId = claims.roleId;
                    token.roleName = claims.roleName;
                    token.isAdmin = claims.isAdmin;
                    token.perms = claims.perms;
                    token.email = userDoc.email?.toLowerCase() || token.email || null;
                } else {
                    token.roleId = null;
                    token.roleName = null;
                    token.isAdmin = false;
                    token.perms = [];
                    token.status = "inactive";
                }
                return token;
            }

            // 3) Mặc định: KHÔNG đụng DB (đường đi middleware/requests thông thường)
            return token;
        },

        // Không chạm DB ở đây – chỉ map từ token sang session
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
