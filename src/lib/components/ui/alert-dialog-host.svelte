<script lang="ts">
  import { alertManager } from "$lib/services/alertManager.svelte";
  import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
  } from "$lib/components/ui/alert-dialog";
  import { onDestroy } from "svelte";
  import type { AlertState } from "$lib/services/alertManager.svelte";

  import { writable } from "svelte/store";

  let alertState: AlertState | null = null;
  let open = false;

  const unsubscribe = alertManager.subscribe((state) => {
    alertState = state;
    open = !!(state && state.open);
    console.log("alertManager subscription:", { alertState, open });
  });

  onDestroy(unsubscribe);

  $: if (!alertState) open = false;

  function handleButtonClick(value: string) {
    console.log("handleButtonClick", value);
    alertManager.close(value);
    open = false;
  }
</script>

<AlertDialog bind:open>
  {#if alertState}
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{alertState.title}</AlertDialogTitle>
        <AlertDialogDescription>{alertState.message}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        {#if alertState.buttons}
          {#each alertState.buttons as btn (btn.value)}
            {#if btn.variant === "destructive"}
              <AlertDialogAction
                class="bg-destructive text-destructive-foreground"
                asChild
              >
                <button
                  type="button"
                  on:click={() => handleButtonClick(btn.value)}
                >
                  {btn.label}
                </button>
              </AlertDialogAction>
            {:else if btn.variant === "outline"}
              <AlertDialogCancel class="border" asChild>
                <button
                  type="button"
                  on:click={() => handleButtonClick(btn.value)}
                >
                  {btn.label}
                </button>
              </AlertDialogCancel>
            {:else}
              <button
                type="button"
                class="btn"
                on:click={() => handleButtonClick(btn.value)}
              >
                {btn.label}
              </button>
            {/if}
          {/each}
        {:else}
          <AlertDialogAction asChild>
            <button type="button" on:click={() => handleButtonClick("ok")}>
              OK
            </button>
          </AlertDialogAction>
        {/if}
      </AlertDialogFooter>
    </AlertDialogContent>
  {/if}
</AlertDialog>
