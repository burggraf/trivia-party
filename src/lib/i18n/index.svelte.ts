import en from "./en";
import es from "./es";

// Define your translations
const translations: any = { en, es };

type TranslationFunction = (
    key: string,
    params?: Record<string, any>,
) => string;

class I18nService {
    #subscribers = new Set<(fn: TranslationFunction) => void>();
    #localeSubscribers = new Set<(value: string) => void>();
    #locale: string;

    constructor() {
        this.#locale = this.getInitialLocale();
    }

    // Translation function
    translate(key: string, params?: Record<string, any>): string {
        const keys = key.split(".");
        let value = translations[this.#locale];
        for (const k of keys) {
            value = value[k];
            if (!value) break;
        }

        if (typeof value === "string" && params) {
            return Object.entries(params).reduce((acc, [k, v]) => {
                return acc.replace(new RegExp(`{${k}}`, "g"), v.toString());
            }, value);
        }

        return value || key;
    }

    private getInitialLocale(): string {
        if (typeof window !== "undefined") {
            const storedLocale = localStorage.getItem("locale");
            if (
                storedLocale && (storedLocale === "en" || storedLocale === "es")
            ) {
                return storedLocale;
            }
        }
        return "en";
    }

    setLocale(newLocale: string) {
        if (newLocale === "en" || newLocale === "es") {
            this.#locale = newLocale;
            if (typeof window !== "undefined") {
                localStorage.setItem("locale", newLocale);
            }
            this.#notify();
            this.#notifyLocaleSubscribers();
        } else {
            console.error(
                'Invalid locale. Supported locales are "en" and "es".',
            );
        }
    }

    getLocale(): string {
        return this.#locale;
    }

    #notify() {
        const translationFn = (key: string, params?: Record<string, any>) =>
            this.translate(key, params);
        this.#subscribers.forEach((fn) => fn(translationFn));
    }

    #notifyLocaleSubscribers() {
        this.#localeSubscribers.forEach((fn) => fn(this.#locale));
    }

    subscribe(fn: (translationFn: TranslationFunction) => void) {
        this.#subscribers.add(fn);
        // Call immediately with current translator
        fn((key: string, params?: Record<string, any>) =>
            this.translate(key, params)
        );

        return () => {
            this.#subscribers.delete(fn);
        };
    }

    subscribeToLocale(fn: (value: string) => void) {
        this.#localeSubscribers.add(fn);
        // Call immediately with current locale
        fn(this.#locale);

        return () => {
            this.#localeSubscribers.delete(fn);
        };
    }
}

// Create a singleton instance
const i18n = new I18nService();

// Export a store-compatible interface for translations
export const t = {
    subscribe: (fn: (val: TranslationFunction) => void) => i18n.subscribe(fn),
};

// Export a store-compatible interface for locale
export const locale = {
    subscribe: (fn: (value: string) => void) => i18n.subscribeToLocale(fn),
};

// Export other functions
export const setLocale = (locale: string) => i18n.setLocale(locale);
export const getLocale = () => i18n.getLocale();
