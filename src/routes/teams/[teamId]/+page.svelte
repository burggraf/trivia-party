<script lang="ts">
  import { page } from "$app/stores";
  import PageTemplate from "$lib/components/PageTemplate.svelte";
  import type { Team } from "$lib/services/teamService.svelte.ts";
  import { upsertTeam, getTeamById } from "$lib/services/teamService.svelte.ts";
  import { getCurrentOrg } from "$lib/services/backend.svelte.ts";
  import { ArrowLeft, Check } from "lucide-svelte"; 
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { goto, invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";

  const teamRouteId = $derived($page.params.teamId);
  const isNew = $derived(teamRouteId === "new");

  const currentOrg = $derived(getCurrentOrg());
  const currentUserIsAdminOrManager = $derived(
    currentOrg?.user_role === "Admin" || currentOrg?.user_role === "Manager",
  );

  let team: Partial<Team> = $state({});
  let pageTitle = $state("");

  let loading = $state(false);
  let error = $state<string | null>(null);
  let unauthorized = $state(false);

  const showPageActions = $derived(
    currentUserIsAdminOrManager && !unauthorized,
  );

  async function initializePage() {
    if (!currentUserIsAdminOrManager && currentOrg) {
      error = "You are not authorized to manage teams.";
      unauthorized = true;
      loading = false;
      return;
    }
    unauthorized = false; 

    loading = true;
    error = null;

    if (isNew) {
      pageTitle = "New Team";
      team = { team_name: "" }; 
      loading = false;
    } else {
      pageTitle = "Edit Team";
      const { data, error: fetchError } = await getTeamById(teamRouteId);
      if (fetchError) {
        error = fetchError.message;
        toast.error("Error loading team", { description: error });
      } else if (data) {
        team = data;
      } else {
        error = "Team not found.";
        toast.error("Error", { description: error });
      }
      loading = false;
    }
  }

  $effect(() => {
    initializePage();
  });

  async function handleSave() {
    if (unauthorized) {
      toast.error("Unauthorized", { description: "You cannot save changes." });
      return;
    }

    if (!team.team_name?.trim()) {
      toast.error("Validation Error", {
        description: "Team name cannot be empty.",
      });
      return;
    }

    loading = true;
    error = null;

    const { data: savedData, error: saveError } = await upsertTeam(team);

    loading = false;

    if (saveError) {
      error = saveError.message;
      toast.error("Save Failed", { description: error });
    } else {
      toast.success("Success", {
        description: `Team ${isNew ? "created" : "updated"} successfully.`,
      });
      await invalidateAll();
      goto("/teams");
    }
  }

  const actionItems = $derived([
    {
      icon: ArrowLeft,
      label: "Back to Teams",
      href: "/teams",
      show: showPageActions,
    },
  ]);
</script>

<PageTemplate {actionItems}>
  {#snippet TopLeft()}
    {#if showPageActions}
      <Button
        variant="ghost"
        size="icon"
        title="Back to Teams"
        onclick={() => goto("/teams")}
      >
        <ArrowLeft class="h-4 w-4" />
      </Button>
    {/if}
  {/snippet}

  {#snippet TopCenter()}
    {unauthorized ? "Unauthorized" : pageTitle}
  {/snippet}

  {#snippet Middle()}
    {#if loading}
      <div class="flex items-center justify-center h-full">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        ></div>
      </div>
    {:else if unauthorized || error}
      <div class="flex items-center justify-center h-full text-destructive p-4">
        <p>{error || "You do not have permission to view this page."}</p>
      </div>
    {:else}
      <div class="w-full flex justify-center p-4 md:p-6">
        <div class="max-w-md w-full space-y-6">
          <div>
            <Label for="teamName">Team Name</Label>
            <Input
              id="teamName"
              type="text"
              placeholder="Enter team name"
              bind:value={team.team_name}
              disabled={unauthorized || loading} 
            />
          </div>

          {#if showPageActions}
            <Button 
              onclick={handleSave} 
              disabled={loading} 
              class="w-full {loading ? 'opacity-50 cursor-not-allowed' : ''}"
            >
              {#if loading}
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              {:else}
                {isNew ? "Create Team" : "Save Changes"}
              {/if}
            </Button>
          {/if}
          
          {#if !isNew && team.created_at}
            <div class="text-sm text-muted-foreground mt-4">
              <p>Team ID: {team.id}</p>
              <p>Created: {new Date(team.created_at).toLocaleDateString()}</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/snippet}
</PageTemplate>
