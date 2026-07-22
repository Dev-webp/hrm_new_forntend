import api from "./api";

/* =========================================================
   OFFER LETTER CRUD
========================================================= */

export const getOfferLetters = () =>
  api.get("/offer-letters");

export const getOfferLetter = (id) =>
  api.get(`/offer-letters/${id}`);

export const createOfferLetter = (data) =>
  api.post("/offer-letters", data);

export const updateOfferLetter = (id, data) =>
  api.put(`/offer-letters/${id}`, data);

/* =========================================================
   PREVIEW

   HTML ONLY.
   NO PDF GENERATION.
   NO FILE STORAGE.
========================================================= */

export const previewOfferLetter = (id) =>
  api.get(`/offer-letters/${id}/preview`, {
    responseType: "text",
  });

/* =========================================================
   DOWNLOAD

   Backend generates fresh PDF Buffer.
   Browser receives Blob.

   NO STORED PDF.
========================================================= */

export const downloadOfferLetterPdf = (id) =>
  api.get(`/offer-letters/${id}/download`, {
    responseType: "blob",
  });

/* =========================================================
   SEND EMAIL

   Backend:
   1. Gets current offer data.
   2. Generates fresh PDF Buffer.
   3. Sends attachment.
   4. Discards Buffer.
   5. Updates status only.
========================================================= */

export const sendOfferLetterEmail = (id) =>
  api.post(`/offer-letters/${id}/send-email`);

/* =========================================================
   ACCEPT OFFER
========================================================= */

export const acceptOfferLetter = (id) =>
  api.put(`/offer-letters/${id}/accept`);