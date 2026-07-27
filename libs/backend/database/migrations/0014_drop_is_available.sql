UPDATE "employee_availability" SET "preference" = 'unavailable' WHERE "is_available" = false;--> statement-breakpoint
ALTER TABLE "employee_availability" DROP COLUMN "is_available";