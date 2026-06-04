CREATE TYPE "public"."change_request_status" AS ENUM('pending', 'approved', 'rejected');
--> statement-breakpoint
CREATE TYPE "public"."change_request_type" AS ENUM('add', 'edit', 'delete');
--> statement-breakpoint
CREATE TABLE "event_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_type" "change_request_type" NOT NULL,
	"event_id" uuid,
	"requested_type" "work_event_type",
	"requested_occurred_at" timestamp with time zone,
	"requested_notes" text,
	"reason" text,
	"status" "change_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_change_requests" ADD CONSTRAINT "event_change_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_change_requests" ADD CONSTRAINT "event_change_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_change_requests" ADD CONSTRAINT "event_change_requests_event_id_work_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."work_events"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "event_change_requests" ADD CONSTRAINT "event_change_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
