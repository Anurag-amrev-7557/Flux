"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/appStore';

export default function AuthCallbackPage() {
    const router = useRouter();
    const { setUser, showToast } = useAppStore();
    const [statusMessage, setStatusMessage] = useState('Completing authentication...');

    useEffect(() => {
        let isMounted = true;
        let sub: { unsubscribe: () => void } | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const handleAuth = async () => {
            try {
                // Check for error parameters in query string or hash
                const searchParams = new URLSearchParams(window.location.search);
                const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
                const hashParams = new URLSearchParams(hash);
                const errorDescription =
                    searchParams.get('error_description') ||
                    hashParams.get('error_description') ||
                    searchParams.get('error') ||
                    hashParams.get('error');

                if (errorDescription) {
                    throw new Error(errorDescription);
                }

                // OAuth uses PKCE in current Supabase clients. The authorization code
                // must be exchanged before getSession() can observe a signed-in user.
                const code = searchParams.get('code');
                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                }
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) throw error;

                if (session?.user) {
                    const user = session.user;
                    const meta = user.user_metadata || {};
                    const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';
                    const avatar = meta.avatar_url || meta.picture || '';

                    setUser({
                        name,
                        email: user.email || '',
                        avatar,
                        isPremium: true,
                    });

                    if (isMounted) {
                        setStatusMessage('Signed in successfully!');
                        showToast(`Welcome back, ${name}!`, 'success');
                        router.replace('/settings');
                    }
                    return;
                }

                // If not immediately available, subscribe to auth state change
                const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
                    if (event === 'SIGNED_IN' && newSession?.user) {
                        const user = newSession.user;
                        const meta = user.user_metadata || {};
                        const name = meta.full_name || meta.name || user.email?.split('@')[0] || 'User';
                        const avatar = meta.avatar_url || meta.picture || '';

                        setUser({
                            name,
                            email: user.email || '',
                            avatar,
                            isPremium: true,
                        });

                        if (isMounted) {
                            showToast(`Welcome, ${name}!`, 'success');
                            router.replace('/settings');
                        }
                    }
                });
                sub = subscription;

                // Timeout fallback if no session arrives within 4 seconds
                timer = setTimeout(() => {
                    if (isMounted) {
                        setStatusMessage('Redirecting to settings...');
                        router.replace('/settings');
                    }
                }, 4000);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Authentication failed';
                if (isMounted) {
                    showToast(message, 'error');
                    router.replace('/settings');
                }
            }
        };

        handleAuth();

        return () => {
            isMounted = false;
            sub?.unsubscribe();
            if (timer) clearTimeout(timer);
        };
    }, [router, setUser, showToast]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background-light text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-4 shadow-sm animate-pulse">
                <span className="material-symbols-outlined text-2xl animate-spin">sync</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">{statusMessage}</h2>
            <p className="text-xs text-slate-500">Connecting your Google account with Flux...</p>
        </div>
    );
}
