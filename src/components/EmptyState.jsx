function EmptyState({
  icon = "fa-inbox",
  title = "No data",
  message = "Nothing to display for the current filters.",
  action = null,
}) {
  return (
    <div className="empty-state">
      <i className={`fas ${icon}`} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}

export default EmptyState;
