import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

function RequireAuth({ children, loginPath = "/" }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return children;
}

export default RequireAuth;
