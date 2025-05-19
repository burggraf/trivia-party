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

// IMPORTANT: Adjust this type to match your 'parties' table in database.types.ts
export type Party = Database["public"]["Tables"]["parties"]["Insert"];

export const getParties = async () => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to view parties"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }
    const { data, error } = await supabase.from("parties").select(
        "id, title, location, orgid, created_at, starttime, endtime, notes, teamsize"
    ).eq("orgid", currentOrg.id)
        .order("title", { ascending: true });

    return { data, error };
};

export const upsertParty = async (party: Partial<Party>) => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to manage parties"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }
    const partyWithOrg = {
        ...party,
        orgid: currentOrg.id,
    };

    if (!partyWithOrg.title && !party.id) {
        return { data: null, error: new Error("Party title is required") };
    }

    // Ensure all required fields for 'parties' are handled here
    const { data, error } = await supabase
        .from("parties")
        .upsert(partyWithOrg)
        .select()
        .single();
    
    if (error) {
        console.error("Failed to upsert party:", error);
    } else {
        console.log("Successfully upserted party:", data);
    }
    
    return { data, error };
};

export const deleteParty = async (id: string) => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to manage parties"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }
    const { data, error } = await supabase.from("parties").delete().eq(
        "id",
        id,
    );
    return { data, error };
};

export const getPartyById = async (id: string) => {
    if (!user) {
        return {
            data: null,
            error: new Error("You need to be logged in to view parties"),
        };
    }
    if (!currentOrg?.id) {
        return { data: null, error: new Error("No organization selected") };
    }
    // Adjust fields in select("*") if you don't need all of them, or be specific
    const { data, error } = await supabase.from("parties").select("*").eq(
        "id",
        id,
    ).single(); 
    return { data, error };
};
