CREATE TABLE "kiosk_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"paired_by_user_id" uuid,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kiosk_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "kiosk_pairing_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"device_name" varchar(150) NOT NULL,
	"created_by_user_id" uuid,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kiosk_pairing_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"device_id" uuid,
	"name" varchar(200) NOT NULL,
	"purpose" varchar(500) NOT NULL,
	"signature_key" varchar(512) NOT NULL,
	"signed_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"signed_out_at" timestamp with time zone,
	"auto_closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kiosk_devices" ADD CONSTRAINT "kiosk_devices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_devices" ADD CONSTRAINT "kiosk_devices_paired_by_user_id_users_id_fk" FOREIGN KEY ("paired_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_pairing_codes" ADD CONSTRAINT "kiosk_pairing_codes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosk_pairing_codes" ADD CONSTRAINT "kiosk_pairing_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_device_id_kiosk_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."kiosk_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kiosk_devices_organization_id_idx" ON "kiosk_devices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "kiosk_pairing_codes_organization_id_idx" ON "kiosk_pairing_codes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visits_organization_id_idx" ON "visits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "visits_org_open_idx" ON "visits" USING btree ("organization_id","signed_out_at");--> statement-breakpoint
CREATE INDEX "visits_org_signed_in_at_idx" ON "visits" USING btree ("organization_id","signed_in_at");