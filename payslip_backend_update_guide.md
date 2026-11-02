# Backend Update Guide for Comprehensive Payslip

## Overview
This guide explains how to update your backend to store and calculate comprehensive salary details including present days, absent days, paid leaves, half days, sandwich days, and per-day calculations.

## Database Schema Updates

Run the SQL script provided in `payslip_schema_update.sql` to add the following columns to your `payslips` table:

- `present_days` - Number of present days
- `absent_days` - Number of absent days
- `paid_leaves` - Number of paid leaves taken
- `half_days` - Number of half days worked
- `sandwich_days` - Number of sandwich days
- `sundays` - Number of sundays in the month
- `holidays` - Number of holidays in the month
- `total_days` - Total days in the month

## Backend API Updates

### 1. Update Payslip Generation Endpoint

```javascript
// backend/routes/payslips.js
router.post('/generate', async (req, res) => {
  const { user_id, month, incentives, deductions, tax } = req.body;

  try {
    // Get employee details
    const empResult = await pool.query(
      'SELECT id, name, salary, joining_date FROM employees WHERE id = $1',
      [user_id]
    );
    const employee = empResult.rows[0];

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get month details
    const [year, monthNum] = month.split('-');
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate();

    // Get attendance data for the month
    const attendanceResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days
       FROM attendance_records
       WHERE user_id = $1 
       AND EXTRACT(YEAR FROM date) = $2 
       AND EXTRACT(MONTH FROM date) = $3`,
      [user_id, parseInt(year), parseInt(monthNum)]
    );

    const attendance = attendanceResult.rows[0];

    // Get paid leaves for the month
    const leaveResult = await pool.query(
      `SELECT COUNT(*) as paid_leaves
       FROM leave_requests
       WHERE user_id = $1
       AND status = 'approved'
       AND EXTRACT(YEAR FROM from_date) = $2
       AND EXTRACT(MONTH FROM from_date) = $3`,
      [user_id, parseInt(year), parseInt(monthNum)]
    );

    const paidLeaves = parseInt(leaveResult.rows[0].paid_leaves);

    // Get sundays in the month
    const sundays = countSundays(parseInt(year), parseInt(monthNum));

    // Get holidays in the month
    const holidayResult = await pool.query(
      `SELECT COUNT(*) as holidays
       FROM company_holidays
       WHERE EXTRACT(YEAR FROM date) = $2
       AND EXTRACT(MONTH FROM date) = $3`,
      [user_id, parseInt(year), parseInt(monthNum)]
    );

    const holidays = parseInt(holidayResult.rows[0].holidays);

    // Calculate sandwich days (using your existing sandwich policy)
    const sandwichResult = await pool.query(
      'SELECT * FROM sandwich_calculations WHERE user_id = $1 AND month = $2',
      [user_id, month]
    );

    const sandwichDays = sandwichResult.rows[0]?.sandwich_days || 0;

    // Calculate payable days
    const payableDays = (
      parseInt(attendance.present_days) +
      sundays +
      holidays +
      paidLeaves +
      parseInt(attendance.half_days) * 0.5
    );

    // Calculate daily rate
    const dailyRate = employee.salary / totalDaysInMonth;

    // Calculate earned salary
    const earnedBasic = dailyRate * payableDays;

    // Calculate leave deduction
    const leaveDeduction = Math.max(0, employee.salary - earnedBasic);

    // Calculate gross pay
    const grossPay = earnedBasic + Number(incentives || 0);

    // Calculate net pay
    const netPay = grossPay - Number(deductions || 0) - Number(tax || 0);

    // Insert or update payslip
    const insertResult = await pool.query(
      `INSERT INTO payslips (
        user_id, employee_code, full_name, department, branch, month,
        basic_salary, daily_rate, present_days, absent_days, paid_leaves,
        half_days, sandwich_days, sundays, holidays, total_days,
        payable_days, leave_deduction, earned_basic, incentives,
        deductions, tax, gross_pay, net_pay, payment_status, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) ON CONFLICT (user_id, month) DO UPDATE SET
        present_days = EXCLUDED.present_days,
        absent_days = EXCLUDED.absent_days,
        paid_leaves = EXCLUDED.paid_leaves,
        half_days = EXCLUDED.half_days,
        sandwich_days = EXCLUDED.sandwich_days,
        sundays = EXCLUDED.sundays,
        holidays = EXCLUDED.holidays,
        total_days = EXCLUDED.total_days,
        payable_days = EXCLUDED.payable_days,
        leave_deduction = EXCLUDED.leave_deduction,
        earned_basic = EXCLUDED.earned_basic,
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
        dailyRate,
        attendance.present_days || 0,
        attendance.absent_days || 0,
        paidLeaves,
        attendance.half_days || 0,
        sandwichDays,
        sundays,
        holidays,
        totalDaysInMonth,
        payableDays,
        leaveDeduction,
        earnedBasic,
        incentives || 0,
        deductions || 0,
        tax || 0,
        grossPay,
        netPay,
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

// Helper function to count sundays in a month
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
```

### 2. Update Payslip List Endpoint

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

### 3. Add Daily Rate Column to Payslips Table

```sql
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payable_days DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS leave_deduction DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS earned_basic DECIMAL(10, 2);
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS gross_pay DECIMAL(10, 2);

COMMENT ON COLUMN payslips.daily_rate IS 'Daily salary rate (monthly salary / total days)';
COMMENT ON COLUMN payslips.payable_days IS 'Total payable days (present + sundays + holidays + paid leaves + half days)';
COMMENT ON COLUMN payslips.leave_deduction IS 'Deduction for unpaid leaves';
COMMENT ON COLUMN payslips.earned_basic IS 'Salary after leave deduction';
COMMENT ON COLUMN payslips.gross_pay IS 'Gross pay (earned basic + incentives)';
```

## Salary Calculation Formula

The salary is calculated as follows:

```
Daily Rate = Monthly Salary / Total Days in Month

Payable Days = Present Days + Sundays + Holidays + Paid Leaves + (Half Days × 0.5)

Earned Basic = Daily Rate × Payable Days

Leave Deduction = Monthly Salary - Earned Basic

Gross Pay = Earned Basic + Incentives

Net Pay = Gross Pay - Deductions - Tax
```

## Frontend Integration

The frontend has been updated to display:
- Per-day salary calculation
- Present days, absent days, paid leaves, half days
- Sandwich days
- Sundays and holidays
- Total payable days
- Complete salary breakdown with calculations

## Testing

1. Run the SQL schema update script
2. Update the backend payslip generation endpoint
3. Test generating a payslip for an employee
4. Verify all attendance details are stored correctly
5. Verify the salary calculation matches the formula
6. Test the payslip list to ensure all columns are displayed
