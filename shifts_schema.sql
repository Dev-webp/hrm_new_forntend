-- ======================================================
-- SHIFT MANAGEMENT SCHEMA FOR HRMS
-- ======================================================

-- Add shift_type column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_effective_date DATE;

-- Add comment to describe shift_type values
COMMENT ON COLUMN employees.shift_type IS 'Shift type: day or night';
COMMENT ON COLUMN employees.shift_effective_date IS 'Date when the shift assignment becomes effective';

-- Update existing employees to have a default shift (optional)
UPDATE employees SET shift_type = 'day', shift_effective_date = CURRENT_DATE WHERE shift_type IS NULL;
