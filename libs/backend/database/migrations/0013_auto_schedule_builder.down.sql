ALTER TABLE "shifts" DROP CONSTRAINT "shifts_staffing_template_id_staffing_templates_id_fk";--> statement-breakpoint
ALTER TABLE "shifts" DROP COLUMN "staffing_template_id";--> statement-breakpoint
ALTER TABLE "employee_availability" DROP COLUMN "preference";--> statement-breakpoint
ALTER TABLE "employee_profiles" DROP COLUMN "max_hours_per_week";--> statement-breakpoint
DROP TABLE "schedule_draft_assignments";--> statement-breakpoint
DROP TABLE "schedule_drafts";--> statement-breakpoint
DROP TABLE "staffing_templates";--> statement-breakpoint
DROP TABLE "scheduling_settings";--> statement-breakpoint
DROP TYPE "public"."schedule_draft_status";--> statement-breakpoint
DROP TYPE "public"."draft_assignment_status";--> statement-breakpoint
DROP TYPE "public"."scheduling_default_availability";--> statement-breakpoint
DROP TYPE "public"."assignment_strategy";--> statement-breakpoint
DROP TYPE "public"."availability_preference";