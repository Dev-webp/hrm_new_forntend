import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { setAuthSession } from "../utils/auth";
import "../styles/Login.css";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setSubmitting(true);

    try {
      const { data } = await api.post("/login", { email, password });

      setAuthSession({ token: data.token, user: data.user });

      const role = data.user.role;

      if (role === "SUPER_ADMIN") {
        navigate("/admin");
      } else if (role === "OPERATIONAL_MANAGER") {
        navigate("/operations");
      } else if (role === "MANAGER") {
        navigate("/manager");
      } else if (role === "SUB_ADMIN") {
        navigate("/sub-admin");
      } else {
        navigate("/employee");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    "Attendance Management",
    "Leave Management",
    "Payroll Processing",
    "Employee Directory",
    "Performance Tracking",
    "Immigration Operations",
    "Offer Letter Generation",
    "Notifications & Alerts",
  ];

  return (
    <main className="vjc-login-page">
      <section className="vjc-hero-section">
        <div className="hero-orbit orbit-one"></div>
        <div className="hero-orbit orbit-two"></div>
        <div className="hero-map"></div>

        <div className="hero-content">
          <div className="hero-badge">Enterprise Immigration HRMS</div>

          <h1>
            Welcome to
            <span>VJC Overseas</span>
            <strong>HRMS</strong>
          </h1>

          <p>
            Manage employees, attendance, payroll, leaves, performance,
            recruitment and immigration operations from one intelligent platform.
          </p>

          <div className="feature-grid">
            {features.map((item, index) => (
              <div className="feature-card" key={item}>
                <span className="feature-icon">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-footer">
          <span>© 2026 VJC Overseas Immigration & Visa Consultants</span>
          <span>Secure HRMS Platform</span>
        </div>
      </section>

      <section className="vjc-login-section">
        <div className="login-bg-circle circle-one"></div>
        <div className="login-bg-circle circle-two"></div>

        <div className="premium-login-card">
         
<div className="logo-box">
  <img
    src={logo}
    alt="VJC Overseas"
    className="company-logo"
  />
</div>



          <div className="login-heading">
            <h2>Welcome Back</h2>
            <p>Sign in to continue to your HRMS dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label>Email Address</label>
              <div className="input-wrap">
                <span>✉</span>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-wrap">
                <span>🔒</span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-row">
                <input type="checkbox" />
                <span>Remember Me</span>
              </label>

              <button type="button" className="forgot-btn">
                Forgot Password?
              </button>
            </div>

            <button type="submit" className="login-btn" disabled={submitting}>
              {submitting ? "Signing in..." : "Login"}
            </button>

            {message && <p className="message">{message}</p>}

          
          </form>

          <div className="secure-note">🔐 Secure HRMS Platform</div>
        </div>
      </section>
    </main>
  );
}

export default Login;
