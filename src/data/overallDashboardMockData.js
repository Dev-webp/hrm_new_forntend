/**
 * VJC Overseas Unified Portal - Executive Dashboard Mock Data
 * Centralized mock data for the executive dashboard
 */

export const overallDashboardMockData = {
  hrms: {
    totalEmployees: 26,
    presentToday: 5,
    absentToday: 21,
    lateToday: 0,
    pendingLeaveRequests: 6,
    lateMTD: 8,
    absencesMTD: 456,
    dailyAttendance: Array.from({ length: 23 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      present: Math.floor(Math.random() * 10) + 2,
      late: Math.floor(Math.random() * 3),
      absent: Math.floor(Math.random() * 20) + 5,
    })),
  },
  invoice: {
    totalSales: 1169600,
    paymentsReceived: 920000,
    pendingAmount: 249600,
    customers: 128,
    totalInvoices: 342,
    invoiceApprovals: {
      approved: 286,
      pending: 42,
      rejected: 14,
    },
    monthlyData: [
      { month: 'Apr', sales: 850000, receipts: 720000, expenses: 150000 },
      { month: 'May', sales: 920000, receipts: 780000, expenses: 180000 },
      { month: 'Jun', sales: 1050000, receipts: 890000, expenses: 200000 },
      { month: 'Jul', sales: 980000, receipts: 820000, expenses: 170000 },
      { month: 'Aug', sales: 1100000, receipts: 950000, expenses: 190000 },
      { month: 'Sep', sales: 1080000, receipts: 900000, expenses: 185000 },
      { month: 'Oct', sales: 1169600, receipts: 920000, expenses: 210000 },
    ],
  },
  ops: {
    totalLeads: 342,
    leadsCreatedToday: 28,
    casesPendingAudit: 18,
    auditCallsToday: { approved: 15, rejected: 3 },
    auditCallsMonth: { approved: 120, rejected: 20 },
    casePipeline: {
      counselor: 98,
      qualityAudit: 64,
      ops: 52,
      caseOfficer: 78,
      visaOutcome: 50,
    },
  },
  alerts: [
    {
      type: 'absent',
      label: 'Employees absent today',
      count: 21,
      route: '/admin/attendance',
      severity: 'warning',
    },
    {
      type: 'payments',
      label: 'Payment pending amount',
      count: 249600,
      route: '/admin/invoice',
      severity: 'danger',
    },
    {
      type: 'audit',
      label: 'Cases pending audit',
      count: 18,
      route: '/admin/ops/cases',
      severity: 'warning',
    },
    {
      type: 'approvals',
      label: 'Pending approvals',
      count: 48,
      route: '/admin/leave',
      severity: 'good',
    },
  ],
  pendingWork: [
    {
      icon: '👤',
      title: 'Approve leave requests',
      count: 6,
      route: '/admin/leave',
    },
    {
      icon: '💰',
      title: 'Invoice approvals',
      count: 42,
      route: '/admin/invoice/approvals',
    },
    {
      icon: '📋',
      title: 'Quality audits',
      count: 18,
      route: '/admin/ops/audit',
    },
    {
      icon: '🎯',
      title: 'Manage leads',
      count: 28,
      route: '/admin/ops/leads',
    },
  ],
  lastUpdated: new Date().toISOString(),
};

export const formatIndianCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCompactCurrency = (value) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  return formatIndianCurrency(value);
};

export const calculateCollectionPercentage = (received, total) => {
  if (total === 0) return 0;
  return ((received / total) * 100).toFixed(1);
};

export const calculateApprovalPercentage = (approved, total) => {
  if (total === 0) return 0;
  return ((approved / total) * 100).toFixed(1);
};
