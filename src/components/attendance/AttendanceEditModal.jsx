import { useMemo, useState } from "react";

const TIME_FIELDS = [
  { key: "check_in_time", label: "Check-In", placeholder: "10:00 AM" },
  { key: "check_out_time", label: "Check-Out", placeholder: "7:00 PM" },
  { key: "break1_in", label: "Break-In", placeholder: "11:30 AM" },
  { key: "break1_out", label: "Break-Out", placeholder: "11:45 AM" },
  { key: "lunch_in", label: "Lunch-In", placeholder: "1:30 PM" },
  { key: "lunch_out", label: "Lunch-Out", placeholder: "2:00 PM" },
  { key: "break2_in", label: "Break 2-In", placeholder: "4:30 PM" },
  { key: "break2_out", label: "Break 2-Out", placeholder: "4:45 PM" },
];

function to12Hour(time) {
  if (!time || time === "--") return "";
  const [rawHour, rawMinute] = String(time).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(rawHour) || Number.isNaN(rawMinute)) return "";
  const suffix = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(rawMinute).padStart(2, "0")} ${suffix}`;
}

function to24Hour(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = Number(match12[1]);
    const minute = Number(match12[2]);
    const suffix = match12[3].toUpperCase();
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (suffix === "PM" && hour !== 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }

  const match24 = text.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = Number(match24[1]);
    const minute = Number(match24[2]);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }

  return null;
}

function normalizeInitial(initialValues) {
  return TIME_FIELDS.reduce((acc, field) => {
    acc[field.key] = to12Hour(initialValues?.[field.key]);
    return acc;
  }, {});
}

function AttendanceEditModalForm({
  employeeName,
  dateStr,
  initialValues,
  saving,
  onClose,
  onSave,
}) {
  const initialForm = useMemo(() => normalizeInitial(initialValues), [initialValues]);
  const [form, setForm] = useState(initialForm);
  const [reason, setReason] = useState("");
  const reasonIsValid = reason.trim().length >= 5;

  const handleSave = () => {
    const updates = {};

    for (const field of TIME_FIELDS) {
      const current = String(form[field.key] || "").trim();
      const initial = String(initialForm[field.key] || "").trim();
      if (current === initial) continue;

      const converted = to24Hour(current);
      if (current && !converted) {
        window.alert(`Use 12-hour format for ${field.label}, for example ${field.placeholder}.`);
        return;
      }

      updates[field.key] = converted;
    }

    if (Object.keys(updates).length === 0) {
      window.alert("Change at least one time field before saving.");
      return;
    }

    const editReason = reason.trim();
    if (editReason.length < 5) {
      window.alert("Please enter a reason of at least 5 characters.");
      return;
    }

    onSave({ ...updates, reason: editReason });
  };

  return (
    <div className="att-modal-card att-modal-card-wide">
      <h3 id="att-edit-title">
        <i className="fas fa-pen-alt" /> Edit Attendance - {employeeName} ({dateStr})
      </h3>

      <div className="att-modal-time-grid">
        {TIME_FIELDS.map((field) => (
          <label key={field.key} htmlFor={`edit-${field.key}`}>
            <span>{field.label}</span>
            <input
              id={`edit-${field.key}`}
              type="text"
              value={form[field.key]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
              }
              placeholder={field.placeholder}
            />
          </label>
        ))}
      </div>

      <label htmlFor="editReason">Reason</label>
      <textarea
        id="editReason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Enter reason for this edit"
        rows={3}
        required
      />
      {!reasonIsValid && (
        <div className="att-modal-error">
          Reason must be at least 5 characters.
        </div>
      )}
      <div className="att-modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="save-btn"
          onClick={handleSave}
          disabled={saving || !reasonIsValid}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function AttendanceEditModal({
  open,
  employeeName,
  dateStr,
  initialValues,
  saving,
  onClose,
  onSave,
}) {
  if (!open) return null;

  return (
    <div
      className="att-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="att-edit-title"
    >
      <AttendanceEditModalForm
        key={`${employeeName}-${dateStr}-${JSON.stringify(initialValues)}`}
        employeeName={employeeName}
        dateStr={dateStr}
        initialValues={initialValues}
        saving={saving}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}

export default AttendanceEditModal;
