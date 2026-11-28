import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import ManagerPlaceholder from "../manager/ManagerPlaceholder";

const OpsRoutes = lazy(() => import("../../modules/ops/OpsRoutes"));
const EmployeeAttendance = lazy(() => import("../employee/EmployeeAttendance"));
const EmployeeDashboard = lazy(() => import("../employee/EmployeeDashboard"));
const EmployeeHelpCenter = lazy(() => import("../employee/EmployeeHelpCenter"));
const EmployeeInstructions = lazy(() => import("../employee/EmployeeInstructions"));
const EmployeeLeave = lazy(() => import("../employee/EmployeeLeave"));
const EmployeePayslip = lazy(() => import("../employee/EmployeePayslip"));
const EmployeeTasks = lazy(() => import("../employee/EmployeeTasks"));
const EmployeeMessages = lazy(() => import("../employee/EmployeeMessages"));
const ManagerAttendance = lazy(() => import("../manager/ManagerAttendance"));
const ManagerBreaks = lazy(() => import("../manager/ManagerBreaks"));
const Invoices = lazy(() => import("../../modules/invoice/Invoices"));
const RejectedInvoices = lazy(() => import("../../modules/invoice/RejectedInvoices"));
const Quotes = lazy(() => import("../../modules/invoice/Quotes"));
const Payments = lazy(() => import("../../modules/invoice/Payments"));
const Expenses = lazy(() => import("../../modules/invoice/Expenses"));
const ApprovalRequests = lazy(() => import("../../modules/invoice/ApprovalRequests"));
const Leads = lazy(() => import("../../modules/crm/Leads"));
const Customers = lazy(() => import("../../modules/crm/Customers"));
const Reports = lazy(() => import("../../modules/invoice/Reports"));
const Items = lazy(() => import("../../modules/invoice/Items"));

export default function SubAdminRoutes() {
  return (
    <RouteErrorBoundary title="Sub Admin module error">
      <Suspense fallback={<PageLoading label="Loading sub admin module…" />}>
        <Routes>
          <Route index element={<EmployeeDashboard embedded />} />
          <Route path="dashboard" element={<EmployeeDashboard embedded />} />
          <Route path="attendance" element={<ManagerAttendance />} />
          <Route path="calendar" element={<EmployeeAttendance embedded />} />
          <Route path="breaks" element={<ManagerBreaks />} />
          <Route path="leave" element={<EmployeeLeave embedded />} />
          <Route path="tasks" element={<EmployeeTasks embedded />} />
          <Route path="messages" element={<EmployeeMessages embedded />} />
          <Route path="payslip" element={<EmployeePayslip embedded />} />
          <Route path="instructions" element={<EmployeeInstructions embedded />} />
          <Route path="notifications" element={<ManagerPlaceholder title="Notifications" />} />
          <Route path="help-center" element={<EmployeeHelpCenter embedded />} />
          <Route path="ops/*" element={<OpsRoutes />} />
          <Route path="invoice/approvals" element={<ApprovalRequests />} />
          <Route path="invoice/invoices" element={<Invoices />} />
          <Route path="invoice/rejected" element={<RejectedInvoices />} />
          <Route path="invoice/quotes" element={<Quotes />} />
          <Route path="invoice/payments" element={<Payments />} />
          <Route path="invoice/expenses" element={<Expenses />} />
          <Route path="invoice/reports" element={<Reports />} />
          <Route path="invoice/items" element={<Items />} />
          <Route path="crm/leads" element={<Leads />} />
          <Route path="crm/customers" element={<Customers />} />
          <Route path="*" element={<Navigate to="/sub-admin" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
