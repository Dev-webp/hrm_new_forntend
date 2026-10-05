import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { clearAuthSession } from "../utils/auth";

/**
 * Axios-based apiFetch matching HTML behavior (paths without /api prefix).
 */
export function useEmployeeApi() {
  const navigate = useNavigate();

  const apiFetch = useCallback(
    async (url, opts = {}) => {
      try {
        const method = opts.method || "GET";
        let data;
        if (opts.body) {
          data =
            typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body;
        }

        const response = await api.request({ url, method, data });
        return response.data;
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          clearAuthSession();
          navigate("/login");
          const cause = err.response?.data?.message || err.message || "API 401";
          throw new Error(cause, { cause: err });
        }
        const message =
          err.response?.data?.message || err.message || `Request failed`;
        throw new Error(message, { cause: err });
      }
    },
    [navigate]
  );

  return { apiFetch, navigate };
}

export function useEmployeeAuthGuard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  if (!token) {
    navigate("/login");
    return false;
  }
  return true;
}
