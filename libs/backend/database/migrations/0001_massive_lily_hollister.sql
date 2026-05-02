CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"pending_data" jsonb NOT NULL,
	"resend_count" smallint DEFAULT 0 NOT NULL,
	"last_resent_at" timestamp with time zone,
	"wrong_attempts" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_verifications_email_idx" ON "email_verifications" USING btree ("email");