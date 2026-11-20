import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { getStoredRole } from "../../utils/auth";

const EmployeeAttendance = lazy(() => import("./EmployeeAttendance"));
const EmployeeBreaks = lazy(() => import("./EmployeeBreaks"));
const EmployeeDashboard = lazy(() => import("./EmployeeDashboard"));
const EmployeeLeave = lazy(() => import("./EmployeeLeave"));
const EmployeeMessages = lazy(() => import("./EmployeeMessages"));
const EmployeePayslip = lazy(() => import("./EmployeePayslip"));
const EmployeeInstructions = lazy(() => import("./EmployeeInstructions"));
const EmployeeHelpCenter = lazy(() => import("./EmployeeHelpCenter"));
const EmployeeTasks = lazy(() => import("./EmployeeTasks"));
const EmployeeLeads = lazy(() => import("./EmployeeLeads"));
const EmployeeCustomers = lazy(() => import("./EmployeeCustomers"));
const EmployeeReports = lazy(() => import("./EmployeeReports"));
const EmployeeInvoices = lazy(() => import("./EmployeeInvoices"));
const EmployeeRejectedInvoices = lazy(() => import("./EmployeeRejectedInvoices"));
const EmployeeQuotes = lazy(() => import("./EmployeeQuotes"));
const EmployeePayments = lazy(() => import("./EmployeePayments"));
const EmployeeItems = lazy(() => import("./EmployeeItems"));
const EmployeeOps = lazy(() => import("./EmployeeOps"));
const EmployeeAWI = lazy(() => import("./EmployeeAWI"));
const EmployeeOnboarding = lazy(() => import("./EmployeeOnboarding"));
const EmployeeOffboarding = lazy(() => import("./EmployeeOffboarding"));
const EmployeeLifecycleOnboarding = lazy(() => import("./EmployeeLifecycleOnboarding"));

export default function EmployeeRoutes() {
  const role = getStoredRole();
  if (role === "SUB_ADMIN") {
    return <Navigate to="/sub-admin" replace />;
  }

  return (
    <RouteErrorBoundary title="Employee module error">
      <Suspense fallback={<PageLoading label="Loading employee module..." />}>
        <Routes>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="breaks" element={<EmployeeBreaks />} />
          <Route path="leave" element={<EmployeeLeave />} />
          <Route path="messages" element={<EmployeeMessages />} />
          <Route path="payslip" element={<EmployeePayslip />} />
          <Route path="instructions" element={<EmployeeInstructions />} />
          <Route path="help-center" element={<EmployeeHelpCenter />} />
          <Route path="tasks" element={<EmployeeTasks />} />
          <Route path="awi" element={<EmployeeAWI />} />
          <Route path="onboarding" element={<EmployeeOnboarding />} />
          <Route path="my-onboarding" element={<EmployeeLifecycleOnboarding />} />
          <Route path="offboarding" element={<EmployeeOffboarding />} />
          <Route path="crm/leads" element={<EmployeeLeads />} />
          <Route path="crm/customers" element={<EmployeeCustomers />} />
          <Route path="invoice/reports" element={<EmployeeReports />} />
          <Route path="invoice/invoices" element={<EmployeeInvoices />} />
          <Route path="invoice/rejected" element={<EmployeeRejectedInvoices />} />
          <Route path="invoice/quotes" element={<EmployeeQuotes />} />
          <Route path="invoice/payments" element={<EmployeePayments />} />
          <Route path="invoice/items" element={<EmployeeItems />} />
          <Route path="ops/*" element={<EmployeeOps />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}