// auth.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// KHÔNG import các module server ở cấp cao nhất - Cấu trúc này là ĐÚNG

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        CredentialsProvider({
            async authorize(credentials) {
                // Dynamic import để đảm bảo không bị bundle vào các môi trường không hỗ trợ
                const { connectToDB } = await import('@/lib/db');
                const Account = (await import('@/models/account.model')).default;
                const Permission = (await import('@/models/permission.model')).default;
                await import('@/models/role.model');

                await connectToDB();

                const user = await Account.findOne({ email: credentials.email })
                    .select('+password')
                    .populate({
                        path: 'role',
                        populate: { path: 'permissions', model: Permission, select: 'name' }
                    });

                if (user && user.password) {
                    const isPasswordCorrect = bcrypt.compareSync(credentials.password, user.password);
                    if (isPasswordCorrect) {
                        return {
                            id: user._id.toString(),
                            name: user.name,
                            email: user.email,
                            role: user.role,
                        };
                    }
                }
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            // Lần đầu đăng nhập
            if (user) {
                token.uid = user.id;
                token.name = user.name;
                token.email = user.email;
                token.roleId = user.role?._id.toString();
                token.roleName = user.role?.name;
                token.perms = user.role?.permissions.map(p => p.name) || [];
                token.isAdmin = user.role?.name === 'admin';

                const realtimeTokenPayload = {
                    uid: user.id,
                    roleId: user.role?._id.toString(),
                };
                token.realtimeToken = sign(realtimeTokenPayload, process.env.AUTH_SECRET, { expiresIn: '1h' });
                return token;
            }

            // Cập nhật session, truy vấn lại DB để lấy quyền mới nhất
            if (trigger === 'update') {
                try {
                    const { connectToDB } = await import('@/lib/db');
                    const Account = (await import('@/models/account.model')).default;
                    const Permission = (await import('@/models/permission.model')).default;
                    await import('@/models/role.model');

                    await connectToDB();

                    const freshUser = await Account.findById(token.uid).populate({
                        path: 'role',
                        populate: { path: 'permissions', model: Permission, select: 'name' }
                    }).lean();

                    if (freshUser) {
                        token.roleId = freshUser.role?._id.toString();
                        token.roleName = freshUser.role?.name;
                        token.perms = freshUser.role?.permissions.map(p => p.name) || [];
                        token.isAdmin = freshUser.role?.name === 'admin';
                    }
                } catch (error) {
                    console.error('[JWT Callback] Lỗi khi làm mới token:', error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.uid;
            session.user.name = token.name;
            session.user.email = token.email;
            session.user.roleId = token.roleId;
            session.user.roleName = token.roleName;
            session.user.perms = token.perms;
            session.user.isAdmin = token.isAdmin;
            session.realtimeToken = token.realtimeToken;
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
});