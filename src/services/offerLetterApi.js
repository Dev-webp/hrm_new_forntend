import api from "./api";

export const getOfferLetters = () =>
  api.get("/offer-letters");

export const getOfferLetter = (id) =>
  api.get(`/offer-letters/${id}`);

export const createOfferLetter = (data) =>
  api.post("/offer-letters", data);

export const sendOfferLetter = (id) =>
  api.put(`/offer-letters/${id}/send`);

export const acceptOfferLetter = (id) =>
  api.put(`/offer-letters/${id}/accept`);

export const generateOfferLetterPdf = (id) =>
  api.post(`/offer-letters/${id}/generate-pdf`);

export const downloadOfferLetterPdf = (id) =>
  api.get(`/offer-letters/${id}/download`, {
    responseType: "blob",
  });

export const previewOfferLetterPdf = (id) =>
  api.get(`/offer-letters/${id}/download`, {
    responseType: "blob",
  });