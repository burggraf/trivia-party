<script lang="ts">
  import PageTemplate from "$lib/components/PageTemplate.svelte";
  import { Plus, Search, Edit, Trash2 } from "lucide-svelte";
  import type { Team } from "$lib/services/teamService.svelte.ts";
  import { getTeams, deleteTeam } from "$lib/services/teamService.svelte.ts";
  import { getCurrentOrg } from "$lib/services/backend.svelte.ts"; // To get currentOrg for role check
  import { goto } from "$app/navigation";
  import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "$lib/components/ui/table";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import * as AlertDialog from "$lib/components/ui/alert-dialog"; // Import all for manual control
  import { toast } from "svelte-sonner";

  // Assume currentOrg.user_role exists and indicates user's role in the org (e.g., 'Admin', 'Manager', 'Member')
  const currentOrg = $derived(getCurrentOrg());
  const currentUserIsAdminOrManager = $derived(
    currentOrg?.user_role === "Admin" || currentOrg?.user_role === "Manager",
  );

  const actionItems = $derived([
    {
      groupName: "Teams",
      groupItems: [
        {
          icon: Plus,
          label: "Add Team",
          onClick: async () => {
            if (currentUserIsAdminOrManager) {
              goto("/teams/new");
            } else {
              // Optionally, show an alert or disable the button if not authorized
              alert("You are not authorized to add teams.");
            }
          },
          disabled: !currentUserIsAdminOrManager, // Visually disable if not admin/manager
        },
      ],
    },
  ]);

  let teams = $state<Team[]>([]);
  let filteredTeams = $state<Team[]>([]);
  let searchQuery = $state("");
  let teamToDelete = $state<Team | null>(null); // To store which team we're about to delete
  let showDeleteConfirm = $state(false); // To control dialog visibility
  let searchTimeout: ReturnType<typeof setTimeout>;
  let loading = $state(true); // Start with loading true
  let error = $state<string | null>(null);

  async function loadTeams() {
    loading = true;
    error = null;
    const { data, error: err } = await getTeams();
    if (err) {
      error = err.message;
      teams = []; // Clear teams on error
    } else {
      teams = data || [];
    }
    loading = false;
  }

  function filterTeams() {
    if (!searchQuery.trim()) {
      filteredTeams = teams;
      return;
    }
    const query = searchQuery?.toLowerCase() ?? "";
    filteredTeams = teams.filter((team) => {
      return team.team_name?.toLowerCase().includes(query);
    });
  }

  async function handleDeleteTeam(teamId: string) {
    const { error: err } = await deleteTeam(teamId);
    if (err) {
      alert(`Failed to delete team: ${err.message}`); // Basic error handling
      // Potentially use a more sophisticated notification system
    } else {
      await loadTeams(); // Refresh the list after deletion
    }
  }

  $effect(() => {
    loadTeams();
  });

  $effect(() => {
    // This effect runs whenever 'teams' or 'searchQuery' changes.
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    // Apply filter immediately if teams array is already populated
    // Or wait for search query input
    if (teams.length > 0 || searchQuery) {
      searchTimeout = setTimeout(
        () => {
          filterTeams();
        },
        searchQuery ? 300 : 0,
      ); // Delay search for input, immediate for team list changes
    } else {
      // if teams is empty and no search query, filteredTeams should also be empty
      filteredTeams = [];
    }

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  });
</script>

<PageTemplate {actionItems}>
  {#snippet TopCenter()}
    Teams
  {/snippet}

  {#snippet Middle()}
    {#if loading}
      <div class="flex items-center justify-center h-full">
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        ></div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center h-full text-destructive">
        <p>{error}</p>
      </div>
    {:else if teams.length === 0}
      <div
        class="flex flex-col items-center justify-center h-full text-muted-foreground"
      >
        <p>No teams yet.</p>
        {#if currentUserIsAdminOrManager}
          <p class="text-sm">
            Click the "Add Team" button to create your first team.
          </p>
        {/if}
      </div>
    {:else}
      <div class="p-4 space-y-4">
        {#if teams.length > 3}
          <div class="relative">
            <Search
              class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
            />
            <Input
              type="search"
              placeholder="Search teams..."
              class="pl-8"
              bind:value={searchQuery}
            />
          </div>
        {/if}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[70%]">Name</TableHead>
              {#if currentUserIsAdminOrManager}
                <TableHead class="w-[30%] text-right">Actions</TableHead>
              {/if}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each filteredTeams as team (team.id)}
              <TableRow>
                <TableCell>
                  <div class="font-medium">
                    {team.team_name || "Unnamed Team"}
                  </div>
                </TableCell>
                {#if currentUserIsAdminOrManager}
                  <TableCell class="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit Team"
                      onclick={() => goto(`/teams/${team.id}/edit`)}
                    >
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete Team"
                      onclick={() => {
                        teamToDelete = team;
                        showDeleteConfirm = true;
                      }}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </TableCell>
                {/if}
              </TableRow>
            {:else}
              <TableRow>
                <TableCell
                  colspan={currentUserIsAdminOrManager ? 2 : 1}
                  class="text-center text-muted-foreground"
                >
                  No teams match your search criteria.
                </TableCell>
              </TableRow>
            {/each}
          </TableBody>
        </Table>
        {#if currentUserIsAdminOrManager && teamToDelete}
          <AlertDialog.Root bind:open={showDeleteConfirm}>
            <AlertDialog.Content>
              <AlertDialog.Header>
                <AlertDialog.Title>Are you sure?</AlertDialog.Title>
                <AlertDialog.Description>
                  This action cannot be undone. This will permanently delete the
                  team "<strong>{teamToDelete.team_name}</strong>" and all associated data.
                </AlertDialog.Description>
              </AlertDialog.Header>
              <AlertDialog.Footer>
                <AlertDialog.Cancel onclick={() => { teamToDelete = null; showDeleteConfirm = false; }}>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action
                  onclick={async () => {
                    if (!teamToDelete) return;
                    const { error: deleteError } = await deleteTeam(teamToDelete.id!);
                    if (deleteError) {
                      toast.error("Delete Failed", {
                        description: deleteError.message,
                      });
                    } else {
                      toast.success("Team Deleted", {
                        description: `Team "${teamToDelete.team_name}" has been deleted.`,
                      });
                      // No need for invalidateAll here, teams array modification below will trigger UI update
                      teams = teams.filter(t => t.id !== teamToDelete!.id);
                      filterTeams(); // Re-filter if the main 'teams' array is the source of truth
                    }
                    teamToDelete = null; // Reset after action
                    showDeleteConfirm = false;
                  }}
                >
                  Delete
                </AlertDialog.Action>
              </AlertDialog.Footer>
            </AlertDialog.Content>
          </AlertDialog.Root>
        {/if}
      </div>
    {/if}
  {/snippet}
</PageTemplate>
