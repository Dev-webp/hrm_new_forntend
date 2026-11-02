# Backend Update Guide - Calculate from Attendance Status

## Overview
Instead of storing attendance details separately in the payslips table, we calculate them dynamically from the `attendance_records` table where the `status` field is stored (present, absent, half_day, etc.).

## Database Schema

### Existing Tables (No Changes Needed)
- `attendance_records` - Contains attendance with `status` field (present, absent, half_day, etc.)
- `payslips` - Stores salary calculations (keep this simple)

### Optional: Add Calculation Columns to Payslips (for caching)
If you want to cache the calculated values for performance, add these columns:

```sql
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS present_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS absent_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS paid_leaves INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS unpaid_leaves INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS half_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS sandwich_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS sundays INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS holidays INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 0;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payable_days DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS leave_deduction DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS earned_basic DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS is_eligible_for_paid_leave BOOLEAN DEFAULT false;
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS days_since_joining INTEGER DEFAULT 0;

COMMENT ON COLUMN payslips.is_eligible_for_paid_leave IS 'Employee is eligible for paid leave after 90 days from joining';
COMMENT ON COLUMN payslips.days_since_joining IS 'Number of days since employee joined the company';
```

## Backend API Updates

### 1. Calculate Attendance Details from Status

```javascript
// backend/utils/salaryCalculator.js

/**
 * Calculate attendance details from attendance_records table
 */
async function calculateAttendanceDetails(pool, userId, year, month) {
  // Get employee details (joining date)
  const empResult = await pool.query(
    'SELECT joining_date FROM employees WHERE id = $1',
    [userId]
  );
  const employee = empResult.rows[0];

  // Get attendance data for the month
  const attendanceResult = await pool.query(
    `SELECT
      COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
      COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
      COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days,
      COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days
     FROM attendance_records
     WHERE user_id = $1
     AND EXTRACT(YEAR FROM date) = $2
     AND EXTRACT(MONTH FROM date) = $3`,
    [userId, parseInt(year), parseInt(month)]
  );

  const attendance = attendanceResult.rows[0];

  // Check if employee is eligible for paid leave (90 days from joining)
  const joiningDate = new Date(employee.joining_date);
  const currentDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const daysSinceJoining = Math.floor((currentDate - joiningDate) / (1000 * 60 * 60 * 24));
  const isEligibleForPaidLeave = daysSinceJoining >= 90;

  // Get all approved leaves for the month
  const leaveResult = await pool.query(
    `SELECT COUNT(*) as total_leaves
     FROM leave_requests
     WHERE user_id = $1
     AND status = 'approved'
     AND EXTRACT(YEAR FROM from_date) = $2
     AND EXTRACT(MONTH FROM from_date) = $3`,
    [userId, parseInt(year), parseInt(month)]
  );

  const totalLeaves = parseInt(leaveResult.rows[0].total_leaves);

  // Calculate paid leaves: only 1 per month if eligible
  let paidLeaves = 0;
  if (isEligibleForPaidLeave && totalLeaves > 0) {
    paidLeaves = Math.min(totalLeaves, 1); // Max 1 paid leave per month
  }

  // Unpaid leaves = total leaves - paid leaves
  const unpaidLeaves = totalLeaves - paidLeaves;

  // Count sundays in the month
  const totalSundays = countSundays(parseInt(year), parseInt(month));

  // Get holidays in the month
  const holidayResult = await pool.query(
    `SELECT COUNT(*) as holidays
     FROM company_holidays
     WHERE EXTRACT(YEAR FROM date) = $2
     AND EXTRACT(MONTH FROM date) = $3`,
    [userId, parseInt(year), parseInt(month)]
  );

  const holidays = parseInt(holidayResult.rows[0].holidays);

  // Calculate sandwich days and paid sundays using your existing sandwich policy
  const sandwichResult = await pool.query(
    'SELECT * FROM sandwich_calculations WHERE user_id = $1 AND month = $2',
    [userId, `${year}-${month}`]
  );

  const sandwichDays = sandwichResult.rows[0]?.sandwich_days || 0;
  const paidSundays = sandwichResult.rows[0]?.paidSundays?.length || 0;

  // Get total days in month
  const totalDaysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();

  return {
    present_days: parseInt(attendance.present_days) || 0,
    absent_days: parseInt(attendance.absent_days) || 0,
    half_days: parseInt(attendance.half_days) || 0,
    late_days: parseInt(attendance.late_days) || 0,
    paid_leaves: paidLeaves,
    unpaid_leaves: unpaidLeaves,
    total_leaves: totalLeaves,
    paid_sundays: paidSundays,
    holidays,
    sandwich_days: sandwichDays,
    total_days: totalDaysInMonth,
    is_eligible_for_paid_leave: isEligibleForPaidLeave,
    days_since_joining: daysSinceJoining
  };
}

/**
 * Count sundays in a month
 */
function countSundays(year, month) {
  let sundays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) { // 0 = Sunday
      sundays++;
    }
  }

  return sundays;
}

/**
 * Calculate salary based on attendance
 */
function calculateSalary(monthlySalary, attendanceDetails, incentives = 0, deductions = 0, tax = 0) {
  const { present_days, half_days, sundays, holidays, paid_leaves, total_days } = attendanceDetails;

  // Calculate daily rate
  const dailyRate = monthlySalary / total_days;

  // Calculate payable days
  const payableDays = present_days + sundays + holidays + paid_leaves + (half_days * 0.5);

  // Calculate earned basic
  const earnedBasic = dailyRate * payableDays;

  // Calculate leave deduction
  const leaveDeduction = Math.max(0, monthlySalary - earnedBasic);

  // Calculate gross pay
  const grossPay = earnedBasic + Number(incentives);

  // Calculate net pay
  const netPay = grossPay - Number(deductions) - Number(tax);

  return {
    daily_rate: dailyRate,
    payable_days: payableDays,
    leave_deduction: leaveDeduction,
    earned_basic: earnedBasic,
    gross_pay: grossPay,
    net_pay: netPay
  };
}

module.exports = {
  calculateAttendanceDetails,
  countSundays,
  calculateSalary
};
```

### 2. Update Payslip Generation Endpoint

```javascript
// backend/routes/payslips.js
const { calculateAttendanceDetails, calculateSalary } = require('../utils/salaryCalculator');

router.post('/generate', async (req, res) => {
  const { user_id, month, incentives, deductions, tax } = req.body;

  try {
    // Get employee details
    const empResult = await pool.query(
      'SELECT id, name, salary, joining_date, department, branch FROM employees WHERE id = $1',
      [user_id]
    );
    const employee = empResult.rows[0];

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Parse month
    const [year, monthNum] = month.split('-');

    // Calculate attendance details from status
    const attendanceDetails = await calculateAttendanceDetails(pool, user_id, year, monthNum);

    // Calculate salary
    const salaryCalculation = calculateSalary(
      employee.salary,
      attendanceDetails,
      incentives,
      deductions,
      tax
    );

    // Insert or update payslip with calculated values
    const insertResult = await pool.query(
      `INSERT INTO payslips (
        user_id, employee_code, full_name, department, branch, month,
        basic_salary, present_days, absent_days, paid_leaves, unpaid_leaves,
        half_days, sandwich_days, sundays, holidays, total_days, daily_rate,
        payable_days, leave_deduction, earned_basic, incentives,
        deductions, tax, gross_pay, net_pay, payment_status, created_at,
        is_eligible_for_paid_leave, days_since_joining
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) ON CONFLICT (user_id, month) DO UPDATE SET
        present_days = EXCLUDED.present_days,
        absent_days = EXCLUDED.absent_days,
        paid_leaves = EXCLUDED.paid_leaves,
        unpaid_leaves = EXCLUDED.unpaid_leaves,
        half_days = EXCLUDED.half_days,
        sandwich_days = EXCLUDED.sandwich_days,
        sundays = EXCLUDED.sundays,
        holidays = EXCLUDED.holidays,
        total_days = EXCLUDED.total_days,
        daily_rate = EXCLUDED.daily_rate,
        payable_days = EXCLUDED.payable_days,
        leave_deduction = EXCLUDED.leave_deduction,
        earned_basic = EXCLUDED.earned_basic,
        incentives = EXCLUDED.incentives,
        deductions = EXCLUDED.deductions,
        tax = EXCLUDED.tax,
        gross_pay = EXCLUDED.gross_pay,
        net_pay = EXCLUDED.net_pay,
        is_eligible_for_paid_leave = EXCLUDED.is_eligible_for_paid_leave,
        days_since_joining = EXCLUDED.days_since_joining
      RETURNING *`,
      [
        user_id,
        employee.id,
        employee.name,
        employee.department,
        employee.branch,
        month,
        employee.salary,
        attendanceDetails.present_days,
        attendanceDetails.absent_days,
        attendanceDetails.paid_leaves,
        attendanceDetails.unpaid_leaves,
        attendanceDetails.half_days,
        attendanceDetails.sandwich_days,
        attendanceDetails.sundays,
        attendanceDetails.holidays,
        attendanceDetails.total_days,
        salaryCalculation.daily_rate,
        salaryCalculation.payable_days,
        salaryCalculation.leave_deduction,
        salaryCalculation.earned_basic,
        incentives || 0,
        deductions || 0,
        tax || 0,
        salaryCalculation.gross_pay,
        salaryCalculation.net_pay,
        'unpaid',
        new Date(),
        attendanceDetails.is_eligible_for_paid_leave,
        attendanceDetails.days_since_joining
      ]
    );

    res.json(insertResult.rows[0]);
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Update Payslip List Endpoint

```javascript
router.get('/', async (req, res) => {
  const { month, branch, department, search } = req.query;

  try {
    let query = `
      SELECT
        p.*,
        e.employee_code,
        e.department,
        e.branch
      FROM payslips p
      JOIN employees e ON p.user_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      query += ` AND p.month LIKE $${params.length + 1}`;
      params.push(`${month}%`);
    }

    if (branch && branch !== 'all') {
      query += ` AND e.branch = $${params.length + 1}`;
      params.push(branch);
    }

    if (department && department !== 'all') {
      query += ` AND e.department = $${params.length + 1}`;
      params.push(department);
    }

    if (search) {
      query += ` AND (e.name ILIKE $${params.length + 1} OR e.employee_code ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.month DESC, e.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Alternative: Calculate on the Fly (No Caching)

If you don't want to store calculated values, calculate them when fetching payslips:

```javascript
router.get('/', async (req, res) => {
  const { month, branch, department, search } = req.query;

  try {
    let query = `
      SELECT
        p.*,
        e.employee_code,
        e.department,
        e.branch,
        -- Calculate attendance details on the fly
        (
          SELECT COUNT(*)
          FROM attendance_records ar
          WHERE ar.user_id = p.user_id
          AND ar.date LIKE p.month || '%'
          AND ar.status = 'present'
        ) as present_days,
        (
          SELECT COUNT(*)
          FROM attendance_records ar
          WHERE ar.user_id = p.user_id
          AND ar.date LIKE p.month || '%'
          AND ar.status = 'absent'
        ) as absent_days,
        (
          SELECT COUNT(*)
          FROM attendance_records ar
          WHERE ar.user_id = p.user_id
          AND ar.date LIKE p.month || '%'
          AND ar.status = 'half_day'
        ) as half_days
      FROM payslips p
      JOIN employees e ON p.user_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      query += ` AND p.month LIKE $${params.length + 1}`;
      params.push(`${month}%`);
    }

    if (branch && branch !== 'all') {
      query += ` AND e.branch = $${params.length + 1}`;
      params.push(branch);
    }

    if (department && department !== 'all') {
      query += ` AND e.department = $${params.length + 1}`;
      params.push(department);
    }

    if (search) {
      query += ` AND (e.name ILIKE $${params.length + 1} OR e.employee_code ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.month DESC, e.name';

    const result = await pool.query(query, params);

    // Calculate salary details for each payslip
    const payslipsWithCalc = result.rows.map(p => {
      const [year, monthNum] = p.month.split('-');
      const sundays = countSundays(parseInt(year), parseInt(monthNum));
      const totalDays = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const dailyRate = p.basic_salary / totalDays;
      const payableDays = p.present_days + sundays + p.holidays + p.paid_leaves + (p.half_days * 0.5);
      const earnedBasic = dailyRate * payableDays;
      const leaveDeduction = Math.max(0, p.basic_salary - earnedBasic);
      const grossPay = earnedBasic + p.incentives;
      const netPay = grossPay - p.deductions - p.tax;

      return {
        ...p,
        daily_rate: dailyRate,
        payable_days: payableDays,
        leave_deduction: leaveDeduction,
        earned_basic: earnedBasic,
        gross_pay: grossPay,
        net_pay: netPay
      };
    });

    res.json(payslipsWithCalc);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Salary Calculation Formula

```
Daily Rate = Monthly Salary / Total Days in Month

Payable Days = Present Days + Sundays + Holidays + Paid Leaves + (Half Days × 0.5)

Earned Basic = Daily Rate × Payable Days

Leave Deduction = Monthly Salary - Earned Basic

Gross Pay = Earned Basic + Incentives

Net Pay = Gross Pay - Deductions - Tax
```

## Paid Leave Eligibility Rule

**Important:** Employees are eligible for paid leave only after completing 90 days from their joining date.

- **Before 90 days:** All leaves are unpaid (0 paid leaves)
- **After 90 days:** Maximum 1 paid leave per month
- **If employee takes more than 1 leave per month:** Only 1 is paid, rest are unpaid

Example:
- Employee joined on Jan 1, 2026
- 90-day completion date: April 1, 2026
- Jan, Feb, Mar: No paid leave eligibility
- April onwards: Eligible for 1 paid leave per month
- If employee takes 3 leaves in April: 1 paid, 2 unpaid

## Benefits of This Approach

1. **Single Source of Truth**: Attendance data lives in `attendance_records` table
2. **No Data Duplication**: Don't store attendance details separately
3. **Always Accurate**: Calculations always reflect current attendance status
4. **Flexible**: Can add new status types without schema changes
5. **Performance**: Option to cache calculated values for frequently accessed data

## Frontend Integration

The frontend remains the same - it receives the calculated values from the backend API.
