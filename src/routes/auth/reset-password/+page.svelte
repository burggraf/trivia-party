<script lang="ts">
  import { goto } from "$app/navigation";
  import { t } from "$lib/i18n/index.svelte.ts";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { page } from "$app/stores";
  import { updateUser } from "$lib/services/backend.svelte";
  import { toast } from "svelte-sonner";

  let newPassword = $state("");
  let confirmPassword = $state("");
  let error = $state<string | null>(null);
  let loading = $state(false);
  let token = $derived($page.url.searchParams.get("token"));

  async function handleResetPassword() {
    if (newPassword !== confirmPassword) {
      error = $t("resetPassword.passwordMismatch");
      return;
    }

    loading = true;
    error = null;

    try {
      const { error: resetError } = await updateUser({
        password: newPassword,
      });

      if (resetError) {
        // error = resetError?.valueOf() || resetError?.toString();
        toast.error("ERROR", {
          description: resetError?.toString(),
        });
      } else {
        // Password reset successful
        toast.success("SUCCESS", {
          description: $t("resetPassword.successMessage"),
        });
        goto("/dashboard");
      }
    } catch (e) {
      console.error("Password reset error:", e);
      toast.error("ERROR", {
        description: $t("resetPassword.unexpectedError"),
      });
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t("resetPassword.pageTitle")}</title>
</svelte:head>

<div class="container mx-auto max-w-sm mt-10">
  <h1 class="text-2xl font-bold mb-4">{$t("resetPassword.title")}</h1>
  <form
    onsubmit={(e) => {
      e.preventDefault();
      handleResetPassword();
    }}
    class="space-y-4"
  >
    <div>
      <Label for="new-password">{$t("resetPassword.newPassword")}</Label>
      <Input
        type="password"
        id="new-password"
        bind:value={newPassword}
        required
      />
    </div>
    <div>
      <Label for="confirm-password">{$t("resetPassword.confirmPassword")}</Label
      >
      <Input
        type="password"
        id="confirm-password"
        bind:value={confirmPassword}
        required
      />
    </div>
    {#if error}
      <p class="text-red-500">{error}</p>
    {/if}
    <Button type="submit" class="w-full" disabled={loading}>
      {loading
        ? $t("resetPassword.resetting")
        : $t("resetPassword.resetButton")}
    </Button>
  </form>
</div>
