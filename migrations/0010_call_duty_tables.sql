-- Call Duty / Lead Duty shift scheduling tables

CREATE TABLE IF NOT EXISTS "call_duty_slots" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" date NOT NULL,
  "shift_type" varchar NOT NULL,
  "start_time" varchar NOT NULL,
  "end_time" varchar NOT NULL,
  "max_signups" integer NOT NULL DEFAULT 1,
  "is_active" boolean DEFAULT true,
  "created_by" varchar REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_call_duty_slots_date_shift" ON "call_duty_slots" ("date", "shift_type");
CREATE INDEX IF NOT EXISTS "idx_call_duty_slots_date" ON "call_duty_slots" ("date");
CREATE INDEX IF NOT EXISTS "idx_call_duty_slots_active" ON "call_duty_slots" ("is_active");

CREATE TABLE IF NOT EXISTS "call_duty_signups" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "slot_id" varchar NOT NULL REFERENCES "call_duty_slots"("id"),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "status" varchar DEFAULT 'active',
  "signed_up_at" timestamp DEFAULT now(),
  "cancelled_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_call_duty_signups_slot_user" ON "call_duty_signups" ("slot_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_call_duty_signups_user" ON "call_duty_signups" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_call_duty_signups_slot" ON "call_duty_signups" ("slot_id");
CREATE INDEX IF NOT EXISTS "idx_call_duty_signups_status" ON "call_duty_signups" ("status");
