import axios from "axios";
import { clearAuthSession, getAuthToken } from "../utils/auth";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  

// Shared Axios instance — attaches JWT from localStorage on every request
const api = axios.create({
  baseURL: API_BASE,
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
    // Match original auth behavior: clear session and return to login on 401
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.assign("/");
    }

    return Promise.reject(error);
  }
);

export default api;
