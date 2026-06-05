import { Component } from "react";

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("RouteErrorBoundary:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { title = "Something went wrong" } = this.props;

    if (hasError) {
      return (
        <div className="scroll-content">
          <div
            className="panel"
            style={{ padding: "32px", textAlign: "center", margin: "24px" }}
          >
            <div className="panel-title" style={{ justifyContent: "center" }}>
              <i className="fas fa-triangle-exclamation" /> {title}
            </div>
            <p style={{ color: "var(--muted)", marginTop: 12, fontSize: "0.85rem" }}>
              {error?.message || "An unexpected error occurred."}
            </p>
            <button
              type="button"
              className="btn-gold"
              style={{ marginTop: 16 }}
              onClick={this.handleReload}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
