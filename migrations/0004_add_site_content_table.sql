-- Migration: Add site_content table for homepage editor
CREATE TABLE IF NOT EXISTS "site_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"section" varchar(100) NOT NULL,
	"content" jsonb NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_content_section_unique" UNIQUE("section")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_site_content_section" ON "site_content" USING btree ("section");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "site_content" ADD CONSTRAINT "site_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;