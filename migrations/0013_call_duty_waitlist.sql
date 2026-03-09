-- Migration: Add Call Duty Waitlist Table
-- Task 5: Allow agents to join waitlists when slots are full

CREATE TABLE IF NOT EXISTS "call_duty_waitlist" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slot_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"position" integer NOT NULL,
	"status" varchar DEFAULT 'waiting' NOT NULL,
	"notified_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign key constraints
ALTER TABLE "call_duty_waitlist" ADD CONSTRAINT "call_duty_waitlist_slot_id_call_duty_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "call_duty_slots"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "call_duty_waitlist" ADD CONSTRAINT "call_duty_waitlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS "idx_call_duty_waitlist_slot_user" ON "call_duty_waitlist" ("slot_id","user_id");
CREATE INDEX IF NOT EXISTS "idx_call_duty_waitlist_slot" ON "call_duty_waitlist" ("slot_id");
CREATE INDEX IF NOT EXISTS "idx_call_duty_waitlist_user" ON "call_duty_waitlist" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_call_duty_waitlist_status" ON "call_duty_waitlist" ("status");
CREATE INDEX IF NOT EXISTS "idx_call_duty_waitlist_position" ON "call_duty_waitlist" ("position");