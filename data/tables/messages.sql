

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


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sender" "uuid",
    "sender_type" "text",
    "subject" "text",
    "message" "text",
    "metadata" "jsonb",
    "sender_deleted_at" timestamp with time zone
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'Messages between users';



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_fkey" FOREIGN KEY ("sender") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Insert - user must be sender" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender"));



ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "must be sender to delete" ON "public"."messages" FOR DELETE USING (("sender" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "must be sender to update" ON "public"."messages" FOR UPDATE USING (("sender" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("sender" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "sender or recipients can view" ON "public"."messages" FOR SELECT USING (true);



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



