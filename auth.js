// auth.js
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// KHÔNG import các module server ở cấp cao nhất

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        CredentialsProvider({
            async authorize(credentials) {
                // Dynamic import để đảm bảo không bị bundle vào middleware
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
        /**
         * Callback JWT là trái tim của việc quản lý session.
         * Nó quyết định những thông tin nào được lưu trong token (cookie).
         */
        async jwt({ token, user, trigger }) {
            // 1. Lần đầu đăng nhập: `user` object tồn tại.
            if (user) {
                console.log('[JWT Callback] Lần đầu đăng nhập, tạo token...');
                token.uid = user.id;
                token.name = user.name;
                token.email = user.email;
                token.roleId = user.role?._id.toString();
                token.roleName = user.role?.name;
                token.perms = user.role?.permissions.map(p => p.name) || [];
                token.isAdmin = user.role?.name === 'admin';

                // Tạo token riêng cho Socket.IO
                const realtimeTokenPayload = {
                    uid: user.id,
                    roleId: user.role?._id.toString(),
                };
                token.realtimeToken = sign(realtimeTokenPayload, process.env.AUTH_SECRET, { expiresIn: '1h' });

                // Trả về token ngay sau khi đăng nhập
                return token;
            }

            // 2. Cập nhật Session: Khi client gọi `updateSession()`, `trigger` sẽ là "update".
            //    Đây là luồng chính để làm mới quyền hạn.
            if (trigger === 'update') {
                console.log('[JWT Callback] Nhận trigger "update", làm mới token từ DB...');

                try {
                    // "LÀM GIÀU" TOKEN: Luôn luôn truy vấn lại DB để lấy thông tin mới nhất.
                    // Đây là cách làm an toàn và đáng tin cậy nhất.
                    const { connectToDB } = await import('@/lib/db');
                    const Account = (await import('@/models/account.model')).default;
                    const Permission = (await import('@/models/permission.model')).default;
                    await import('@/models/role.model');

                    await connectToDB();

                    const freshUser = await Account.findById(token.uid).populate({
                        path: 'role',
                        populate: { path: 'permissions', model: Permission, select: 'name' }
                    }).lean(); // .lean() để lấy object thuần túy

                    if (freshUser) {
                        console.log('[JWT Callback] Tìm thấy dữ liệu mới cho user:', freshUser.email);
                        // Cập nhật lại toàn bộ thông tin trong token từ dữ liệu mới nhất
                        token.roleId = freshUser.role?._id.toString();
                        token.roleName = freshUser.role?.name;
                        token.perms = freshUser.role?.permissions.map(p => p.name) || [];
                        token.isAdmin = freshUser.role?.name === 'admin';
                    } else {
                        console.warn('[JWT Callback] Không tìm thấy user khi làm mới token.');
                    }
                } catch (error) {
                    console.error('[JWT Callback] Lỗi khi làm mới token:', error);
                }
            }

            // Trả về token đã được cập nhật (hoặc token cũ nếu không có trigger 'update')
            return token;
        },

        /**
         * Callback session chỉ có nhiệm vụ sao chép dữ liệu từ token đã được xử lý
         * vào đối tượng `session` để client có thể truy cập.
         */
        async session({ session, token }) {
            session.user.id = token.uid;
            session.user.name = token.name;
            session.user.email = token.email;
            session.user.roleId = token.roleId;
            session.user.roleName = token.roleName;
            session.user.perms = token.perms;
            session.user.isAdmin = token.isAdmin; // Luôn đảm bảo trường này đúng
            session.realtimeToken = token.realtimeToken; // Token cho socket
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