-- Migration: multi-tenancy, role enum, soft deletes
-- Adds: organizations table, user_role enum, organizationId/role/deletedAt on users,
--       organizationId on sessions. Removes: is_superuser, is_staff from users.

--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'hr', 'manager', 'employee');

--> statement-breakpoint
CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);

--> statement-breakpoint
ALTER TABLE "users"
  ADD COLUMN "organization_id" uuid,
  ADD COLUMN "role" "user_role" DEFAULT 'employee' NOT NULL,
  ADD COLUMN "deleted_at" timestamp with time zone;

--> statement-breakpoint
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "is_superuser",
  DROP COLUMN IF EXISTS "is_staff";

--> statement-breakpoint
ALTER TABLE "users"
  ADD CONSTRAINT "users_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;

--> statement-breakpoint
ALTER TABLE "sessions"
  ADD COLUMN "organization_id" uuid;

--> statement-breakpoint
ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

--> statement-breakpoint
CREATE INDEX "users_organization_id_deleted_at_idx"
  ON "users" ("organization_id", "deleted_at");
