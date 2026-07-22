import axios from "axios";
import { clearAuthSession, getAuthToken } from "../utils/auth";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";
  

// Shared Axios instance — attaches JWT from localStorage on every request
const api = axios.create({
  baseURL: API_BASE,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 30000),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = String(error.config?.url || "").endsWith("/login");
    const skipAuthRedirect = Boolean(error.config?.skipAuthRedirect);

    // Keep protected-route behavior, but let login form handle bad credentials in-place.
    if (error.response?.status === 401 && !isLoginRequest && !skipAuthRedirect) {
      clearAuthSession();
      window.location.assign("/");
    }

    if (error.code === "ECONNABORTED") {
      error.message = "API request timed out. Please try again.";
    } else if (!error.response) {
      error.message = "Unable to reach HRMS API. Please check the server status.";
    } else if (error.response?.data?.error) {
      error.message = error.response.data.error;
    } else if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }

    return Promise.reject(error);
  }
);

export default api;
