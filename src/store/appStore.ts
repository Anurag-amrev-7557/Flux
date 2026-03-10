import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserProfile {
    name: string;
    email: string;
    avatar: string;
    isPremium: boolean;
}

interface AppState {
    activeProfileId: string;
    setActiveProfileId: (id: string) => void;
    isOffline: boolean;
    setOfflineStatus: (status: boolean) => void;
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    language: string;
    setLanguage: (lang: string) => void;
    user: UserProfile;
    setUser: (user: UserProfile) => void;
    isLogExpenseOpen: boolean;
    setIsLogExpenseOpen: (isOpen: boolean) => void;
    logout: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            activeProfileId: 'personal-default',
            setActiveProfileId: (id) => set({ activeProfileId: id }),
            isOffline: false,
            theme: 'light',
            setTheme: () => { }, // No-op, we are light mode only
            language: 'English',
            setLanguage: (lang) => set({ language: lang }),
            setOfflineStatus: (status) => set({ isOffline: status }),
            isLogExpenseOpen: false,
            setIsLogExpenseOpen: (isOpen) => set({ isLogExpenseOpen: isOpen }),
            user: {
                name: 'Alex Thompson',
                email: 'alex.thompson@example.com',
                avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=256&h=256',
                isPremium: true
            },
            setUser: (user) => set({ user }),
            logout: () => set({
                activeProfileId: 'personal-default',
                user: {
                    name: 'Guest User',
                    email: 'guest@example.com',
                    avatar: '',
                    isPremium: false
                }
            }),
        }),
        {
            name: 'expense-app-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
