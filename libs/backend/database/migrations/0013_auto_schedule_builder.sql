CREATE TYPE "public"."availability_preference" AS ENUM('preferred', 'available', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."assignment_strategy" AS ENUM('preference_first', 'fairness_first', 'preference_only');--> statement-breakpoint
CREATE TYPE "public"."scheduling_default_availability" AS ENUM('available', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."draft_assignment_status" AS ENUM('proposed', 'manual', 'stale', 'unfilled');--> statement-breakpoint
CREATE TYPE "public"."schedule_draft_status" AS ENUM('draft', 'published', 'discarded');--> statement-breakpoint
CREATE TABLE "scheduling_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"max_hours_per_week" integer DEFAULT 40 NOT NULL,
	"min_rest_hours" integer DEFAULT 11 NOT NULL,
	"enforce_max_hours" boolean DEFAULT true NOT NULL,
	"enforce_rest_rule" boolean DEFAULT true NOT NULL,
	"default_availability" "scheduling_default_availability" DEFAULT 'available' NOT NULL,
	"assignment_strategy" "assignment_strategy" DEFAULT 'preference_first' NOT NULL,
	"allow_claiming_during_draft" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduling_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "staffing_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"days_of_week" integer[] NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"headcount" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_draft_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"shift_id" uuid NOT NULL,
	"user_id" uuid,
	"status" "draft_assignment_status" DEFAULT 'proposed' NOT NULL,
	"score" integer,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_draft_assignments_draft_id_shift_id_unique" UNIQUE("draft_id","shift_id")
);
--> statement-breakpoint
CREATE TABLE "schedule_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"status" "schedule_draft_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD COLUMN "max_hours_per_week" integer;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "staffing_template_id" uuid;--> statement-breakpoint
ALTER TABLE "employee_availability" ADD COLUMN "preference" "availability_preference" DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduling_settings" ADD CONSTRAINT "scheduling_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staffing_templates" ADD CONSTRAINT "staffing_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staffing_templates" ADD CONSTRAINT "staffing_templates_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_draft_assignments" ADD CONSTRAINT "schedule_draft_assignments_draft_id_schedule_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."schedule_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_draft_assignments" ADD CONSTRAINT "schedule_draft_assignments_shift_id_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_draft_assignments" ADD CONSTRAINT "schedule_draft_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_drafts" ADD CONSTRAINT "schedule_drafts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_drafts" ADD CONSTRAINT "schedule_drafts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_staffing_template_id_staffing_templates_id_fk" FOREIGN KEY ("staffing_template_id") REFERENCES "public"."staffing_templates"("id") ON DELETE set null ON UPDATE no action;