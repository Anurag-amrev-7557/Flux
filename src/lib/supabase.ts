import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder')
);

// Fallback dummy client if credentials are not configured yet, so the app doesn't crash during build or local dev
export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        }
    })
    : createClient('https://placeholder.supabase.co', 'placeholder-anon-key');

export async function getAuthToken(): Promise<string | null> {
    if (!isSupabaseConfigured) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

export async function getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function signInWithGoogle(): Promise<{
    success: boolean;
    url?: string;
    error?: string;
    providerDisabled?: boolean;
}> {
    if (!isSupabaseConfigured) {
        return {
            success: false,
            error: 'Supabase credentials not configured in .env.local'
        };
    }

    try {
        const redirectTo = typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'select_account',
                },
            }
        });

        if (error) {
            const isProviderDisabled =
                error.message?.toLowerCase().includes('provider is not enabled') ||
                error.message?.toLowerCase().includes('unsupported provider') ||
                error.message?.toLowerCase().includes('validation_failed');
            return {
                success: false,
                error: error.message,
                providerDisabled: isProviderDisabled,
            };
        }

        if (data?.url) {
            return { success: true, url: data.url };
        }

        return { success: false, error: 'No OAuth authorization URL returned.' };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google sign in failed';
        const isProviderDisabled =
            message.toLowerCase().includes('provider is not enabled') ||
            message.toLowerCase().includes('unsupported provider') ||
            message.toLowerCase().includes('validation_failed');
        return { success: false, error: message, providerDisabled: isProviderDisabled };
    }
}

export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) return { success: true };
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sign out failed';
        return { success: false, error: message };
    }
}

/** Persist editable account identity independently from OAuth provider metadata. */
export async function syncAccountProfile(profile: { name: string; avatar: string }): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) return;
    const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        display_name: profile.name,
        avatar: profile.avatar ? { url: profile.avatar } : null,
    }, { onConflict: 'user_id' });
    if (error) throw error;
}
