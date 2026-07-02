import { useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import "../../styles/EmployeeInstructions.css";

const POLICY_SECTIONS = [
  {
    id: "office-timings",
    nav: "Office Timings",
    icon: "fa-clock",
    title: "Office Timings",
    description: "Standard office hours and gross login-to-logout duration expectations.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Office Time", value: "10:00 AM - 7:00 PM", note: "Standard office timing for every regular working day" },
          { label: "Grace Time", value: "10:00 AM - 10:14 AM", note: "On-time login window with no late count" },
          { label: "Late Login Starts", value: "10:15 AM", note: "Any login from this time counts as late" },
          { label: "Half Day Starts", value: "10:30 AM", note: "Login from this time cannot become Full Day" },
          { label: "Full Day", value: "9 Gross Hours", note: "Calculated from actual login time to logout time" },
          { label: "Half Day", value: "4+ Gross Hours", note: "Only if login is at or after 10:30 AM" },
        ],
      },
      {
        type: "info",
        title: "Gross Duration Rule",
        text: "Full Day and Half Day are based on total login-to-logout duration. Break time is shown in reports and alerts, but it is not deducted from the attendance duration calculation.",
      },
      {
        type: "exampleList",
        title: "Examples",
        items: [
          "10:12 AM login requires logout at 7:12 PM for Full Day.",
          "10:20 AM to 7:20 PM is Full Day, and late login count increases by 1.",
          "10:30 AM to 7:30 PM is Half Day only, not Full Day.",
          "Less than 4 gross hours is Absent.",
        ],
      },
      {
        type: "warning",
        title: "Actual Login Time Matters",
        text: "Employees must complete the required gross duration from the actual login time, even when the login is within grace time.",
      },
    ],
  },
  {
    id: "grace-time-policy",
    nav: "Grace Time",
    icon: "fa-stopwatch",
    title: "Grace Time",
    description: "Grace login is on time, but the 9-hour requirement still starts from actual login.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Grace Window", value: "10:00-10:14 AM", note: "Login in this window is on time" },
          { label: "Late Count", value: "No Increase", note: "Grace login does not increase late login count" },
          { label: "Full Day Need", value: "9 Gross Hours", note: "Must be completed from actual login time" },
          { label: "Example", value: "10:12 AM - 7:12 PM", note: "Required timing for Full Day" },
        ],
      },
      {
        type: "success",
        title: "Grace Login Example",
        text: "If an employee logs in at 10:12 AM, logout must be at or after 7:12 PM to be eligible for Full Day.",
      },
    ],
  },
  {
    id: "late-login-policy",
    nav: "Late Login",
    icon: "fa-business-time",
    title: "Late Login",
    description: "Late login count starts after grace time and is shown as a total count only.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Late Starts", value: "10:15 AM+", note: "Any login at or after 10:15 AM counts as late" },
          { label: "Monthly Limit", value: "No 6-Limit", note: "Only total late login count is shown" },
          { label: "Late Display", value: "Total Only", note: "Employees see only total late login count" },
          { label: "Status Logic", value: "Separate", note: "Late count and attendance status are calculated separately" },
        ],
      },
      {
        type: "exampleList",
        title: "Late Login Examples",
        items: [
          "10:10 AM login: late count 0.",
          "10:15 AM login: late count +1.",
          "10:29 AM login: late count +1 and Full Day is possible if 9 gross hours are completed.",
          "10:30 AM login: late count +1 and only Half Day or Absent is possible.",
        ],
      },
    ],
  },
  {
    id: "half-day-attendance",
    nav: "Half Day Rules",
    icon: "fa-calendar-half-stroke",
    title: "Half Day Rules",
    description: "Half Day applies to late-half-day logins that meet the minimum gross duration.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Half-Day Start", value: "10:30 AM+", note: "Login at or after this time cannot become Full Day" },
          { label: "Minimum Duration", value: "4 Gross Hours", note: "Needed to mark Half Day" },
          { label: "Below Minimum", value: "Absent", note: "Less than 4 gross hours is Absent" },
          { label: "Full Day", value: "Not Allowed", note: "10:30 AM or later can never become Full Day" },
        ],
      },
      {
        type: "exampleList",
        title: "Half-Day Examples",
        items: [
          "10:30 AM to 2:30 PM is Half Day if 4 gross hours are completed.",
          "10:30 AM to 7:30 PM is still Half Day, not Full Day.",
          "10:31 AM with less than 4 gross hours is Absent.",
        ],
      },
      {
        type: "warning",
        title: "Full Day Cutoff",
        text: "Full Day is possible only when login is before 10:30 AM and the employee completes 9 gross hours.",
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
    title: "Break Policy",
    description: "Breaks are tracked for reporting and over-limit attendance action.",
    content: [
      {
        type: "statGrid",
        items: [
          { label: "Daily Limit", value: "60 Minutes", note: "Total break time allowed per day" },
          { label: "Tea Break 1", value: "15 Minutes", note: "Part of the daily break limit" },
          { label: "Lunch", value: "30 Minutes", note: "Part of the daily break limit" },
          { label: "Tea Break 2", value: "15 Minutes", note: "Part of the daily break limit" },
          { label: "Attendance Duration", value: "Not Deducted", note: "Breaks do not reduce gross hours for status calculation" },
          { label: "Over Limit", value: "Half Day", note: "More than 60 minutes marks attendance as Half Day" },
          { label: "End Break", value: "Always Allowed", note: "End Break must still be saved after 60 minutes" },
        ],
      },
      {
        type: "exampleList",
        title: "Break Examples",
        items: [
          "11:00 AM to 12:00 PM is 60 minutes: Break time is accepted.",
          "11:00 AM to 12:01 PM is 61 minutes: Break exceeded and attendance marked Half Day.",
          "10:22 AM to 11:30 AM is 68 minutes: End Break is allowed and attendance marked Half Day.",
        ],
      },
      {
        type: "warning",
        title: "Break Exceeded Status",
        text: "After 60 minutes, remaining break time may show 0 minutes, but total used break time continues increasing and the status is shown as Exceeded.",
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
          "Collection is handled by Receptionist.",
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
    "VJC Overseas - Office Policies & Instructions",
    "Last Updated: July 2026",
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

  if (block.type === "checkList" || block.type === "bulletList" || block.type === "exampleList") {
    return (
      <div className={`doc-list-block ${block.type === "checkList" ? "checks" : ""} ${block.type === "exampleList" ? "examples" : ""}`}>
        <h3>{block.title}</h3>
        <ul>
          {block.items.map((item) => (
            <li key={item}>
              <i className={`fas ${block.type === "checkList" ? "fa-check" : block.type === "exampleList" ? "fa-arrow-right" : "fa-circle"}`} />
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

export default function EmployeeInstructions({ embedded = false }) {
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
    if (!filteredSections.some((section) => section.id === activeSection)) {
      setActiveSection(filteredSections[0]?.id || POLICY_SECTIONS[0].id);
    }
  }, [activeSection, filteredSections]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;

    const observedNodes = [];
    let animationFrameId;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { root: null, rootMargin: "-120px 0px -55% 0px", threshold: [0.1, 0.35, 0.65] }
    );

    animationFrameId = window.requestAnimationFrame(() => {
      filteredSections.forEach((section) => {
        const node = document.getElementById(section.id);
        if (node) {
          observer.observe(node);
          observedNodes.push(node);
        }
      });
    });

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
      observedNodes.forEach((node) => observer.unobserve(node));
      observer.disconnect();
    };
  }, [filteredSections]);

  const scrollToSection = (sectionId) => {
    const sectionNode = document.getElementById(sectionId);
    if (sectionNode) {
      sectionNode.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  return (
    <div className={embedded ? "employee-instructions-page" : "layout employee-instructions-page"}>
      {!embedded && <EmployeeSidebar activePage="instructions" />}
      <main className="employee-instructions-main">
        <section className="handbook-header">
          <div className="handbook-title-block">
            <span className="branch-label">HRMS EMPLOYEE HANDBOOK</span>
            <h1>Office Policies &amp; Instructions</h1>
            <p>Attendance, breaks, leave, workplace rules, and employee responsibilities.</p>
            <div className="handbook-badges">
              <span><i className="fas fa-calendar-check" /> Last Updated : July 2026</span>
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
              Download Handbook
            </button>
          </div>
        </section>

        <section className="handbook-container">
          <aside className="handbook-nav" aria-label="Policy sections">
            <div className="nav-title">Policy Guide</div>
            {filteredSections.map((section, index) => (
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
