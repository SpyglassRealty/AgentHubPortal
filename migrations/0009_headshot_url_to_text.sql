-- Change headshot_url from varchar(500) to text to support base64 data URLs
ALTER TABLE agent_directory_profiles ALTER COLUMN headshot_url TYPE text;
