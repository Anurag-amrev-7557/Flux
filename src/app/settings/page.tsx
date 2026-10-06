"use client";

import { useAppStore } from "@/store/appStore";
import { useDatabase } from "@/db/DatabaseProvider";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import { useI18n } from "@/hooks/useI18n";
import { languages } from "@/i18n/translations";
import LanguageSelector from "@/components/LanguageSelector";
import CurrencySelector from "@/components/CurrencySelector";
import { exportDatabaseToJson, importDatabaseFromJson, exportTransactionsToCsv, exportDebtsToCsv } from "@/utils/exportImport";
import { triggerHaptic } from "@/utils/haptics";
import { signInWithGoogle, signOutUser, isSupabaseConfigured, supabase, syncAccountProfile } from "@/lib/supabase";
import FluxLogo from "@/components/FluxLogo";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

const PRESET_AVATARS = [
    { id: '1', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=james-t', label: 'Classic' },
    { id: '2', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=alexandra', label: 'Creative' },
    { id: '3', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=felix', label: 'Executive' },
    { id: '4', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=olivia', label: 'Minimalist' },
    { id: '5', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=marcus', label: 'Architect' },
    { id: '6', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=sophia', label: 'Thinker' },
    { id: '7', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=leo', label: 'Analyst' },
    { id: '8', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=maya', label: 'Writer' },
    { id: '9', url: 'https://api.dicebear.com/10.x/notionists/svg?seed=elena', label: 'Strategist' },
];

// ── DiceBear Notionists 10.x Component Options (from official schema) ──
const NOTIONISTS_OPTIONS: Record<string, { label: string; icon: string; probability: number; values: string[] }> = {
    hair: {
        label: 'Hair',
        icon: 'content_cut',
        probability: 100,
        values: [
            'hat','variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10',
            'variant11','variant12','variant13','variant14','variant15','variant16','variant17','variant18','variant19','variant20',
            'variant21','variant22','variant23','variant24','variant25','variant26','variant27','variant28','variant29','variant30',
            'variant31','variant32','variant33','variant34','variant35','variant36','variant37','variant38','variant39','variant40',
            'variant41','variant42','variant43','variant44','variant45','variant46','variant47','variant48','variant49','variant50',
            'variant51','variant52','variant53','variant54','variant55','variant56','variant57','variant58','variant59','variant60',
            'variant61','variant62','variant63',
        ],
    },
    eyes: {
        label: 'Eyes',
        icon: 'visibility',
        probability: 100,
        values: ['variant01','variant02','variant03','variant04','variant05'],
    },
    eyebrows: {
        label: 'Eyebrows',
        icon: 'mood',
        probability: 100,
        values: ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10','variant11','variant12','variant13'],
    },
    mouth: {
        label: 'Mouth',
        icon: 'sentiment_satisfied',
        probability: 100,
        values: [
            'variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10',
            'variant11','variant12','variant13','variant14','variant15','variant16','variant17','variant18','variant19','variant20',
            'variant21','variant22','variant23','variant24','variant25','variant26','variant27','variant28','variant29','variant30',
        ],
    },
    nose: {
        label: 'Nose',
        icon: 'air',
        probability: 100,
        values: [
            'variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10',
            'variant11','variant12','variant13','variant14','variant15','variant16','variant17','variant18','variant19','variant20',
        ],
    },
    clothes: {
        label: 'Clothes',
        icon: 'checkroom',
        probability: 100,
        values: [
            'variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10',
            'variant11','variant12','variant13','variant14','variant15','variant16','variant17','variant18','variant19','variant20',
            'variant21','variant22','variant23','variant24','variant25',
        ],
    },
    beard: {
        label: 'Beard',
        icon: 'face_6',
        probability: 10,
        values: ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10','variant11','variant12'],
    },
    glasses: {
        label: 'Glasses',
        icon: 'eyeglasses',
        probability: 20,
        values: ['variant01','variant02','variant03','variant04','variant05','variant06','variant07','variant08','variant09','variant10','variant11'],
    },
    gesture: {
        label: 'Gesture',
        icon: 'waving_hand',
        probability: 10,
        values: ['hand','handPhone','ok','okLongArm','point','pointLongArm','waveLongArm','waveLongArms','waveOkLongArms','wavePointLongArms'],
    },
    clothesGraphic: {
        label: 'Graphic',
        icon: 'palette',
        probability: 50,
        values: ['electric','galaxy','saturn'],
    },
};

const NOTIONISTS_COLORS = {
    backgroundColor: {
        label: 'Background',
        presets: ['f1f5f9','dff0eb','e8e0f0','fde8e8','fef3c7','dbeafe','f3e8ff','e0f2fe','fce7f3','ecfdf5','fff7ed','f0fdf4'],
    },
    inkColor: {
        label: 'Ink',
        presets: ['000000','0f172a','0f3d38','1e1b4b','4c1d95','7c2d12','831843','134e4a','1e3a5f','3f3f46'],
    },
};

type AvatarBuilderState = Record<string, string>;

function buildNotionistsUrl(state: AvatarBuilderState): string {
    const base = 'https://api.dicebear.com/10.x/notionists/svg';
    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    // For any component that has a value AND has default probability < 100,
    // force its probability to 100 so the component actually appears
    Object.entries(NOTIONISTS_OPTIONS).forEach(([key, opt]) => {
        if (state[key] && opt.probability < 100) {
            params.set(`${key}Probability`, '100');
        }
    });
    return `${base}?${params.toString()}`;
}

function NightBanner() {
    return (
        <div className="absolute inset-x-0 top-0 h-64 sm:h-72 pointer-events-none overflow-hidden select-none z-0">
            {/* ── Light Mode Daytime Scenery ── */}
            <svg
                viewBox="0 0 400 250"
                className="block dark:hidden w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="settingsSkyLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BAE6FD" />
                        <stop offset="45%" stopColor="#E0F2FE" />
                        <stop offset="85%" stopColor="#F0F9FF" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>
                    <radialGradient id="settingsSunLight" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                        <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="settingsBottomBlendLight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0" />
                        <stop offset="55%" stopColor="#F8FAFC" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#F8FAFC" />
                    </linearGradient>
                </defs>
                <rect width="400" height="250" fill="url(#settingsSkyLight)" />
                {/* Morning Sun */}
                <circle cx="340" cy="46" r="32" fill="url(#settingsSunLight)" />
                <circle cx="340" cy="46" r="14" fill="#F59E0B" opacity="0.9" />
                <circle cx="340" cy="46" r="10" fill="#FDE68A" />

                {/* Soft Fluffy Clouds */}
                <g opacity="0.75">
                    <path d="M 60 48 Q 72 38 88 44 Q 104 36 116 46 Q 124 44 130 52 L 60 52 Z" fill="#FFFFFF" />
                    <path d="M 210 38 Q 222 30 236 34 Q 248 26 260 36 Q 268 34 274 42 L 210 42 Z" fill="#FFFFFF" opacity="0.6" />
                </g>

                {/* Airplane soaring across blue sky */}
                <g transform="translate(216, 42) rotate(-26) scale(0.6)" opacity="0.85" fill="#0284C7">
                    <path d="M12 2L10 9H3L1 11L7 13L6 17L4 18L5 20L9 19L13 20L14 18L12 17L11 13L17 11L15 9H12L12 2Z" />
                </g>

                {/* Rolling Green Hills */}
                <path
                    d="M-20 175 C 60 135, 160 155, 260 130 C 330 112, 380 145, 420 135 L 420 250 L -20 250 Z"
                    fill="#86EFAC"
                    opacity="0.9"
                />
                <path
                    d="M-20 185 C 80 155, 200 170, 320 150 C 370 140, 400 160, 420 155 L 420 250 L -20 250 Z"
                    fill="#4ADE80"
                />

                {/* Tree on Hill */}
                <g transform="translate(365, 120)">
                    <rect x="7" y="22" width="4" height="24" fill="#78350F" rx="1" />
                    <ellipse cx="9" cy="14" rx="10" ry="14" fill="#15803D" />
                    <ellipse cx="9" cy="12" rx="7" ry="10" fill="#16A34A" opacity="0.8" />
                </g>

                {/* Bush clumps */}
                <ellipse cx="310" cy="160" rx="10" ry="6" fill="#16A34A" />
                <ellipse cx="15" cy="180" rx="14" ry="7" fill="#16A34A" />

                {/* Solid Wavy Ground Boundary Separation */}
                <path
                    d="M-10 224 C 80 204, 180 228, 280 210 C 335 200, 375 218, 410 212 L 410 250 L -10 250 Z"
                    fill="#F8FAFC"
                />
            </svg>

            {/* ── Dark Mode Night Scenery ── */}
            <svg
                viewBox="0 0 400 250"
                className="hidden dark:block w-full h-full object-cover"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="nightSkyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0B0F15" />
                        <stop offset="60%" stopColor="#111B18" />
                        <stop offset="100%" stopColor="#141414" />
                    </linearGradient>

                    {/* Bottom Edge Fade for seamless blend into page */}
                    <linearGradient id="settingsBottomBlend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#141414" stopOpacity="0" />
                        <stop offset="55%" stopColor="#141414" stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#141414" stopOpacity="1" />
                    </linearGradient>
                </defs>
                <rect width="400" height="250" fill="url(#nightSkyGrad)" />

                {/* Stars / tiny sparkles */}
                <circle cx="45" cy="30" r="1" fill="#ffffff" opacity="0.4" />
                <circle cx="120" cy="22" r="1.2" fill="#ffffff" opacity="0.6" />
                <circle cx="210" cy="32" r="1" fill="#ffffff" opacity="0.5" />
                <circle cx="265" cy="40" r="1.5" fill="#E8B931" opacity="0.7" />
                <circle cx="340" cy="25" r="1.2" fill="#ffffff" opacity="0.6" />
                <circle cx="160" cy="48" r="0.9" fill="#ffffff" opacity="0.3" />

                {/* Stylized tiny airplane silhouette */}
                <g transform="translate(216, 42) rotate(-26) scale(0.6)" opacity="0.75" fill="#C4C7C5">
                    <path d="M12 2L10 9H3L1 11L7 13L6 17L4 18L5 20L9 19L13 20L14 18L12 17L11 13L17 11L15 9H12L12 2Z" />
                </g>

                {/* Rolling hills background curve */}
                <path
                    d="M-20 175 C 60 135, 160 155, 260 130 C 330 112, 380 145, 420 135 L 420 250 L -20 250 Z"
                    fill="#152119"
                    opacity="0.9"
                />

                {/* Rolling hills foreground curve */}
                <path
                    d="M-20 185 C 80 155, 200 170, 320 150 C 370 140, 400 160, 420 155 L 420 250 L -20 250 Z"
                    fill="#1A2D22"
                />

                {/* Stylized tree on right hill */}
                <g transform="translate(365, 120)">
                    <rect x="7" y="22" width="4" height="24" fill="#4B3621" rx="1" />
                    <ellipse cx="9" cy="14" rx="10" ry="14" fill="#245136" />
                    <ellipse cx="9" cy="12" rx="7" ry="10" fill="#2E6845" opacity="0.7" />
                </g>

                {/* Bush clumps */}
                <ellipse cx="310" cy="160" rx="10" ry="6" fill="#1C3829" />
                <ellipse cx="15" cy="180" rx="14" ry="7" fill="#1C3829" />

                {/* Seamless Bottom Blend into Page */}
                <rect x="0" y="190" width="400" height="60" fill="url(#settingsBottomBlend)" />
            </svg>
            {/* Bottom Boundary: In dark mode, soft gradient fade. In light mode, crisp solid wavy boundary separation */}
            <div className="hidden dark:block absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-[#141414]/75 to-[#141414] pointer-events-none z-[1]" />
            <div className="block dark:hidden absolute inset-x-0 bottom-0 w-full overflow-hidden pointer-events-none z-[1] leading-none select-none">
                <svg
                    viewBox="0 0 1200 120"
                    preserveAspectRatio="none"
                    className="w-full h-8 sm:h-10 block drop-shadow-[0_-2px_4px_rgba(15,23,42,0.04)]"
                    aria-hidden="true"
                >
                    <path
                        d="M0,45 C160,82 340,16 520,52 C700,88 880,24 1040,58 C1120,74 1170,48 1200,54 L1200,120 L0,120 Z"
                        fill="#CBD5E1"
                        opacity="0.45"
                    />
                    <path
                        d="M0,58 C180,18 360,92 540,50 C720,8 900,82 1060,40 C1130,22 1175,34 1200,38 L1200,120 L0,120 Z"
                        fill="#F8FAFC"
                    />
                </svg>
            </div>
        </div>
    );
}

function YinYangAvatar({ className = "w-full h-full" }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="50" fill="#141414" />
            <path d="M50 0 A50 50 0 0 1 50 100 A25 25 0 0 1 50 50 A25 25 0 0 0 50 0 Z" fill="#ffffff" />
            <circle cx="50" cy="25" r="7" fill="#141414" />
            <circle cx="50" cy="75" r="7" fill="#ffffff" />
        </svg>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const db = useDatabase();
    const {
        user,
        setUser,
        logout,
        showToast,
        currency,
        theme,
        setTheme,
    } = useAppStore();
    const { t, language } = useI18n();

    // Modal states
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isGoogleSetupModalOpen, setIsGoogleSetupModalOpen] = useState(false);
    const [isQuickGoogleModalOpen, setIsQuickGoogleModalOpen] = useState(false);
    const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isAutopayModalOpen, setIsAutopayModalOpen] = useState(false);
    const [isPocketMoneyModalOpen, setIsPocketMoneyModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
    const [isPaymentMethodsModalOpen, setIsPaymentMethodsModalOpen] = useState(false);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    // Form inputs & loading state
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [profileNameInput, setProfileNameInput] = useState(user?.name || "Flux User");
    const [quickGoogleEmail, setQuickGoogleEmail] = useState("");
    const [quickGoogleName, setQuickGoogleName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarUploadRef = useRef<HTMLInputElement>(null);
    const avatarPickerScrollRef = useRef<HTMLDivElement>(null);

    // Avatar builder state
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [builderActiveCategory, setBuilderActiveCategory] = useState<string | null>(null);
    const [avatarBuilder, setAvatarBuilder] = useState<AvatarBuilderState>({
        seed: 'flux-custom',
    });

    const builderPreviewUrl = useMemo(() => buildNotionistsUrl(avatarBuilder), [avatarBuilder]);

    const updateBuilderOption = (key: string, value: string) => {
        setAvatarBuilder(prev => {
            if (prev[key] === value) {
                // Toggle off if already selected
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: value };
        });
    };

    useEffect(() => {
        if (!isBuilderOpen) return;
        const frame = requestAnimationFrame(() => {
            const container = avatarPickerScrollRef.current;
            container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        });
        return () => cancelAnimationFrame(frame);
    }, [isBuilderOpen]);

    // 1. Sync active Supabase session upon mount (without dependency loop)
    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const syncFromAuthUser = async (authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
            const meta = authUser.user_metadata || {};
            const providerName = (meta.full_name as string) || (meta.name as string) || authUser.email?.split('@')[0] || 'Flux User';
            const providerAvatar = (meta.avatar_url as string) || (meta.picture as string) || '';
            // User-edited identity is stored in public.profiles. OAuth metadata
            // is only the fallback; it must not overwrite a local edit on mount.
            const { data: storedProfile } = await supabase
                .from('profiles')
                .select('display_name, avatar')
                .eq('user_id', authUser.id)
                .maybeSingle();
            const storedAvatar = storedProfile?.avatar && typeof storedProfile.avatar === 'object' && 'url' in storedProfile.avatar
                ? String(storedProfile.avatar.url || '')
                : '';
            const name = storedProfile?.display_name || providerName;
            const avatar = storedAvatar || providerAvatar;

            const currentUser = useAppStore.getState().user;
            if (
                currentUser?.email !== authUser.email ||
                currentUser?.name !== name ||
                (avatar && currentUser?.avatar !== avatar)
            ) {
                useAppStore.getState().setUser({
                    ...currentUser,
                    name,
                    email: authUser.email || currentUser?.email || '',
                    avatar: avatar || currentUser?.avatar || '',
                    isPremium: true
                });
            }
        };

        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                void syncFromAuthUser(session.user);
            }
        }).catch(err => {
            console.warn("Could not retrieve Supabase session:", err);
        });

        // Realtime auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                void syncFromAuthUser(session.user);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const currentLanguageName = useMemo(() => {
        return languages.find(l => l.name === language || l.code === language)?.name || language;
    }, [language]);

    const isUserSignedIn = Boolean(user?.email && user.email !== 'guest@example.com');

    // Profile actions
    const handleSaveProfile = () => {
        const trimmed = profileNameInput.trim();
        if (trimmed) {
            setUser({ ...(user || {}), name: trimmed });
            void syncAccountProfile({ name: trimmed, avatar: user?.avatar || '' }).catch(() => showToast("Profile saved locally; sync will retry", "info"));
            showToast("Profile name updated", "success");
            setIsEditProfileOpen(false);
        }
    };

    const handleSelectAvatar = (url: string) => {
        setUser({ ...(user || {}), avatar: url });
        void syncAccountProfile({ name: user?.name || 'Flux User', avatar: url }).catch(() => showToast("Photo saved locally; sync will retry", "info"));
        showToast("Profile photo updated", "success");
    };

    const handleResetAvatar = () => {
        setUser({ ...(user || {}), avatar: '' });
        void syncAccountProfile({ name: user?.name || 'Flux User', avatar: '' }).catch(() => showToast("Photo saved locally; sync will retry", "info"));
        showToast("Reset photo to initials", "info");
    };

function resizeImageToDataUrl(file: File, maxDim = 192): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > height) {
                if (width > maxDim) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                }
            } else {
                if (height > maxDim) {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(url);
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = url;
    });
}

    const handleLocalAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast("Please choose an image under 5MB", "error");
            return;
        }

        try {
            const resizedDataUrl = await resizeImageToDataUrl(file, 192);
            setUser({ ...(user || {}), avatar: resizedDataUrl });
            void syncAccountProfile({ name: user?.name || 'Flux User', avatar: resizedDataUrl }).catch(() => showToast("Photo saved locally; sync will retry", "info"));
            showToast("Profile photo updated", "success");
            setIsAvatarPickerOpen(false);
        } catch {
            showToast("Failed to process image", "error");
        }
    };

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        const result = await signInWithGoogle();

        if (result.providerDisabled) {
            setIsGoogleLoading(false);
            setIsGoogleSetupModalOpen(true);
        } else if (!result.success) {
            setIsGoogleLoading(false);
            showToast(result.error || "Google authentication failed", "error");
        } else if (result.url) {
            window.location.href = result.url;
        }
    };

    const handleQuickGoogleConnect = () => {
        if (!quickGoogleEmail.trim()) {
            showToast("Please enter your Google email", "error");
            return;
        }
        const nameToUse = quickGoogleName.trim() || quickGoogleEmail.split('@')[0];
        const generatedAvatar = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=27272a&color=ffffff&bold=true&size=256`;
        setUser({
            ...(user || {}),
            name: nameToUse,
            email: quickGoogleEmail.trim(),
            avatar: generatedAvatar,
            isPremium: true
        });
        showToast(`Connected as ${nameToUse}!`, "success");
        setIsQuickGoogleModalOpen(false);
        setIsGoogleSetupModalOpen(false);
    };

    const handleSignOut = async () => {
        setIsGoogleLoading(true);
        try {
            await signOutUser();
        } catch (err) {
            console.warn("Supabase sign out error:", err);
        }
        logout();
        showToast("Signed out successfully", "info");
        setIsGoogleLoading(false);
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const result = await importDatabaseFromJson(db, text);
            if (result.success) {
                showToast(result.message, "success");
            } else {
                showToast(result.message, "error");
            }
        } catch {
            showToast("Failed to read snapshot file", "error");
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <main className="max-w-md w-full mx-auto flex flex-col min-h-[100dvh] bg-slate-50 dark:bg-[#141414] text-slate-900 dark:text-[#E3E3E3] relative select-none pb-20">
            {/* ── 1. Top Whimsical Illustration Banner (Adaptive Light / Dark) ── */}
            <NightBanner />

            {/* ── 2. Top Header with Actions ── */}
            <header className="relative z-20 pt-4 px-5 sm:px-6 flex items-center justify-between">
                <div className="w-8" />
                <div className="relative">
                    <button
                        onClick={() => setIsTopMenuOpen(prev => !prev)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-800 dark:text-white/90 hover:bg-slate-200/50 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                        aria-label="More options"
                    >
                        <span className="material-symbols-outlined text-[24px]">more_vert</span>
                    </button>

                    {/* Top dropdown menu */}
                    <AnimatePresence>
                        {isTopMenuOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setIsTopMenuOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-12 w-56 bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-40 text-sm overflow-hidden"
                                >
                                    <button
                                        onClick={() => {
                                            setIsTopMenuOpen(false);
                                            setIsEditProfileOpen(true);
                                        }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 text-slate-800 dark:text-[#FFF] cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-slate-700 dark:text-[#FFF]">edit</span>
                                        <span>Edit Name</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsTopMenuOpen(false);
                                            setIsAvatarPickerOpen(true);
                                        }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 text-slate-800 dark:text-[#FFF] cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-slate-700 dark:text-[#FFF]">photo_camera</span>
                                        <span>Change Avatar</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsTopMenuOpen(false);
                                            setIsPreferencesModalOpen(true);
                                        }}
                                        className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 text-slate-800 dark:text-[#FFF] cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-slate-700 dark:text-[#FFF]">tune</span>
                                        <span>Flux Preferences</span>
                                    </button>
                                    <div className="my-1 border-t border-slate-200 dark:border-white/10" />
                                    {isUserSignedIn ? (
                                        <button
                                            onClick={() => {
                                                setIsTopMenuOpen(false);
                                                handleSignOut();
                                            }}
                                            className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 text-rose-600 dark:text-rose-400 cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">logout</span>
                                            <span>Sign Out</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (isGoogleLoading) return;
                                                setIsTopMenuOpen(false);
                                                handleGoogleSignIn();
                                            }}
                                            disabled={isGoogleLoading}
                                            className="w-full px-4 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-3 text-primary dark:text-[#A8C7FA] cursor-pointer disabled:opacity-50"
                                        >
                                            <span className={`material-symbols-outlined text-[18px] ${isGoogleLoading ? 'animate-spin' : ''}`}>
                                                {isGoogleLoading ? 'sync' : 'login'}
                                            </span>
                                            <span>{isGoogleLoading ? 'Signing in...' : 'Sign In with Google'}</span>
                                        </button>
                                    )}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* ── 3. Main Content Area ── */}
            <div className="relative z-10 px-5 sm:px-6 pt-2">
                
                {/* ── Identity Header ── */}
                <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="min-w-0 flex-1">
                        <h1
                            onClick={() => {
                                setProfileNameInput(user?.name || "Flux User");
                                setIsEditProfileOpen(true);
                            }}
                            className="text-[26px] sm:text-[28px] font-normal text-slate-900 dark:text-white tracking-tight leading-tight cursor-pointer hover:opacity-90 flex items-center gap-2"
                            title="Click to edit name"
                        >
                            <span className="truncate">{user?.name || "Flux User"}</span>
                        </h1>

                        <div className="mt-3 space-y-1">
                            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-300/80 leading-none">
                                {user?.email ? "Account Email" : "Sync ID"}
                            </p>
                            <p className="text-[13.5px] font-normal text-slate-800 dark:text-white truncate leading-tight">
                                {user?.email || "flux-local-vault"}
                            </p>
                        </div>

                        {/* Account sync verification status */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-[#0842A0]/70 border border-blue-300 dark:border-[#A8C7FA]/30 text-blue-900 dark:text-white text-[12px] font-medium shadow-xs">
                                <span 
                                    className="material-symbols-outlined text-[16px] text-blue-700 dark:text-[#D3E3FD]" 
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    {isUserSignedIn ? "cloud_done" : "offline_pin"}
                                </span>                                
                                <span>{isUserSignedIn ? "Google Cloud Synced" : "Local-First Vault"}</span>
                            </span>
                        </div>
                    </div>

                    {/* Circular Avatar + Mini QR badge */}
                    <div className="relative shrink-0 mt-2 mr-1">
                        <div
                            onClick={() => setIsAvatarPickerOpen(true)}
                            className="w-[90px] h-[90px] rounded-full border-2 border-slate-300 dark:border-slate-700/60 overflow-hidden shadow-xl bg-slate-100 dark:bg-[#1E2020] cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                            title="Change photo"
                        >
                            {user?.avatar ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={user.avatar}
                                    alt={user?.name || "User"}
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <YinYangAvatar className="w-full h-full" />
                            )}
                        </div>

                        {/* Mini QR Badge */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                setIsQrModalOpen(true);
                            }}
                            className="absolute -bottom-1 -right-1 w-[26px] h-[26px] rounded-[8px] bg-white dark:bg-[#1E2020] border border-slate-200 dark:border-white/20 flex items-center justify-center text-slate-800 dark:text-white shadow-md hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                            title="Show QR Code"
                            aria-label="Show QR Code"
                        >
                            <span className="material-symbols-outlined text-[15px] text-slate-700 dark:text-[#E3E3E3]">qr_code_2</span>
                        </button>
                    </div>
                </div>

                {/* ── PAYMENT METHODS CARD ── */}
                <div
                    onClick={() => {
                        triggerHaptic('light');
                        setIsPaymentMethodsModalOpen(true);
                    }}
                    className="bg-white dark:bg-[#1E2020] mt-6 sm:mt-7 mb-3 rounded-[28px] p-5 border border-slate-200/80 dark:border-white/5 shadow-xs sm:shadow-md cursor-pointer hover:bg-slate-50 dark:hover:bg-[#222525] active:scale-[0.99] transition-all"
                >
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[16.5px] font-medium text-slate-900 dark:text-[#FFF]">Payment methods</h2>
                        <span className="material-symbols-outlined text-[20px] text-slate-400 dark:text-slate-500">chevron_right</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                        {/* Bank account */}
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#005AC1] dark:text-[#D3E3FD] mb-2 bg-blue-50 dark:bg-transparent">
                                <span className="material-symbols-outlined text-[30px] scale-120">account_balance</span>
                            </div>
                            <span className="text-[13px] font-normal text-slate-900 dark:text-[#FFF] leading-tight">Bank account</span>
                            <span className="text-[11.5px] text-slate-500 dark:text-[#C4C7C5] mt-0.5">1 account</span>
                        </div>

                        {/* RuPay credit card */}
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#005AC1] dark:text-[#D3E3FD] mb-2 bg-blue-50 dark:bg-transparent">
                                <span className="material-symbols-outlined text-[30px] scale-120">credit_card</span>
                            </div>
                            <span className="text-[13px] font-normal text-slate-900 dark:text-[#FFF] leading-tight">RuPay credit card</span>
                            <span className="text-[11.5px] text-slate-500 dark:text-[#C4C7C5] mt-0.5">1 card</span>
                        </div>

                        {/* UPI Lite */}
                        <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-[#005AC1] dark:text-[#D3E3FD] mb-2 bg-blue-50 dark:bg-transparent">
                                <span className="material-symbols-outlined text-[30px] scale-120">bolt</span>
                            </div>
                            <span className="text-[13px] font-normal text-slate-900 dark:text-[#FFF] leading-tight">UPI Lite</span>
                            <span className="text-[11.5px] text-amber-600 dark:text-yellow mt-0.5">Balance: ₹0</span>
                        </div>
                    </div>
                </div>

                {/* ── VERTICAL ACTION ITEMS LIST ── */}
                <div className="space-y-1 pt-1 pb-6">
                    {/* 1. Your QR code */}
                    <div
                        onClick={() => {
                            triggerHaptic('light');
                            setIsQrModalOpen(true);
                        }}
                        className="flex items-center gap-4 py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] rounded-2xl transition-all"
                    >
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-primary dark:text-[#A8C7FA]">
                            <span className="material-symbols-outlined text-[26px]">qr_code_2</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">Your QR code</h3>
                            <p className="text-[12.5px] text-slate-500 dark:text-[#C4C7C5] leading-snug">Use to receive money from any UPI app</p>
                        </div>
                    </div>

                    {/* 2. Autopay */}
                    <div
                        onClick={() => {
                            triggerHaptic('light');
                            setIsAutopayModalOpen(true);
                        }}
                        className="flex items-center gap-4 py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] rounded-2xl transition-all"
                    >
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-primary dark:text-[#A8C7FA]">
                            <span className="material-symbols-outlined text-[26px]">autorenew</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">Autopay</h3>
                            <p className="text-[12.5px] text-slate-500 dark:text-[#C4C7C5] leading-snug">1 pending request</p>
                        </div>
                    </div>

                    {/* 3. Set up pocket money */}
                    <div
                        onClick={() => {
                            triggerHaptic('light');
                            setIsPocketMoneyModalOpen(true);
                        }}
                        className="flex items-center gap-4 py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] rounded-2xl transition-all"
                    >
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-primary dark:text-[#A8C7FA]">
                            <span className="material-symbols-outlined text-[26px]">volunteer_activism</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">Set up pocket money</h3>
                            <p className="text-[12.5px] text-slate-500 dark:text-[#C4C7C5] leading-snug">Let your loved ones pay using UPI Circle</p>
                        </div>
                    </div>

                    {/* 4. Settings */}
                    <div
                        onClick={() => {
                            triggerHaptic('light');
                            setIsPreferencesModalOpen(true);
                        }}
                        className="flex items-center gap-4 py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] rounded-2xl transition-all"
                    >
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-primary dark:text-[#A8C7FA]">
                            <span className="material-symbols-outlined text-[26px]">settings</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">Settings</h3>
                        </div>
                    </div>

                    {/* 5. Manage Google account */}
                    <div
                        onClick={() => {
                            if (isGoogleLoading) return;
                            triggerHaptic('light');
                            if (isUserSignedIn) {
                                setIsQuickGoogleModalOpen(true);
                            } else {
                                handleGoogleSignIn();
                            }
                        }}
                        className={`flex items-center gap-4 py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] rounded-2xl transition-all ${isGoogleLoading ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-primary dark:text-[#A8C7FA]">
                            <span className={`material-symbols-outlined text-[26px] ${isGoogleLoading ? 'animate-spin' : ''}`}>
                                {isGoogleLoading ? 'sync' : 'account_circle'}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">
                                {isGoogleLoading ? 'Connecting Google...' : 'Manage Google account'}
                            </h3>
                        </div>
                    </div>

                    {/* 6. Get help */}
                    <div
                        onClick={() => {
                            triggerHaptic('light');
                            setIsHelpModalOpen(true);
                        }}
                        className="flex items-center gap-4 py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] rounded-2xl transition-all"
                    >
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-primary dark:text-[#A8C7FA]">
                            <span className="material-symbols-outlined text-[26px]">help</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">Get help</h3>
                        </div>
                    </div>

                    {/* 7. Language */}
                    <div
                        onClick={() => {
                            triggerHaptic('light');
                            setIsLanguageModalOpen(true);
                        }}
                        className="flex items-center gap-4 py-2.5 px-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 active:scale-[0.99] rounded-2xl transition-all"
                    >
                        <div className="w-10 h-10 flex items-center justify-center shrink-0 text-primary dark:text-[#A8C7FA]">
                            <span className="material-symbols-outlined text-[26px]">language</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[15.5px] font-normal text-slate-900 dark:text-[#E3E3E3] leading-snug">Language</h3>
                            <p className="text-[12.5px] text-slate-500 dark:text-[#C4C7C5] leading-snug">{currentLanguageName || 'English'}</p>
                        </div>
                    </div>
                </div>

                {/* Hidden JSON file picker */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                />

                {/* Hidden avatar image file picker */}
                <input
                    ref={avatarUploadRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLocalAvatarUpload}
                    className="hidden"
                />
            </div>

            {/* ── BOTTOM SHEET MODALS (Matching CurrencySelector & LanguageSelector) ── */}

            {/* 1. Language Selector Bottom Sheet */}
            <LanguageSelector
                isOpen={isLanguageModalOpen}
                onClose={() => setIsLanguageModalOpen(false)}
            />

            {/* 2. Currency Selector Bottom Sheet */}
            <CurrencySelector
                isOpen={isCurrencyModalOpen}
                onClose={() => setIsCurrencyModalOpen(false)}
            />

            {/* 3. Edit Display Name Bottom Sheet */}
            <AnimatePresence>
                {isEditProfileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditProfileOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="bg-white dark:bg-[#141416] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-safe flex flex-col"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsEditProfileOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-slate-100 dark:border-white/5 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsEditProfileOpen(false)}
                                            className="m3-icon-btn text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Display Name</h3>
                                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">Ledger Identity</p>
                                        </div>
                                        <div className="w-10"></div>
                                    </div>
                                </header>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block mb-1.5">
                                            Your Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profileNameInput}
                                            onChange={(e) => setProfileNameInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                                            className="w-full bg-slate-50 dark:bg-[#1c1c1f] border-2 border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-slate-900 dark:focus:border-indigo-400 transition-colors font-bold text-slate-900 dark:text-white"
                                            placeholder="Your Name"
                                            autoFocus
                                        />
                                    </div>

                                    <button
                                        onClick={handleSaveProfile}
                                        className="w-full py-3.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 font-bold text-sm active:scale-[0.98] transition-all shadow-sm"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* 4. Refined & Segregated Profile Photo Bottom Sheet */}
            <AnimatePresence>
                {isAvatarPickerOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAvatarPickerOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="bg-white dark:bg-[#141416] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-safe max-h-[88vh] flex flex-col"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsAvatarPickerOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-slate-100 dark:border-white/5 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsAvatarPickerOpen(false)}
                                            className="m3-icon-btn text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Profile Photo</h3>
                                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">Personalize Appearance</p>
                                        </div>
                                        <div className="w-10"></div>
                                    </div>
                                </header>

                                <div ref={avatarPickerScrollRef} className="p-6 overflow-y-auto m3-scrollable space-y-6">
                                    {/* ── Active Photo Spotlight ── */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#1c1c1f] rounded-2xl border border-slate-200/90 dark:border-white/10">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-18 h-18 rounded-2xl overflow-hidden bg-white dark:bg-[#27272a] border-1 border-slate-500 dark:border-white/20 shadow-xs flex items-center justify-center shrink-0">
                                                {user?.avatar ? (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={user.avatar}
                                                        alt={user?.name || 'User'}
                                                        referrerPolicy="no-referrer"
                                                        crossOrigin="anonymous"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-xl font-black text-slate-800 dark:text-white">
                                                        {(user?.name || 'F').charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">Current Portrait</p>
                                                <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{user?.email || 'Local User'}</p>
                                            </div>
                                        </div>

                                        {user?.avatar && (
                                            <button
                                                onClick={handleResetAvatar}
                                                className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#27272a] hover:bg-slate-100 dark:hover:bg-[#323238] text-rose-600 dark:text-rose-400 text-xs font-bold border border-slate-200 dark:border-white/10 transition-colors"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* ── Option 1: Upload from Device ── */}
                                    <div
                                        onClick={() => avatarUploadRef.current?.click()}
                                        className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-slate-900 dark:hover:border-white/40 bg-white dark:bg-[#1c1c1f] hover:bg-slate-50/80 dark:hover:bg-[#27272a] cursor-pointer transition-all flex items-center justify-between group"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Upload from Device</h4>
                                                <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">Choose from photo library or camera</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-white text-[20px]">
                                            upload
                                        </span>
                                    </div>

                                    {/* ── Option 2: Curated Portraits ── */}
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-md font-semibold text-slate-900 dark:text-white">Curated Portraits</h4>
                                            <span className="text-sm font-medium text-slate-400">Swipe to browse</span>
                                        </div>

                                        <div
                                            className="flex gap-3 overflow-x-auto mt-4 -mb-4 pb-2 snap-x snap-mandatory scroll-smooth"
                                            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                                        >
                                            {PRESET_AVATARS.map((av) => {
                                                const isSelected = user?.avatar === av.url;
                                                return (
                                                    <button
                                                        key={av.id}
                                                        type="button"
                                                        onClick={() => handleSelectAvatar(av.url)}
                                                        className={clsx(
                                                            "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all active:scale-95 shrink-0 snap-start w-[86px]"
                                                        )}
                                                    >
                                                        <div className={clsx("w-18 h-18 rounded-xl bg-[#f1f5f9] dark:bg-[#27272a] overflow-hidden flex items-center justify-center", isSelected ? "border-1 border-slate-900 dark:border-white" : "")}>
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={av.url}
                                                                alt={av.label}
                                                                className="w-full h-full object-contain"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                        <span className={clsx(
                                                            "text-[13px] font-medium truncate max-w-full text-center leading-tight",
                                                            isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-zinc-300"
                                                        )}>
                                                            {av.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ── Option 3: Avatar Studio ── */}
                                    <div className="border-t border-slate-100 dark:border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setIsBuilderOpen(!isBuilderOpen)}
                                            className="w-full flex items-center justify-between py-1 group"
                                        >
                                            <div className="mt-2 flex items-center gap-2.5">
                                                <h4 className="text-md font-semibold text-slate-900 dark:text-white">Avatar Studio</h4>
                                                <span className="text-[11px] font-semibold text-white bg-slate-900 dark:bg-white dark:text-zinc-950 px-1.5 py-0.5 rounded-md leading-tight tracking-wider">
                                                    Custom
                                                </span>
                                            </div>
                                            <span className={clsx(
                                                "material-symbols-outlined text-[20px] text-slate-400 transition-transform duration-200",
                                                isBuilderOpen && "rotate-180"
                                            )}>
                                                expand_more
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {isBuilderOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.22, ease: 'easeOut' }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-4 space-y-5">
                                                        {/* ── Live Preview Card ── */}
                                                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#1c1c1f] rounded-2xl border border-slate-200/80 dark:border-white/10">
                                                            <div className="w-[88px] h-[88px] rounded-2xl overflow-hidden bg-white dark:bg-[#27272a] border-2 border-slate-200 dark:border-white/15 shadow-sm shrink-0">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={builderPreviewUrl}
                                                                    alt="Avatar preview"
                                                                    className="w-full h-full object-contain"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0 space-y-3">
                                                                <div>
                                                                    <p className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight pl-2">Your Avatar</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleSelectAvatar(builderPreviewUrl);
                                                                            setIsAvatarPickerOpen(false);
                                                                        }}
                                                                        className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs font-bold active:scale-[0.97] transition-all shadow-xs"
                                                                    >
                                                                        Use This
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAvatarBuilder({ seed: `flux-${Date.now()}` })}
                                                                        className="w-10 h-10 rounded-xl bg-white dark:bg-[#27272a] text-slate-700 dark:text-white flex items-center justify-center border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#323238] active:scale-90 transition-all"
                                                                        title="Randomize"
                                                                    >
                                                                        <span className="material-symbols-outlined text-[18px]">casino</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ── Seed ── */}
                                                        <div>
                                                            <label className="text-md font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">Avatar Name</label>
                                                            <input
                                                                type="text"
                                                                value={avatarBuilder.seed || ''}
                                                                onChange={(e) => setAvatarBuilder(prev => ({ ...prev, seed: e.target.value }))}
                                                                placeholder="Type any name or word..."
                                                                className="w-full bg-white dark:bg-[#1c1c1f] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-3 text-[14px] font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-indigo-400 focus:ring-1 focus:ring-slate-900/10 dark:focus:ring-indigo-400/20 transition-all placeholder:text-slate-400"
                                                            />
                                                        </div>

                                                        {/* ── Colors ── */}
                                                        <div className="space-y-3">
                                                            <h5 className="text-md font-semibold text-slate-700 dark:text-zinc-300">Colors</h5>
                                                            {Object.entries(NOTIONISTS_COLORS).map(([colorKey, config]) => (
                                                                <div key={colorKey}>
                                                                    <span className="text-[13px] font-semibold text-slate-500 dark:text-zinc-400 mb-2 block">{config.label}</span>
                                                                    <div
                                                                        className="flex gap-2 overflow-x-auto px-2 pb-1 py-1"
                                                                        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                                                                    >
                                                                        {config.presets.map((hex) => (
                                                                            <button
                                                                                key={hex}
                                                                                type="button"
                                                                                onClick={() => updateBuilderOption(colorKey, hex)}
                                                                                className={clsx(
                                                                                    "w-8 h-8 rounded-xl border-2 transition-all active:scale-90 shrink-0",
                                                                                    avatarBuilder[colorKey] === hex
                                                                                        ? "border-slate-900 dark:border-white ring-2 ring-slate-900/20 dark:ring-white/20 scale-110"
                                                                                        : "border-slate-200/80 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30"
                                                                                )}
                                                                                style={{ backgroundColor: `#${hex}` }}
                                                                                title={`#${hex}`}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* ── Features ── */}
                                                        <div className="space-y-3">
                                                            <h5 className="text-md font-semibold text-slate-900 dark:text-white">Features</h5>

                                                            {/* Category Pill Tabs */}
                                                            <div
                                                                className="flex gap-2 overflow-x-auto -mx-6 px-6 pb-1"
                                                                style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                                                            >
                                                                {Object.entries(NOTIONISTS_OPTIONS).map(([key, opt]) => {
                                                                    const isActive = builderActiveCategory === key;
                                                                    const hasValue = Boolean(avatarBuilder[key]);
                                                                    return (
                                                                        <button
                                                                            key={key}
                                                                            type="button"
                                                                            onClick={() => setBuilderActiveCategory(isActive ? null : key)}
                                                                            className={clsx(
                                                                                "flex items-center gap-1.5 px-3.5 py-2 my-1 mx-1 rounded-full text-[11px] font-semibold transition-all shrink-0 active:scale-95",
                                                                                isActive
                                                                                    ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                                                                                    : hasValue
                                                                                        ? "bg-slate-200 dark:bg-[#27272a] text-slate-900 dark:text-white ring-1 ring-slate-300 dark:ring-white/20"
                                                                                        : "bg-white dark:bg-[#1c1c1f] text-slate-800 dark:text-zinc-200 ring-1 ring-slate-200 dark:ring-white/10 hover:dark:bg-[#27272a]"
                                                                            )}
                                                                        >
                                                                            <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
                                                                            <span>{opt.label}</span>
                                                                            {hasValue && !isActive && (
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Variant Carousel for Selected Category */}
                                                            <AnimatePresence mode="wait">
                                                                {builderActiveCategory && NOTIONISTS_OPTIONS[builderActiveCategory] && (
                                                                    <motion.div
                                                                        key={builderActiveCategory}
                                                                        initial={{ opacity: 0, y: 6 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -6 }}
                                                                        transition={{ duration: 0.15 }}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2.5">
                                                                            <span className="text-[13px] font-bold text-slate-500 dark:text-zinc-400">
                                                                                {NOTIONISTS_OPTIONS[builderActiveCategory].label} · {NOTIONISTS_OPTIONS[builderActiveCategory].values.length} styles
                                                                            </span>
                                                                            {avatarBuilder[builderActiveCategory] && (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setAvatarBuilder(prev => {
                                                                                            const next = { ...prev };
                                                                                            delete next[builderActiveCategory!];
                                                                                            return next;
                                                                                        });
                                                                                    }}
                                                                                    className="text-[13px] font-semibold text-rose-500 hover:text-rose-600 active:scale-95 transition-all"
                                                                                >
                                                                                    Reset
                                                                                </button>
                                                                            )}
                                                                        </div>

                                                                        {/* Horizontal scroll carousel for variants */}
                                                                        <div
                                                                            className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
                                                                            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
                                                                        >
                                                                            {NOTIONISTS_OPTIONS[builderActiveCategory].values.map((variant) => {
                                                                                const isSelected = avatarBuilder[builderActiveCategory] === variant;
                                                                                const previewParams = new URLSearchParams();
                                                                                previewParams.set('seed', avatarBuilder.seed || 'flux');
                                                                                if (avatarBuilder.backgroundColor) {
                                                                                    previewParams.set('backgroundColor', avatarBuilder.backgroundColor);
                                                                                }
                                                                                previewParams.set(builderActiveCategory, variant);
                                                                                // Force probability for low-probability components
                                                                                const prob = NOTIONISTS_OPTIONS[builderActiveCategory].probability;
                                                                                if (prob < 100) {
                                                                                    previewParams.set(`${builderActiveCategory}Probability`, '100');
                                                                                }
                                                                                const variantUrl = `https://api.dicebear.com/10.x/notionists/svg?${previewParams.toString()}`;

                                                                                return (
                                                                                    <button
                                                                                        key={variant}
                                                                                        type="button"
                                                                                        onClick={() => updateBuilderOption(builderActiveCategory, variant)}
                                                                                        className={clsx(
                                                                                            "relative rounded-2xl border overflow-hidden transition-all active:scale-95 shrink-0 snap-start w-[60px] h-[60px]",
                                                                                            isSelected
                                                                                                ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-[#27272a] shadow-sm"
                                                                                                : "border-slate-100 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-[#1c1c1f]"
                                                                                        )}
                                                                                        title={variant}
                                                                                    >
                                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                        <img
                                                                                            src={variantUrl}
                                                                                            alt={variant}
                                                                                            className="w-full h-full object-contain"
                                                                                            loading="lazy"
                                                                                        />
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* 5. Refined & Professional About Flux Bottom Sheet */}
            <AnimatePresence>
                {isAboutModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAboutModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="bg-white dark:bg-[#141416] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-safe max-h-[85vh] flex flex-col"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsAboutModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-slate-100 dark:border-white/5 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsAboutModalOpen(false)}
                                            className="m3-icon-btn text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">About Flux</h3>
                                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">Mindful Personal Finance</p>
                                        </div>
                                        <div className="w-10"></div>
                                    </div>
                                </header>

                                <div className="p-6 overflow-y-auto m3-scrollable space-y-5">
                                    {/* Header Branding */}
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shrink-0 shadow-sm">
                                            <FluxLogo className="w-6.5 h-6.5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Flux</h3>
                                            <p className="text-xs text-slate-600 dark:text-zinc-400 font-bold">Mindful Personal Finance</p>
                                        </div>
                                    </div>

                                    {/* Mission statement */}
                                    <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                                        Flux is crafted for individuals who value clarity, privacy, and full autonomy over their financial journey. Completely free of advertisements, tracking scripts, and predatory subscription models.
                                    </p>

                                    {/* Core Principles (High Contrast) */}
                                    <div className="bg-slate-50 dark:bg-[#1c1c1f] rounded-2xl p-4 border border-slate-200/90 dark:border-white/10 space-y-3.5">
                                        <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px] shrink-0 mt-0.5">lock</span>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Privacy First</h4>
                                                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-normal">Your financial records remain encrypted on your device and belong strictly to you.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px] shrink-0 mt-0.5">bolt</span>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Zero Friction</h4>
                                                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-normal">Fast, tactile expense logging with instantaneous local reads and zero waiting.</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-slate-900 dark:text-white text-[20px] shrink-0 mt-0.5">folder_zip</span>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Complete Portability</h4>
                                                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-normal">Export and import your entire financial ledger anytime with open JSON formats.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Version Footer */}
                                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400 font-semibold pt-2 border-t border-slate-100 dark:border-white/5">
                                        <span>Version 2.4.0 (Build 2026.09)</span>
                                        <span>Crafted with care</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* 6. Google Provider Setup Modal */}
            <AnimatePresence>
                {isGoogleSetupModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsGoogleSetupModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="bg-white dark:bg-[#141416] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-safe flex flex-col"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsGoogleSetupModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-slate-100 dark:border-white/5 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsGoogleSetupModalOpen(false)}
                                            className="m3-icon-btn text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Google OAuth</h3>
                                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">Provider Setup</p>
                                        </div>
                                        <div className="w-10"></div>
                                    </div>
                                </header>

                                <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-zinc-300">
                                    <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 rounded-2xl text-amber-900 dark:text-amber-200 space-y-1.5">
                                        <p className="font-bold flex items-center gap-1.5 text-sm">
                                            <span className="material-symbols-outlined text-[18px]">info</span>
                                            <span>Action Required in Supabase</span>
                                        </p>
                                        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                                            In your Supabase project (<strong>dqmuxspzenamvqodrnsm</strong>), navigate to <strong>Authentication → Providers → Google</strong>, toggle it <strong>Enabled</strong>, and paste your Google Client ID & Secret.
                                        </p>
                                    </div>

                                    <div className="pt-2 space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                window.open('https://supabase.com/dashboard/project/dqmuxspzenamvqodrnsm/auth/providers', '_blank');
                                                setIsGoogleSetupModalOpen(false);
                                            }}
                                            className="w-full py-3.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-slate-800 dark:hover:bg-zinc-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[17px]">open_in_new</span>
                                            <span>Open Supabase Providers Dashboard</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsGoogleSetupModalOpen(false);
                                                setQuickGoogleEmail(user?.email !== 'guest@example.com' ? (user?.email || '') : '');
                                                setQuickGoogleName(user?.name || '');
                                                setIsQuickGoogleModalOpen(true);
                                            }}
                                            className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1c1c1f] dark:hover:bg-[#27272a] text-slate-900 dark:text-white border border-transparent dark:border-white/10 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[17px]">account_circle</span>
                                            <span>Connect Google Profile (Instant Preview)</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* 7. Quick Google Profile Connect Bottom Sheet */}
            <AnimatePresence>
                {isQuickGoogleModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsQuickGoogleModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="bg-white dark:bg-[#141416] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 dark:border-white/10 pb-safe flex flex-col"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsQuickGoogleModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#141416] z-10 border-b border-slate-100 dark:border-white/5 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsQuickGoogleModalOpen(false)}
                                            className="m3-icon-btn text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Google Profile</h3>
                                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider leading-tight">Instant Preview</p>
                                        </div>
                                        <div className="w-10"></div>
                                    </div>
                                </header>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block mb-1.5">
                                            Google Email
                                        </label>
                                        <input
                                            type="email"
                                            value={quickGoogleEmail}
                                            onChange={(e) => setQuickGoogleEmail(e.target.value)}
                                            placeholder="you@gmail.com"
                                            className="w-full bg-slate-50 dark:bg-[#1c1c1f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-white/40"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 block mb-1.5">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={quickGoogleName}
                                            onChange={(e) => setQuickGoogleName(e.target.value)}
                                            placeholder="Your Name"
                                            className="w-full bg-slate-50 dark:bg-[#1c1c1f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-slate-900 dark:focus:border-white/40"
                                        />
                                    </div>

                                    <button
                                        onClick={handleQuickGoogleConnect}
                                        className="w-full py-3.5 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-sm hover:bg-slate-800 dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-xs"
                                    >
                                        Link Account
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* ── 5. FLUX PREFERENCES BOTTOM SHEET (Settings) ── */}
            <AnimatePresence>
                {isPreferencesModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPreferencesModalOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white dark:bg-[#1E2020] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-200 dark:border-white/10 pb-safe max-h-[88vh] flex flex-col text-slate-800 dark:text-[#E3E3E3]"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsPreferencesModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#1E2020] z-10 border-b border-slate-200 dark:border-white/10 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsPreferencesModalOpen(false)}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E3E3E3]">Settings</h3>
                                            <p className="text-slate-500 dark:text-[#C4C7C5] text-[10.5px] uppercase tracking-wider leading-tight">Preferences & Data</p>
                                        </div>
                                        <div className="w-9"></div>
                                    </div>
                                </header>

                                <div className="p-5 space-y-5 overflow-y-auto overscroll-contain">
                                    {/* Appearance / Theme Mode */}
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#C4C7C5] px-1 mb-2 block">
                                            Appearance
                                        </span>
                                        <div className="bg-slate-100 dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-white/10 p-3 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="material-symbols-outlined text-[20px] text-primary dark:text-[#A8C7FA]">palette</span>
                                                    <span className="text-sm font-medium text-slate-800 dark:text-[#E3E3E3]">Theme Mode</span>
                                                </div>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-[#C4C7C5] capitalize">
                                                    {theme === 'system' ? 'Auto' : theme}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 p-1 bg-slate-200/80 dark:bg-[#1E2020] rounded-xl border border-slate-300/80 dark:border-white/10 relative">
                                                {[
                                                    { id: 'light', label: 'Light', icon: 'light_mode' },
                                                    { id: 'dark', label: 'Dark', icon: 'dark_mode' },
                                                    { id: 'system', label: 'Auto', icon: 'brightness_auto' },
                                                ].map((item) => {
                                                    const isActive = theme === item.id;
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                triggerHaptic('light');
                                                                setTheme(item.id as 'light' | 'dark' | 'system');
                                                            }}
                                                            className={clsx(
                                                                "relative flex items-center justify-center gap-1.5 h-8 text-xs font-semibold rounded-lg transition-colors z-10 cursor-pointer",
                                                                isActive ? "text-white font-bold" : "text-slate-600 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-[#E3E3E3]"
                                                            )}
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                                                            <span>{item.label}</span>
                                                            {isActive && (
                                                                <motion.div
                                                                    layoutId="prefThemeSegmentPill"
                                                                    className="absolute inset-0 bg-[#0842A0] rounded-lg -z-10"
                                                                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                                                />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financial Notation */}
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#C4C7C5] px-1 mb-2 block">
                                            Currency
                                        </span>
                                        <div
                                            onClick={() => {
                                                triggerHaptic('light');
                                                setIsCurrencyModalOpen(true);
                                            }}
                                            className="bg-slate-100 dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 active:scale-[0.99] transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[20px] text-primary dark:text-[#A8C7FA]">payments</span>
                                                <div>
                                                    <h4 className="text-sm font-medium text-slate-800 dark:text-[#E3E3E3]">Primary Currency</h4>
                                                    <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">{currency?.code || 'USD'} ({currency?.symbol || '$'})</p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-[20px] text-slate-400 dark:text-[#C4C7C5]">chevron_right</span>
                                        </div>
                                    </div>

                                    {/* Data & Backups */}
                                    <div>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#C4C7C5] px-1 mb-2 block">
                                            Data & Backup
                                        </span>
                                        <div className="bg-slate-100 dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-200 dark:divide-white/5 overflow-hidden">
                                            {/* Export Backup JSON */}
                                            <div
                                                onClick={async () => {
                                                    try {
                                                        triggerHaptic('success');
                                                        await exportDatabaseToJson(db);
                                                        showToast("Backup snapshot downloaded", "success");
                                                    } catch {
                                                        showToast("Export failed", "error");
                                                    }
                                                }}
                                                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-[20px] text-primary dark:text-[#A8C7FA]">download</span>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-slate-800 dark:text-[#E3E3E3]">Export JSON Backup</h4>
                                                        <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">Download complete database snapshot</p>
                                                    </div>
                                                </div>
                                                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-[#C4C7C5]">chevron_right</span>
                                            </div>

                                            {/* Export Transactions CSV */}
                                            <div
                                                onClick={async () => {
                                                    try {
                                                        triggerHaptic('success');
                                                        const [txDocs, catDocs] = await Promise.all([
                                                            db.transactions.find({ selector: { _deleted: false } }).exec(),
                                                            db.categories.find({ selector: { _deleted: false } }).exec(),
                                                        ]);
                                                        const catMap: Record<string, any> = {};
                                                        catDocs.forEach(c => { catMap[c.id] = c.toJSON(); });
                                                        exportTransactionsToCsv(txDocs.map(d => d.toJSON() as any), catMap);
                                                        showToast("Transactions CSV downloaded", "success");
                                                    } catch {
                                                        showToast("CSV export failed", "error");
                                                    }
                                                }}
                                                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-[20px] text-primary dark:text-[#A8C7FA]">table_chart</span>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-slate-800 dark:text-[#E3E3E3]">Export Transactions CSV</h4>
                                                        <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">Spreadsheet format for Excel & Sheets</p>
                                                    </div>
                                                </div>
                                                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-[#C4C7C5]">chevron_right</span>
                                            </div>

                                            {/* Restore from JSON */}
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-[20px] text-primary dark:text-[#A8C7FA]">upload</span>
                                                    <div>
                                                        <h4 className="text-sm font-medium text-slate-800 dark:text-[#E3E3E3]">Restore from Backup</h4>
                                                        <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">Import accounts, categories & expenses</p>
                                                    </div>
                                                </div>
                                                <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-[#C4C7C5]">chevron_right</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* About Flux */}
                                    <div>
                                        <div
                                            onClick={() => setIsAboutModalOpen(true)}
                                            className="bg-slate-100 dark:bg-[#141414] rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-[20px] text-primary dark:text-[#A8C7FA]">info</span>
                                                <div>
                                                    <h4 className="text-sm font-medium text-slate-800 dark:text-[#E3E3E3]">About Flux</h4>
                                                    <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">Version 2.4.0 • Mindful personal finance</p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-[#C4C7C5]">chevron_right</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* ── 6. YOUR QR CODE BOTTOM SHEET ── */}
            <AnimatePresence>
                {isQrModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsQrModalOpen(false)}
                            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white dark:bg-[#1E2020] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-200 dark:border-white/10 pb-safe flex flex-col text-slate-800 dark:text-[#E3E3E3]"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsQrModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#1E2020] z-10 border-b border-slate-200 dark:border-white/10 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsQrModalOpen(false)}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E3E3E3]">Receive Money</h3>
                                            <p className="text-slate-500 dark:text-[#C4C7C5] text-[10.5px] uppercase tracking-wider leading-tight">UPI QR Code</p>
                                        </div>
                                        <div className="w-9"></div>
                                    </div>
                                </header>

                                <div className="p-6 flex flex-col items-center text-center space-y-4">
                                    {/* User Details */}
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-300 dark:border-white/20 mb-2">
                                            {user?.avatar ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <YinYangAvatar className="w-full h-full" />
                                            )}
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{user?.name || "Anurag Verma"}</h3>
                                        <p className="text-xs text-slate-500 dark:text-[#C4C7C5] mt-0.5">UPI ID: <span className="text-primary dark:text-[#A8C7FA] select-all font-mono">mindreaders7557-1@okhdfcbank</span></p>
                                    </div>

                                    {/* QR Code Canvas Card */}
                                    <div className="bg-white p-5 rounded-3xl shadow-xl flex flex-col items-center border border-slate-200 dark:border-transparent">
                                        <svg viewBox="0 0 160 160" className="w-48 h-48">
                                            {/* Stylized QR Matrix Pattern */}
                                            <rect width="160" height="160" fill="white" />
                                            {/* Top-left position block */}
                                            <rect x="12" y="12" width="40" height="40" fill="#141414" rx="4" />
                                            <rect x="20" y="20" width="24" height="24" fill="white" rx="2" />
                                            <rect x="26" y="26" width="12" height="12" fill="#141414" rx="1" />
                                            {/* Top-right position block */}
                                            <rect x="108" y="12" width="40" height="40" fill="#141414" rx="4" />
                                            <rect x="116" y="20" width="24" height="24" fill="white" rx="2" />
                                            <rect x="122" y="26" width="12" height="12" fill="#141414" rx="1" />
                                            {/* Bottom-left position block */}
                                            <rect x="12" y="108" width="40" height="40" fill="#141414" rx="4" />
                                            <rect x="20" y="116" width="24" height="24" fill="white" rx="2" />
                                            <rect x="26" y="122" width="12" height="12" fill="#141414" rx="1" />
                                            {/* Simulated Data dots */}
                                            <rect x="62" y="16" width="8" height="8" fill="#141414" />
                                            <rect x="76" y="16" width="8" height="8" fill="#141414" />
                                            <rect x="90" y="16" width="8" height="8" fill="#141414" />
                                            <rect x="62" y="32" width="8" height="8" fill="#141414" />
                                            <rect x="90" y="32" width="8" height="8" fill="#141414" />
                                            <rect x="62" y="48" width="8" height="8" fill="#141414" />
                                            <rect x="76" y="48" width="8" height="8" fill="#141414" />
                                            <rect x="16" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="32" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="48" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="62" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="76" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="90" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="108" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="124" y="62" width="8" height="8" fill="#141414" />
                                            <rect x="140" y="62" width="8" height="8" fill="#141414" />
                                            {/* Center Badge */}
                                            <circle cx="80" cy="80" r="16" fill="#0842A0" />
                                            <text x="80" y="85" fill="#D3E3FD" fontSize="13" fontWeight="bold" textAnchor="middle">UPI</text>
                                            {/* Bottom data dots */}
                                            <rect x="62" y="98" width="8" height="8" fill="#141414" />
                                            <rect x="76" y="98" width="8" height="8" fill="#141414" />
                                            <rect x="108" y="98" width="8" height="8" fill="#141414" />
                                            <rect x="124" y="98" width="8" height="8" fill="#141414" />
                                            <rect x="62" y="116" width="8" height="8" fill="#141414" />
                                            <rect x="90" y="116" width="8" height="8" fill="#141414" />
                                            <rect x="124" y="116" width="8" height="8" fill="#141414" />
                                            <rect x="76" y="132" width="8" height="8" fill="#141414" />
                                            <rect x="108" y="132" width="8" height="8" fill="#141414" />
                                            <rect x="140" y="132" width="8" height="8" fill="#141414" />
                                        </svg>
                                        <p className="text-[11px] font-semibold text-slate-700 mt-2">Scan with any UPI App</p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 w-full pt-2">
                                        <button
                                            onClick={() => {
                                                triggerHaptic('light');
                                                if (navigator?.clipboard) {
                                                    navigator.clipboard.writeText("mindreaders7557-1@okhdfcbank");
                                                }
                                                showToast("UPI ID copied to clipboard!", "success");
                                            }}
                                            className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-[#E3E3E3] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-primary dark:text-[#A8C7FA]">content_copy</span>
                                            <span>Copy UPI ID</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                triggerHaptic('light');
                                                if (navigator?.share) {
                                                    navigator.share({
                                                        title: "My UPI QR Code",
                                                        text: "Pay Anurag Verma via UPI: mindreaders7557-1@okhdfcbank",
                                                    }).catch(() => {});
                                                } else {
                                                    showToast("Share link copied!", "info");
                                                }
                                            }}
                                            className="flex-1 py-3 px-4 rounded-2xl bg-[#0842A0] hover:bg-[#073887] text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-[#D3E3FD]">share</span>
                                            <span>Share QR</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* ── 7. PAYMENT METHODS BOTTOM SHEET ── */}
            <AnimatePresence>
                {isPaymentMethodsModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPaymentMethodsModalOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white dark:bg-[#1E2020] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-200 dark:border-white/10 pb-safe flex flex-col text-slate-800 dark:text-[#E3E3E3]"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsPaymentMethodsModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#1E2020] z-10 border-b border-slate-200 dark:border-white/10 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsPaymentMethodsModalOpen(false)}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E3E3E3]">Payment Methods</h3>
                                            <p className="text-slate-500 dark:text-[#C4C7C5] text-[10.5px] uppercase tracking-wider leading-tight">Accounts & Cards</p>
                                        </div>
                                        <div className="w-9"></div>
                                    </div>
                                </header>

                                <div className="p-5 space-y-4 overflow-y-auto">
                                    {/* Bank Account */}
                                    <div className="bg-slate-100 dark:bg-[#141414] rounded-2xl p-4 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-white/10 flex items-center justify-center text-[#005AC1] dark:text-[#D3E3FD]">
                                                <span className="material-symbols-outlined text-[24px]">account_balance</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E3E3E3]">HDFC Bank •••• 7557</h4>
                                                <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">Primary account for receiving money</p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-bold text-primary dark:text-[#A8C7FA] bg-blue-100 dark:bg-[#0842A0]/30 px-2.5 py-1 rounded-full">Primary</span>
                                    </div>

                                    {/* RuPay Credit Card */}
                                    <div className="bg-slate-100 dark:bg-[#141414] rounded-2xl p-4 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-white/10 flex items-center justify-center text-[#005AC1] dark:text-[#D3E3FD]">
                                                <span className="material-symbols-outlined text-[24px]">credit_card</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E3E3E3]">RuPay Credit Card •••• 3012</h4>
                                                <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">Linked for merchant payments</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-[#C4C7C5]">chevron_right</span>
                                    </div>

                                    {/* UPI Lite */}
                                    <div className="bg-slate-100 dark:bg-[#141414] rounded-2xl p-4 border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-white/10 flex items-center justify-center text-[#005AC1] dark:text-[#D3E3FD]">
                                                <span className="material-symbols-outlined text-[24px]">bolt</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E3E3E3]">UPI Lite</h4>
                                                <p className="text-xs text-amber-600 dark:text-[#E8DEF8]">Balance: ₹0</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => showToast("UPI Lite balance top-up is active", "info")}
                                            className="text-xs font-semibold text-primary dark:text-[#A8C7FA] bg-blue-50 hover:bg-blue-100 dark:bg-white/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
                                        >
                                            + Add money
                                        </button>
                                    </div>

                                    {/* Add Account Button */}
                                    <button
                                        onClick={() => showToast("Add bank account feature ready", "info")}
                                        className="w-full py-3.5 px-4 rounded-2xl bg-[#0842A0] hover:bg-[#073887] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px] text-[#D3E3FD]">add</span>
                                        <span>Add bank account</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* ── 8. AUTOPAY BOTTOM SHEET ── */}
            <AnimatePresence>
                {isAutopayModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAutopayModalOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white dark:bg-[#1E2020] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-200 dark:border-white/10 pb-safe flex flex-col text-slate-800 dark:text-[#E3E3E3]"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsAutopayModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#1E2020] z-10 border-b border-slate-200 dark:border-white/10 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsAutopayModalOpen(false)}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E3E3E3]">Autopay</h3>
                                            <p className="text-slate-500 dark:text-[#C4C7C5] text-[10.5px] uppercase tracking-wider leading-tight">Recurring Mandates</p>
                                        </div>
                                        <div className="w-9"></div>
                                    </div>
                                </header>

                                <div className="p-5 space-y-4">
                                    <div className="bg-slate-100 dark:bg-[#141414] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E3E3E3]">Spotify Premium</h4>
                                                    <p className="text-xs text-slate-500 dark:text-[#C4C7C5]">₹119 / month • Due in 2 days</p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">Pending</span>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    triggerHaptic('success');
                                                    showToast("Autopay mandate approved", "success");
                                                    setIsAutopayModalOpen(false);
                                                }}
                                                className="flex-1 py-2 px-3 rounded-xl bg-[#0842A0] hover:bg-[#073887] text-white text-xs font-semibold transition-all"
                                            >
                                                Approve Mandate
                                            </button>
                                            <button
                                                onClick={() => {
                                                    triggerHaptic('light');
                                                    showToast("Mandate declined", "info");
                                                    setIsAutopayModalOpen(false);
                                                }}
                                                className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-[#C4C7C5] text-xs font-semibold transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* ── 9. SET UP POCKET MONEY BOTTOM SHEET ── */}
            <AnimatePresence>
                {isPocketMoneyModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPocketMoneyModalOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white dark:bg-[#1E2020] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-200 dark:border-white/10 pb-safe flex flex-col text-slate-800 dark:text-[#E3E3E3]"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsPocketMoneyModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#1E2020] z-10 border-b border-slate-200 dark:border-white/10 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsPocketMoneyModalOpen(false)}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E3E3E3]">UPI Circle</h3>
                                            <p className="text-slate-500 dark:text-[#C4C7C5] text-[10.5px] uppercase tracking-wider leading-tight">Pocket Money</p>
                                        </div>
                                        <div className="w-9"></div>
                                    </div>
                                </header>

                                <div className="p-6 text-center space-y-4">
                                    <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-[#0842A0]/20 text-primary dark:text-[#A8C7FA] flex items-center justify-center mx-auto">
                                        <span className="material-symbols-outlined text-[32px]">volunteer_activism</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Let your loved ones pay</h3>
                                        <p className="text-xs text-slate-500 dark:text-[#C4C7C5] mt-1 max-w-xs mx-auto">
                                            Share your UPI account with family. They can make payments while you maintain full spending control and limits.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            triggerHaptic('light');
                                            showToast("Select a contact to invite to UPI Circle", "info");
                                        }}
                                        className="w-full py-3.5 px-4 rounded-2xl bg-[#0842A0] hover:bg-[#073887] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <span className="material-symbols-outlined text-[20px] text-[#D3E3FD]">person_add</span>
                                        <span>Add family member</span>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* ── 10. GET HELP BOTTOM SHEET ── */}
            <AnimatePresence>
                {isHelpModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHelpModalOpen(false)}
                            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[90]"
                        />
                        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                className="bg-white dark:bg-[#1E2020] w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-200 dark:border-white/10 pb-safe flex flex-col text-slate-800 dark:text-[#E3E3E3]"
                                drag="y"
                                dragConstraints={{ top: 0, bottom: 0 }}
                                dragElastic={{ top: 0, bottom: 0.8 }}
                                onDragEnd={(_, info) => {
                                    if (info.offset.y > 100 || info.velocity.y > 500) {
                                        setIsHelpModalOpen(false);
                                    }
                                }}
                            >
                                <header className="px-6 py-4 flex flex-col items-center sticky top-0 bg-white dark:bg-[#1E2020] z-10 border-b border-slate-200 dark:border-white/10 shrink-0">
                                    <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mb-3" />
                                    <div className="w-full flex items-center justify-between relative">
                                        <button
                                            onClick={() => setIsHelpModalOpen(false)}
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-[#C4C7C5] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                            aria-label="Close modal"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                        <div className="text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-[#E3E3E3]">Help & Support</h3>
                                            <p className="text-slate-500 dark:text-[#C4C7C5] text-[10.5px] uppercase tracking-wider leading-tight">Assistance</p>
                                        </div>
                                        <div className="w-9"></div>
                                    </div>
                                </header>

                                <div className="p-5 space-y-3 overflow-y-auto">
                                    {[
                                        { q: "How do I backup and export my records?", a: "Open Settings > Data & Backup > Export JSON Backup or CSV to save all your data." },
                                        { q: "Can I receive money using this QR code?", a: "Yes, your UPI ID works across all standard UPI applications including GPay, PhonePe, and Paytm." },
                                        { q: "Where is my data stored?", a: "Your finances are kept safely on your local device storage with client-side synchronization." },
                                    ].map((item, idx) => (
                                        <div key={idx} className="bg-slate-100 dark:bg-[#141414] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E3E3E3]">{item.q}</h4>
                                            <p className="text-xs text-slate-500 dark:text-[#C4C7C5] mt-1.5 leading-relaxed">{item.a}</p>
                                        </div>
                                    ))}

                                    <div className="pt-2">
                                        <button
                                            onClick={() => {
                                                triggerHaptic('light');
                                                window.open("https://github.com/flux/support", "_blank");
                                            }}
                                            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-[#E3E3E3] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                                        >
                                            <span className="material-symbols-outlined text-[18px] text-primary dark:text-[#A8C7FA]">support_agent</span>
                                            <span>Contact Support</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}
