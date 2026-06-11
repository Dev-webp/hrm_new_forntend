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
  const profileName = localStorage.getItem("full_name") || "VJC User";
  const profileInitials = profileName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
        <label className="topbar-search">
          <i className="fas fa-search" />
          <input type="search" placeholder="Search workspace" aria-label="Search workspace" />
          <span>Ctrl K</span>
        </label>

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

        <button type="button" className="topbar-icon-btn" aria-label="Notifications">
          <i className="fas fa-bell" />
          <span className="topbar-notification-dot" />
        </button>

        <div className="topbar-profile" aria-label={`Signed in as ${profileName}`}>
          <div className="topbar-avatar">{profileInitials}</div>
          <div className="topbar-profile-copy">
            <strong>{profileName}</strong>
            <span>VJC Overseas</span>
          </div>
          <i className="fas fa-chevron-down" />
        </div>
      </div>
    </div>
  );
}

export default Navbar;
