import { useEffect, useState } from "react";

import {
  getOfferLetters,
  getOfferLetter,
  createOfferLetter,
  updateOfferLetter,
  previewOfferLetter,
  sendOfferLetterEmail,
  acceptOfferLetter,
  downloadOfferLetterPdf,
} from "../../services/offerLetterApi";

const BRANCH_OPTIONS = ["Hyderabad", "Bangalore"];

const OFFER_TEXT_FIELDS = [
  "candidate_name",
  "candidate_email",
  "candidate_address",
  "designation",
  "department",
  "joining_time",
  "job_title",
  "job_description",
  "office_location",
  "salary",
  "salary_in_words",
  "ctc",
  "branch",
  "location",
  "reporting_manager",
  "reference_number",
  "status",
];

const normalizeBranch = (value) => {
  const branch = String(value ?? "")
    .trim()
    .toLowerCase();

  if (branch === "bangalore" || branch === "bengaluru") {
    return "Bangalore";
  }

  if (branch === "hyderabad" || branch === "hyd") {
    return "Hyderabad";
  }

  return "";
};

const normalizeStatus = (value) =>
  String(value ?? "DRAFT")
    .trim()
    .toUpperCase();

const asText = (value) => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
};

const asDateInput = (value) => {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
};

const getBranchBadgeStyle = (branch) => {
  const normalized = normalizeBranch(branch);

  if (normalized === "Bangalore") {
    return {
      background: "#EFF6FF",
      color: "#1D4ED8",
      border: "1px solid #BFDBFE",
    };
  }

  if (normalized === "Hyderabad") {
    return {
      background: "#FFF7ED",
      color: "#C2410C",
      border: "1px solid #FED7AA",
    };
  }

  return {
    background: "#F8FAFC",
    color: "#64748B",
    border: "1px solid #E2E8F0",
  };
};

const getStatusBadgeStyle = (status) => {
  switch (normalizeStatus(status)) {
    case "SENT":
      return {
        background: "#EFF6FF",
        color: "#1D4ED8",
        border: "1px solid #BFDBFE",
      };

    case "ACCEPTED":
      return {
        background: "#F0FDF4",
        color: "#15803D",
        border: "1px solid #BBF7D0",
      };

    default:
      return {
        background: "#F8FAFC",
        color: "#475569",
        border: "1px solid #E2E8F0",
      };
  }
};

function normalizeOffer(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const offer = { ...value };

  OFFER_TEXT_FIELDS.forEach((field) => {
    offer[field] = asText(value[field]);
  });

  offer.offer_date = asDateInput(value.offer_date);
  offer.joining_date = asDateInput(value.joining_date);

  offer.id =
    typeof value.id === "number" ||
    typeof value.id === "string"
      ? value.id
      : "";

  offer.branch = normalizeBranch(value.branch);

  offer.location =
    asText(value.location) ||
    offer.branch;

  offer.status = normalizeStatus(value.status);

  return offer;
}

function extractOffer(payload) {
  const candidate =
    payload?.offer ??
    payload?.data?.offer ??
    payload?.data?.rows?.[0] ??
    payload?.rows?.[0] ??
    payload?.result ??
    payload?.data ??
    payload;

  return normalizeOffer(candidate);
}

function extractOffers(payload) {
  const candidate =
    payload?.offers ??
    payload?.data?.offers ??
    payload?.data?.rows ??
    payload?.rows ??
    payload?.data ??
    payload;

  if (!Array.isArray(candidate)) {
    console.error(
      "[INVALID_OFFERS_RESPONSE]",
      payload
    );

    return [];
  }

  return candidate
    .map(normalizeOffer)
    .filter(Boolean)
    .filter((offer) => offer.id !== "");
}

function buildOfferPayload(form) {
  const branch = normalizeBranch(form.branch);

  return {
    candidate_name:
      String(form.candidate_name ?? "").trim(),

    candidate_email:
      String(form.candidate_email ?? "").trim(),

    candidate_address:
      String(form.candidate_address ?? "").trim(),

    designation:
      String(form.designation ?? "").trim(),

    department:
      String(form.department ?? "").trim(),

    offer_date:
      form.offer_date || null,

    joining_date:
      form.joining_date || null,

    joining_time:
      String(form.joining_time ?? "").trim(),

    job_title:
      String(form.job_title ?? "").trim(),

    job_description:
      String(form.job_description ?? "").trim(),

    office_location:
      String(form.office_location ?? "").trim(),

    salary:
      form.salary === ""
        ? null
        : Number(form.salary),

    salary_in_words:
      String(form.salary_in_words ?? "").trim(),

    ctc:
      form.ctc === ""
        ? null
        : Number(form.ctc),

    branch,

    location: branch,

    reporting_manager:
      String(form.reporting_manager ?? "").trim(),

    reference_number:
      String(form.reference_number ?? "").trim(),
  };
}

async function getOfferError(error, fallback) {
  let payload = error?.response?.data;

  if (payload instanceof Blob) {
    try {
      payload = JSON.parse(await payload.text());
    } catch {
      payload = null;
    }
  }

  return (
    payload?.error ||
    payload?.message ||
    error?.message ||
    fallback
  );
}

export default function AdminOfferLetters() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [actionOfferId, setActionOfferId] = useState(null);

  const [toast, setToast] = useState("");

  const today = new Date()
    .toISOString()
    .split("T")[0];

  const createInitialForm = () => {
    const storedBranch =
      normalizeBranch(localStorage.getItem("branch")) ||
      "Hyderabad";

    return {
      candidate_name: "",
      candidate_email: "",
      candidate_address: "",

      designation: "",
      department: "",

      offer_date: today,
      joining_date: "",
      joining_time: "10:00 AM",

      job_title: "",
      job_description: "",

      office_location: "",

      salary: "",
      salary_in_words: "",
      ctc: "",

      branch: storedBranch,
      location: storedBranch,

      reporting_manager: "",

      reference_number: `VJC-OL-${Date.now()}`,
    };
  };

  const [form, setForm] = useState(createInitialForm);

  const showToast = (message) => {
    setToast(String(message || "Something went wrong"));

    window.setTimeout(() => {
      setToast("");
    }, 3000);
  };

  const loadOffers = async () => {
    setLoading(true);

    try {
      const response = await getOfferLetters();

      console.log(
        "[GET_OFFERS_RESPONSE]",
        response?.data
      );

      setOffers(extractOffers(response?.data));
    } catch (error) {
      console.error(
        "[GET_OFFERS_FAILED]",
        error?.response?.status,
        error?.response?.data,
        error
      );

      setOffers([]);

      showToast(
        await getOfferError(
          error,
          "Failed to load offer letters"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleBranchChange = (event) => {
    const branch = normalizeBranch(event.target.value);

    setForm((previous) => ({
      ...previous,
      branch,
      location: branch,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = buildOfferPayload(form);

      if (!payload.branch) {
        throw new Error("Please select a valid branch");
      }

      if (
        payload.salary !== null &&
        !Number.isFinite(payload.salary)
      ) {
        throw new Error("Please enter a valid salary");
      }

      if (
        payload.ctc !== null &&
        !Number.isFinite(payload.ctc)
      ) {
        throw new Error("Please enter a valid CTC");
      }

      if (editingOfferId !== null) {
        await updateOfferLetter(
          editingOfferId,
          payload
        );

        showToast("Offer letter updated successfully");
      } else {
        await createOfferLetter(payload);

        showToast("Offer letter created successfully");
      }

      await loadOffers();

      setShowForm(false);
      setEditingOfferId(null);
      setSelectedOffer(null);
      setForm(createInitialForm());
    } catch (error) {
      console.error(
        "[SAVE_OFFER_FAILED]",
        error?.response?.data || error
      );

      showToast(
        await getOfferError(
          error,
          editingOfferId !== null
            ? "Failed to update offer letter"
            : "Failed to create offer letter"
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await getOfferLetter(id);

      const offer = extractOffer(response?.data);

      if (!offer) {
        throw new Error("Invalid offer letter response");
      }

      const branch =
        normalizeBranch(offer.branch) ||
        "Hyderabad";

      setForm({
        ...createInitialForm(),

        candidate_name: offer.candidate_name,
        candidate_email: offer.candidate_email,
        candidate_address: offer.candidate_address,

        designation: offer.designation,
        department: offer.department,

        offer_date: offer.offer_date || today,
        joining_date: offer.joining_date,
        joining_time:
          offer.joining_time || "10:00 AM",

        job_title: offer.job_title,
        job_description: offer.job_description,

        office_location: offer.office_location,

        salary: offer.salary,
        salary_in_words: offer.salary_in_words,
        ctc: offer.ctc,

        branch,
        location: branch,

        reporting_manager: offer.reporting_manager,
        reference_number: offer.reference_number,
      });

      setEditingOfferId(offer.id);
      setSelectedOffer(null);
      setShowForm(true);
    } catch (error) {
      showToast(
        await getOfferError(
          error,
          "Failed to load offer letter"
        )
      );
    }
  };

  const handleView = async (id) => {
    try {
      const response = await getOfferLetter(id);

      const offer = extractOffer(response?.data);

      if (!offer) {
        throw new Error("Invalid offer letter response");
      }

      setSelectedOffer(offer);
      setShowForm(false);
      setEditingOfferId(null);
    } catch (error) {
      showToast(
        await getOfferError(
          error,
          "Failed to load offer letter"
        )
      );
    }
  };

  const handleSend = async (id) => {
    if (actionOfferId !== null) return;
    setActionOfferId(id);
    try {
      await sendOfferLetterEmail(id);
      await loadOffers();

      showToast("Offer letter emailed");
    } catch (error) {
      showToast(
        await getOfferError(
          error,
          "Failed to send offer letter"
        )
      );
    } finally { setActionOfferId(null); }
  };

  const handleAccept = async (id) => {
    try {
      await acceptOfferLetter(id);
      await loadOffers();

      showToast("Offer letter accepted");
    } catch (error) {
      showToast(
        await getOfferError(
          error,
          "Failed to accept offer letter"
        )
      );
    }
  };

  const handleDownloadPdf = async (
    id,
    candidateName
  ) => {
    try {
      const response =
        await downloadOfferLetterPdf(id);

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        }
      );

      if (!blob.size) {
        throw new Error("Downloaded PDF is empty");
      }

      const url =
        window.URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `${candidateName || "offer-letter"}.pdf`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showToast("PDF downloaded");
    } catch (error) {
      showToast(
        await getOfferError(
          error,
          "Failed to download PDF"
        )
      );
    }
  };

  const handlePreview = async (id) => {
    try {
      const response = await previewOfferLetter(id);
      const previewWindow = window.open("", "_blank");

      if (!previewWindow) {
        throw new Error(
          "Popup blocked. Please allow popups."
        );
      }

      previewWindow.document.open();
      previewWindow.document.write(response.data);
      previewWindow.document.close();
      showToast("Offer preview opened");
    } catch (error) {
      showToast(
        await getOfferError(
          error,
          "Failed to preview offer letter"
        )
      );
    }
  };

  const fields = [
    {
      label: "Candidate Name",
      name: "candidate_name",
      required: true,
    },
    {
      label: "Candidate Email",
      name: "candidate_email",
      type: "email",
      required: true,
    },
    {
      label: "Designation",
      name: "designation",
      required: true,
    },
    {
      label: "Department",
      name: "department",
      required: true,
    },
    {
      label: "Offer Date",
      name: "offer_date",
      type: "date",
      required: true,
    },
    {
      label: "Joining Date",
      name: "joining_date",
      type: "date",
      required: true,
    },
    {
      label: "Joining Time",
      name: "joining_time",
      required: true,
    },
    {
      label: "Job Title",
      name: "job_title",
      required: true,
    },
    {
      label: "Office Location",
      name: "office_location",
      required: true,
    },
    {
      label: "Salary in Words",
      name: "salary_in_words",
      required: true,
    },
    {
      label: "Salary (₹)",
      name: "salary",
      type: "number",
      required: true,
    },
    {
      label: "CTC (₹)",
      name: "ctc",
      type: "number",
    },
    {
      label: "Branch",
      name: "branch",
      required: true,
    },
    {
      label: "Reporting Manager",
      name: "reporting_manager",
    },
    {
      label: "Reference Number",
      name: "reference_number",
    },
  ];

  const inputStyle = {
    width: "100%",
    background: "#FFFFFF",
    border: "1px solid #CBD5E1",
    borderRadius: "10px",
    padding: "10px 14px",
    color: "#1A2B4B",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      className="main-panel admin-portal-page admin-offer-letters-page"
      style={{
        padding: "24px",
        background: "#F5F7FA",
        color: "#1A2B4B",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0D47A1",
            }}
          >
            Offer Letters
          </h1>

          <p
            style={{
              color: "#64748B",
              fontSize: "13px",
              marginTop: "4px",
            }}
          >
            Create and manage candidate offer letters
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const openingForm = !showForm;

            setShowForm(openingForm);
            setEditingOfferId(null);
            setSelectedOffer(null);

            if (openingForm) {
              setForm(createInitialForm());
            }
          }}
          style={{
            background: "#FF8C00",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "12px",
            padding: "10px 20px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          {showForm
            ? "✕ Cancel"
            : "+ New Offer Letter"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h3
            style={{
              color: "#0D47A1",
              marginBottom: "20px",
            }}
          >
            {editingOfferId !== null
              ? "Edit Offer Letter"
              : "Create Offer Letter"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "16px",
              }}
            >
              {fields.map(
                ({
                  label,
                  name,
                  type = "text",
                  required,
                }) => (
                  <div key={name}>
                    <label
                      style={{
                        color: "#64748B",
                        fontSize: "12px",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      {label}
                      {required ? " *" : ""}
                    </label>

                    {name === "branch" ? (
                      <select
                        name="branch"
                        value={form.branch}
                        onChange={handleBranchChange}
                        required
                        style={inputStyle}
                      >
                        <option value="">
                          Select Branch
                        </option>

                        {BRANCH_OPTIONS.map(
                          (branch) => (
                            <option
                              key={branch}
                              value={branch}
                            >
                              {branch}
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <input
                        type={type}
                        name={name}
                        value={form[name] ?? ""}
                        onChange={handleChange}
                        required={required}
                        style={inputStyle}
                      />
                    )}
                  </div>
                )
              )}

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label
                  style={{
                    color: "#64748B",
                    fontSize: "12px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Address
                </label>

                <textarea
                  name="candidate_address"
                  value={form.candidate_address}
                  onChange={handleChange}
                  rows={2}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                }}
              >
                <label
                  style={{
                    color: "#64748B",
                    fontSize: "12px",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Job Description *
                </label>

                <textarea
                  name="job_description"
                  value={form.job_description}
                  onChange={handleChange}
                  rows={3}
                  required
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: "20px",
                background: "#0D47A1",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                padding: "12px 32px",
                fontWeight: 700,
                cursor:
                  submitting
                    ? "not-allowed"
                    : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting
                ? "Saving..."
                : editingOfferId !== null
                  ? "Update Offer Letter"
                  : "Create Offer Letter"}
            </button>
          </form>
        </div>
      )}

      {selectedOffer && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3>Offer Letter Details</h3>

            <button
              type="button"
              onClick={() => setSelectedOffer(null)}
            >
              Close
            </button>
          </div>

          <p>
            <strong>Candidate:</strong>{" "}
            {selectedOffer.candidate_name || "-"}
          </p>

          <p>
            <strong>Designation:</strong>{" "}
            {selectedOffer.designation || "-"}
          </p>

          <p>
            <strong>Branch:</strong>{" "}
            {selectedOffer.branch || "Not assigned"}
          </p>

          <p>
            <strong>Location:</strong>{" "}
            {selectedOffer.location || "-"}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {selectedOffer.status}
          </p>
        </div>
      )}

      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px solid #E2E8F0",
          padding: "24px",
        }}
      >
        <h3
          style={{
            color: "#0D47A1",
            marginBottom: "16px",
          }}
        >
          All Offer Letters
        </h3>

        {loading ? (
          <p>Loading...</p>
        ) : offers.length === 0 ? (
          <p>No offer letters yet</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr>
                  {[
                    "Ref #",
                    "Candidate",
                    "Designation",
                    "Department",
                    "Offer Date",
                    "Joining Date",
                    "Branch",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        color: "#64748B",
                        borderBottom:
                          "1px solid #E2E8F0",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {offers.map((offer) => {
                  const status =
                    normalizeStatus(offer.status);

                  return (
                    <tr key={String(offer.id)}>
                      <td style={{ padding: "12px" }}>
                        {offer.reference_number || "-"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        <strong>
                          {offer.candidate_name || "-"}
                        </strong>

                        <br />

                        <small>
                          {offer.candidate_email || "-"}
                        </small>
                      </td>

                      <td style={{ padding: "12px" }}>
                        {offer.designation || "-"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {offer.department || "-"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {offer.offer_date || "-"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {offer.joining_date || "-"}
                      </td>

                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            ...getBranchBadgeStyle(
                              offer.branch
                            ),

                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",

                            width: "105px",
                            minHeight: "28px",

                            borderRadius: "999px",

                            padding: "4px 10px",

                            fontSize: "12px",
                            fontWeight: 600,

                            boxSizing: "border-box",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {offer.branch ||
                            "Not assigned"}
                        </span>
                      </td>

                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            ...getStatusBadgeStyle(status),

                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",

                            width: "95px",
                            minHeight: "28px",

                            borderRadius: "999px",

                            padding: "4px 10px",

                            fontSize: "12px",
                            fontWeight: 600,

                            boxSizing: "border-box",
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      <td style={{ padding: "12px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleView(offer.id)
                            }
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleEdit(offer.id)
                            }
                          >
                            Edit
                          </button>

                          <button type="button" onClick={() => handlePreview(offer.id)}>
                            Preview
                          </button>

                          <button type="button" onClick={() => handleDownloadPdf(offer.id, offer.candidate_name)}>
                            Download PDF
                          </button>

                          {status === "DRAFT" && (
                            <button
                              type="button"
                              disabled={actionOfferId !== null}
                              onClick={() =>
                                handleSend(offer.id)
                              }
                            >
                              {actionOfferId === offer.id ? "Sending..." : "Send Email"}
                            </button>
                          )}

                          {status === "SENT" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAccept(offer.id)
                              }
                            >
                              Accept
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            right: "24px",
            bottom: "24px",
            zIndex: 9999,

            background: "#FFFFFF",
            border: "1px solid #FF8C00",
            color: "#1A2B4B",

            borderRadius: "12px",
            padding: "12px 20px",

            fontSize: "13px",
            fontWeight: 600,

            boxShadow:
              "0 10px 30px rgba(15,23,42,0.12)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
