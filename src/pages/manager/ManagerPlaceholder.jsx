import EmptyState from "../../components/EmptyState";

function ManagerPlaceholder({ title = "Manager module" }) {
  return (
    <div className="scroll-content">
      <div className="panel" style={{ padding: 24 }}>
        <h2>{title}</h2>
        <p style={{ color: "var(--muted)", marginTop: 8 }}>
          This manager page will be migrated from the legacy HTML app in a
          future step.
        </p>
        <EmptyState
          icon="fa-hard-hat"
          title={`${title} — coming soon`}
          message="Navigation is wired; the full UI is not converted yet."
        />
      </div>
    </div>
  );
}

export default ManagerPlaceholder;
