import { useState, useMemo, useEffect } from "react";
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("vjc_invoice_auth");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
// Reports already connected to real backend data
const API_REPORT_MAP = {
  salesByCustomer:        "/reports/sales-by-customer",
  salesByItem:            "/reports/sales-by-item",
  salesBySalesPerson:     "/reports/sales-by-salesperson",
  invoiceDetails:         "/reports/invoice-details",
  quoteDetails:           "/reports/quote-details",
  paymentsReceived:       "/reports/payments-received",
  arAgingSummary:         "/reports/ar-aging-summary",
  customerBalanceSummary: "/reports/customer-balance-summary",
  leadSourceReport:       "/reports/lead-source",         // NEW
  agentPerformanceReport: "/reports/agent-performance",   // NEW
};

// ─── Mock Data (for reports not yet connected — Expenses/Taxes/Projects/Activity) ──
const MOCK_DATA = {
  salesBySalesPerson: [
    { person: "Ravi Kumar", invoices: 14, amount: 280000, commission: 14000 },
    { person: "Priya Sharma", invoices: 10, amount: 190000, commission: 9500 },
    { person: "Arun Reddy", invoices: 4, amount: 92000, commission: 4600 },
  ],
  expenseDetails: [
    { expNo: "EXP-001", date: "2026-06-01", category: "Travel", customer: "ABC Pvt Ltd", amount: 5000, status: "Billable" },
    { expNo: "EXP-002", date: "2026-06-02", category: "Office Supplies", customer: "-", amount: 2000, status: "Non Billable" },
    { expNo: "EXP-003", date: "2026-06-03", category: "Meals", customer: "XYZ Solutions", amount: 1500, status: "Invoiced" },
    { expNo: "EXP-004", date: "2026-06-05", category: "Software", customer: "-", amount: 3000, status: "Non Billable" },
  ],
  expensesByCategory: [
    { category: "Travel", count: 3, amount: 12000 },
    { category: "Office Supplies", count: 5, amount: 8500 },
    { category: "Meals", count: 4, amount: 6000 },
    { category: "Software", count: 2, amount: 6000 },
  ],
  timesheetDetails: [
    { logNo: "TL-001", project: "Website Redesign", customer: "ABC Pvt Ltd", task: "UI Design", hours: 3.5, billable: true, amount: 5250 },
    { logNo: "TL-002", project: "Website Redesign", customer: "ABC Pvt Ltd", task: "Frontend Dev", hours: 5.0, billable: true, amount: 7500 },
    { logNo: "TL-003", project: "ERP Integration", customer: "XYZ Solutions", task: "API Integration", hours: 4.0, billable: false, amount: 0 },
    { logNo: "TL-004", project: "Mobile App", customer: "Global Tech", task: "Testing", hours: 2.5, billable: true, amount: 3750 },
  ],
  projectSummary: [
    { project: "Website Redesign", customer: "ABC Pvt Ltd", hours: 28.5, billableHrs: 24, revenue: 36000, status: "Active" },
    { project: "ERP Integration", customer: "XYZ Solutions", hours: 40.0, billableHrs: 30, revenue: 45000, status: "Active" },
    { project: "Mobile App", customer: "Global Tech", hours: 60.0, billableHrs: 55, revenue: 82500, status: "Completed" },
  ],
  taxSummary: [
    { quarter: "Q1 2026", tdsDeducted: 12000, tcsCollected: 3500, netTax: 8500 },
    { quarter: "Q4 2025", tdsDeducted: 9800, tcsCollected: 2800, netTax: 7000 },
    { quarter: "Q3 2025", tdsDeducted: 8500, tcsCollected: 2100, netTax: 6400 },
  ],
  activityLogs: [
    { date: "2026-06-10 10:32", user: "Admin", action: "Invoice INV-004 created", module: "Invoices" },
    { date: "2026-06-10 09:18", user: "Admin", action: "Payment received for INV-003", module: "Payments" },
    { date: "2026-06-09 16:45", user: "Admin", action: "Expense EXP-004 added", module: "Expenses" },
    { date: "2026-06-09 14:20", user: "Admin", action: "Project 'Mobile App' closed", module: "Time Tracking" },
  ],
};

// ─── Report Catalog ───────────────────────────────────────────────────────────
const REPORT_CATEGORIES = [
  {
    id: "sales",
    icon: "📊",
    label: "Sales",
    reports: [
      { id: "salesByCustomer", label: "Sales by Customer", desc: "Revenue breakdown per customer" },
      { id: "salesByItem", label: "Sales by Item", desc: "Top selling products/services" },
      { id: "salesBySalesPerson", label: "Sales by Sales Person", desc: "Performance by sales rep" },
    ],
  },
  {
    id: "leads",
    icon: "👥",
    label: "Leads",
    reports: [
      { id: "leadSourceReport", label: "Lead Source Report", desc: "Leads received per source (Google Ads, Facebook, Organic, Walk-ins)" },
      { id: "agentPerformanceReport", label: "Agent Performance Report", desc: "Leads closed and Red Flags per agent" },
    ],
  },
  {
    id: "receivables",
    icon: "📋",
    label: "Receivables",
    reports: [
      { id: "arAgingSummary", label: "AR Aging Summary", desc: "Outstanding dues by age bucket" },
      { id: "arAgingDetails", label: "AR Aging Details", desc: "Detailed aging per invoice" },
      { id: "invoiceDetails", label: "Invoice Details", desc: "All invoices with status" },
      { id: "quoteDetails", label: "Quote Details", desc: "All quotes and conversion rates" },
      { id: "badDebts", label: "Bad Debts", desc: "Written off receivables" },
      { id: "bankCharges", label: "Bank Charges", desc: "Bank fee breakdown" },
      { id: "customerBalanceSummary", label: "Customer Balance Summary", desc: "Net balance per customer" },
      { id: "receivableSummary", label: "Receivable Summary", desc: "Total outstanding summary" },
      { id: "receivableDetails", label: "Receivable Details", desc: "Line-by-line receivable records" },
    ],
  },
  {
    id: "payments",
    icon: "💳",
    label: "Payments Received",
    reports: [
      { id: "paymentsReceived", label: "Payments Received", desc: "All incoming payments" },
      { id: "timeToGetPaid", label: "Time to Get Paid", desc: "Avg days to collect payment" },
      { id: "refundHistory", label: "Refund History", desc: "Refunds issued to customers" },
      { id: "withholdingTax", label: "Withholding Tax", desc: "Tax withheld at source" },
    ],
  },
  {
    id: "expenses",
    icon: "🧾",
    label: "Purchases and Expenses",
    reports: [
      { id: "expenseDetails", label: "Expense Details", desc: "All expense transactions" },
      { id: "expensesByCategory", label: "Expenses by Category", desc: "Spend breakdown by type" },
      { id: "expensesByCustomer", label: "Expenses by Customer", desc: "Client-wise expense tracking" },
      { id: "expensesByProject", label: "Expenses by Project", desc: "Project cost analysis" },
      { id: "billableExpenseDetails", label: "Billable Expense Details", desc: "Billable vs non-billable" },
    ],
  },
  {
    id: "taxes",
    icon: "🏛️",
    label: "Taxes",
    reports: [
      { id: "tdsReceivableSummary", label: "TDS Receivable Summary", desc: "TDS deducted summary" },
      { id: "tcsPayableSummary", label: "TCS Payable Summary (Form No. 27EQ)", desc: "TCS collected details" },
    ],
  },
  {
    id: "projects",
    icon: "⏱️",
    label: "Projects and Timesheet",
    reports: [
      { id: "timesheetDetails", label: "Timesheet Details", desc: "All logged time entries" },
      { id: "projectSummary", label: "Project Summary", desc: "Hours and revenue per project" },
      { id: "projectDetails", label: "Project Details", desc: "Detailed project breakdown" },
      { id: "projectsRevenueSummary", label: "Projects Revenue Summary", desc: "Revenue earned from projects" },
    ],
  },
  {
    id: "activity",
    icon: "📝",
    label: "Activity",
    reports: [
      { id: "systemMails", label: "System Mails", desc: "Emails sent from the system" },
      { id: "activityLogs", label: "Activity Logs & Audit Trail", desc: "All user actions logged" },
      { id: "exceptionReport", label: "Exception Report", desc: "Errors and anomalies" },
      { id: "portalActivities", label: "Portal Activities", desc: "Customer portal usage" },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) { return `₹${Number(n || 0).toLocaleString("en-IN")}`; }

function StatusBadge({ status }) {
  const map = {
    Paid: "#34a853", Overdue: "#ea4335", Pending: "#fbbc04", Sent: "#1a73e8",
    Draft: "#888", Unpaid: "#fbbc04", "Partially Paid": "#1a73e8", Cancelled: "#888",
    Accepted: "#34a853", Rejected: "#ea4335", Expired: "#fbbc04", Invoiced: "#34a853",
    Billable: "#1a73e8", "Non Billable": "#fbbc04",
    Active: "#34a853", Completed: "#888",
  };
  const c = map[status] || "#888";
  return (
    <span style={{ background: `${c}18`, color: c, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  );
}

function Table({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f7f8fc" }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: "10px 14px", textAlign: "left", color: "#888", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: 32, color: "#bbb" }}>No data available</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} style={{ borderTop: "1px solid #f0f0f0" }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: "11px 14px", color: c.mono ? "#1a73e8" : "#333", fontWeight: c.bold ? 600 : 400 }}>
                  {c.badge ? <StatusBadge status={row[c.key]} /> : c.currency ? fmt(row[c.key]) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Report Views ─────────────────────────────────────────────────────────────
function ReportView({ reportId, onBack }) {
  const [liveData, setLiveData] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dateRange, setDateRange] = useState("thisMonth");

  const [spYear, setSpYear]   = useState(String(new Date().getFullYear()));
  const [spMonth, setSpMonth] = useState("all");
  const [spDay, setSpDay]     = useState("all");

  const apiPath = API_REPORT_MAP[reportId];
  const isSalesPersonReport =
    reportId === "salesBySalesPerson" ||
    reportId === "leadSourceReport" ||
    reportId === "agentPerformanceReport";
  useEffect(() => {
    if (!apiPath) return;
    let active = true;
    setLoading(true);
    setError("");
    const params = isSalesPersonReport
      ? { year: spYear, month: spMonth !== "all" ? spMonth : undefined, day: spDay !== "all" ? spDay : undefined }
      : { dateRange };
    API.get(apiPath, { params })
      .then((res) => { if (active) setLiveData(res.data.data || []); })
      .catch(() => { if (active) setError("Failed to load report data.please check whether the backend is running."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reportId, dateRange, spYear, spMonth, spDay]);
  const views = {
    // ✅ CONNECTED TO BACKEND
    salesByCustomer: () => (
      <>
        <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Total Revenue", val: fmt(liveData.reduce((s, r) => s + r.amount, 0)) },
            { label: "Total Paid", val: fmt(liveData.reduce((s, r) => s + r.paid, 0)), color: "#34a853" },
            { label: "Outstanding", val: fmt(liveData.reduce((s, r) => s + r.outstanding, 0)), color: "#ea4335" },
            { label: "Customers", val: liveData.length },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 140, background: "#f7f8fc", borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, color: "#888" }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color || "#1a73e8" }}>{s.val}</div>
            </div>
          ))}
        </div>
        <Table
          columns={[
            { key: "customer", label: "Customer", mono: true },
            { key: "invoices", label: "Invoices", bold: true },
            { key: "amount", label: "Total Amount", currency: true, bold: true },
            { key: "paid", label: "Paid", currency: true },
            { key: "outstanding", label: "Outstanding", currency: true },
          ]}
          rows={liveData}
        />
      </>
    ),

    salesByItem: () => (
  <Table
    columns={[
      { key: "item", label: "Item / Service", mono: true },
      { key: "qty", label: "Qty Sold", bold: true },
      { key: "amount", label: "Total Amount", currency: true, bold: true },
      { key: "paid", label: "Paid", currency: true },
      { key: "pending", label: "Pending", currency: true },
      { key: "avgPrice", label: "Avg Price", currency: true },
    ]}
    rows={liveData}
  />
),

    invoiceDetails: () => (
      <Table
        columns={[
          { key: "invoiceNo", label: "Invoice No", mono: true },
          { key: "customer", label: "Customer" },
          { key: "date", label: "Date" },
          { key: "dueDate", label: "Due Date" },
          { key: "amount", label: "Total Amount", currency: true, bold: true },
          { key: "paid", label: "Paid", currency: true },
          { key: "balance", label: "Balance", currency: true },
          { key: "status", label: "Status", badge: true },
        ]}
        rows={liveData}
      />
    ),

    quoteDetails: () => (
      <Table
        columns={[
          { key: "quoteNo", label: "Quote No", mono: true },
          { key: "customer", label: "Customer" },
          { key: "date", label: "Date" },
          { key: "expiryDate", label: "Expiry Date" },
          { key: "amount", label: "Amount", currency: true, bold: true },
          { key: "status", label: "Status", badge: true },
        ]}
        rows={liveData}
      />
    ),

    paymentsReceived: () => (
      <>
        <div style={{ marginBottom: 14, padding: "12px 16px", background: "#e8f5e9", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#34a853" }}>
          Total Collected: {fmt(liveData.reduce((s, r) => s + r.amount, 0))}
        </div>
        <Table
          columns={[
            { key: "date", label: "Date" },
            { key: "customer", label: "Customer", mono: true },
            { key: "invoiceNo", label: "Invoice No" },
            { key: "mode", label: "Payment Mode" },
            { key: "amount", label: "Amount", currency: true, bold: true },
          ]}
          rows={liveData}
        />
      </>
    ),

    arAgingSummary: () => (
      <>
        <div style={{ marginBottom: 14, padding: "10px 16px", background: "#fff3cd", borderRadius: 8, fontSize: 13, color: "#856404" }}>
          ⚠️ Customers with overdue amounts shown below. Follow up recommended for 60+ days buckets.
        </div>
        <Table
          columns={[
            { key: "customer", label: "Customer", mono: true },
            { key: "current", label: "Current", currency: true },
            { key: "days30", label: "1-30 Days", currency: true },
            { key: "days60", label: "31-60 Days", currency: true },
            { key: "days90", label: "61-90 Days", currency: true },
            { key: "total", label: "Total Due", currency: true, bold: true },
          ]}
          rows={liveData}
        />
      </>
    ),

    customerBalanceSummary: () => (
      <Table
        columns={[
          { key: "customerId", label: "Customer ID", mono: true },
          { key: "customer", label: "Customer" },
          { key: "outstanding", label: "Outstanding", currency: true, bold: true },
          { key: "totalPayments", label: "Total Payments", currency: true },
        ]}
        rows={liveData}
      />
    ),

    // ── Below: still MOCK_DATA (backend table not built yet) ──
    salesBySalesPerson: () => {
  const [spSearch, setSpSearch] = useState("");
  const filtered = liveData.filter(r =>
    r.person?.toLowerCase().includes(spSearch.toLowerCase()) ||
    r.email?.toLowerCase().includes(spSearch.toLowerCase())
  );
  const totalSale = liveData.reduce((s, r) => s + r.amount, 0);
  const totalPaid = liveData.reduce((s, r) => s + r.paid, 0);
  const totalPending = liveData.reduce((s, r) => s + r.pending, 0);
  const totalInvoices = liveData.reduce((s, r) => s + r.invoices, 0);
  return (
    <>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { label: "Total Sale (Approved)", val: fmt(totalSale), color: "#1a73e8" },
          { label: "Received", val: fmt(totalPaid), color: "#34a853" },
          { label: "Pending", val: fmt(totalPending), color: "#ea4335" },
          { label: "Approved Invoices", val: totalInvoices },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 160, background: "#f7f8fc", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 12, color: "#888" }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color || "#1a1a2e" }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 14 }}>
        <input
          placeholder="Search by name or email..."
          value={spSearch}
          onChange={e => setSpSearch(e.target.value)}
          style={{
            padding: "8px 14px", border: "1px solid #ddd",
            borderRadius: 8, fontSize: 13, width: 280, outline: "none"
          }}
        />
      </div>
      <Table
        columns={[
          { key: "person", label: "Sales Person", mono: true },
          { key: "email", label: "Email" },
          { key: "invoices", label: "Invoices", bold: true },
          { key: "amount", label: "Total Sales", currency: true, bold: true },
          { key: "paid", label: "Paid", currency: true },
          { key: "pending", label: "Pending", currency: true },
        ]}
        rows={filtered}
      />
    </>
  );
},
        // NEW — Lead Source Report
    leadSourceReport: () => {
      const totalLeads = liveData.reduce((s, r) => s + Number(r.count || 0), 0);
      return (
        <>
          <div style={{ marginBottom: 14, padding: "12px 16px", background: "#f7f8fc", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#333" }}>
            Total Leads: {totalLeads}
          </div>
          <Table
            columns={[
              { key: "source", label: "Source", mono: true },
              { key: "count", label: "No. of Leads", bold: true },
              { key: "closed", label: "Closed" },
              { key: "conversionRate", label: "Conversion %" },
            ]}
            rows={liveData}
          />
        </>
      );
    },

    // NEW — Agent Performance Report
    agentPerformanceReport: () => (
      <Table
        columns={[
          { key: "agent", label: "Agent", mono: true },
          { key: "totalLeads", label: "Total Leads Assigned", bold: true },
          { key: "closed", label: "Leads Closed" },
          { key: "redFlags", label: "Red Flags", badge: false },
        ]}
        rows={liveData}
      />
    ),

    expenseDetails: () => (
      <Table
        columns={[
          { key: "expNo", label: "Exp No", mono: true },
          { key: "date", label: "Date" },
          { key: "category", label: "Category" },
          { key: "customer", label: "Customer" },
          { key: "amount", label: "Amount", currency: true, bold: true },
          { key: "status", label: "Status", badge: true },
        ]}
        rows={MOCK_DATA.expenseDetails}
      />
    ),
    expensesByCategory: () => (
      <>
        <div style={{ marginBottom: 14, padding: "12px 16px", background: "#f7f8fc", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#333" }}>
          Total Spend: {fmt(MOCK_DATA.expensesByCategory.reduce((s, r) => s + r.amount, 0))}
        </div>
        <Table
          columns={[
            { key: "category", label: "Category", mono: true },
            { key: "count", label: "No. of Expenses", bold: true },
            { key: "amount", label: "Total Amount", currency: true, bold: true },
          ]}
          rows={MOCK_DATA.expensesByCategory}
        />
      </>
    ),
    timesheetDetails: () => (
      <>
        <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
          {[
            { label: "Total Hours", val: `${MOCK_DATA.timesheetDetails.reduce((s, r) => s + r.hours, 0).toFixed(1)} hrs`, color: "#1a73e8" },
            { label: "Billable Hours", val: `${MOCK_DATA.timesheetDetails.filter(r => r.billable).reduce((s, r) => s + r.hours, 0).toFixed(1)} hrs`, color: "#34a853" },
            { label: "Billable Amount", val: fmt(MOCK_DATA.timesheetDetails.reduce((s, r) => s + r.amount, 0)), color: "#34a853" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, minWidth: 140, background: "#f7f8fc", borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ fontSize: 12, color: "#888" }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        <Table
          columns={[
            { key: "logNo", label: "Log No", mono: true },
            { key: "project", label: "Project" },
            { key: "customer", label: "Customer" },
            { key: "task", label: "Task" },
            { key: "hours", label: "Hours", bold: true },
            { key: "amount", label: "Amount", currency: true, bold: true },
          ]}
          rows={MOCK_DATA.timesheetDetails}
        />
      </>
    ),
    projectSummary: () => (
      <Table
        columns={[
          { key: "project", label: "Project", mono: true },
          { key: "customer", label: "Customer" },
          { key: "hours", label: "Total Hours", bold: true },
          { key: "billableHrs", label: "Billable Hrs" },
          { key: "revenue", label: "Revenue", currency: true, bold: true },
          { key: "status", label: "Status", badge: true },
        ]}
        rows={MOCK_DATA.projectSummary}
      />
    ),
    tdsReceivableSummary: () => (
      <Table
        columns={[
          { key: "quarter", label: "Quarter", mono: true },
          { key: "tdsDeducted", label: "TDS Deducted", currency: true, bold: true },
          { key: "tcsCollected", label: "TCS Collected", currency: true },
          { key: "netTax", label: "Net Tax Payable", currency: true, bold: true },
        ]}
        rows={MOCK_DATA.taxSummary}
      />
    ),
    tcsPayableSummary: () => (
      <Table
        columns={[
          { key: "quarter", label: "Quarter", mono: true },
          { key: "tcsCollected", label: "TCS Collected (27EQ)", currency: true, bold: true },
          { key: "tdsDeducted", label: "TDS Deducted", currency: true },
          { key: "netTax", label: "Net Payable", currency: true, bold: true },
        ]}
        rows={MOCK_DATA.taxSummary}
      />
    ),
    activityLogs: () => (
      <Table
        columns={[
          { key: "date", label: "Date & Time", mono: true },
          { key: "user", label: "User" },
          { key: "module", label: "Module" },
          { key: "action", label: "Action", bold: true },
        ]}
        rows={MOCK_DATA.activityLogs}
      />
    ),
  };

  // Find report label
  let reportLabel = reportId;
  let categoryLabel = "";
  REPORT_CATEGORIES.forEach(cat => {
    cat.reports.forEach(r => {
      if (r.id === reportId) { reportLabel = r.label; categoryLabel = cat.label; }
    });
  });

  const ViewComp = views[reportId];

  return (
    <div>
      {/* Back + Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid #ddd", borderRadius: 8,
          padding: "7px 14px", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 600
        }}>← Back</button>
        <div>
          <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{categoryLabel}</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1a1a2e" }}>{reportLabel}</h2>
        </div>
      </div>

      {/* Date Range + Export Bar */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 20, alignItems: "center",
        background: "#fff", borderRadius: 10, padding: "12px 18px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)", flexWrap: "wrap"
      }}>
       {isSalesPersonReport ? (
          <>
            <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Year:</span>
            <select value={spYear} onChange={e => setSpYear(e.target.value)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }}>
              {Array.from({ length: 10 }, (_, i) => 2026 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Month:</span>
            <select value={spMonth} onChange={e => { setSpMonth(e.target.value); setSpDay("all"); }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }}>
              <option value="all">All Months</option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Day:</span>
            <select value={spDay} onChange={e => setSpDay(e.target.value)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }}>
              <option value="all">All Days</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: "#888", fontWeight: 600 }}>Date Range:</span>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #ddd", fontSize: 13 }}>
              <option value="today">Today</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisQuarter">This Quarter</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button style={{
          padding: "7px 18px", borderRadius: 7, border: "1px solid #34a853",
          color: "#34a853", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>⬇ Export CSV</button>
        <button style={{
          padding: "7px 18px", borderRadius: 7, border: "1px solid #ea4335",
          color: "#ea4335", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>⬇ Export PDF</button>
        <button style={{
          padding: "7px 18px", borderRadius: 7, border: "none",
          color: "#fff", background: "#1a73e8", fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>🖨 Print</button>
      </div>

      {/* Report Content */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "20px 24px",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)"
      }}>
        {apiPath && loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
            <div style={{ fontSize: 14 }}>Loading report...</div>
          </div>
        ) : apiPath && error ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#ea4335" }}>
            <div style={{ fontSize: 14 }}>{error}</div>
          </div>
        ) : ViewComp ? <ViewComp /> : (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#bbb" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Report data coming soon</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>This report will show {reportLabel} data</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Reports() {
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(new Set(["salesByCustomer", "invoiceDetails"]));
  const [activeReport, setActiveReport] = useState(null);

  function toggleFav(id, e) {
    e.stopPropagation();
    setFavorites(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return REPORT_CATEGORIES;
    const q = search.toLowerCase();
    return REPORT_CATEGORIES.map(cat => ({
      ...cat,
      reports: cat.reports.filter(r =>
        r.label.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q) || cat.label.toLowerCase().includes(q)
      )
    })).filter(cat => cat.reports.length > 0);
  }, [search]);

  const favoriteReports = useMemo(() => {
    const all = [];
    REPORT_CATEGORIES.forEach(cat => cat.reports.forEach(r => { if (favorites.has(r.id)) all.push({ ...r, catLabel: cat.label }); }));
    return all;
  }, [favorites]);

  if (activeReport) {
    return (
      <div style={{ padding: "24px 28px", background: "#f7f8fc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
        <ReportView reportId={activeReport} onBack={() => setActiveReport(null)} />
      </div>
    );
  }

  return (
    <div style={{ padding: "0", background: "#f7f8fc", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* ── Hero Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        padding: "48px 0 36px",
        position: "relative", overflow: "hidden"
      }}>
        {["📊", "📋", "💳", "🧾", "⏱️", "📈", "🏛️", "📝"].map((ic, i) => (
          <span key={i} style={{
            position: "absolute", fontSize: 60, opacity: 0.05,
            top: `${10 + (i * 13) % 80}%`, left: `${(i * 12.5) % 100}%`,
            transform: "rotate(-15deg)", pointerEvents: "none"
          }}>{ic}</span>
        ))}
        <div style={{ textAlign: "center", position: "relative" }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Reports Center</h1>
          <p style={{ margin: "8px 0 24px", color: "#94a3b8", fontSize: 15 }}>
            Insights across Sales, Receivables, Expenses, Projects & more
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 560, maxWidth: "90vw" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 16 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search reports..."
                style={{
                  width: "100%", padding: "13px 16px 13px 42px",
                  borderRadius: 10, border: "none", fontSize: 15,
                  boxSizing: "border-box", outline: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.25)"
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 28px" }}>

        {/* ── Favorites ── */}
        {favoriteReports.length > 0 && !search && (
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
              ⭐ Favorites
            </h3>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {favoriteReports.map(r => (
                <div key={r.id} onClick={() => setActiveReport(r.id)} style={{
                  background: "#fff", borderRadius: 10, padding: "12px 18px",
                  cursor: "pointer", border: "2px solid #fbbc04",
                  boxShadow: "0 1px 6px rgba(251,188,4,0.15)",
                  transition: "transform 0.1s"
                }}>
                  <div style={{ fontSize: 12, color: "#aaa", marginBottom: 2 }}>{r.catLabel}</div>
                  <div style={{ fontWeight: 700, color: "#1a73e8", fontSize: 14 }}>{r.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Report Categories ── */}
        {filteredCategories.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#bbb" }}>
            <div style={{ fontSize: 48 }}>🔍</div>
            <div style={{ fontSize: 16, marginTop: 12 }}>No reports found for "{search}"</div>
          </div>
        )}

        {filteredCategories.map(cat => (
          <div key={cat.id} style={{ marginBottom: 28 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#1a1a2e", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{cat.icon}</span> {cat.label}
            </h3>
            <div style={{
              background: "#fff", borderRadius: 12,
              boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden"
            }}>
              {cat.reports.map((r, i) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center",
                  borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
                  padding: "0"
                }}>
                  <div
                    onClick={() => setActiveReport(r.id)}
                    style={{
                      flex: 1, padding: "14px 20px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f7f8fc"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <div style={{ color: "#1a73e8", fontWeight: 600, fontSize: 14 }}>{r.label}</div>
                      <div style={{ color: "#aaa", fontSize: 12, marginTop: 1 }}>{r.desc}</div>
                    </div>
                  </div>

                  <button
                    onClick={e => toggleFav(r.id, e)}
                    title={favorites.has(r.id) ? "Remove from favorites" : "Add to favorites"}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "14px 18px", fontSize: 18,
                      color: favorites.has(r.id) ? "#fbbc04" : "#ddd",
                      transition: "color 0.15s"
                    }}
                  >★</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── Summary Stats ── */}
        {!search && (
          <div style={{
            marginTop: 10, padding: "18px 24px", background: "#fff",
            borderRadius: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
            display: "flex", gap: 24, flexWrap: "wrap"
          }}>
            <div style={{ fontSize: 13, color: "#888" }}>
              <span style={{ fontWeight: 700, color: "#1a1a2e", fontSize: 22, marginRight: 6 }}>
                {REPORT_CATEGORIES.reduce((s, c) => s + c.reports.length, 0)}
              </span>Total Reports
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>
              <span style={{ fontWeight: 700, color: "#fbbc04", fontSize: 22, marginRight: 6 }}>{favorites.size}</span>Starred
            </div>
            <div style={{ fontSize: 13, color: "#888" }}>
              <span style={{ fontWeight: 700, color: "#34a853", fontSize: 22, marginRight: 6 }}>{REPORT_CATEGORIES.length}</span>Categories
            </div>
          </div>
        )}
      </div>
    </div>
  );
}