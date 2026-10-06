import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserProfile {
    name: string;
    email: string;
    avatar: string;
    isPremium: boolean;
}

export interface CurrencyConfig {
    code: string;
    symbol: string;
    name: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
    { code: 'USD', symbol: '$', name: 'USD' },
    { code: 'INR', symbol: '₹', name: 'INR' },
    { code: 'EUR', symbol: '€', name: 'EUR' },
    { code: 'GBP', symbol: '£', name: 'GBP' },
    { code: 'JPY', symbol: '¥', name: 'JPY' },
    { code: 'AED', symbol: 'د.إ', name: 'AED' },
];

export type ThemeMode = 'light' | 'dark' | 'system';

export function applyTheme(theme: ThemeMode) {
    if (typeof window === 'undefined') return;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
}

interface AppState {
    activeProfileId: string;
    setActiveProfileId: (id: string) => void;
    isOffline: boolean;
    setOfflineStatus: (status: boolean) => void;
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    language: string;
    setLanguage: (lang: string) => void;
    currency: CurrencyConfig;
    setCurrency: (currency: CurrencyConfig) => void;
    hasCompletedOnboarding: boolean;
    setHasCompletedOnboarding: (completed: boolean) => void;
    isOnboardingOpen: boolean;
    setIsOnboardingOpen: (isOpen: boolean) => void;
    user: UserProfile;
    setUser: (user: UserProfile) => void;
    isLogExpenseOpen: boolean;
    setIsLogExpenseOpen: (isOpen: boolean) => void;
    isSplitBillOpen: boolean;
    setIsSplitBillOpen: (isOpen: boolean) => void;
    initialTransactionType: 'expense' | 'income';
    setInitialTransactionType: (type: 'expense' | 'income') => void;
    openLogTransaction: (type?: 'expense' | 'income') => void;
    initialCategoryName: string | null;
    setInitialCategoryName: (name: string | null) => void;
    openLogExpenseWithCategory: (categoryName: string) => void;
    editingTransactionId: string | null;
    setEditingTransactionId: (id: string | null) => void;
    toast: { message: string; type?: 'success' | 'info' | 'error' } | null;
    showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
    clearToast: () => void;
    isPrivacyMode: boolean;
    togglePrivacyMode: () => void;
    setPrivacyMode: (val: boolean) => void;
    monthlyBudget: number | null;
    setMonthlyBudget: (budget: number | null) => void;
    logout: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            activeProfileId: 'personal-default',
            setActiveProfileId: (id) => set({ activeProfileId: id }),
            isPrivacyMode: false,
            togglePrivacyMode: () => set((state) => ({ isPrivacyMode: !state.isPrivacyMode })),
            setPrivacyMode: (val) => set({ isPrivacyMode: val }),
            monthlyBudget: 1500,
            setMonthlyBudget: (val) => set({ monthlyBudget: val }),
            isOffline: false,
            theme: 'dark',
            setTheme: (theme) => {
                applyTheme(theme);
                set({ theme });
            },
            language: 'English',
            setLanguage: (lang) => set({ language: lang }),
            currency: SUPPORTED_CURRENCIES[0],
            setCurrency: (currency) => set({ currency }),
            hasCompletedOnboarding: false,
            setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
            isOnboardingOpen: false,
            setIsOnboardingOpen: (isOpen) => set({ isOnboardingOpen: isOpen }),
            setOfflineStatus: (status) => set({ isOffline: status }),
            isLogExpenseOpen: false,
            isSplitBillOpen: false,
            setIsSplitBillOpen: (isOpen) => set({ isSplitBillOpen: isOpen }),
            initialTransactionType: 'expense',
            setInitialTransactionType: (type) => set({ initialTransactionType: type }),
            setIsLogExpenseOpen: (isOpen) => set((state) => ({
                isLogExpenseOpen: isOpen,
                editingTransactionId: isOpen ? state.editingTransactionId : null,
                initialCategoryName: isOpen ? state.initialCategoryName : null,
                initialTransactionType: isOpen ? state.initialTransactionType : 'expense'
            })),
            openLogTransaction: (type = 'expense') => set({
                isLogExpenseOpen: true,
                initialTransactionType: type,
                editingTransactionId: null,
                initialCategoryName: null
            }),
            initialCategoryName: null,
            setInitialCategoryName: (name) => set({ initialCategoryName: name }),
            openLogExpenseWithCategory: (categoryName) => set({
                isLogExpenseOpen: true,
                initialCategoryName: categoryName,
                initialTransactionType: 'expense',
                editingTransactionId: null
            }),
            editingTransactionId: null,
            setEditingTransactionId: (id) => set({ editingTransactionId: id, isLogExpenseOpen: Boolean(id) }),
            toast: null,
            showToast: (message, type = 'success') => {
                set({ toast: { message, type } });
                setTimeout(() => {
                    set((state) => (state.toast?.message === message ? { toast: null } : {}));
                }, 3000);
            },
            clearToast: () => set({ toast: null }),
            user: {
                name: 'Guest User',
                email: 'guest@example.com',
                avatar: '',
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
                },
                isOnboardingOpen: true,
            }),
        }),
        {
            name: 'expense-app-storage',
            version: 3,
            migrate: (persistedState: unknown, version: number) => {
                const state = (persistedState && typeof persistedState === 'object') ? { ...(persistedState as Record<string, unknown>) } : {};
                if (!version || version < 2) {
                    state.hasCompletedOnboarding = false;
                    state.isOnboardingOpen = true;
                }
                if (!version || version < 3) {
                    if (!state.theme || state.theme === 'system') {
                        state.theme = 'dark';
                    }
                }
                return state;
            },
            storage: createJSONStorage(() => localStorage),
        }
    )
);
