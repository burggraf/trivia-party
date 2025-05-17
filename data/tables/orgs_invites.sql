

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."orgs_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "orgid" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "user_role" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "metadata" "jsonb"
);


ALTER TABLE "public"."orgs_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."orgs_invites" IS 'pending invitations to join an org';



ALTER TABLE ONLY "public"."orgs_invites"
    ADD CONSTRAINT "orgs_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orgs_invites"
    ADD CONSTRAINT "orgs_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orgs_invites"
    ADD CONSTRAINT "orgs_invites_orgid_fkey" FOREIGN KEY ("orgid") REFERENCES "public"."orgs"("id");



CREATE POLICY "admin or invitee can delete an invite" ON "public"."orgs_invites" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("email" = ( SELECT "auth"."email"() AS "uid"))));



CREATE POLICY "admin or invitee can view invite" ON "public"."orgs_invites" FOR SELECT TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("email" = ( SELECT "auth"."email"() AS "email"))));



CREATE POLICY "org admins can create invites" ON "public"."orgs_invites" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "public"."get_org_role"("orgs_invites"."orgid") AS "get_org_role") = 'Admin'::"text") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "org admins can updated policies they created" ON "public"."orgs_invites" FOR UPDATE TO "authenticated" USING (((( SELECT "public"."get_org_role"("orgs_invites"."orgid") AS "get_org_role") = 'Admin'::"text") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (((( SELECT "public"."get_org_role"("orgs_invites"."orgid") AS "get_org_role") = 'Admin'::"text") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."orgs_invites" ENABLE ROW LEVEL SECURITY;


GRANT ALL ON TABLE "public"."orgs_invites" TO "anon";
GRANT ALL ON TABLE "public"."orgs_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."orgs_invites" TO "service_role";



