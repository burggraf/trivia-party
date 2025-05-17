<script lang="ts">
  import "../app.css";
  import { ModeWatcher } from "mode-watcher";
  import { SafeArea } from "@capacitor-community/safe-area";
  import { setLocale } from "$lib/i18n/index.svelte.ts";
  import { initializeUser } from "$lib/services/backend.svelte";
  // import Alert from "$lib/components/ui/alert/alert.svelte";
  import Loading from "$lib/components/loading/loading.svelte";
  import AlertDialogHost from "$lib/components/ui/alert-dialog-host.svelte";

  let { children } = $props();

  $effect(() => {
    initializeUser();
    SafeArea.enable({
      config: {
        customColorsForSystemBars: true,
        statusBarColor: "#00000000", // transparent
        statusBarContent: "light",
        navigationBarColor: "#00000000", // transparent
        navigationBarContent: "light",
      },
    });
    // Try to get the locale from localStorage
    const storedLocale = localStorage.getItem("locale");
    if (storedLocale) {
      setLocale(storedLocale);
    }
  });
</script>

{@render children()}
<ModeWatcher />
<Loading />
<AlertDialogHost />
<!--
<Alert />
<div
  class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none w-full max-w-md flex justify-center items-center"
></div>
-->
