import { useAppStore } from "@/store/appStore";
import { translations, TranslationKey } from "@/i18n/translations";

export function useI18n() {
    const { language } = useAppStore();

    const t = (key: TranslationKey): string => {
        const langTranslations = translations[language as keyof typeof translations] || translations['English'];
        return langTranslations[key] || translations['English'][key] || key;
    };

    return { t, language };
}
