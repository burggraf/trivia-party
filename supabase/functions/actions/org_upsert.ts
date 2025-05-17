import { supabase } from "../_shared/supabase_client.ts";
import type { User } from "@supabase/supabase-js";
import { getUserRole } from "../_shared/get_user_role.ts";
interface Payload {
    id: string | null;
    title: string;
}
export const org_upsert = async (
    payload: Payload,
    user: User | null,
): Promise<{ data: unknown; error: unknown | null }> => {
    try {
        if (!user) {
            return { data: null, error: "User not found" };
        }
        // Get the title from the request body
        const id = payload.id;
        const title = payload.title;

        if (id) {
            const { data: userRole, error: userRoleError } = await getUserRole(
                id,
                user.id,
            );
            if (userRoleError) {
                return { data: null, error: userRoleError };
            }
            if (userRole !== "Admin") {
                return {
                    data: null,
                    error: "User is not an admin of the organization",
                };
            }
        }

        // Insert new orgs_users row
        const { data: upsertData, error: upsertError } = await supabase
            .from("orgs")
            .upsert({ id: id || undefined, title })
            .select()
            .single();

        if (upsertError) {
            return { data: null, error: upsertError };
        }
        if (!id) {
            // Insert new orgs_users row
            const { data: orgUserData, error: orgUserError } = await supabase
                .from("orgs_users")
                .insert({
                    orgid: upsertData.id,
                    userid: user.id,
                    user_role: "Admin",
                })
                .select()
                .single();

            if (orgUserError) {
                return { data: null, error: orgUserError };
            }

            // Your org creation logic here
            return { data: orgUserData, error: null };
        } else {
            return { data: upsertData, error: null };
        }
    } catch (err) {
        return { data: null, error: err };
    }
};
