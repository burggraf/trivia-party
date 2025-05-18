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

// Assuming 'teams' table exists in your database.types.ts
export type Team = Database["public"]["Tables"]["teams"]["Insert"];

export const getTeams = async () => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to view teams"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }
    const { data, error } = await supabase.from("teams").select(
        "id, team_name, orgid, created_at",
    ).eq("orgid", currentOrg.id)
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
    const teamWithOrg = {
        ...team,
        orgid: currentOrg.id,
    };

    // Ensure 'team_name' is provided for new teams, or if it's being updated.
    // Supabase might handle this at the DB level with constraints, but good to check.
    if (!teamWithOrg.team_name && !team.id) {
        return { data: null, error: new Error("Team name is required") };
    }

    const { data, error } = await supabase
        .from("teams")
        .upsert(teamWithOrg)
        .select()
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
    const { data, error } = await supabase.from("teams").delete().eq(
        "id",
        id,
    );
    return { data, error };
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
    const { data, error } = await supabase.from("teams").select("*").eq(
        "id",
        id,
    ).single(); // Assuming ID is unique, so single() is appropriate
    return { data, error };
};
