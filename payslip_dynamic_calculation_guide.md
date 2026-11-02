# Payslip Calculation - Dynamic from Attendance Status

## Overview
Calculate all attendance details dynamically from `attendance_records` table without storing in payslips. This ensures payslips always reflect the current attendance status, even after manual edits.

## Database Schema
**No changes needed to payslips table!** Keep it simple - only store final salary calculations.

```sql
-- Keep payslips table minimal - only store final salary calculations
-- All attendance details are calculated on the fly from attendance_records
```

## Backend API - Calculate on the Fly

### 1. Payslip List Endpoint with Dynamic Calculation

```javascript
// backend/routes/payslips.js
const { calculateAttendanceDetails, calculateSalary } = require('../utils/salaryCalculator');

router.get('/', async (req, res) => {
  const { month, branch, department, search } = req.query;

  try {
    let query = `
      SELECT
        p.*,
        e.employee_code,
        e.department,
        e.branch,
        e.joining_date
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

    // Calculate attendance details dynamically for each payslip
    const payslipsWithDetails = await Promise.all(
      result.rows.map(async (p) => {
        const [year, monthNum] = p.month.split('-');

        // Calculate attendance details from status
        const attendanceDetails = await calculateAttendanceDetails(
          pool,
          p.user_id,
          year,
          monthNum
        );

        // Return payslip with calculated attendance details
        return {
          ...p,
          present_days: attendanceDetails.present_days,
          absent_days: attendanceDetails.absent_days,
          paid_leaves: attendanceDetails.paid_leaves,
          unpaid_leaves: attendanceDetails.unpaid_leaves,
          half_days: attendanceDetails.half_days,
          sandwich_days: attendanceDetails.sandwich_days,
          paid_sundays: attendanceDetails.paid_sundays,
          holidays: attendanceDetails.holidays,
          total_days: attendanceDetails.total_days,
          is_eligible_for_paid_leave: attendanceDetails.is_eligible_for_paid_leave,
          days_since_joining: attendanceDetails.days_since_joining
        };
      })
    );

    res.json(payslipsWithDetails);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Attendance Calculation Utility

```javascript
// backend/utils/salaryCalculator.js

/**
 * Calculate attendance details from attendance_records table
 * This ensures data is always current, even after manual edits
 */
async function calculateAttendanceDetails(pool, userId, year, month) {
  // Get employee details (joining date)
  const empResult = await pool.query(
    'SELECT joining_date FROM employees WHERE id = $1',
    [userId]
  );
  const employee = empResult.rows[0];

  // Get attendance data for the month - calculated from status
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

  // Count total sundays in the month
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
  const { present_days, half_days, paid_sundays, holidays, paid_leaves, total_days } = attendanceDetails;

  // Calculate daily rate
  const dailyRate = monthlySalary / total_days;

  // Calculate payable days
  const payableDays = present_days + paid_sundays + holidays + paid_leaves + (half_days * 0.5);

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

### 3. Payslip Generation with Dynamic Calculation

```javascript
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

    // Calculate attendance details from status (dynamic)
    const attendanceDetails = await calculateAttendanceDetails(pool, user_id, year, monthNum);

    // Calculate salary
    const salaryCalculation = calculateSalary(
      employee.salary,
      attendanceDetails,
      incentives,
      deductions,
      tax
    );

    // Insert payslip with only final salary values (no attendance details stored)
    const insertResult = await pool.query(
      `INSERT INTO payslips (
        user_id, employee_code, full_name, department, branch, month,
        basic_salary, incentives, deductions, tax, gross_pay, net_pay,
        payment_status, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) ON CONFLICT (user_id, month) DO UPDATE SET
        incentives = EXCLUDED.incentives,
        deductions = EXCLUDED.deductions,
        tax = EXCLUDED.tax,
        gross_pay = EXCLUDED.gross_pay,
        net_pay = EXCLUDED.net_pay
      RETURNING *`,
      [
        user_id,
        employee.id,
        employee.name,
        employee.department,
        employee.branch,
        month,
        employee.salary,
        incentives || 0,
        deductions || 0,
        tax || 0,
        salaryCalculation.gross_pay,
        salaryCalculation.net_pay,
        'unpaid',
        new Date()
      ]
    );

    res.json(insertResult.rows[0]);
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Salary Calculation Formula

```
Daily Rate = Monthly Salary / Total Days in Month

Payable Days = Present Days + Paid Sundays + Holidays + Paid Leaves + (Half Days × 0.5)

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

## Benefits of Dynamic Calculation

1. **Always Accurate:** Attendance details calculated from current status
2. **Auto-Updates:** Manual attendance edits immediately reflect in payslips
3. **No Data Duplication:** No need to store attendance details in payslips
4. **Single Source of Truth:** All attendance data lives in `attendance_records`
5. **Flexible:** Easy to add new status types without schema changes
6. **Consistent:** Same calculation logic used everywhere

## Frontend Integration

The frontend remains the same - it receives the calculated values from the backend API. The attendance details are calculated on the fly when fetching payslips, ensuring they're always up to date.
