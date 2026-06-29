import { useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import "../../styles/EmployeeInstructions.css";

const POLICY_SECTIONS = [
  {
    id: "office-timings",
    nav: "Office Timings",
    icon: "fa-clock",
    title: "Office Timings",
    description: "Standard work hours, approved breaks, and minimum production expectations.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Standard Working Hours", value: "10:00 AM - 7:00 PM", note: "No shift system like manufacturing companies" },
          { label: "Present", value: "8 Hours or More", note: "Minimum production for a full day" },
          { label: "Half Day", value: "Less than 8 Hours", note: "Production below full-day requirement" },
          { label: "Full Day Absent", value: "Less than 4 Hours", note: "Insufficient daily production" },
        ],
      },
      {
        type: "checkList",
        title: "Included Breaks",
        items: ["Tea Break 1 - 15 Minutes", "Lunch - 30 Minutes", "Tea Break 2 - 15 Minutes"],
      },
      {
        type: "warning",
        title: "Working Hours Warning",
        text: "No reasons will be accepted for working less than required hours.",
      },
    ],
  },
  {
    id: "late-login-policy",
    nav: "Late Login Policy",
    icon: "fa-business-time",
    title: "Late Login Policy",
    description: "Grace time and monthly late login limits for every employee.",
    content: [
      {
        type: "warning",
        title: "No Exceptions",
        text: "Maximum late logins: 6 per month. Grace time is 10:15 AM. After 10:15 AM, attendance may be treated as half-day absent as per company policy.",
      },
      {
        type: "statGrid",
        items: [
          { label: "Maximum Late Logins", value: "6 Per Month", note: "Monthly limit" },
          { label: "Grace Time", value: "10:15 AM", note: "Login before or at this time" },
          { label: "After 10:15", value: "Half-Day Absent", note: "No exceptions" },
        ],
      },
    ],
  },
  {
    id: "half-day-attendance",
    nav: "Half Day Attendance",
    icon: "fa-calendar-half-stroke",
    title: "Half-Day Attendance",
    description: "Approved half-day windows and examples that are not allowed.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Morning Session", value: "10:00 AM - 2:30 PM", note: "Approved first-half window" },
          { label: "Afternoon Session", value: "2:30 PM - 7:00 PM", note: "Approved second-half window" },
        ],
      },
      {
        type: "danger",
        title: "Examples Not Allowed",
        text: "10:30 AM - 3:00 PM and 2:00 PM - 6:00 PM are not valid half-day sessions.",
      },
    ],
  },
  {
    id: "misuse-of-login",
    nav: "Misuse of Login",
    icon: "fa-triangle-exclamation",
    title: "Misuse of Time After Login",
    description: "Employees should start work immediately after logging in.",
    content: [
      {
        type: "bulletList",
        title: "The following are prohibited",
        items: ["Freshening up after login", "Socializing after login", "Loitering after login"],
      },
      {
        type: "danger",
        title: "Penalty",
        text: "Misuse of time after login will be marked as Half-Day Absent.",
      },
    ],
  },
  {
    id: "break-policy",
    nav: "Break Policy",
    icon: "fa-mug-hot",
    title: "Break Timings & Department Presence",
    description: "Breaks must be planned so departments remain available for clients and support.",
    content: [
      {
        type: "checkList",
        title: "At least one employee must remain available for",
        items: ["Phone Calls", "Walk-in Clients", "Customer Support"],
      },
      {
        type: "statGrid",
        items: [
          { label: "Tea Break", value: "15 mins", note: "First tea break" },
          { label: "Lunch", value: "30 mins", note: "Midday break" },
          { label: "Tea Break", value: "15 mins", note: "Second tea break" },
        ],
      },
      {
        type: "success",
        title: "Remaining Break Rule",
        text: "If an employee has remaining break time, it can be used in multiple small breaks. Example: remaining 10 mins can be used as 5 + 5, 2 + 3 + 5, or 1 + 2 + 7, provided the total daily limit is not exceeded.",
      },
    ],
  },
  {
    id: "leave-policy",
    nav: "Leave Policy",
    icon: "fa-umbrella-beach",
    title: "Leave Policy",
    description: "Rules for sudden leave, extensions, medical emergencies, and weekend-linked leave usage.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Sudden Leave", value: "1+1 Rule", note: "Applied to unplanned leave" },
          { label: "Leave Extension", value: "Same 1+1 Rule", note: "Applied to extensions" },
          { label: "Medical Emergency", value: "Prescription Required", note: "Proof must be submitted" },
          { label: "Saturday / Monday Leave Abuse", value: "1+1 Rule", note: "More than one leave triggers rule" },
        ],
      },
    ],
  },
  {
    id: "mobile-phone-policy",
    nav: "Mobile Phone Policy",
    icon: "fa-mobile-screen-button",
    title: "Mobile Phone Policy",
    description: "Personal phone usage rules inside the workplace.",
    content: [
      {
        type: "info",
        title: "Work Desk Rule",
        text: "Personal mobile phones are prohibited at work desks due to misuse of client information and excessive personal usage.",
      },
      {
        type: "bulletList",
        title: "Deposit & Collection",
        items: [
          "Deposit phones at Reception.",
          "Collection is handled by Sireesha.",
          "If unavailable, follow the instructions of the assigned person.",
          "Phones may be collected during break timings only for emergencies.",
        ],
      },
      {
        type: "danger",
        title: "Penalty",
        text: "Violation may lead to serious disciplinary action.",
      },
    ],
  },
  {
    id: "dress-code",
    nav: "Dress Code",
    icon: "fa-user-tie",
    title: "Dress Code",
    description: "Formal and semi-formal dress requirements for office days.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Monday-Thursday", value: "Formal", note: "Formal attire required" },
          { label: "Friday-Saturday", value: "Semi Formal", note: "Semi-formal attire allowed" },
          { label: "Shoes", value: "Mandatory", note: "Required on office premises" },
          { label: "Violation", value: "1 Full Day Absent", note: "Attendance penalty" },
        ],
      },
    ],
  },
  {
    id: "posting-logs",
    nav: "Posting Logs",
    icon: "fa-clipboard-check",
    title: "Posting Logs",
    description: "Attendance, break, and HRMS entries must be posted only by the concerned employee.",
    content: [
      {
        type: "danger",
        title: "Strictly Prohibited",
        text: "Posting attendance, break logs, or HRMS entries for another employee is strictly prohibited.",
      },
      {
        type: "warning",
        title: "Penalty",
        text: "Both employees will be marked Full Day Absent. No exceptions.",
      },
    ],
  },
];

function buildHandbookText() {
  return POLICY_SECTIONS.map((section, index) => {
    const lines = [`${index + 1}. ${section.title}`, section.description, ""];
    section.content.forEach((block) => {
      if (block.title) lines.push(block.title);
      if (block.text) lines.push(block.text);
      if (block.items) {
        block.items.forEach((item) => {
          if (typeof item === "string") lines.push(`- ${item}`);
          else lines.push(`- ${item.label}: ${item.value} (${item.note})`);
        });
      }
      lines.push("");
    });
    return lines.join("\n");
  }).join("\n---\n\n");
}

function downloadHandbook() {
  const content = [
    "VJC Overseas - Office Policies & Ethics",
    "Last Updated: June 2026",
    "Applies to All Employees",
    "",
    buildHandbookText(),
  ].join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vjc-overseas-office-policies.txt";
  link.click();
  URL.revokeObjectURL(url);
}

function PolicyBlock({ block }) {
  if (block.type === "statGrid") {
    return (
      <div className="doc-stat-grid">
        {block.items.map((item) => (
          <div className="doc-stat" key={`${item.label}-${item.value}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "checkList" || block.type === "bulletList") {
    return (
      <div className={`doc-list-block ${block.type === "checkList" ? "checks" : ""}`}>
        <h3>{block.title}</h3>
        <ul>
          {block.items.map((item) => (
            <li key={item}>
              <i className={`fas ${block.type === "checkList" ? "fa-check" : "fa-circle"}`} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`doc-callout ${block.type}`}>
      <i className={`fas ${block.type === "danger" ? "fa-ban" : block.type === "success" ? "fa-circle-check" : block.type === "warning" ? "fa-triangle-exclamation" : "fa-circle-info"}`} />
      <div>
        <h3>{block.title}</h3>
        <p>{block.text}</p>
      </div>
    </div>
  );
}

export default function EmployeeInstructions() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState(POLICY_SECTIONS[0].id);
  const [acknowledged, setAcknowledged] = useState(false);

  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return POLICY_SECTIONS;
    return POLICY_SECTIONS.filter((section) => {
      const haystack = [
        section.nav,
        section.title,
        section.description,
        ...section.content.flatMap((block) => [
          block.title || "",
          block.text || "",
          ...(block.items || []).map((item) => (
            typeof item === "string" ? item : `${item.label} ${item.value} ${item.note}`
          )),
        ]),
      ].join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [search]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { root: null, rootMargin: "-120px 0px -55% 0px", threshold: [0.1, 0.35, 0.65] }
    );

    POLICY_SECTIONS.forEach((section) => {
      const node = document.getElementById(section.id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="layout employee-instructions-page">
      <EmployeeSidebar activePage="instructions" />
      <main className="employee-instructions-main">
        <section className="handbook-header">
          <div>
            <span className="branch-label">HYDERABAD - BENGALURU</span>
            <h1>Office Policies &amp; Ethics</h1>
            <p>Please read all company policies carefully. These rules apply to every employee.</p>
            <div className="handbook-badges">
              <span><i className="fas fa-calendar-check" /> Last Updated : June 2026</span>
              <span><i className="fas fa-users" /> Applies to All Employees</span>
            </div>
          </div>
          <div className="handbook-tools">
            <label className="handbook-search">
              <i className="fas fa-search" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search Policies..."
              />
            </label>
            <button type="button" onClick={downloadHandbook}>
              <i className="fas fa-download" />
              Download PDF
            </button>
          </div>
        </section>

        <section className="handbook-container">
          <aside className="handbook-nav" aria-label="Policy sections">
            <div className="nav-title">Policy Guide</div>
            {POLICY_SECTIONS.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? "active" : ""}
                onClick={() => scrollToSection(section.id)}
              >
                <span>{index + 1}</span>
                {section.nav}
              </button>
            ))}
          </aside>

          <article className="handbook-document">
            {filteredSections.length > 0 ? (
              filteredSections.map((section) => (
                <section className="doc-section" id={section.id} key={section.id}>
                  <div className="doc-section-head">
                    <span className="doc-section-icon">
                      <i className={`fas ${section.icon}`} />
                    </span>
                    <div>
                      <h2>{section.title}</h2>
                      <p>{section.description}</p>
                    </div>
                  </div>
                  <div className="doc-divider" />
                  <div className="doc-blocks">
                    {section.content.map((block, index) => (
                      <PolicyBlock block={block} key={`${section.id}-${index}`} />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="doc-empty">
                <i className="fas fa-magnifying-glass" />
                No policy sections match your search.
              </div>
            )}

            <section className="important-notes">
              <div>
                <h2><i className="fas fa-circle-info" /> Important Notes</h2>
                <ul>
                  <li>Read policies carefully.</li>
                  <li>Contact Manager for attendance issues.</li>
                  <li>Contact HR/Admin for HRMS issues.</li>
                  <li>Contact Chairman only for escalations.</li>
                </ul>
              </div>
            </section>

            <section className="acknowledgement-panel">
              <div>
                <h2>Employee Acknowledgement</h2>
                <label>
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  I have read and understood all company policies.
                </label>
              </div>
              <button type="button" disabled={!acknowledged}>
                Acknowledge Policies
              </button>
            </section>
          </article>
        </section>
      </main>
    </div>
  );
}
