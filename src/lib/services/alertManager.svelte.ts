// src/lib/services/alertManager.svelte.ts
import { writable } from "svelte/store";

export interface AlertButton {
    label: string;
    value: string;
    variant?: "default" | "outline" | "destructive";
}

export interface AlertOptions {
    title: string;
    message: string;
    buttons?: AlertButton[];
}

export interface AlertState extends AlertOptions {
    open: boolean;
    resolve?: (value: string | undefined) => void;
}

function createAlertManager() {
    const { subscribe, set, update } = writable<AlertState | null>(null);

    async function show(options: AlertOptions): Promise<string | undefined> {
        return new Promise((resolve) => {
            set({
                ...options,
                open: true,
                resolve,
            });
        });
    }

    function close(result?: string) {
        update((state) => {
            if (state && state.resolve) state.resolve(result);
            return null;
        });
    }

    return {
        subscribe,
        show,
        close,
    };
}

export const alertManager = createAlertManager();
