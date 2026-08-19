import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import RequireAuth from "./components/RequireAuth";
import PageLoading from "./components/PageLoading";
import {
  getStoredRole,
  isAuthenticated,
} from "./utils/auth";

const DashboardLayout = lazy(
  () => import("./layouts/DashboardLayout")
);

const AdminRoutes = lazy(
  () => import("./pages/admin/AdminRoutes")
);

const EmployeeRoutes = lazy(
  () => import("./pages/employee/EmployeeRoutes")
);

const Login = lazy(
  () => import("./pages/Login")
);

const ManagerRoutes = lazy(
  () => import("./pages/manager/ManagerRoutes")
);

const OperationalManagerRoutes = lazy(
  () =>
    import(
      "./pages/operations/OperationalManagerRoutes"
    )
);

const SubAdminRoutes = lazy(
  () =>
    import(
      "./pages/subadmin/SubAdminRoutes"
    )
);


// =====================================================
// MOBILE DEVICE CHECK
// =====================================================

function isMobileDevice() {
  const userAgent =
    navigator.userAgent ||
    navigator.vendor ||
    window.opera ||
    "";

  // 1. Normal mobile User-Agent
  const mobileUserAgent =
    /Android|iPhone|iPad|iPod|Windows Phone|IEMobile|Opera Mini|BlackBerry/i.test(
      userAgent
    );

  // 2. Touch device detection
  const touchDevice =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window;

  // 3. Small screen detection
  const smallScreen =
    Math.min(window.screen.width, window.screen.height) <= 900;

  // 4. Coarse pointer = usually touchscreen
  const coarsePointer =
    window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches;

  // Strong mobile indicators
  if (mobileUserAgent) {
    return true;
  }

  // Desktop-site mode on phones/tablets
  if (touchDevice && smallScreen && coarsePointer) {
    return true;
  }

  return false;
}

// =====================================================
// MOBILE ACCESS BLOCK SCREEN
// =====================================================

function MobileAccessDenied() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f5f7fa",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily:
          "Plus Jakarta Sans, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "450px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "40px 30px",
          textAlign: "center",
          boxShadow:
            "0 10px 40px rgba(0, 0, 0, 0.08)",
          boxSizing: "border-box",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: "#fff3e6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "38px",
          }}
        >
          💻
        </div>

        {/* Title */}
        <h1
          style={{
            margin: "0 0 14px",
            fontSize: "24px",
            fontWeight: "700",
            color: "#1f2937",
          }}
        >
          Desktop Access Required
        </h1>

        {/* Message */}
        <p
          style={{
            margin: "0 auto",
            maxWidth: "360px",
            fontSize: "15px",
            lineHeight: "1.7",
            color: "#6b7280",
          }}
        >
          VJC Overseas HRMS can only be accessed
          from a desktop or laptop.
        </p>

        <p
          style={{
            marginTop: "16px",
            marginBottom: "0",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "#9ca3af",
          }}
        >
          Please open this website using a desktop
          computer or laptop to continue.
        </p>
      </div>
    </div>
  );
}


// =====================================================
// ROOT REDIRECT
// =====================================================

function RootRedirect() {

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const role = getStoredRole();

  if (role === "OPERATIONAL_MANAGER") {
    return (
      <Navigate
        to="/operations"
        replace
      />
    );
  }

  if (role === "MANAGER") {
    return (
      <Navigate
        to="/manager"
        replace
      />
    );
  }

  if (role === "SUB_ADMIN") {
    return (
      <Navigate
        to="/sub-admin"
        replace
      />
    );
  }

  if (role === "EMPLOYEE") {
    return (
      <Navigate
        to="/employee"
        replace
      />
    );
  }

  return (
    <Navigate
      to="/admin"
      replace
    />
  );
}


// =====================================================
// APP
// =====================================================

function App() {

  const [mobileBlocked, setMobileBlocked] =
    useState(false);

  const [checkingDevice, setCheckingDevice] =
    useState(true);


  // ===================================================
  // CHECK DEVICE BEFORE SHOWING HRMS
  // ===================================================

  useEffect(() => {

    const mobile = isMobileDevice();

    setMobileBlocked(mobile);
    setCheckingDevice(false);

  }, []);


  // ===================================================
  // DEVICE CHECK LOADING
  // ===================================================

  if (checkingDevice) {
    return (
      <PageLoading
        label="Checking device…"
      />
    );
  }


  // ===================================================
  // BLOCK MOBILE DEVICES
  // ===================================================

  if (mobileBlocked) {
    return <MobileAccessDenied />;
  }


  // ===================================================
  // DESKTOP HRMS
  // ===================================================

  return (
    <div className="hrms-desktop-app">

      <BrowserRouter>

        <Suspense
          fallback={
            <PageLoading
              label="Loading HRMS…"
            />
          }
        >

          <Routes>

            {/* =================================================
                LOGIN
            ================================================= */}

            <Route
              path="/"
              element={<Login />}
            />

            <Route
              path="/login"
              element={<Login />}
            />


            {/* =================================================
                ADMIN
            ================================================= */}

            <Route
              path="/admin/*"
              element={
                <RequireAuth>
                  <DashboardLayout
                    role="admin"
                  />
                </RequireAuth>
              }
            >
              <Route
                path="*"
                element={<AdminRoutes />}
              />
            </Route>


            {/* =================================================
                MANAGER
            ================================================= */}

            <Route
              path="/manager/*"
              element={
                <RequireAuth>
                  <DashboardLayout
                    role="manager"
                  />
                </RequireAuth>
              }
            >
              <Route
                path="*"
                element={<ManagerRoutes />}
              />
            </Route>


            {/* =================================================
                OPERATIONAL MANAGER
            ================================================= */}

            <Route
              path="/operations/*"
              element={
                <RequireAuth>
                  <DashboardLayout
                    role="operational-manager"
                  />
                </RequireAuth>
              }
            >
              <Route
                path="*"
                element={
                  <OperationalManagerRoutes />
                }
              />
            </Route>


            {/* =================================================
                EMPLOYEE
            ================================================= */}

            <Route
              path="/employee/*"
              element={
                <RequireAuth>
                  <EmployeeRoutes />
                </RequireAuth>
              }
            />


            {/* =================================================
                SUB ADMIN
            ================================================= */}

            <Route
              path="/sub-admin/*"
              element={
                <RequireAuth>
                  <DashboardLayout
                    role="sub-admin"
                  />
                </RequireAuth>
              }
            >
              <Route
                path="*"
                element={
                  <SubAdminRoutes />
                }
              />
            </Route>


            {/* =================================================
                SUBADMIN
            ================================================= */}

            <Route
              path="/subadmin/*"
              element={
                <RequireAuth>
                  <DashboardLayout
                    role="sub-admin"
                  />
                </RequireAuth>
              }
            >
              <Route
                path="*"
                element={
                  <SubAdminRoutes />
                }
              />
            </Route>


            {/* =================================================
                HOME
            ================================================= */}

            <Route
              path="/home"
              element={<RootRedirect />}
            />


            {/* =================================================
                UNKNOWN ROUTES
            ================================================= */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Routes>

        </Suspense>

      </BrowserRouter>

    </div>
  );
}

export default App;