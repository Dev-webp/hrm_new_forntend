import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import PageLoading from "./PageLoading";
import { isAuthenticated } from "../utils/auth";

function RequireAuth({ children, loginPath = "/" }) {
  const location = useLocation();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    setAuthLoading(false);
  }, []);

  if (authLoading) {
    return <PageLoading label="Restoring session..." />;
  }

  if (!isAuthenticated()) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return children;
}

export default RequireAuth;
