CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(150),
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(150),
	"last_name" varchar(150),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_superuser" boolean DEFAULT false NOT NULL,
	"is_staff" boolean DEFAULT false NOT NULL,
	"date_joined" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_name" varchar(255),
	"platform" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;