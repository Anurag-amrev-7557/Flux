"use client";

import { useDatabase } from "@/db/DatabaseProvider";
import { useAppStore } from "@/store/appStore";
import { ProfileDocType, TransactionDocType } from "@/db/schema";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import clsx from "clsx";
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from "framer-motion";

import { ActionModal } from "@/components/ActionModal";

export default function ProfilesPage() {
    const router = useRouter();
    const db = useDatabase();
    const { activeProfileId, setActiveProfileId } = useAppStore();

    const [profiles, setProfiles] = useState<ProfileDocType[]>([]);
    const [transactions, setTransactions] = useState<TransactionDocType[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
    const [isAddingProfile, setIsAddingProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [activeModal, setActiveModal] = useState<{
        type: 'rename' | 'delete' | 'warning';
        profileId?: string;
        profileName?: string;
    } | null>(null);
    const [modalInput, setModalInput] = useState("");
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        const sub1 = db.profiles.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setProfiles(docs.map(d => d.toJSON() as ProfileDocType));
        });

        const sub2 = db.transactions.find({ selector: { _deleted: false } }).$.subscribe(docs => {
            setTransactions(docs.map(d => d.toJSON() as TransactionDocType));
        });

        return () => {
            sub1.unsubscribe();
            sub2.unsubscribe();
        };
    }, [db]);

    useEffect(() => {
        if (!isMenuOpen) return;
        const handleClick = () => setIsMenuOpen(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isMenuOpen]);

    const { totalSpend, profileSpendMap } = useMemo(() => {
        let total = 0;
        const profileMap: Record<string, number> = {};

        // Only count current month for overview
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        transactions.forEach(tx => {
            if (tx.type === 'expense' && tx.timestamp >= startOfMonth) {
                total += tx.amount;
                profileMap[tx.profile_id] = (profileMap[tx.profile_id] || 0) + tx.amount;
            }
        });

        return { totalSpend: total, profileSpendMap: profileMap };
    }, [transactions]);

    const handleProfileSelect = (id: string) => {
        setActiveProfileId(id);
        router.push('/');
    };

    const handleAddProfile = async () => {
        if (!newProfileName.trim()) return;

        const id = uuidv4();
        await db.profiles.insert({
            id,
            name: newProfileName.trim(),
            theme: 'primary',
            _deleted: false,
            _modified: Date.now()
        });
        setNewProfileName("");
        setIsAddingProfile(false);
    };

    const confirmDeleteProfile = async () => {
        if (!activeModal?.profileId) return;

        setIsActionLoading(true);
        const profileDoc = await db.profiles.findOne(activeModal.profileId).exec();
        if (profileDoc) {
            await profileDoc.remove();
            if (activeProfileId === activeModal.profileId) {
                // Switch to the first available profile
                const remainingProfiles = profiles.filter(p => p.id !== activeModal.profileId);
                if (remainingProfiles.length > 0) {
                    setActiveProfileId(remainingProfiles[0].id);
                }
            }
        }
        setIsActionLoading(false);
        setActiveModal(null);
    };

    const confirmRenameProfile = async () => {
        if (!activeModal?.profileId || !modalInput.trim()) return;

        setIsActionLoading(true);
        const profileDoc = await db.profiles.findOne(activeModal.profileId).exec();
        if (profileDoc) {
            await profileDoc.patch({ name: modalInput.trim(), _modified: Date.now() });
        }
        setIsActionLoading(false);
        setActiveModal(null);
    };

    return (
        <main className="flex-1 max-w-md w-full mx-auto px-4 pb-24">
            <header className="sticky top-0 z-10 bg-background-light/80 backdrop-blur-md py-4 -mx-4 px-4 flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="material-symbols-outlined text-slate-900 cursor-pointer hover:bg-slate-900/5 rounded-full p-1 transition-colors">arrow_back</button>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Expense Profiles</h1>
                </div>
                <button
                    onClick={() => setIsAddingProfile(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors shadow-sm"
                >
                    <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
            </header>

            <section className="my-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 px-1">Overview</h2>
                <div className="bg-white rounded-xl p-5 shadow-sm flex justify-between items-center">
                    <div>
                        <p className="text-xs text-slate-500">Total Monthly Spend</p>
                        <p className="text-2xl font-extrabold text-slate-900">${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="h-12 w-12 bg-slate-900/5 rounded-full flex items-center justify-center text-slate-900">
                        <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                    </div>
                </div>
            </section>

            <div className="flex flex-col">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 px-1">Your Profiles</h2>

                <AnimatePresence initial={false}>
                    {isAddingProfile && (
                        <motion.div
                            layout
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.4 }}
                            onAnimationComplete={() => {
                                if (isAddingProfile) {
                                    inputRef.current?.focus();
                                }
                            }}
                            className="overflow-hidden"
                        >
                            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 mb-6 border-none">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-900">
                                        <span className="material-symbols-outlined text-xl">person_add</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 leading-none">Create Profile</h3>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Personalize your tracking</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label htmlFor="profileName" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Profile Name</label>
                                        <input
                                            ref={inputRef}
                                            id="profileName"
                                            type="text"
                                            value={newProfileName}
                                            onChange={(e) => setNewProfileName(e.target.value)}
                                            placeholder="e.g. Vacation, Office, Family"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddProfile();
                                                if (e.key === 'Escape') setIsAddingProfile(false);
                                            }}
                                            className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-900 transition-colors font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-semibold"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleAddProfile}
                                            className="flex-[2] bg-slate-900 text-white hover:bg-slate-800 py-3 rounded-xl text-sm font-bold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                            Add Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAddingProfile(false);
                                                setNewProfileName("");
                                            }}
                                            className="flex-1 bg-slate-50 text-slate-600 hover:bg-slate-100 py-3 rounded-xl text-sm font-bold active:scale-[0.98] transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {profiles.map(profile => (
                    <motion.div
                        layout
                        key={profile.id}
                        initial={false}
                        transition={{ ease: [0.32, 0.72, 0, 1], duration: 0.4 }}
                        className="mb-4"
                    >
                        <div
                            onClick={() => handleProfileSelect(profile.id)}
                            className={clsx(
                                "bg-white rounded-xl overflow-hidden shadow-sm cursor-pointer group relative"
                            )}
                        >
                            <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop')` }}>
                                {activeProfileId === profile.id && (
                                    <div className="absolute top-4 right-4 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm z-10">
                                        Active
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="min-w-0 pr-6">
                                        <h3 className="font-bold text-lg truncate text-slate-900">{profile.name}</h3>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsMenuOpen(isMenuOpen === profile.id ? null : profile.id);
                                            }}
                                            className="material-symbols-outlined text-slate-500 hover:text-slate-900 transition-colors p-1"
                                        >
                                            more_vert
                                        </button>
                                        <AnimatePresence>
                                            {isMenuOpen === profile.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(4px)' }}
                                                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(4px)' }}
                                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                                    className="absolute right-0 bottom-full mb-2 w-32 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 z-20 py-1.5 overflow-hidden ring-1 ring-slate-900/5 text-slate-800"
                                                >
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setModalInput(profile.name);
                                                            setActiveModal({ type: 'rename', profileId: profile.id, profileName: profile.name });
                                                            setIsMenuOpen(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span> Rename
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (profiles.length <= 1) {
                                                                setActiveModal({ type: 'warning' });
                                                            } else {
                                                                setActiveModal({ type: 'delete', profileId: profile.id, profileName: profile.name });
                                                            }
                                                            setIsMenuOpen(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span> Delete
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-500">Monthly Spend</p>
                                        <p className="text-lg font-bold text-slate-900">${(profileSpendMap[profile.id] || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <button className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm active:scale-95">
                                        Select
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Rename Modal */}
            <ActionModal
                isOpen={activeModal?.type === 'rename'}
                onClose={() => setActiveModal(null)}
                title="Rename Profile"
                description={`Enter a new name for "${activeModal?.profileName}"`}
                confirmLabel="Rename"
                confirmVariant="slate"
                onConfirm={confirmRenameProfile}
                isConfirmLoading={isActionLoading}
            >
                <div className="mt-4">
                    <input
                        autoFocus
                        type="text"
                        value={modalInput}
                        onChange={(e) => setModalInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && confirmRenameProfile()}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-900 transition-colors font-bold text-slate-900"
                    />
                </div>
            </ActionModal>

            {/* Delete Confirmation Modal */}
            <ActionModal
                isOpen={activeModal?.type === 'delete'}
                onClose={() => setActiveModal(null)}
                title="Delete Profile?"
                description={`Are you sure you want to delete "${activeModal?.profileName}"? This action cannot be undone.`}
                confirmLabel="Delete"
                confirmVariant="danger"
                onConfirm={confirmDeleteProfile}
                isConfirmLoading={isActionLoading}
            />

            {/* Delete Warning Modal (Last Profile) */}
            <ActionModal
                isOpen={activeModal?.type === 'warning'}
                onClose={() => setActiveModal(null)}
                title="Cannot Delete"
                description="You must have at least one profile. Create a new one before deleting this one."
                confirmLabel="Got it"
                confirmVariant="slate"
                onConfirm={() => setActiveModal(null)}
            />
        </main>
    );
}
