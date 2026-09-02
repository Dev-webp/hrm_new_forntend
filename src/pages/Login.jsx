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

// ─────────────────────────────────────────────
// GET CURRENT GPS LOCATION
// ─────────────────────────────────────────────
const getCurrentLocation = () => {
return new Promise((resolve, reject) => {
if (!navigator.geolocation) {
reject(
new Error(
"Geolocation is not supported by this browser."
)
);
return;
}


  navigator.geolocation.getCurrentPosition(
    (position) => {
      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },

    (error) => {
      let errorMessage =
        "Unable to get your location.";

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage =
            "Location permission was denied. Please enable location access to login.";
          break;

        case error.POSITION_UNAVAILABLE:
          errorMessage =
            "Your location is currently unavailable. Please try again.";
          break;

        case error.TIMEOUT:
          errorMessage =
            "Location request timed out. Please try again.";
          break;

        default:
          errorMessage =
            "Unable to determine your location. Please try again.";
      }

      reject(new Error(errorMessage));
    },

    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  );
});


};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
const handleLogin = async (e) => {
e.preventDefault();


if (submitting) return;

setMessage("");
setSubmitting(true);

try {
  // Step 1: Get current GPS location
  const location = await getCurrentLocation();

  // Step 2: Send login credentials + GPS coordinates
  const { data } = await api.post(
    "/login",
    {
      email: email.trim(),
      password: password,
      latitude: location.latitude,
      longitude: location.longitude,
    },
    {
      skipAuthRedirect: true,
    }
  );

  // Step 3: Save authentication session
  setAuthSession({
    token: data.token,
    user: data.user,
  });

  // Step 4: Redirect based on user role
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
  console.error("Login error:", err);

  if (err.response?.status === 401) {
    setMessage("Invalid email or password");

  } else if (err.response?.data?.message) {
    setMessage(err.response.data.message);

  } else {
    setMessage(
      err.message ||
        "Unable to reach HRMS API. Please try again."
    );
  }

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

return ( <main className="vjc-login-page">


  {/* LEFT HERO SECTION */}
  <section className="vjc-hero-section">

    <div className="hero-orbit orbit-one"></div>
    <div className="hero-orbit orbit-two"></div>
    <div className="hero-map"></div>

    <div className="hero-content">

      <div className="hero-badge">
        Enterprise Immigration HRMS
      </div>

      <h1>
        Welcome to
        <span>VJC Overseas</span>
        <strong>HRMS</strong>
      </h1>

      <p>
        Manage employees, attendance, payroll, leaves,
        performance, recruitment and immigration operations
        from one intelligent platform.
      </p>

      <div className="feature-grid">
        {features.map((item, index) => (
          <div
            className="feature-card"
            key={item}
          >
            <span className="feature-icon">
              {index + 1}
            </span>

            <span>{item}</span>
          </div>
        ))}
      </div>

    </div>

    <div className="hero-footer">
      <span>
        © 2026 VJC Overseas Immigration & Visa Consultants
      </span>

      <span>
        Secure HRMS Platform
      </span>
    </div>

  </section>


  {/* RIGHT LOGIN SECTION */}
  <section className="vjc-login-section">

    <div className="login-bg-circle circle-one"></div>
    <div className="login-bg-circle circle-two"></div>

    <div className="premium-login-card">

      {/* LOGO */}
      <div className="logo-box">
        <img
          src={logo}
          alt="VJC Overseas"
          className="company-logo"
        />
      </div>


      {/* LOGIN HEADING */}
      <div className="login-heading">
        <h2>Welcome Back</h2>

        <p>
          Sign in to continue to your HRMS dashboard
        </p>
      </div>


      {/* LOGIN FORM */}
      <form
        onSubmit={handleLogin}
        className="login-form"
      >

        {/* EMAIL */}
        <div className="input-group">

          <label>Email Address</label>

          <div className="input-wrap">

            <span>✉</span>

            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
              autoComplete="email"
              disabled={submitting}
            />

          </div>

        </div>


        {/* PASSWORD */}
        <div className="input-group">

          <label>Password</label>

          <div className="input-wrap">

            <span>🔒</span>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              autoComplete="current-password"
              disabled={submitting}
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword((prev) => !prev)
              }
              disabled={submitting}
            >
              {showPassword ? "Hide" : "Show"}
            </button>

          </div>

        </div>


        {/* OPTIONS */}
        <div className="form-options">

          <label className="remember-row">

            <input type="checkbox" />

            <span>
              Remember Me
            </span>

          </label>


          <button
            type="button"
            className="forgot-btn"
          >
            Forgot Password?
          </button>

        </div>


        {/* LOGIN BUTTON */}
        <button
          type="submit"
          className="login-btn"
          disabled={submitting}
        >
          {submitting
            ? "Checking location..."
            : "Login"}
        </button>


        {/* ERROR / SUCCESS MESSAGE */}
        {message && (
          <p className="message">
            {message}
          </p>
        )}

      </form>


      <div className="secure-note">
        🔐 Secure HRMS Platform
      </div>

    </div>

  </section>

</main>


);
}

export default Login;
