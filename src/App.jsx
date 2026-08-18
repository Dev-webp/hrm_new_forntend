import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import PageLoading from "./components/PageLoading";
import { getStoredRole, isAuthenticated } from "./utils/auth";

const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const AdminRoutes = lazy(() => import("./pages/admin/AdminRoutes"));
const EmployeeRoutes = lazy(() => import("./pages/employee/EmployeeRoutes"));
const Login = lazy(() => import("./pages/Login"));
const ManagerRoutes = lazy(() => import("./pages/manager/ManagerRoutes"));
const OperationalManagerRoutes = lazy(() => import("./pages/operations/OperationalManagerRoutes"));
const SubAdminRoutes = lazy(() => import("./pages/subadmin/SubAdminRoutes"));

function RootRedirect() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const role = getStoredRole();
  if (role === "OPERATIONAL_MANAGER") return <Navigate to="/operations" replace />;
  if (role === "MANAGER") return <Navigate to="/manager" replace />;
  if (role === "SUB_ADMIN") return <Navigate to="/sub-admin" replace />;
  if (role === "EMPLOYEE") return <Navigate to="/employee" replace />;
  return <Navigate to="/admin" replace />;
}

function App() {
  const [isPhone, setIsPhone] = useState(false);

useEffect(() => {
  const checkPhone = () => {
    const ua = navigator.userAgent || "";

    const touch =
      navigator.maxTouchPoints > 0 ||
      "ontouchstart" in window;

    const coarsePointer =
      window.matchMedia("(pointer: coarse)").matches;

    const smallViewport =
      Math.min(window.innerWidth, window.innerHeight) <= 600;

    const android = /Android/i.test(ua);
    const iphone = /iPhone|iPod/i.test(ua);
    const ipad = /iPad/i.test(ua);

    const androidPhone =
      android &&
      (
        /Mobile/i.test(ua) ||
        (touch && (coarsePointer || smallViewport))
      );

    const applePhone =
      iphone ||
      ipad && touch;

    const otherPhone =
      /Windows Phone|IEMobile|Opera Mini|BlackBerry/i.test(ua);

    const phone =
      androidPhone ||
      applePhone ||
      otherPhone ||
      (touch && coarsePointer && smallViewport);

    setIsPhone(phone);
  };

  checkPhone();

  window.addEventListener("resize", checkPhone);

  return () => {
    window.removeEventListener("resize", checkPhone);
  };
}, []);

  if (isPhone) {
    return (
      <div className="phone-blocked-message">
        <div className="phone-blocked-card">
          <div className="phone-blocked-icon">🖥️</div>

          <h1>Desktop Access Required</h1>

          <p>
            VJC HRMS is available only on desktop and laptop computers.
          </p>

          <p>
            Please open HRMS on a desktop or laptop to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="hrms-desktop-app">
      <BrowserRouter>
        <Suspense fallback={<PageLoading label="Loading HRMS…" />}>
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

            <Route
              path="/subadmin/*"
              element={
                <RequireAuth>
                  <DashboardLayout role="sub-admin" />
                </RequireAuth>
              }
            >
              <Route path="*" element={<SubAdminRoutes />} />
            </Route>

            <Route path="/home" element={<RootRedirect />} />

            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </div>
  );
}

export default App;
