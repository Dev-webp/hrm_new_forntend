import api from "./api";
const base = (type) => `/letters/${type}`;
export const getLetter = (type) => api.get(base(type));
export const previewLetter = (type, data) => api.post(`${base(type)}/preview`, data, { responseType: "text" });
export const generateLetter = (type, data) => api.post(`${base(type)}/generate`, data);
export const downloadLetter = (type, data) =>
  api.post(`${base(type)}/download`, data, {
    responseType: "blob",
  });
  
export const sendLetterEmail = (type, data) => api.post(`${base(type)}/send-email`, data);
export const fetchLetterEmployees = () => api.get("/admin/employees", { params: { status: "active" } });
