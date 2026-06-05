// Reusable stat/card widgets used across admin dashboard sections

export function WelcomeStat({ value, label, colorClass }) {
  return (
    <div className="welcome-stat">
      <div className={`ws-val ${colorClass}`}>{value}</div>
      <div className="ws-lbl">{label}</div>
    </div>
  );
}

export function StripTile({ icon, label, value, accentColor }) {
  return (
    <div
      className="strip-tile"
      style={{ "--accent-color": accentColor }}
    >
      <div className="tile-icon">
        <i className={icon} />
      </div>
      <div className="tile-val">{value}</div>
      <div className="tile-lbl">{label}</div>
    </div>
  );
}

export function MonthStripSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="strip-tile skeleton"
          style={{ height: "78px" }}
        />
      ))}
    </>
  );
}

export function EmployeeCardSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="emp-card skeleton" style={{ height: "230px" }} />
      ))}
    </>
  );
}

export function Toast({ message, visible }) {
  return (
    <div className={`toast${visible ? " show" : ""}`}>{message}</div>
  );
}
