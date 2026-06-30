-- migrate:verify-column people phone_number

ALTER TABLE people
ADD COLUMN phone_number TEXT;
