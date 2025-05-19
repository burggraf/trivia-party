import type { Database } from "$lib/types/database.types";
import { supabase } from "./backend.svelte.ts";
import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from "@supabase/supabase-js";

import { getUser, getCurrentOrg } from "./backend.svelte.ts";
import type { Org } from "./backend.svelte.ts";

const user = $derived(getUser());
const currentOrg: Org | null = $derived(getCurrentOrg());

// Assuming 'teams' table exists in your database.types.ts and includes partyid
export type Team = Database["public"]["Tables"]["teams"]["Row"];

export const getTeams = async (partyid: string) => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to view teams"),
        };
    }
    if (!partyid) {
        return { data: null, error: new Error("Party ID is required to view teams") };
    }
    const { data, error } = await supabase.from("teams").select(
        "id, team_name, orgid, partyid, created_at", // Added partyid to select
    ).eq("partyid", partyid) // Filter by partyid
        .order("team_name", { ascending: true });

    return { data, error };
};

export const upsertTeam = async (team: Partial<Team>) => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to manage teams"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }

    // Ensure partyid is provided for new teams. For updates, it's part of 'team' if being changed.
    if (!team.id && !team.partyid) {
        return { data: null, error: new Error("Party ID is required for a new team") };
    }

    const teamToUpsert = {
        ...team, // team object from parameter, expected to include partyid if relevant
        orgid: currentOrg.id, // Continue to store orgid
    };

    // Ensure 'team_name' is provided for new teams, or if it's being updated.
    if (!teamToUpsert.team_name && !team.id) {
        return { data: null, error: new Error("Team name is required") };
    }

    const { data, error } = await supabase
        .from("teams")
        .upsert(teamToUpsert)
        .select() // This will select all fields, including partyid if saved
        .single();
    
    if (error) {
        console.error("Failed to upsert team:", error);
    } else {
        console.log("Successfully upserted team:", data);
    }
    
    return { data, error };
};

export const deleteTeam = async (id: string) => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to manage teams"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }

    const { data, error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id)
        // Also match orgid to ensure user can only delete from their current org
        // This is a good practice even if RLS handles it, for defense-in-depth
        .eq("orgid", currentOrg.id) 
        .select(); // Chain .select() to get back the deleted records if successful

    if (error) {
        return { data, error };
    }

    // If no error, but data is null or an empty array, it means RLS likely prevented deletion
    // or the team didn't exist / didn't match the orgid criteria.
    if (!data || data.length === 0) {
        return {
            data: null,
            error: new Error("Team not found or delete operation was blocked. Please check permissions or team details."),
        };
    }

    // If data is present (and not empty), deletion was successful
    return { data, error: null }; // Explicitly return error as null on success
};

export const getTeamById = async (id: string) => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to view teams"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }
    // select("*") will include partyid if it's in the table schema
    const { data, error } = await supabase.from("teams").select("*").eq(
        "id",
        id,
    ).single(); 
    return { data, error };
};
