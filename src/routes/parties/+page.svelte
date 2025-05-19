<script lang="ts">
  import PageTemplate from "$lib/components/PageTemplate.svelte";
  import { Plus, Search, Edit, Trash2 } from "lucide-svelte";
  import type { Party } from "$lib/services/partyService.svelte.ts";
  import { getParties, deleteParty } from "$lib/services/partyService.svelte.ts";
  import { getCurrentOrg } from "$lib/services/backend.svelte.ts";
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
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import { toast } from "svelte-sonner";

  const currentOrg = $derived(getCurrentOrg());
  const currentUserIsAdminOrManager = $derived(
    currentOrg?.user_role === "Admin" || currentOrg?.user_role === "Manager",
  );

  const actionItems = $derived([
    {
      groupName: "Parties",
      groupItems: [
        {
          icon: Plus,
          label: "Add Party",
          onClick: async () => {
            if (currentUserIsAdminOrManager) {
              goto("/parties/new");
            } else {
              alert("You are not authorized to add parties.");
            }
          },
          disabled: !currentUserIsAdminOrManager,
        },
      ],
    },
  ]);

  let parties = $state<Party[]>([]);
  let filteredParties = $state<Party[]>([]);
  let searchQuery = $state("");
  let partyToDelete = $state<Party | null>(null);
  let showDeleteConfirm = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout>;
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function loadParties() {
    loading = true;
    error = null;
    const { data, error: err } = await getParties();
    if (err) {
      error = err.message;
      parties = [];
    } else {
      parties = data || [];
    }
    loading = false;
  }

  function filterParties() {
    if (!searchQuery.trim()) {
      filteredParties = parties;
      return;
    }
    const query = searchQuery?.toLowerCase() ?? "";
    filteredParties = parties.filter((party) => {
      return party.title?.toLowerCase().includes(query);
    });
  }

  async function handleDeleteParty(partyId: string) {
    const { error: err } = await deleteParty(partyId);
    if (err) {
      toast.error("Failed to delete party", { description: err.message });
    } else {
      toast.success("Party deleted successfully");
      await loadParties(); // Refresh the list
      showDeleteConfirm = false; // Close dialog
    }
  }

  $effect(() => {
    loadParties();
  });

  $effect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    if (parties.length > 0 || searchQuery) {
      searchTimeout = setTimeout(
        () => {
          filterParties();
        },
        searchQuery ? 300 : 0,
      );
    } else {
      filteredParties = [];
    }

    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  });
</script>

<PageTemplate {actionItems}>
  {#snippet TopCenter()}
    Parties
  {/snippet}

  {#snippet Middle()}
    {#if loading}
      <div class="flex items-center justify-center h-full">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center h-full text-destructive">
        <p>{error}</p>
      </div>
    {:else if parties.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>No parties yet.</p>
        {#if currentUserIsAdminOrManager}
          <p class="text-sm">Click the "Add Party" button to create your first party.</p>
        {/if}
      </div>
    {:else}
      <div class="p-4 space-y-4">
        {#if parties.length > 3} // Show search only if more than 3 parties
          <div class="relative">
            <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search parties..."
              class="pl-8"
              bind:value={searchQuery}
            />
          </div>
        {/if}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[70%]">Name</TableHead>
              <!-- Add other headers like Party Date, Location if needed -->
              {#if currentUserIsAdminOrManager}
                <TableHead class="w-[30%] text-right">Actions</TableHead>
              {/if}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#each filteredParties as party (party.id)}
              <TableRow>
                <TableCell>
                  <div class="font-medium">{party.title || "Unnamed Party"}</div>
                  <!-- Display other party info like date/location here if desired -->
                  <!-- Commenting out party_date until correct field name is known -->
                  {#if party.starttime}
                    <div class="text-sm text-muted-foreground">
                      Starts: {new Date(party.starttime).toLocaleString()}
                    </div>
                  {/if}
                  
                  {#if party.location}
                    <div class="text-sm text-muted-foreground">{party.location}</div>
                  {/if}
                </TableCell>
                {#if currentUserIsAdminOrManager}
                  <TableCell class="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Edit Party"
                      onclick={() => goto(`/parties/${party.id}`)}
                    >
                      <Edit class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete Party"
                      onclick={() => {
                        partyToDelete = party;
                        showDeleteConfirm = true;
                      }}
                    >
                      <Trash2 class="h-4 w-4" />
                    </Button>
                  </TableCell>
                {/if}
              </TableRow>
            {/each}
          </TableBody>
        </Table>
      </div>
    {/if}

    {#if showDeleteConfirm && partyToDelete}
      <AlertDialog.Root bind:open={showDeleteConfirm}>
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Are you sure?</AlertDialog.Title>
            <AlertDialog.Description>
              This action cannot be undone. This will permanently delete the party
              "<strong>{partyToDelete.title || 'Unnamed Party'}</strong>".
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel onclick={() => { partyToDelete = null; showDeleteConfirm = false; }}>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action
              onclick={() => handleDeleteParty(partyToDelete!.id!)}
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Root>
    {/if}
  {/snippet}
</PageTemplate>
