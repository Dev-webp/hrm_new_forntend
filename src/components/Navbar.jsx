import { useEffect, useRef, useState } from "react";
import { BRANCH_LABELS } from "../utils/dashboardHelpers";
import { BRANCH_OPTIONS } from "../config/adminNav";

function Navbar({
  title,
  subtitle,
  branch,
  onBranchChange,
  month,
  onMonthChange,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close branch dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const branchLabel = BRANCH_LABELS[branch] || branch;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="topbar-title">
          <h1>
            <i
              className="fas fa-chart-line"
              style={{
                color: "var(--gold)",
                marginRight: "6px",
                fontSize: "0.95rem",
              }}
            />
            {title}
          </h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="topbar-controls">
        <div className="month-picker-wrap">
          <i
            className="fas fa-calendar-alt"
            style={{ color: "var(--gold)", fontSize: "0.72rem" }}
          />
          <input
            type="month"
            value={month}
            onChange={(event) => onMonthChange(event.target.value)}
          />
        </div>

        <div className="branch-dropdown" ref={dropdownRef}>
          <button
            type="button"
            className="branch-btn"
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
          >
            <i className="fas fa-store" />
            <span>{branchLabel}</span>
            <i className="fas fa-chevron-down" style={{ fontSize: "0.6rem" }} />
          </button>

          <div className={`dropdown-menu${menuOpen ? " show" : ""}`}>
            {BRANCH_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="dropdown-item"
                onClick={() => {
                  onBranchChange(option.value);
                  setMenuOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>

        <div className="live-pill">
          <div className="live-dot" />
          <span>Live</span>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
