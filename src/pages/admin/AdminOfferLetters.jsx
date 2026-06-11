import { useEffect, useState } from "react";
import {
  getOfferLetters,
  createOfferLetter,
  sendOfferLetter,
  generateOfferLetterPdf,
  downloadOfferLetterPdf,
  previewOfferLetterPdf,
} from "../../services/offerLetterApi";

export default function AdminOfferLetters() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    candidate_name: "",
    candidate_email: "",
    candidate_address: "",
    designation: "",
    department: "",
    offer_date: today,
    joining_date: "",
    salary: "",
    ctc: "",
    branch: localStorage.getItem("branch") || "Hyderabad",
    location: localStorage.getItem("branch") || "Hyderabad",
    reporting_manager: "",
    reference_number: `VJC-OL-${Date.now()}`,
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadOffers = async () => {
    setLoading(true);
    try {
      const { data } = await getOfferLetters();
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast("Failed to load offer letters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBranchChange = (e) => {
    const branch = e.target.value;

    setForm((prev) => ({
      ...prev,
      branch,
      location: branch,
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createOfferLetter(form);
      showToast("Offer letter created successfully");
      setShowForm(false);
      setForm((prev) => ({
        ...prev,
        reference_number: `VJC-OL-${Date.now()}`,
      }));
      loadOffers();
    } catch (err) {
      showToast("Failed to create offer letter");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (id) => {
    try {
      await sendOfferLetter(id);
      showToast("Offer letter sent");
      loadOffers();
    } catch (err) {
      showToast("Failed to send offer letter");
    }
  };

  const handleGeneratePdf = async (id) => {
    try {
      await generateOfferLetterPdf(id);
      showToast("PDF generated successfully");
      loadOffers();
    } catch (err) {
      console.error(err);
      showToast("Failed to generate PDF");
    }
  };

  const handleDownloadPdf = async (id, candidateName) => {
    try {
      const response = await downloadOfferLetterPdf(id);

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `${candidateName || "offer-letter"}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      showToast("PDF downloaded");
    } catch (err) {
      console.error(err);
      showToast("Failed to download PDF");
    }
  };

  const handlePreviewPdf = async (id) => {
    try {
      const response = await previewOfferLetterPdf(id);

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");

      showToast("PDF preview opened");
    } catch (err) {
      console.error(err);
      showToast("Generate PDF first, then preview");
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "SENT":
        return "#FF8C00";
      case "ACCEPTED":
        return "#16A34A";
      case "REJECTED":
        return "#DC2626";
      default:
        return "#64748B";
    }
  };

  return (
    <div className="main-panel" style={{ padding: "24px" }}>
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
              background: "linear-gradient(135deg,#FFF4E5,#FF8C00)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Offer Letters
          </h1>
          <p style={{ color: "#64748B", fontSize: "13px", marginTop: "4px" }}>
            Create and manage candidate offer letters
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: "linear-gradient(135deg,#FF8C00,#FFF4E5)",
            color: "#F5F7FA",
            border: "none",
            borderRadius: "12px",
            padding: "10px 20px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          {showForm ? "✕ Cancel" : "+ New Offer Letter"}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            background: "#1E2030",
            borderRadius: "20px",
            padding: "24px",
            marginBottom: "24px",
            border: "1px solid #EAF4FF",
          }}
        >
          <h3 style={{ color: "#FF8C00", marginBottom: "20px", fontWeight: 700 }}>
            Create Offer Letter
          </h3>

          <form onSubmit={handleCreate}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
              }}
            >
              {[
                { label: "Candidate Name", name: "candidate_name", required: true },
                { label: "Candidate Email", name: "candidate_email", type: "email", required: true },
                { label: "Designation", name: "designation", required: true },
                { label: "Department", name: "department", required: true },
                { label: "Offer Date", name: "offer_date", type: "date", required: true },
                { label: "Joining Date", name: "joining_date", type: "date", required: true },
                { label: "Salary (₹)", name: "salary", type: "number", required: true },
                { label: "CTC (₹)", name: "ctc", type: "number" },
                { label: "Branch", name: "branch" },
                { label: "Location", name: "location" },
                { label: "Reporting Manager", name: "reporting_manager" },
                { label: "Reference Number", name: "reference_number" },
              ].map(({ label, name, type = "text", required }) => (
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
                    {required && " *"}
                  </label>

                  {name === "branch" ? (
                    <select
                      name="branch"
                      value={form.branch}
                      onChange={handleBranchChange}
                      required={required}
                      style={{
                        width: "100%",
                        background: "#EAF4FF",
                        border: "1px solid #EAF4FF",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        color: "#F0F2F8",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="Bangalore">Bangalore</option>
                      <option value="Hyderabad">Hyderabad</option>
                    </select>
                  ) : (
                    <input
                      type={type}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      required={required}
                      readOnly={name === "location"}
                      style={{
                        width: "100%",
                        background: "#EAF4FF",
                        border: "1px solid #EAF4FF",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        color: "#F0F2F8",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              ))}

              <div style={{ gridColumn: "1 / -1" }}>
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
                    width: "100%",
                    background: "#EAF4FF",
                    border: "1px solid #EAF4FF",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    color: "#F0F2F8",
                    fontSize: "13px",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: "20px",
                background: "linear-gradient(135deg,#FF8C00,#FFF4E5)",
                color: "#F5F7FA",
                border: "none",
                borderRadius: "12px",
                padding: "12px 32px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {submitting ? "Creating..." : "Create Offer Letter"}
            </button>
          </form>
        </div>
      )}

      <div
        style={{
          background: "#1E2030",
          borderRadius: "20px",
          padding: "24px",
          border: "1px solid #EAF4FF",
        }}
      >
        <h3 style={{ color: "#FF8C00", marginBottom: "16px", fontWeight: 700 }}>
          All Offer Letters
        </h3>

        {loading ? (
          <p style={{ color: "#64748B", textAlign: "center" }}>Loading...</p>
        ) : offers.length === 0 ? (
          <p style={{ color: "#64748B", textAlign: "center" }}>No offer letters yet</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #EAF4FF" }}>
                  {["Ref #", "Candidate", "Designation", "Dept", "Offer Date", "Joining Date", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        color: "#64748B",
                        fontWeight: 600,
                        padding: "10px 12px",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {offers.map((o) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid #F5F7FA" }}>
                    <td style={{ padding: "12px", color: "#FF8C00", fontFamily: "monospace" }}>
                      {o.reference_number}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <strong style={{ color: "#F0F2F8" }}>{o.candidate_name}</strong>
                      <br />
                      <span style={{ color: "#64748B", fontSize: "11px" }}>
                        {o.candidate_email}
                      </span>
                    </td>

                    <td style={{ padding: "12px", color: "#F0F2F8" }}>{o.designation}</td>
                    <td style={{ padding: "12px", color: "#64748B" }}>{o.department}</td>
                    <td style={{ padding: "12px", color: "#64748B" }}>{o.offer_date?.slice(0, 10)}</td>
                    <td style={{ padding: "12px", color: "#64748B" }}>{o.joining_date?.slice(0, 10)}</td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          background: statusColor(o.status) + "22",
                          color: statusColor(o.status),
                          borderRadius: "20px",
                          padding: "4px 12px",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {o.status}
                      </span>
                    </td>

                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleGeneratePdf(o.id)}
                          style={{
                            background: "#EAF4FF",
                            border: "1px solid #16A34A",
                            color: "#16A34A",
                            borderRadius: "8px",
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          Generate PDF
                        </button>

                        {o.pdf_url && (
                          <button
                            onClick={() => handleDownloadPdf(o.id, o.candidate_name)}
                            style={{
                              background: "#EAF4FF",
                              border: "1px solid #60A5FA",
                              color: "#60A5FA",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            Download
                          </button>
                        )}

                        {o.pdf_url && (
                          <button
                            onClick={() => handlePreviewPdf(o.id)}
                            style={{
                              background: "#EAF4FF",
                              border: "1px solid #A78BFA",
                              color: "#A78BFA",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            Preview
                          </button>
                        )}

                        {o.status === "DRAFT" && (
                          <button
                            onClick={() => handleSend(o.id)}
                            style={{
                              background: "#EAF4FF",
                              border: "1px solid #FF8C00",
                              color: "#FF8C00",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            Send
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#EAF4FF",
            border: "1px solid #FF8C00",
            color: "#F0F2F8",
            borderRadius: "12px",
            padding: "12px 20px",
            fontSize: "13px",
            fontWeight: 600,
            zIndex: 9999,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}