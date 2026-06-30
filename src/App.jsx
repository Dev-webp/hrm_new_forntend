import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminRoutes from "./pages/admin/AdminRoutes";
import EmployeeRoutes from "./pages/employee/EmployeeRoutes";
import Login from "./pages/Login";
import ManagerRoutes from "./pages/manager/ManagerRoutes";
import OperationalManagerRoutes from "./pages/operations/OperationalManagerRoutes";
import SubAdminRoutes from "./pages/subadmin/SubAdminRoutes";
import { isAuthenticated } from "./utils/auth";

function RootRedirect() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  try {
    const role = JSON.parse(localStorage.getItem("user") || "{}")?.role;
    if (role === "OPERATIONAL_MANAGER") return <Navigate to="/operations" replace />;
    if (role === "MANAGER") return <Navigate to="/manager" replace />;
    if (role === "SUB_ADMIN") return <Navigate to="/sub-admin" replace />;
    if (role === "EMPLOYEE") return <Navigate to="/employee" replace />;
  } catch {
    // fall back to admin
  }
  return <Navigate to="/admin" replace />;
}

function App() {
  return (
    <>
      <div className="desktop-only-message">
        
      </div>

      <div className="hrms-desktop-app">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/admin/*"
              element={
                <RequireAuth>
                  <DashboardLayout role="admin" />
                </RequireAuth>
              }
            >
              <Route path="*" element={<AdminRoutes />} />
            </Route>

            <Route
              path="/manager/*"
              element={
                <RequireAuth>
                  <DashboardLayout role="manager" />
                </RequireAuth>
              }
            >
              <Route path="*" element={<ManagerRoutes />} />
            </Route>

            <Route
              path="/operations/*"
              element={
                <RequireAuth>
                  <DashboardLayout role="operational-manager" />
                </RequireAuth>
              }
            >
              <Route path="*" element={<OperationalManagerRoutes />} />
            </Route>

            <Route
              path="/employee/*"
              element={
                <RequireAuth>
                  <EmployeeRoutes />
                </RequireAuth>
              }
            />

            <Route
              path="/sub-admin/*"
              element={
                <RequireAuth>
                  <DashboardLayout role="sub-admin" />
                </RequireAuth>
              }
            >
              <Route path="*" element={<SubAdminRoutes />} />
            </Route>

            <Route path="/home" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;
