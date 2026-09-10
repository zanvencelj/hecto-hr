CREATE TABLE "app_links" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"android_apk_url" text,
	"ios_download_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "app_links" ADD CONSTRAINT "app_links_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;