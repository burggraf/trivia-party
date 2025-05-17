import { writable } from "svelte/store";

interface AlertOptions {
    title?: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    timeout?: number;
}

interface Alert extends AlertOptions {
    id: string;
}

function createAlertManager() {
    const alerts = writable<Alert[]>([]);

    function show(options: AlertOptions) {
        const id = crypto.randomUUID();
        const alert: Alert = {
            id,
            title: options.title || "",
            message: options.message,
            type: options.type || "info",
            timeout: options.timeout || 5000,
        };

        alerts.update((all) => [...all, alert]);

        if (alert.timeout) {
            setTimeout(() => {
                dismiss(id);
            }, alert.timeout);
        }

        return id;
    }

    function dismiss(id: string) {
        alerts.update((all) => all.filter((alert) => alert.id !== id));
    }

    function clear() {
        alerts.set([]);
    }

    return {
        subscribe: alerts.subscribe,
        show,
        dismiss,
        clear,
    };
}

export const alertManager = createAlertManager();
