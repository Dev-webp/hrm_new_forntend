import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "../services/api";
import {
  clearOpsSession,
  exchangeSsoToken,
  setOpsSession,
  setOpsSessionRefresher,
} from "../modules/ops/services/opsApi";
import { allowedSectionsFor } from "../modules/ops/Shared";

// HRMS -> OPS single sign-on for the browser.
//
//   HRMS JWT --POST /ops-sso (HRMS)--> 60 second OPS token
//   OPS token --POST /auth/sso (OPS)--> OPS session token + OPS user
//
// HRMS decides WHETHER the person may enter OPS (users.ops_access). OPS decides
// WHAT they may do: roles and work profiles come back from the OPS database in
// the exchange response and are the only source the UI uses.
//
// The OPS session token is held in memory by opsApi.js. It is never written to
// localStorage, and it never replaces or touches the HRMS token or the Invoice
// session. A page reload performs the exchange again.

const OpsAuthContext = createContext(null);

const INERT = Object.freeze({
  enabled: false,
  ready: false,
  loading: false,
  error: "",
  user: null,
  allowedSections: [],
  retry: async () => false,
});

// Mount this once around the authenticated app shell. Give it key={userId} so a
// different person signing in on the same browser always starts from nothing.
export function OpsAuthProvider({ hasOpsAccess, children }) {
  const [state, setState] = useState({ user: null, ready: false, loading: false, error: "" });
  const inFlight = useRef(null);
  const mounted = useRef(false);

  const exchange = useCallback(() => {
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      if (mounted.current) setState((s) => ({ ...s, loading: true, error: "" }));
      try {
        const { data } = await api.post("/ops-sso");
        if (!data?.ssoToken) {
          throw new Error("OPS single sign-on did not return a token.");
        }
        const result = await exchangeSsoToken(data.ssoToken);
        setOpsSession(result.token);
        if (mounted.current) {
          setState({ user: result.user || null, ready: true, loading: false, error: "" });
        }
        return true;
      } catch (err) {
        clearOpsSession();
        if (mounted.current) {
          setState({
            user: null,
            ready: false,
            loading: false,
            error: err?.message || "Unable to connect to OPS.",
          });
        }
        return false;
      } finally {
        inFlight.current = null;
      }
    })();

    return inFlight.current;
  }, []);

  useEffect(() => {
    mounted.current = true;
    setOpsSessionRefresher(exchange);
    if (hasOpsAccess) exchange();

    return () => {
      mounted.current = false;
      setOpsSessionRefresher(null);
      clearOpsSession();
    };
  }, [hasOpsAccess, exchange]);

  const value = useMemo(
    () => ({
      enabled: Boolean(hasOpsAccess),
      ready: state.ready,
      loading: state.loading,
      error: state.error,
      user: state.user,
      allowedSections: state.ready ? allowedSectionsFor(state.user) : [],
      retry: exchange,
    }),
    [hasOpsAccess, state, exchange]
  );

  return <OpsAuthContext.Provider value={value}>{children}</OpsAuthContext.Provider>;
}

// Safe outside the provider (returns an inert value) so the sidebars can never
// crash a page for a person who has no OPS access.
export function useOpsAuth() {
  return useContext(OpsAuthContext) ?? INERT;
}
