-- CMA Database Fix Script
-- Add any missing columns to the cmas table

ALTER TABLE cmas ADD COLUMN IF NOT EXISTS share_token VARCHAR UNIQUE;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS share_created_at TIMESTAMP;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS properties_data JSONB;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS prepared_for TEXT;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS suggested_list_price INTEGER;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS cover_letter TEXT;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS brochure JSONB;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS adjustments JSONB;
ALTER TABLE cmas ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Fix naming convention (camelCase vs snake_case)
ALTER TABLE cmas RENAME COLUMN "shareToken" TO share_token;
ALTER TABLE cmas RENAME COLUMN "shareCreatedAt" TO share_created_at;  
ALTER TABLE cmas RENAME COLUMN "propertiesData" TO properties_data;
ALTER TABLE cmas RENAME COLUMN "preparedFor" TO prepared_for;
ALTER TABLE cmas RENAME COLUMN "suggestedListPrice" TO suggested_list_price;
ALTER TABLE cmas RENAME COLUMN "coverLetter" TO cover_letter;
ALTER TABLE cmas RENAME COLUMN "expiresAt" TO expires_at;
ALTER TABLE cmas RENAME COLUMN "presentationConfig" TO presentation_config;
ALTER TABLE cmas RENAME COLUMN "userId" TO user_id;
ALTER TABLE cmas RENAME COLUMN "subjectProperty" TO subject_property;
ALTER TABLE cmas RENAME COLUMN "comparableProperties" TO comparable_properties;
ALTER TABLE cmas RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE cmas RENAME COLUMN "updatedAt" TO updated_at;