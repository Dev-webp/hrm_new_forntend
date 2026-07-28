import React from "react";

export default function SendingOverlay({ step }) {
  return (
    <div className="sending-overlay">
      <div className="sending-card">

        <div className="sending-spinner"></div>

        <h2>VJC Overseas</h2>

        <p>{step}</p>

        <small>
          Please wait while your PDF is generated and delivered.
        </small>

      </div>
    </div>
  );
}