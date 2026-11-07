// Reusable stat/card widgets used across admin dashboard sections

export function WelcomeStat({ value, label, colorClass, icon, accentColor }) {
  const displayValue = isNaN(value) ? 0 : value;
  return (
    <div
      className="welcome-stat"
      style={accentColor ? { "--stat-accent": accentColor } : undefined}
    >
      {icon ? (
        <div className="ws-icon">
          <i className={icon} />
        </div>
      ) : null}
      <div className="ws-copy">
        <div className={`ws-val ${colorClass}`}>{displayValue}</div>
        <div className="ws-lbl">{label}</div>
      </div>
    </div>
  );
}

export function StripTile({ icon, label, value, accentColor, isAction, onClick }) {
  const displayValue = isNaN(value) ? 0 : value;
  return (
    <div
      className={`strip-tile ${isAction ? "strip-tile-action" : ""}`}
      style={{ "--accent-color": accentColor }}
      onClick={isAction ? onClick : undefined}
    >
      <div className="tile-icon">
        <i className={icon} />
      </div>
      <div className="tile-copy">
        <div className="tile-val">{displayValue}</div>
        <div className="tile-lbl">{label}</div>
      </div>
      {isAction && <div className="tile-action-icon"><i className="fas fa-arrow-right" /></div>}
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
        <div key={index} className="emp-card skeleton" style={{ height: "156px" }} />
      ))}
    </>
  );
}

export function Toast({ message, visible }) {
  return (
    <div className={`toast${visible ? " show" : ""}`}>{message}</div>
  );
}
