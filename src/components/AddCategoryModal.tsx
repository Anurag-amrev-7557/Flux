"use client";

import { useState } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useDatabase } from "@/db/DatabaseProvider";
import { v4 as uuidv4 } from "uuid";
import { useAppStore } from "@/store/appStore";
import { useI18n } from "@/hooks/useI18n";

interface AddCategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    profileId: string;
}

const CATEGORY_ICONS = [
    // Food & Drink
    "restaurant", "coffee", "emoji_food_beverage", "local_bar", "bakery_dining", "icecream", "fastfood", "local_pizza", "liquor",
    // Shopping
    "shopping_bag", "shopping_cart", "storefront", "local_mall", "sell", "redeem", "inventory_2",
    // Transportation
    "directions_car", "directions_bus", "directions_railway", "directions_bike", "flight", "local_taxi", "pedal_bike", "local_gas_station",
    // Housing & Utilities
    "home", "potted_plant", "home_repair_service", "electrical_services", "plumbing", "water_drop", "bolt", "wifi", "garage", "cleaning_services",
    // Entertainment & Leisure
    "movie", "theater_comedy", "music_note", "videogame_asset", "sports_esports", "casino", "extension", "event_seat", "tv",
    // Health & Personal Care
    "medical_services", "vaccines", "health_and_safety", "fitness_center", "self_improvement", "spa", "content_cut", "face_6", "medication",
    // Finance
    "payments", "account_balance", "account_balance_wallet", "credit_card", "monetization_on", "savings", "attach_money", "receipt_long",
    // Work & Education
    "work", "school", "menu_book", "edit_note", "laptop_mac", "print", "business_center", "group", "campaign",
    // Pets
    "pets",
    // Travel & Outdoors
    "hiking", "terrain", "explore", "beach_access", "hotel", "map", "local_see",
    // Gifts & Celebration
    "celebration", "cake", "card_giftcard", "auto_awesome", "volunteer_activism",
    // Misc
    "more_horiz", "public", "category", "build", "settings", "vpn_key", "lock", "notifications", "history_edu"
];

export default function AddCategoryModal({ isOpen, onClose, profileId }: AddCategoryModalProps) {
    const db = useDatabase();
    const { t } = useI18n();
    const dragControls = useDragControls();
    const [name, setName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState(CATEGORY_ICONS[0]);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await db.categories.insert({
                id: uuidv4(),
                profile_id: profileId,
                name: name.trim(),
                icon: selectedIcon,
                _deleted: false,
                _modified: Date.now()
            });
            setName("");
            onClose();
        } catch (error) {
            console.error("Failed to add category", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="add-category-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] pointer-events-auto"
                    />

                    {/* Modal Content container */}
                    <div key="add-category-modal-container" className="fixed inset-0 z-[200] flex items-end justify-center pointer-events-none">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-md rounded-t-[32px] shadow-2xl overflow-hidden pointer-events-auto border-t border-slate-100 pb-safe origin-bottom max-h-[92vh] flex flex-col relative z-[210]"
                            drag="y"
                            dragControls={dragControls}
                            dragListener={false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.8 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 100 || info.velocity.y > 500) {
                                    onClose();
                                }
                            }}
                        >
                            {/* Modal Header */}
                            <header
                                className="px-6 py-6 flex flex-col items-center sticky top-0 bg-white z-20 touch-none cursor-grab active:cursor-grabbing"
                            >
                                <div className="w-full flex items-center justify-center relative">
                                    <h2 className="text-xl font-black text-slate-800">{t('new_category')}</h2>
                                </div>
                            </header>

                            <div className="flex-1 overflow-y-auto px-6 pb-10 pt-0">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 px-1">{t('category_name')}</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('vacation_placeholder')}
                                            className="w-full mt-2 h-12 px-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-600 px-1">{t('select_icon')}</label>
                                        <div className="grid grid-cols-5 gap-3 max-h-64 overflow-y-auto p-1 custom-scrollbar mt-4">
                                            {CATEGORY_ICONS.map((icon) => (
                                                <button
                                                    key={icon}
                                                    type="button"
                                                    onClick={() => setSelectedIcon(icon)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selectedIcon === icon
                                                        ? "bg-primary text-white shadow-md scale-110"
                                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        disabled={!name.trim() || isSaving}
                                        className="w-full bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-4 rounded-full shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">add</span>
                                                {t('create_category')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
