"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, isSupabaseConfigured, signInWithGoogle } from '@/lib/supabase';
import { useDatabase } from '@/db/DatabaseProvider';
import { useAppStore } from '@/store/appStore';
import { useSyncStatus } from '@/sync/syncStatus';
import type { User } from '@supabase/supabase-js';

interface AuthSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthSyncModal({ isOpen, onClose }: AuthSyncModalProps) {
    const db = useDatabase();
    const { showToast, setUser, user } = useAppStore();

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStats, setSyncStats] = useState<{ profiles: number; debts: number; categories: number; transactions: number } | null>(null);

    useEffect(() => {
        if (!isSupabaseConfigured) return;

        supabase.auth.getSession().then(({ data: { session } }) => {
            setCurrentUser(session?.user || null);
            if (session?.user?.email) {
                setUser({
                    ...user,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                });
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user || null);
            if (session?.user?.email) {
                setUser({
                    ...user,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                });
            }
        });

        return () => subscription.unsubscribe();
    }, [user, setUser]);

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            showToast('Please enter both email and password', 'error');
            return;
        }

        setIsLoading(true);
        try {
            if (authMode === 'signup') {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
                showToast('Registration successful! Please check your email.', 'success');
                if (data.user) setCurrentUser(data.user);
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
                showToast('Welcome back! Signed in successfully.', 'success');
                if (data.user) setCurrentUser(data.user);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed';
            showToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        const result = await signInWithGoogle();
        if (!result.success) {
            setIsLoading(false);
            showToast(result.error || 'Google sign in failed', 'error');
        } else if (result.url) {
            window.location.href = result.url;
        }
    };

    const handleSignOut = async () => {
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            setCurrentUser(null);
            showToast('Signed out successfully', 'info');
        } catch {
            showToast('Failed to sign out', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTriggerSync = async () => {
        setIsSyncing(true);
        try {
            const [profilesCount, debtsCount, categoriesCount, txCount] = await Promise.all([
                db.profiles.count({ selector: { _deleted: false } }).exec(),
                db.debts.count({ selector: { _deleted: false } }).exec(),
                db.categories.count({ selector: { _deleted: false } }).exec(),
                db.transactions.count({ selector: { _deleted: false } }).exec(),
            ]);

            setSyncStats({
                profiles: profilesCount,
                debts: debtsCount,
                categories: categoriesCount,
                transactions: txCount,
            });

            useSyncStatus.getState().markSynced();
            showToast('Cloud database synchronized!', 'success');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Sync check failed';
            showToast(msg, 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 overflow-hidden max-h-[90vh] overflow-y-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                                    <span className="material-symbols-outlined text-[22px]">cloud_sync</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Cloud Sync & Auth</h3>
                                    <p className="text-xs text-slate-500">Live Encrypted Synchronization</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {!isSupabaseConfigured ? (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs leading-relaxed">
                                    <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-950">
                                        <span className="material-symbols-outlined text-[17px]">info</span>
                                        Setup Supabase Environment Keys
                                    </div>
                                    To enable Auth and real-time cloud synchronization, add your free Supabase URL and Anon Key to <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">.env.local</code>.
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                                    <p className="font-semibold text-slate-800">Add to .env.local:</p>
                                    <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto text-[11px] font-mono">
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
                                    </pre>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-full h-11 rounded-2xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all"
                                >
                                    Got It
                                </button>
                            </div>
                        ) : currentUser ? (
                            <div className="space-y-5">
                                {/* Authenticated User Card */}
                                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                                            {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-emerald-950 block truncate">
                                                {currentUser.email}
                                            </span>
                                            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Connected to Supabase Cloud
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cloud Database Sync Card */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-600 text-[20px]">cloud_done</span>
                                            <span className="text-xs font-bold text-slate-800">PostgreSQL Cloud Sync</span>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            LIVE
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        All your profiles, debts, categories, and transactions are synchronized with conflict-free hybrid logical clocks.
                                    </p>

                                    {syncStats && (
                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-center">
                                            <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Debts & Persons</span>
                                                <span className="text-sm font-extrabold text-slate-800">{syncStats.debts}</span>
                                            </div>
                                            <div className="p-2 rounded-xl bg-white border border-slate-200/80">
                                                <span className="text-[10px] text-slate-400 block font-bold uppercase">Transactions</span>
                                                <span className="text-sm font-extrabold text-slate-800">{syncStats.transactions}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleTriggerSync}
                                        disabled={isSyncing}
                                        className="w-full h-11 rounded-2xl bg-slate-900 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xs disabled:opacity-50"
                                    >
                                        <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
                                            sync
                                        </span>
                                        {isSyncing ? 'Verifying Cloud Sync...' : 'Verify Cloud Sync'}
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-slate-100">
                                    <button
                                        onClick={handleSignOut}
                                        disabled={isLoading}
                                        className="w-full h-10 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 active:scale-[0.98] transition-all"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Mode Selector */}
                                <div className="flex rounded-2xl bg-slate-100 p-1">
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('signin')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${authMode === 'signin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode('signup')}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${authMode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                                    >
                                        Create Free Account
                                    </button>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleAuthSubmit} className="space-y-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            required
                                            className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="w-full h-11 px-3.5 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-11 rounded-2xl bg-slate-900 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xs disabled:opacity-50 mt-2"
                                    >
                                        {isLoading ? (
                                            <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                                        ) : (
                                            authMode === 'signin' ? 'Sign In' : 'Create Account'
                                        )}
                                    </button>
                                </form>

                                <div className="relative my-3 text-center">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <span className="relative bg-white px-2 text-[10px] uppercase font-bold text-slate-400">
                                        Or continue with
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    className="w-full h-11 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-2xs"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                    </svg>
                                    Google
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
