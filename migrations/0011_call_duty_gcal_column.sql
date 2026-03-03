-- Add Google Calendar event ID to call_duty_slots
-- Links each shift slot to its corresponding Google Calendar event
ALTER TABLE call_duty_slots ADD COLUMN google_calendar_event_id VARCHAR;
