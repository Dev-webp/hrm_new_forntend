import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const INVOICE_API_URL = import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api";

const InvoiceAuthContext = createContext(null);

// Mount this ONCE, wrapping the whole authenticated app shell (e.g. inside
// DashboardLayout, above <Sidebar/> and <Outlet/>) — NOT just the CRM/Invoice
// route subtree. It fires the SSO exchange as soon as the user is known to
// have invoice_access, so the sidebar can filter Finance/CRM items on first
// paint instead of only after someone navigates into those pages.
//
// IMPORTANT: decode `invoice_access` from the HRMS JWT payload (add it there
// if it isn't already included) so this never fires a wasted request for
// people who don't have Invoice access at all.
export function InvoiceAuthProvider({ hasInvoiceAccess, children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const inFlight = useRef(null);

  const ensureAuth = useCallback(async () => {
    if (token) return token;
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      console.log(`[InvoiceAuthContext] SSO exchange STARTED, timestamp: ${performance.now()}`);
      const hrmsToken = localStorage.getItem("token");
      if (!hrmsToken) {
        setError("HRMS session expired. Please log in again.");
        return null;
      }

      try {
        console.log(`[InvoiceAuthContext] SSO STEP 1 START (invoice-sso), timestamp: ${performance.now()}`);
        const ssoRes = await fetch(`${API_BASE_URL}/invoice-sso`, {
          method: "POST",
          headers: { Authorization: `Bearer ${hrmsToken}` },
        });
        const ssoData = await ssoRes.json();
        console.log(`[InvoiceAuthContext] SSO STEP 1 DONE (invoice-sso) → status: ${ssoRes.status}, timestamp: ${performance.now()}`, ssoData);
        if (!ssoRes.ok || !ssoData?.ssoToken) {
          throw new Error(ssoData?.message || "Invoice access is not enabled for your account.");
        }

        console.log(`[InvoiceAuthContext] SSO STEP 2 START (auth/sso), timestamp: ${performance.now()}`);
        const exchangeRes = await fetch(`${INVOICE_API_URL}/auth/sso`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ssoToken: ssoData.ssoToken }),
        });
        const exchangeData = await exchangeRes.json();
        console.log(`[InvoiceAuthContext] SSO STEP 2 DONE (auth/sso) → status: ${exchangeRes.status}, timestamp: ${performance.now()}`, exchangeData);
        if (!exchangeRes.ok || !exchangeData?.success || !exchangeData?.token) {
          throw new Error(exchangeData?.message || "Unable to authenticate with Invoice/CRM.");
        }

        console.log(`[InvoiceAuthContext] setToken called with value: ${exchangeData.token ? 'EXISTS' : 'NULL'}, timestamp: ${performance.now()}`);
        setToken(exchangeData.token);
        setUser(exchangeData.user || null);
        setError("");

        // The existing CRM/Invoice pages (Leads.jsx, Customers.jsx, etc.)
        // read the token straight from these exact localStorage keys —
        // writing them here means those pages can be copied over as-is,
        // with zero code changes inside each page file.
        localStorage.setItem("vjc_invoice_auth", exchangeData.token);
        localStorage.setItem("vjc_invoice_user", JSON.stringify(exchangeData.user || {}));

        const verifyToken = localStorage.getItem("vjc_invoice_auth");
        console.log(`[InvoiceAuthContext] localStorage.setItem called, verify readback: ${verifyToken ? 'EXISTS' : 'NULL'}, timestamp: ${performance.now()}`);

        console.log(`[InvoiceAuthContext] SSO exchange COMPLETED, timestamp: ${performance.now()}`);
        return exchangeData.token;
      } catch (err) {
        console.log(`[InvoiceAuthContext] SSO exchange FAILED: ${err.message}, timestamp: ${performance.now()}`);
        setError(err.message || "Unable to connect to Invoice/CRM.");
        return null;
      } finally {
        inFlight.current = null;
      }
    })();

    return inFlight.current;
  }, [token]);

  // Fire once, right after mount, only if this person actually has
  // invoice_access — so the sidebar knows what to show immediately.
  useEffect(() => {
    console.log(`[InvoiceAuthContext] useEffect triggered - hasInvoiceAccess: ${hasInvoiceAccess}, timestamp: ${performance.now()}`);
    if (hasInvoiceAccess) {
      ensureAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInvoiceAccess]);

  const value = useMemo(
    () => ({ token, user, error, ready: Boolean(token), ensureAuth }),
    [token, user, error, ensureAuth]
  );

  return <InvoiceAuthContext.Provider value={value}>{children}</InvoiceAuthContext.Provider>;
}

export function useInvoiceAuth() {
  const ctx = useContext(InvoiceAuthContext);
  if (!ctx) {
    throw new Error("useInvoiceAuth must be used inside <InvoiceAuthProvider>");
  }
  return ctx;
}