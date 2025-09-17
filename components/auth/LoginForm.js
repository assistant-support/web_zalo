'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { LogIn, Mail, Lock } from 'lucide-react';

export default function LoginForm({ callbackUrl = '/' }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState(searchParams.get('email') || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(searchParams.get('error') ? 'Email hoặc mật khẩu không đúng.' : '');
    const [isPending, startTransition] = useTransition();

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        const res = await signIn('credentials', {
            redirect: false,
            email,
            password
        });
        if (!res || res.error) {
            setError('Email hoặc mật khẩu không đúng.');
            return;
        }
        startTransition(() => router.push(callbackUrl || '/'));
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-[var(--surface)] p-6 shadow-sm border border-[var(--border)]">
            {error && (
                <div className="rounded-xl border border-[var(--danger-200)] bg-[var(--danger-50)] p-3 text-sm text-[var(--danger-700)]">
                    {error}
                </div>
            )}

            <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text)]">Email</label>
                <Mail className="absolute left-3 top-9 h-4 w-4 text-[var(--muted)]" aria-hidden />
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input mt-1 pl-10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-[var(--text)]">Mật khẩu</label>
                <Lock className="absolute left-3 top-9 h-4 w-4 text-[var(--muted)]" aria-hidden />
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="input mt-1 pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <button type="submit" disabled={isPending} className="btn btn-primary w-full gap-2">
                <LogIn className="h-4 w-4" aria-hidden />
                {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
        </form>
    );
}
