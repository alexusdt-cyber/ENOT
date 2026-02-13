-- Add appType column to app_categories table
ALTER TABLE app_categories ADD COLUMN app_type VARCHAR(20) NOT NULL DEFAULT 'internal';

-- Add appType column to apps table
ALTER TABLE apps ADD COLUMN app_type VARCHAR(20) NOT NULL DEFAULT 'internal';

-- Create index for app_type on apps table
CREATE INDEX app_type_idx ON apps(app_type);
