import { useState } from "react";
import { validateTimeHHMM } from "../../utils/attendanceHelpers";

function AttendanceEditModalForm({
  employeeName,
  dateStr,
  initialCheckIn,
  initialCheckOut,
  saving,
  onClose,
  onSave,
}) {
  const [checkIn, setCheckIn] = useState(initialCheckIn || "09:00");
  const [checkOut, setCheckOut] = useState(initialCheckOut || "18:00");
  const [reason, setReason] = useState("");
  const reasonIsValid = reason.trim().length >= 5;

  const handleSave = () => {
    const newIn = checkIn.trim();
    const newOut = checkOut.trim();
    const editReason = reason.trim();

    if (!newIn || !newOut) {
      window.alert("Please fill both fields");
      return;
    }

    if (!validateTimeHHMM(newIn) || !validateTimeHHMM(newOut)) {
      window.alert("Use HH:MM format (24h)");
      return;
    }

    if (editReason.length < 5) {
      window.alert("Please enter a reason of at least 5 characters.");
      return;
    }

    onSave(newIn, newOut, editReason);
  };

  return (
    <div className="att-modal-card">
      <h3 id="att-edit-title">
        <i className="fas fa-pen-alt" /> Edit Attendance · {employeeName} (
        {dateStr})
      </h3>
      <label htmlFor="editCheckIn">Check-In (HH:MM)</label>
      <input
        id="editCheckIn"
        type="text"
        value={checkIn}
        onChange={(e) => setCheckIn(e.target.value)}
        placeholder="09:00"
      />
      <label htmlFor="editCheckOut">Check-Out (HH:MM)</label>
      <input
        id="editCheckOut"
        type="text"
        value={checkOut}
        onChange={(e) => setCheckOut(e.target.value)}
        placeholder="18:00"
      />
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
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function AttendanceEditModal({
  open,
  employeeName,
  dateStr,
  initialCheckIn,
  initialCheckOut,
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
        key={`${employeeName}-${dateStr}-${initialCheckIn}-${initialCheckOut}`}
        employeeName={employeeName}
        dateStr={dateStr}
        initialCheckIn={initialCheckIn}
        initialCheckOut={initialCheckOut}
        saving={saving}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}

export default AttendanceEditModal;
