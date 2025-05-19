<script lang="ts">
  import { page } from "$app/stores";
  import PageTemplate from "$lib/components/PageTemplate.svelte";
  import type { Party } from "$lib/services/partyService.svelte.ts";
  import { upsertParty, getPartyById } from "$lib/services/partyService.svelte.ts";
  import { getCurrentOrg } from "$lib/services/backend.svelte.ts";
  import { ArrowLeft } from "lucide-svelte"; 
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { goto, invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";

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

  let startTimeForInput = $state('');
  let endTimeForInput = $state('');

  // Sync party.starttime/endtime with input fields
  $effect(() => {
    if (party.starttime) {
      startTimeForInput = new Date(new Date(party.starttime).getTime() - new Date(party.starttime).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } else {
      startTimeForInput = ''; // Reset if party.starttime is cleared
    }
  });

  $effect(() => {
    if (party.endtime) {
      endTimeForInput = new Date(new Date(party.endtime).getTime() - new Date(party.endtime).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } else {
      endTimeForInput = ''; // Reset if party.endtime is cleared
    }
  });

  // Sync input fields back to party.starttime/endtime
  $effect(() => {
    party.starttime = startTimeForInput ? new Date(startTimeForInput).toISOString() : undefined;
  });

  $effect(() => {
    party.endtime = endTimeForInput ? new Date(endTimeForInput).toISOString() : undefined;
  });

  const showPageActions = $derived(
    currentUserIsAdminOrManager && !unauthorized,
  );

  async function initializePage() {
    if (!currentUserIsAdminOrManager && currentOrg) {
      error = "You are not authorized to manage parties.";
      unauthorized = true;
      loading = false;
      return;
    }
    unauthorized = false; 

    loading = true;
    error = null;

    if (isNew) {
      pageTitle = "New Party";
      // Initialize with default values, especially for required fields if any
      party = { title: "", location: "" }; 
      startTimeForInput = ''; // Clear input fields for new party
      endTimeForInput = '';   // Clear input fields for new party
      loading = false;
    } else {
      pageTitle = "Edit Party";
      const { data, error: fetchError } = await getPartyById(partyRouteId);
      if (fetchError) {
        error = fetchError.message;
        toast.error("Error loading party", { description: error });
      } else if (data) {
        party = data;
        // startTimeForInput and endTimeForInput will be set by the $effect above
      } else {
        error = "Party not found.";
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

    if (!party.title?.trim()) {
      toast.error("Validation Error", {
        description: "Party title cannot be empty.",
      });
      return;
    }
    // Add other validations as necessary, e.g., for party_date

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
      await invalidateAll();
      goto("/parties");
    }
  }

  const actionItems = $derived([
    {
      icon: ArrowLeft,
      label: "Back to Parties",
      href: "/parties",
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
        title="Back to Parties"
        onclick={() => goto("/parties")}
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
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    {:else if unauthorized || error}
      <div class="flex items-center justify-center h-full text-destructive p-4">
        <p>{error || "You do not have permission to view this page."}</p>
      </div>
    {:else}
      <div class="w-full flex justify-center p-4 md:p-6">
        <form onsubmit={(event) => { event.preventDefault(); handleSave(); }} class="max-w-md w-full space-y-6">
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
            <Label for="location">Location (Optional)</Label>
            <Input 
              id="location" 
              type="text" 
              placeholder="Enter location"
              bind:value={party.location} 
              disabled={unauthorized || loading} 
            />
          </div>

          {#if showPageActions}
            <Button 
              type="submit"
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
                {isNew ? "Create Party" : "Save Changes"}
              {/if}
            </Button>
          {/if}
          
          {#if !isNew && party.id && party.created_at}
            <div class="text-sm text-muted-foreground mt-4">
              <p>Party ID: {party.id}</p>
              <p>Created: {new Date(party.created_at).toLocaleDateString()}</p>
            </div>
          {/if}
        </form>
      </div>
    {/if}
  {/snippet}
</PageTemplate>
