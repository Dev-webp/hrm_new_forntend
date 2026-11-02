-- ======================================================
-- PAYSLIP SCHEMA UPDATE FOR COMPREHENSIVE SALARY DETAILS
-- ======================================================

-- Add attendance-related columns to payslips table
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS paid_leaves INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS unpaid_leaves INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS half_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS sandwich_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS paid_sundays INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS holidays INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS is_eligible_for_paid_leave BOOLEAN DEFAULT false;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS days_since_joining INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN payslips.present_days IS 'Number of present days in the month';
COMMENT ON COLUMN payslips.absent_days IS 'Number of absent days in the month';
COMMENT ON COLUMN payslips.paid_leaves IS 'Number of paid leaves taken (max 1 per month after 90 days)';
COMMENT ON COLUMN payslips.unpaid_leaves IS 'Number of unpaid leaves taken';
COMMENT ON COLUMN payslips.half_days IS 'Number of half days worked';
COMMENT ON COLUMN payslips.sandwich_days IS 'Number of sandwich days (paid/unpaid)';
COMMENT ON COLUMN payslips.paid_sundays IS 'Number of paid sundays (based on sandwich policy)';
COMMENT ON COLUMN payslips.holidays IS 'Number of holidays in the month';
COMMENT ON COLUMN payslips.total_days IS 'Total days in the month (present + absent + leaves + half + sunday + holiday)';
COMMENT ON COLUMN payslips.is_eligible_for_paid_leave IS 'Employee is eligible for paid leave after 90 days from joining';
COMMENT ON COLUMN payslips.days_since_joining IS 'Number of days since employee joined the company';
