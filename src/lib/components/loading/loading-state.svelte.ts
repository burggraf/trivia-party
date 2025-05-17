import { writable } from "svelte/store";

interface LoadingState {
    isLoading: boolean;
    message: string;
    context?: string;
}

function createLoadingState() {
    const initialState: LoadingState = {
        isLoading: false,
        message: "",
        context: undefined,
    };

    const store = writable<LoadingState>(initialState);

    function startLoading(message = "Loading...", context?: string) {
        store.update(() => ({
            isLoading: true,
            message,
            context,
        }));
    }

    function stopLoading() {
        store.update((state) => ({
            ...state,
            isLoading: false,
        }));
    }

    function updateMessage(message: string) {
        store.update((state) => ({
            ...state,
            message,
        }));
    }

    return {
        subscribe: store.subscribe,
        startLoading,
        stopLoading,
        updateMessage,
    };
}

export const loadingState = createLoadingState();
