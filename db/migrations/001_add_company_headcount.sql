-- migrate:verify-column companies employee_count
-- migrate:verify-column companies employee_count_range

ALTER TABLE companies
ADD COLUMN employee_count INTEGER
CHECK (employee_count IS NULL OR employee_count >= 0);

ALTER TABLE companies
ADD COLUMN employee_count_range TEXT;
