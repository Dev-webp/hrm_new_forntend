import { useEffect, useMemo, useRef, useState } from "react";
import { ROLE_OPTIONS, STATUS_OPTIONS } from "../utils/employeeHelpers";

function EmployeeFilters({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  departments = [],
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
}) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const deptRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (deptRef.current && !deptRef.current.contains(event.target)) {
        setDeptOpen(false);
        setDeptQuery("");
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const filteredDepartments = useMemo(() => {
    if (!deptQuery.trim()) return departments;
    const q = deptQuery.trim().toLowerCase();
    return departments.filter((dept) => dept.toLowerCase().includes(q));
  }, [departments, deptQuery]);

  const deptLabel = department === "all" ? "All Departments" : department;

  return (
    <div className="ef-bar">
      <style>{`
        .ef-bar {
          --navy: #143967;
          --navy-dark: #0E2A4D;
          --orange: #F6821F;
          --teal: #14A79E;
          --mist: #F3F6FB;
          --line: #E2E7EF;
          --muted: #64748B;

          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px 18px;
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 16px;
          margin-bottom: 20px;
        }
        .ef-top-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* --- Search: small and compact --- */
        .ef-search {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--mist);
          border: 1.5px solid transparent;
          border-radius: 999px;
          padding: 0 12px;
          height: 36px;
          width: 240px;
          max-width: 100%;
          transition: box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, width 0.18s ease;
        }
        .ef-search.focused {
          background: #FFFFFF;
          border-color: var(--orange);
          width: 280px;
          box-shadow: 0 0 0 3px rgba(246, 130, 31, 0.16);
        }
        .ef-search-icon {
          font-size: 12px;
          color: #93A0AC;
          transition: color 0.18s ease;
          flex-shrink: 0;
        }
        .ef-search.focused .ef-search-icon {
          color: var(--orange);
        }
        .ef-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          color: var(--navy-dark);
          padding: 0 8px;
          height: 100%;
          min-width: 0;
        }
        .ef-search input::placeholder {
          color: #9AA7AC;
        }
        .ef-search-clear {
          border: none;
          background: var(--line);
          color: var(--muted);
          width: 16px;
          height: 16px;
          border-radius: 50%;
          font-size: 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s ease;
        }
        .ef-search-clear:hover {
          background: #D6DEE8;
        }

        /* --- Role / status selects --- */
        .ef-selects {
          display: flex;
          gap: 10px;
        }
        .ef-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .ef-select-wrap i {
          position: absolute;
          left: 12px;
          font-size: 12px;
          color: var(--navy);
          pointer-events: none;
        }
        .ef-select {
          appearance: none;
          border: 1.5px solid var(--line);
          background: #FAFBFD;
          border-radius: 10px;
          padding: 9px 30px 9px 32px;
          font-size: 13.5px;
          color: var(--navy-dark);
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .ef-select:hover,
        .ef-select:focus {
          border-color: var(--navy);
          outline: none;
        }

        /* --- Department: searchable dropdown --- */
        .ef-dept {
          position: relative;
        }
        .ef-dept-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #FAFBFD;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13.5px;
          color: var(--navy-dark);
          cursor: pointer;
          transition: border-color 0.15s ease;
          white-space: nowrap;
        }
        .ef-dept-btn:hover,
        .ef-dept.open .ef-dept-btn {
          border-color: var(--navy);
        }
        .ef-dept-btn i.fa-building { color: var(--navy); font-size: 12px; }
        .ef-dept-btn i.fa-chevron-down { color: var(--muted); font-size: 10px; margin-left: 2px; }

        .ef-dept-panel {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          width: 240px;
          background: #FFFFFF;
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: 0 10px 28px rgba(14, 42, 77, 0.14);
          padding: 8px;
          z-index: 30;
        }
        .ef-dept-search {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--mist);
          border-radius: 8px;
          padding: 7px 10px;
          margin-bottom: 6px;
        }
        .ef-dept-search i {
          font-size: 11px;
          color: var(--muted);
        }
        .ef-dept-search input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          color: var(--navy-dark);
          flex: 1;
        }
        .ef-dept-list {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .ef-dept-item {
          padding: 8px 10px;
          border-radius: 7px;
          font-size: 13px;
          color: var(--navy-dark);
          cursor: pointer;
        }
        .ef-dept-item:hover {
          background: var(--mist);
        }
        .ef-dept-item.active {
          background: var(--orange);
          color: #fff;
          font-weight: 600;
        }
        .ef-dept-empty {
          padding: 10px;
          font-size: 12.5px;
          color: var(--muted);
          text-align: center;
        }
      `}</style>

      <div className="ef-top-row">
        <div className={`ef-search${searchFocused ? " focused" : ""}`}>
          <i className="fas fa-search ef-search-icon" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {search && (
            <button
              type="button"
              className="ef-search-clear"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        <div className="ef-selects">
          <div className="ef-select-wrap">
            <i className="fas fa-user-tag" />
            <select
              className="ef-select"
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value)}
              aria-label="Filter by role"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="ef-select-wrap">
            <i className="fas fa-circle-dot" />
            <select
              className="ef-select"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={`ef-dept${deptOpen ? " open" : ""}`} ref={deptRef}>
          <button
            type="button"
            className="ef-dept-btn"
            onClick={(event) => {
              event.stopPropagation();
              setDeptOpen((prev) => !prev);
            }}
          >
            <i className="fas fa-building" />
            {deptLabel}
            <i className="fas fa-chevron-down" />
          </button>

          {deptOpen && (
            <div className="ef-dept-panel">
              <div className="ef-dept-search">
                <i className="fas fa-search" />
                <input
                  type="text"
                  placeholder="Search department..."
                  value={deptQuery}
                  onChange={(event) => setDeptQuery(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="ef-dept-list">
                {!deptQuery && (
                  <div
                    className={`ef-dept-item${department === "all" ? " active" : ""}`}
                    onClick={() => {
                      onDepartmentChange("all");
                      setDeptOpen(false);
                      setDeptQuery("");
                    }}
                  >
                    All Departments
                  </div>
                )}

                {filteredDepartments.length === 0 ? (
                  <div className="ef-dept-empty">No matching departments</div>
                ) : (
                  filteredDepartments.map((dept) => (
                    <div
                      key={dept}
                      className={`ef-dept-item${department === dept ? " active" : ""}`}
                      onClick={() => {
                        onDepartmentChange(dept);
                        setDeptOpen(false);
                        setDeptQuery("");
                      }}
                    >
                      {dept}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default EmployeeFilters;