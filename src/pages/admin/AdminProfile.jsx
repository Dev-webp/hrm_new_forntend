import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { fetchProfile, updateProfile } from "../../services/profileApi";
import { getStoredUser, setAuthSession } from "../../utils/auth";
import "./AdminProfile.css";

const EMPTY_FORM = {
  email: "",
  password: "",
  confirmPassword: "",
};

function getCurrentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminProfile() {
  const storedUser = getStoredUser();
  const [branch, setBranch] = useState("all");
  const [month, setMonth] = useState(getCurrentMonth);
  const [form, setForm] = useState(EMPTY_FORM);
  const [profile, setProfile] = useState(storedUser || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchProfile();
        if (ignore) return;
        setProfile(data.user);
        setForm((current) => ({ ...current, email: data.user.email || "" }));
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || "Failed to load profile");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }

    if (form.password && form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const payload = { email: form.email.trim() };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const data = await updateProfile(payload);
      setAuthSession({ token: data.token, user: data.user });
      setProfile(data.user);
      setForm({
        email: data.user.email || "",
        password: "",
        confirmPassword: "",
      });
      setMessage(data.message || "Profile updated successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar
        title="Super Admin Profile"
        subtitle="Update your login email and password"
        branch={branch}
        onBranchChange={setBranch}
        month={month}
        onMonthChange={setMonth}
        profileName={profile?.full_name || "Super Admin"}
        profileSubtitle={profile?.email || "Secure profile"}
      />

      <div className="scroll-content admin-profile-page admin-portal-page">
        <section className="admin-profile-shell">
          <div className="admin-profile-summary">
            <div className="admin-profile-avatar">
              <i className="fas fa-user-shield" />
            </div>
            <div>
              <span className="admin-profile-eyebrow">SUPER ADMIN ONLY</span>
              <h2>{profile?.full_name || "Super Admin"}</h2>
              <p>{profile?.email || "Your admin login profile"}</p>
            </div>
          </div>

          <form className="admin-profile-form" onSubmit={handleSubmit}>
            <div className="profile-form-head">
              <h3>Login Details</h3>
              <p>Only email and password can be changed from this profile.</p>
            </div>

            {loading ? (
              <div className="profile-status">Loading profile...</div>
            ) : null}

            {message ? <div className="profile-alert success">{message}</div> : null}
            {error ? <div className="profile-alert error">{error}</div> : null}

            <label className="profile-field">
              <span>Email Address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="superadmin@example.com"
                autoComplete="email"
                disabled={loading || saving}
                required
              />
            </label>

            <label className="profile-field">
              <span>New Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
                disabled={loading || saving}
              />
            </label>

            <label className="profile-field">
              <span>Confirm Password</span>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={loading || saving}
              />
            </label>

            <div className="profile-actions">
              <button type="submit" className="profile-save-btn" disabled={loading || saving}>
                <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`} />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
