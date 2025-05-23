<script lang="ts">
  import { page } from "$app/stores";
  import PageTemplate from "$lib/components/PageTemplate.svelte";
  import type { Party } from "$lib/services/partyService.svelte.ts";
  import {
    upsertParty,
    getPartyById,
  } from "$lib/services/partyService.svelte.ts";
  import {
    getTeams,
    upsertTeam,
    deleteTeam,
    type Team,
  } from "$lib/services/teamService.svelte.ts";
  import { getCurrentOrg } from "$lib/services/backend.svelte.ts";
  import { ArrowLeft, Trash2, Edit, PlusCircle } from "lucide-svelte";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import Textarea from "$lib/components/ui/textarea/textarea.svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import * as Tabs from "$lib/components/ui/tabs";
  import { alertManager } from "$lib/services/alertManager.svelte";

  const partyRouteId = $derived($page.params.partyId);
  const isNew = $derived(partyRouteId === "new");

  const currentOrg = $derived(getCurrentOrg());
  const currentUserIsAdminOrManager = $derived(
    currentOrg?.user_role === "Admin" || currentOrg?.user_role === "Manager",
  );

  let party: Partial<Party> = $state({});
  let pageTitle = $state("");

  let loading = $state(false);
  let error = $state<string | null>(null);
  let unauthorized = $state(false);

  let startTimeForInput = $state("");
  let endTimeForInput = $state("");

  // Team Management State
  let teams: Team[] = $state([]);
  let loadingTeams = $state(false);
  let newTeamName = $state("");
  let editingTeamId: string | null = $state(null);
  let editingTeamName = $state("");

  // Sync party.starttime/endtime with input fields
  $effect(() => {
    if (party.starttime) {
      startTimeForInput = new Date(
        new Date(party.starttime).getTime() -
          new Date(party.starttime).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
    } else {
      startTimeForInput = ""; // Reset if party.starttime is cleared
    }
  });

  $effect(() => {
    if (party.endtime) {
      endTimeForInput = new Date(
        new Date(party.endtime).getTime() -
          new Date(party.endtime).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);
    } else {
      endTimeForInput = ""; // Reset if party.endtime is cleared
    }
  });

  // Sync input fields back to party.starttime/endtime
  $effect(() => {
    party.starttime = startTimeForInput
      ? new Date(startTimeForInput).toISOString()
      : undefined;
  });

  $effect(() => {
    party.endtime = endTimeForInput
      ? new Date(endTimeForInput).toISOString()
      : undefined;
  });

  // Ensure notes and teamsize are initialized
  $effect(() => {
    if (party && party.notes === undefined) {
      party.notes = null; // Ensure undefined becomes null
    }
    if (party && party.teamsize === undefined) {
      party.teamsize = null;
    }
  });

  const showPageActions = $derived(
    currentUserIsAdminOrManager && !unauthorized,
  );

  async function fetchTeams() {
    if (isNew || !party.id) return;
    loadingTeams = true;
    const { data, error: fetchError } = await getTeams(party.id);
    if (fetchError) {
      toast.error("Error loading teams", { description: fetchError.message });
      teams = [];
    } else if (data) {
      teams = data;
    }
    loadingTeams = false;
  }

  async function initializePage() {
    // Initial broad authorization check based on user role in their current organization
    if (!currentUserIsAdminOrManager && currentOrg) {
      error = "You are not authorized to manage parties in this organization.";
      unauthorized = true;
      loading = false;
      return;
    }
    // Tentatively set authorized for general party management in the org;
    // will verify for specific party if editing an existing one.
    unauthorized = false;

    loading = true;
    error = null;

    if (isNew) {
      pageTitle = "New Party";
      // Initialize with default values
      party = { title: "", location: "", notes: null, teamsize: null };
      startTimeForInput = ""; // Clear input fields for new party
      endTimeForInput = ""; // Clear input fields for new party
      teams = []; // No teams for a new party initially
      loading = false;
    } else {
      pageTitle = "Edit Party";
      const { data: fetchedPartyData, error: fetchError } =
        await getPartyById(partyRouteId);

      if (fetchError) {
        error = fetchError.message;
        toast.error("Error loading party", { description: error });
        unauthorized = true; // Can't load party, assume unauthorized
      } else if (fetchedPartyData) {
        party = fetchedPartyData;

        // CRITICAL CHECK: Verify party ownership against current organization
        if (currentOrg && party.orgid !== currentOrg.id) {
          error =
            "Access Denied: This party does not belong to your current organization.";
          unauthorized = true; // Mark as unauthorized for THIS specific party
          toast.error("Access Denied", { description: error });
        } else if (!currentOrg && party.orgid) {
          // This case implies user has no currentOrg but party has an orgid.
          // Should ideally be caught by backend.svelte.ts, but as a safeguard:
          error = "Authorization error: Organization context mismatch.";
          unauthorized = true;
          toast.error("Authorization Error", { description: error });
        } else {
          // User is authorized for this party (either org matches, or org context isn't strictly enforced for this user, e.g. superadmin)
          // unauthorized remains false from the earlier check.
          await fetchTeams(); // Fetch teams only if authorized for this party
        }
      } else {
        error = "Party not found.";
        toast.error("Error", { description: error });
        unauthorized = true; // Party not found, assume unauthorized
      }
      loading = false;
    }
  }

  $effect(() => {
    initializePage();
  });

  async function handleSaveParty(event: Event) {
    event.preventDefault(); // Manual preventDefault for onsubmit
    if (unauthorized) {
      toast.error("Unauthorized", { description: "You cannot save changes." });
      return;
    }

    if (!party.title?.trim()) {
      toast.error("Validation Error", {
        description: "Party title cannot be empty.",
      });
      return;
    }

    loading = true;
    error = null;

    const { data: savedData, error: saveError } = await upsertParty(party);

    loading = false;

    if (saveError) {
      error = saveError.message;
      toast.error("Save Failed", { description: error });
    } else {
      toast.success("Success", {
        description: `Party ${isNew ? "created" : "updated"} successfully.`,
      });
      if (isNew && savedData?.id) {
        // If new party was created, go to its edit page with tabs
        goto(`/parties/${savedData.id}`, { invalidateAll: true });
      } else {
        await invalidateAll();
        // Potentially refresh teams if party details might affect them, though not directly here.
      }
    }
  }

  async function handleAddTeam(event: Event) {
    event.preventDefault(); // Manual preventDefault for onsubmit
    if (!newTeamName.trim() || !party.id) {
      toast.error("Cannot add team", {
        description: "Team name cannot be empty.",
      });
      return;
    }
    loadingTeams = true;
    // Ensure party.id is passed, as it's required by teamService
    const { data, error: saveError } = await upsertTeam({
      team_name: newTeamName,
      partyid: party.id,
    });
    if (saveError) {
      toast.error("Failed to add team", { description: saveError.message });
    } else {
      toast.success("Team added successfully");
      newTeamName = "";
      await fetchTeams(); // Refresh team list
    }
    loadingTeams = false;
  }

  function startEditTeam(team: Team) {
    if (unauthorized) return;
    editingTeamId = team.id;
    editingTeamName = team.team_name || "";
  }

  async function handleUpdateTeam() {
    if (!editingTeamId || !editingTeamName.trim() || !party.id) {
      toast.error("Cannot update team", {
        description: "Team name cannot be empty or invalid ID.",
      });
      return;
    }
    loadingTeams = true;
    // Ensure party.id is passed
    const { error: saveError } = await upsertTeam({
      id: editingTeamId,
      team_name: editingTeamName,
      partyid: party.id,
    });
    if (saveError) {
      toast.error("Failed to update team", { description: saveError.message });
    } else {
      toast.success("Team updated successfully");
      editingTeamId = null;
      editingTeamName = "";
      await fetchTeams(); // Refresh team list
    }
    loadingTeams = false;
  }

  async function handleDeleteTeam(teamId: string) {
    if (unauthorized) return;

    loadingTeams = true;
    const { error: deleteError } = await deleteTeam(teamId);
    if (deleteError) {
      toast.error("Error deleting team", {
        description: deleteError.message,
      });
    } else {
      toast.success("Team deleted successfully");
      await fetchTeams(); // Refresh team list
    }
    loadingTeams = false;
  }

  const actionItems = $derived([
    {
      icon: ArrowLeft,
      label: "Back to Parties",
      href: "/parties",
      show: true, // Always show back button, authorization handled by page content
    },
  ]);

  let activeTab = $state("details");

  $effect(() => {
    // When switching to teams tab and teams haven't been loaded for an existing party
    if (
      activeTab === "teams" &&
      !isNew &&
      party.id &&
      teams.length === 0 &&
      !loadingTeams
    ) {
      fetchTeams();
    }
  });
</script>

<PageTemplate {actionItems}>
  {#snippet TopLeft()}
    <Button
      variant="ghost"
      size="icon"
      title="Back to Parties"
      onclick={() => goto("/parties")}
    >
      <ArrowLeft class="h-4 w-4" />
    </Button>
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
      <Tabs.Root bind:value={activeTab} class="w-full p-4 md:p-6">
        <Tabs.List class="grid w-full grid-cols-2">
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="teams" disabled={isNew}>Teams</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="details">
          <div class="w-full flex justify-center pt-6">
            <form onsubmit={handleSaveParty} class="max-w-md w-full space-y-6">
              <div>
                <Label for="partyName">Party Name</Label>
                <Input
                  id="partyName"
                  type="text"
                  placeholder="Enter party title"
                  bind:value={party.title}
                  disabled={unauthorized || loading}
                  required
                />
              </div>

              <div>
                <Label for="partyStartTime">Start Time (Optional)</Label>
                <Input
                  id="partyStartTime"
                  type="datetime-local"
                  bind:value={startTimeForInput}
                  disabled={unauthorized || loading}
                />
              </div>

              <div>
                <Label for="partyEndTime">End Time (Optional)</Label>
                <Input
                  id="partyEndTime"
                  type="datetime-local"
                  bind:value={endTimeForInput}
                  disabled={unauthorized || loading}
                />
              </div>

              <div>
                <Label for="partyLocation">Location (Optional)</Label>
                <Input
                  id="partyLocation"
                  type="text"
                  placeholder="Enter location (e.g., conference room, Zoom link)"
                  bind:value={party.location}
                  disabled={unauthorized || loading}
                />
              </div>

              <div>
                <Label for="partyTeamSize">Max Team Size (Optional)</Label>
                <Input
                  id="partyTeamSize"
                  type="number"
                  placeholder="e.g., 5"
                  bind:value={party.teamsize}
                  min="1"
                  disabled={unauthorized || loading}
                />
              </div>

              <div>
                <Label for="partyNotes">Notes (Optional)</Label>
                <Textarea
                  id="partyNotes"
                  placeholder="Any additional notes for the party..."
                  bind:value={party.notes}
                  disabled={unauthorized || loading}
                />
              </div>

              {#if showPageActions}
                <Button
                  type="submit"
                  class="w-full"
                  disabled={loading || unauthorized}
                >
                  {#if loading}Saving...{:else}Save Party{/if}
                </Button>
              {/if}
            </form>
          </div>
        </Tabs.Content>

        <Tabs.Content value="teams">
          {#if isNew}
            <p class="text-muted-foreground pt-6 text-center">
              Save the party details first to manage teams.
            </p>
          {:else}
            <div class="pt-6 space-y-4">
              <h3 class="text-lg font-semibold">Manage Teams</h3>
              {#if loadingTeams}
                <p>Loading teams...</p>
              {:else}
                <form onsubmit={handleAddTeam} class="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="New team name"
                    bind:value={newTeamName}
                    disabled={loadingTeams || unauthorized}
                    required
                  />
                  <Button
                    type="submit"
                    disabled={loadingTeams || unauthorized}
                    size="icon"
                    title="Add Team"
                  >
                    <PlusCircle class="h-5 w-5" />
                  </Button>
                </form>

                {#if teams.length === 0}
                  <p class="text-muted-foreground text-center py-4">
                    No teams added yet.
                  </p>
                {:else}
                  <ul class="space-y-2">
                    {#each teams as team (team.id)}
                      <li
                        class="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                      >
                        {#if editingTeamId === team.id}
                          <Input
                            type="text"
                            bind:value={editingTeamName}
                            class="flex-grow mr-2"
                            disabled={loadingTeams || unauthorized}
                            onkeydown={(e: KeyboardEvent) => {
                              if (e.key === "Enter") handleUpdateTeam();
                            }}
                          />
                          <Button
                            onclick={handleUpdateTeam}
                            disabled={loadingTeams || unauthorized}
                            variant="outline"
                            size="sm">Save</Button
                          >
                          <Button
                            onclick={() => (editingTeamId = null)}
                            disabled={loadingTeams || unauthorized}
                            variant="ghost"
                            size="sm">Cancel</Button
                          >
                        {:else}
                          <span class="flex-grow">{team.team_name}</span>
                          <div class="flex items-center gap-1">
                            <Button
                              onclick={() => startEditTeam(team)}
                              variant="ghost"
                              size="icon"
                              title="Edit Team Name"
                              disabled={unauthorized}
                            >
                              <Edit class="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Team"
                              class="text-destructive hover:text-destructive-foreground hover:bg-destructive/80"
                              disabled={unauthorized}
                              onclick={async () => {
                                const result = await alertManager.show({
                                  title: "Confirm Delete Team",
                                  message: `Are you sure you want to delete team "${team.team_name || 'Unnamed Team'}"? This action cannot be undone.`,
                                  buttons: [
                                    { label: "Cancel", value: "cancel", variant: "outline" },
                                    { label: "Delete", value: "delete", variant: "destructive" },
                                  ],
                                });
                                if (result === "delete") {
                                  if (team.id) {
                                    await handleDeleteTeam(team.id);
                                  } else {
                                    toast.error("Cannot delete team: Team ID is missing.");
                                    console.error("Delete failed: team.id is missing", team);
                                  }
                                }
                              }}
                            >
                              <Trash2 class="h-4 w-4" />
                            </Button>
                          </div>
                        {/if}
                      </li>
                    {/each}
                  </ul>
                {/if}
              {/if}
            </div>
          {/if}
        </Tabs.Content>
      </Tabs.Root>
    {/if}
  {/snippet}
</PageTemplate>
