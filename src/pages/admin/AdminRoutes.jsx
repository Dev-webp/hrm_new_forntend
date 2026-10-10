import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { getPlaceholderAdminRoutes } from "../../config/adminNav";
import { getStoredRole } from "../../utils/auth";
import AdminPlaceholder from "./AdminPlaceholder";

// ======================================================
// ADMIN MODULES
// ======================================================

const AdminAttendance = lazy(() => import("./AdminAttendance"));
const AdminAttendanceAnalysis = lazy(
  () => import("./AdminAttendanceAnalysis")
);
const AdminBreaks = lazy(() => import("./AdminBreaks"));
const AdminCalendar = lazy(() => import("./AdminCalendar"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminEmployees = lazy(() => import("./AdminEmployees"));
const AdminLeave = lazy(() => import("./AdminLeave"));
const AdminActivityLogs = lazy(() => import("./AdminActivityLogs"));
const AdminDepartment = lazy(() => import("./AdminDepartment"));
const AdminNotifications = lazy(() => import("./AdminNotifications"));
const AdminPayslip = lazy(() => import("./AdminPayslip"));
const AdminOfferLetters = lazy(() => import("./AdminOfferLetters"));
const OfferLetter = lazy(() => import("./OfferLetter"));
const ExperienceLetter = lazy(() => import("./ExperienceLetter"));
const LettersHome = lazy(() => import("./LettersHome"));
const AdminProfile = lazy(() => import("./AdminProfile"));


const ApprovalRequests = lazy(() => import("../../modules/invoice/ApprovalRequests"));
const RejectedInvoices = lazy(() => import("../../modules/invoice/RejectedInvoices"));


// ======================================================
// CRM MODULES
// ======================================================

const Leads = lazy(() => import("../../modules/crm/Leads"));
const Customers = lazy(() => import("../../modules/crm/Customers"));
const LeadProfileHistory = lazy(
  () => import("../../modules/crm/LeadProfilesHistory")
);

// ======================================================
// INVOICE MODULES
// ======================================================

const InvoiceDashboard = lazy(
  () => import("../../modules/invoice/Dashboard")
);

const Invoices = lazy(
  () => import("../../modules/invoice/Invoices")
);

const Quotes = lazy(
  () => import("../../modules/invoice/Quotes")
);

const Payments = lazy(
  () => import("../../modules/invoice/Payments")
);

const Expenses = lazy(
  () => import("../../modules/invoice/Expenses")
);



const InvoiceReports = lazy(
  () => import("../../modules/invoice/Reports")
);

const Items = lazy(
  () => import("../../modules/invoice/Items")
);

// ======================================================
// ADMIN ROUTES
// ======================================================

function AdminRoutes() {
  const today = new Date();

  const [currentBranch, setCurrentBranch] = useState("all");

  const [currentMonthStr, setCurrentMonthStr] = useState(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  });

  const role = getStoredRole();

  // ======================================================
  // ROLE PROTECTION
  // ======================================================

  if (role === "SUB_ADMIN") {
    return <Navigate to="/sub-admin" replace />;
  }

  if (role && role !== "SUPER_ADMIN") {
    return <Navigate to="/home" replace />;
  }

  // ======================================================
  // PLACEHOLDER ROUTES
  // ======================================================

  const placeholderSlugs = getPlaceholderAdminRoutes().map((path) =>
    path.replace("/admin/", "")
  );

  const placeholderProps = {
    branch: currentBranch,
    month: currentMonthStr,
    onBranchChange: setCurrentBranch,
    onMonthChange: setCurrentMonthStr,
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <RouteErrorBoundary title="Admin module error">
      <Suspense
        fallback={<PageLoading label="Loading admin module…" />}
      >
        <Routes>

          {/* ==================================================
              ADMIN DASHBOARD
          ================================================== */}

          <Route
            index
            element={<AdminDashboard />}
          />

          {/* ==================================================
              EMPLOYEES
          ================================================== */}

          <Route
            path="employees"
            element={<AdminEmployees />}
          />

          {/* ==================================================
              ATTENDANCE
          ================================================== */}

          <Route
            path="attendance"
            element={<AdminAttendance />}
          />

          <Route
            path="attendance-analysis"
            element={<AdminAttendanceAnalysis />}
          />

          {/* ==================================================
              BREAKS
          ================================================== */}

          <Route
            path="breaks"
            element={<AdminBreaks />}
          />

          {/* ==================================================
              CALENDAR
          ================================================== */}

          <Route
            path="calendar"
            element={<AdminCalendar />}
          />

          {/* ==================================================
              LEAVE
          ================================================== */}

          <Route
            path="leave"
            element={<AdminLeave />}
          />

          {/* ==================================================
              OFFER LETTERS / LETTERS
          ================================================== */}

          <Route
            path="offer-letters"
            element={<AdminOfferLetters />}
          />

          <Route
            path="letters"
            element={<LettersHome />}
          />

          <Route
            path="letters/offer"
            element={<OfferLetter />}
          />

          <Route
            path="letters/experience"
            element={<ExperienceLetter />}
          />

          {/* ==================================================
              PAYROLL
          ================================================== */}

          <Route
            path="payroll"
            element={<AdminPayslip />}
          />

          {/* ==================================================
              NOTIFICATIONS
          ================================================== */}

          <Route
            path="notifications"
            element={<AdminNotifications />}
          />

          {/* ==================================================
              PROFILE
          ================================================== */}

          <Route
            path="profile"
            element={<AdminProfile />}
          />

          {/* ==================================================
              ACTIVITY LOGS
          ================================================== */}

          <Route
            path="activity-logs"
            element={<AdminActivityLogs />}
          />

          {/* ==================================================
              DEPARTMENT
          ================================================== */}

          <Route
            path="department"
            element={<AdminDepartment />}
          />

          {/* ==================================================
              CRM (all wrapped in InvoiceGate — waits for the SSO
              token exchange to finish before rendering the page,
              fixing the "Invalid token on first load" race)
          ================================================== */}

          <Route
            path="crm/leads"
            element={<Leads />}
          />

          <Route
            path="crm/customers"
            element={<Customers />}
          />

          <Route
            path="crm/lead-history/:id"
            element={<LeadProfileHistory />}
          />

          {/* ==================================================
              INVOICE DASHBOARD
          ================================================== */}
          <Route path="invoice/approvals" element={<ApprovalRequests />} />
          <Route path="invoice/rejected" element={<RejectedInvoices />} />

          <Route
            path="invoice/dashboard"
            element={<InvoiceDashboard />}
          />

          {/* ==================================================
              INVOICES
          ================================================== */}

          <Route
            path="invoice/invoices"
            element={<Invoices />}
          />

          {/* ==================================================
              QUOTES
          ================================================== */}

          <Route
            path="invoice/quotes"
            element={<Quotes />}
          />

          {/* ==================================================
              PAYMENTS
          ================================================== */}

          <Route
            path="invoice/payments"
            element={<Payments />}
          />



          {/* ==================================================
              EXPENSES
          ================================================== */}

          <Route
            path="invoice/expenses"
            element={<Expenses />}
          />

      
          {/* ==================================================
              INVOICE REPORTS
          ================================================== */}

          <Route
            path="invoice/reports"
            element={<InvoiceReports />}
          />

          {/* ==================================================
              ITEMS
          ================================================== */}

          <Route
            path="invoice/items"
            element={<Items />}
          />

          {/* ==================================================
              PLACEHOLDER ADMIN ROUTES
          ================================================== */}

          {placeholderSlugs.map((slug) => (
            <Route
              key={slug}
              path={slug}
              element={
                <AdminPlaceholder
                  {...placeholderProps}
                />
              }
            />
          ))}

          {/* ==================================================
              CATCH UNKNOWN ADMIN ROUTES
          ================================================== */}

          <Route
            path="*"
            element={
              <AdminPlaceholder
                {...placeholderProps}
              />
            }
          />

        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default AdminRoutes;