'use server';
import { signIn, signOut } from '@/auth';

export async function login(prevState, formData) {
    const { email, password } = Object.fromEntries(formData);
    try {
        await signIn('credentials', { email, password, redirectTo: '/' });
    } catch (error) {
        if (error.type === 'CredentialsSignin') {
            return { error: 'Email hoặc mật khẩu không hợp lệ.' };
        }
        throw error;
    }
}

export async function logout() {
    await signOut({ redirectTo: '/login' });
}