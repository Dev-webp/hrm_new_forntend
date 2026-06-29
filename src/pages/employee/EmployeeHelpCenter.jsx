import EmployeeSidebar from "../../components/EmployeeSidebar";
import "../../styles/EmployeeHelpCenter.css";

const SUPPORT_CARDS = [
  {
    title: "Contact Manager",
    icon: "fa-user-tie",
    description: [
      "Attendance Issues",
      "Leave Requests",
      "Break Issues",
      "Daily Work Queries",
    ],
    button: "Message Manager",
    href: "mailto:manager@vjcoverseas.com?subject=Employee%20Support%20Request",
  },
  {
    title: "Contact Chairman",
    icon: "fa-crown",
    description: [
      "Escalations",
      "Approvals",
      "Serious Complaints",
      "Company Matters",
    ],
    button: "Email Chairman",
    href: "mailto:chairman@vjcoverseas.com?subject=Employee%20Escalation",
  },
  {
    title: "HRMS Support / Admin",
    icon: "fa-headset",
    description: [
      "Attendance Correction",
      "Absent Correction",
      "Profile Updates",
      "Salary Queries",
      "Technical Issues",
      "HRMS Bugs",
    ],
    button: "Email Admin",
    href: "mailto:admin@vjcoverseas.com?subject=HRMS%20Support%20Request",
  },
];

export default function EmployeeHelpCenter() {
  return (
    <div className="layout employee-help-center-page">
      <EmployeeSidebar activePage="help-center" />
      <main className="employee-help-main">
        <section className="help-center-hero">
          <div>
            <span className="help-kicker">Employee Support</span>
            <h1>Help Center</h1>
            <p>Contact the right person for quick assistance.</p>
          </div>
          <div className="help-hero-badge">
            <i className="fas fa-headset" />
            Support Desk
          </div>
        </section>

        <section className="support-card-grid" aria-label="Support contacts">
          {SUPPORT_CARDS.map((card) => (
            <article className="support-card" key={card.title}>
              <div className="support-icon">
                <i className={`fas ${card.icon}`} />
              </div>
              <h2>{card.title}</h2>
              <ul>
                {card.description.map((item) => (
                  <li key={item}>
                    <i className="fas fa-circle-check" />
                    {item}
                  </li>
                ))}
              </ul>
              <a className="support-action" href={card.href}>
                <i className="fas fa-envelope" />
                {card.button}
              </a>
            </article>
          ))}
        </section>

        <section className="attendance-support-notice">
          <div className="notice-icon">
            <i className="fas fa-circle-info" />
          </div>
          <div>
            <h2>If your attendance is incorrect, please mention:</h2>
            <div className="notice-points">
              <span>Date</span>
              <span>Check In</span>
              <span>Check Out</span>
              <span>Reason</span>
            </div>
            <p>Share these details before contacting support so the team can verify your request quickly.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
