import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminRoutes from "./pages/admin/AdminRoutes";
import EmployeeRoutes from "./pages/employee/EmployeeRoutes";
import Login from "./pages/Login";
import ManagerRoutes from "./pages/manager/ManagerRoutes";
import { isAuthenticated } from "./utils/auth";

function RootRedirect() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
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
              path="/employee/*"
              element={
                <RequireAuth>
                  <EmployeeRoutes />
                </RequireAuth>
              }
            />

            <Route path="/home" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;