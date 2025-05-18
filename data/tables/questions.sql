

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


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "text" NOT NULL,
    "category" "text",
    "subcategory" "text",
    "difficulty" "text",
    "question" "text",
    "a" "text",
    "b" "text",
    "c" "text",
    "d" "text",
    "level" numeric,
    "metadata" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


COMMENT ON TABLE "public"."questions" IS 'trivia questions';



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



