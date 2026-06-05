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

  const handleSave = () => {
    const newIn = checkIn.trim();
    const newOut = checkOut.trim();

    if (!newIn || !newOut) {
      window.alert("Please fill both fields");
      return;
    }

    if (!validateTimeHHMM(newIn) || !validateTimeHHMM(newOut)) {
      window.alert("Use HH:MM format (24h)");
      return;
    }

    onSave(newIn, newOut);
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
      <div className="att-modal-actions">
        <button type="button" className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
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
