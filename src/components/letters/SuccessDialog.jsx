import React from "react";

export default function SuccessDialog({
  open,
  title,
  recipient,
  email,
  referenceNumber,
  sentAt,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="success-overlay">
      <div className="success-dialog">
        <div className="success-icon">✓</div>

        <h2>Email Sent Successfully</h2>

        <p className="success-subtitle">{title}</p>

        <div className="success-details">
          <div className="success-row">
            <strong>Recipient</strong>
            <span>{recipient}</span>
          </div>

          <div className="success-row">
            <strong>Email</strong>
            <span>{email}</span>
          </div>

          <div className="success-row">
            <strong>Reference No.</strong>
            <span>{referenceNumber}</span>
          </div>

          <div className="success-row">
            <strong>Sent At</strong>
            <span>{sentAt}</span>
          </div>
        </div>

        <button
          className="success-close-btn"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}