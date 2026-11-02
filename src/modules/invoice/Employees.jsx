import { useState } from "react";
import {
  Box, Typography, Button, TextField, MenuItem, Grid,
  Paper, Chip, Checkbox, CircularProgress, Alert,
  IconButton, InputAdornment, Stack,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import BadgeIcon from "@mui/icons-material/Badge";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_INVOICE_API_URL || "https://invoice.vjcoverseas.com/api";

const DEPARTMENTS = ["Sales", "Operations", "Accounts", "HR", "Marketing", "Management", "MIS", "Developer" ,  "Study/Visit Process Consultant",
  "Immigration Process Consultant"];
const ROLES = ["employee", "manager", "mis-executive", "Full-Stack-Developer" , "Study/Visit Process Consultant",
  "Immigration Process Consultant"];
const LOCATIONS = ["Hyderabad", "Bangalore"];

const ALL_PERMISSIONS = [
  { key: "dashboard",  label: "Dashboard",          icon: "🏠" },
  { key: "leads",      label: "Leads",              icon: "🎯" },
  { key: "customers",  label: "Customers",          icon: "👤" },
  { key: "invoices",   label: "Invoices",           icon: "🧾" },
  { key: "quotes",     label: "Proforma Invoice",             icon: "📋" },
  { key: "payments",   label: "Payments Received",  icon: "💰" },
  { key: "expenses",   label: "Expenses",           icon: "💸" },
  { key: "reports",    label: "Reports",            icon: "📊" },
  { key: "services",   label: "Services",           icon: "🛠️" },
  { key: "rejected_invoices", label: "Rejected Invoices", icon: "🚫" },   // NEW
];

const STEP_LABELS = [
  { label: "Basic Info",      desc: "Name & credentials"  },
  { label: "Role & Location", desc: "Team structure"      },
  { label: "Permissions",     desc: "Access control"      },
];

const EMPTY_FORM = {
  name: "", email: "", password: "", department: "",
  role: "employee", location: "Hyderabad",
  salary: "", bank_account: "", pan: "", ifsc: "",
  dob: "", doj: "", paid_leaves: "0",employee_number: "",
  office_number: "",   // NEW — WhatsApp number for lead-assignment alerts
  permissions: {},
};

function FieldLabel({ children, required }) {
  return (
    <Typography variant="caption" sx={{
      fontWeight: 700, color: "#64748b", letterSpacing: 0.5,
      display: "block", mb: 0.5, textTransform: "uppercase", fontSize: 11,
    }}>
      {children} {required && <span style={{ color: "#ef4444" }}>*</span>}
    </Typography>
  );
}

function StepBar({ step }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", mb: 4 }}>
      {STEP_LABELS.map((s, i) => {
        const done   = i < step;
        const active = i === step;
        return (
          <Box key={i} sx={{ display: "flex", alignItems: "flex-start", flex: i < STEP_LABELS.length - 1 ? 1 : "none" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                bgcolor: done ? "#16a34a" : active ? "#4f46e5" : "#f1f5f9",
                border: `2px solid ${done ? "#16a34a" : active ? "#4f46e5" : "#e2e8f0"}`,
                color: done || active ? "#fff" : "#94a3b8",
                fontWeight: 700, fontSize: 15, transition: "all 0.3s",
              }}>
                {done ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : i + 1}
              </Box>
              <Typography variant="caption" sx={{
                mt: 0.75, fontWeight: active ? 700 : done ? 600 : 400,
                color: done ? "#16a34a" : active ? "#4f46e5" : "#94a3b8",
                textAlign: "center", fontSize: 12, whiteSpace: "nowrap",
              }}>
                {s.label}
              </Typography>
              <Typography variant="caption" sx={{ color: "#cbd5e1", fontSize: 10, textAlign: "center" }}>
                {s.desc}
              </Typography>
            </Box>
            {i < STEP_LABELS.length - 1 && (
              <Box sx={{
                flex: 1, height: 2, mt: "19px", mx: 0.5,
                bgcolor: done ? "#16a34a" : "#e2e8f0",
                transition: "background 0.4s",
              }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function EmpIdPreview({ location, employeeNumber }) {
  const code = location === "Bangalore" ? "BNG" : "HYD";
  const year = new Date().getFullYear();
  return (
    <Box sx={{
      bgcolor: "#eff6ff", border: "1.5px dashed #93c5fd",
      borderRadius: 2, px: 3, py: 2, mt: 1,
      display: "flex", alignItems: "center", gap: 2,
    }}>
      <BadgeIcon sx={{ color: "#4f46e5", fontSize: 22 }} />
      <Box>
        <Typography sx={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, color: "#4f46e5", letterSpacing: 1 }}>
          VJC-{code}-{year}-{employeeNumber || "XXX"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Sequential number assigned automatically on creation
        </Typography>
      </Box>
      <Chip label="AUTO-ASSIGNED" size="small"
        sx={{ ml: "auto", bgcolor: "#dbeafe", color: "#4f46e5", fontWeight: 700, fontSize: 10 }} />
    </Box>
  );
}

function Employees() {
  const navigate = useNavigate();
  const [step, setStep]                 = useState(0);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});
  const [saving, setSaving]             = useState(false);
  const [done, setDone]                 = useState(false);
  const [createdId, setCreatedId]       = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.name.trim())     e.name     = "Full name is required";
      if (!form.email.trim())    e.email    = "Email address is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
      if (!form.password.trim()) e.password = "Password is required";
      else if (form.password.length < 6)         e.password = "Minimum 6 characters";
    }
    if (step === 1) {
      if (!form.role)     e.role     = "Role is required";
      if (!form.location) e.location = "Location is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => s + 1); };
  const back = () => { setErrors({}); setStep((s) => s - 1); };

  const togglePerm = (key) =>
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/auth/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedId(data.employee_id);
        setDone(true);
      } else {
        setErrors({ submit: data.message || "Failed to create employee" });
      }
    } catch {
      setErrors({ submit: "Network error — please try again" });
    } finally {
      setSaving(false);
    }
  };

  // ── Success Screen ──────────────────────────────────────────
  if (done) return (
    <Box sx={{ maxWidth: 560, mx: "auto", textAlign: "center", py: 6 }}>
      <Box sx={{
        width: 96, height: 96, borderRadius: "50%",
        bgcolor: "#dcfce7", display: "flex", alignItems: "center",
        justifyContent: "center", mx: "auto", mb: 3,
        boxShadow: "0 0 0 12px #f0fdf4",
      }}>
        <CheckCircleIcon sx={{ fontSize: 54, color: "#16a34a" }} />
      </Box>
      <Typography variant="h4" fontWeight={800} color="#0f172a">Employee Created!</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
        Login credentials sent to <strong>{form.email}</strong>
      </Typography>
      <Box sx={{
        bgcolor: "#f8fafc", border: "1.5px solid #e2e8f0",
        borderRadius: 3, px: 5, py: 3, mb: 4, display: "inline-block",
      }}>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1, textTransform: "uppercase" }}>
          Employee ID
        </Typography>
        <Typography fontFamily="monospace" fontWeight={800} fontSize={28} color="#4f46e5" sx={{ mt: 0.5 }}>
          {createdId}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
        <Button variant="outlined"
          onClick={() => { setDone(false); setStep(0); setForm(EMPTY_FORM); setErrors({}); }}
          sx={{ px: 4, borderRadius: 2 }}>
          Add Another Invoice Employee
        </Button>
      </Box>
    </Box>
  );

  const stepContent = () => {
    // Step 0 — Basic Info
    if (step === 0) return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FieldLabel required>Full Name</FieldLabel>
          <TextField fullWidth size="small" placeholder="e.g. Rahul Sharma"
            value={form.name} onChange={set("name")}
            error={!!errors.name} helperText={errors.name}
            inputProps={{ autoComplete: "off" }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FieldLabel required>Email Address</FieldLabel>
          <TextField fullWidth size="small" autoComplete="off"
            placeholder="rahul@vjcoverseas.com"
            value={form.email} onChange={set("email")}
            error={!!errors.email} helperText={errors.email} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FieldLabel required>Password</FieldLabel>
          <TextField fullWidth size="small" autoComplete="new-password"
            type={showPassword ? "text" : "password"}
            placeholder="Set a strong password"
            value={form.password} onChange={set("password")}
            error={!!errors.password} helperText={errors.password}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword(v => !v)} edge="end" tabIndex={-1}>
                      {showPassword
                        ? <VisibilityOffIcon sx={{ fontSize: 18, color: "#64748b" }} />
                        : <VisibilityIcon   sx={{ fontSize: 18, color: "#64748b" }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FieldLabel>Department</FieldLabel>
          <TextField select fullWidth size="small"
            value={form.department} onChange={set("department")}>
            <MenuItem value=""><em style={{ color: "#94a3b8" }}>Select department</em></MenuItem>
            {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
                   <Typography variant="caption" color="text.secondary">
            Select from list — Chairman can add new
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FieldLabel>Office Number (WhatsApp)</FieldLabel>
          <TextField fullWidth size="small" placeholder="e.g. 9198xxxxxxx (optional)"
            value={form.office_number} onChange={set("office_number")} />
          <Typography variant="caption" color="text.secondary">
            Optional — lead assignment WhatsApp alerts go here
          </Typography>
        </Grid>
      </Grid>
    );

    // Step 1 — Role & Location
    if (step === 1) return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FieldLabel required>Role</FieldLabel>
          <TextField select fullWidth size="small"
            value={form.role} onChange={set("role")}
            error={!!errors.role} helperText={errors.role}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FieldLabel required>Location</FieldLabel>
          <TextField select fullWidth size="small"
            value={form.location} onChange={set("location")}
            error={!!errors.location} helperText={errors.location}>
            {LOCATIONS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
  <FieldLabel required>Employee Number</FieldLabel>
  <TextField
    fullWidth
    size="small"
    placeholder="e.g. 001"
    value={form.employee_number}
    onChange={set("employee_number")}
  />
</Grid>
        <Grid item xs={12}>
          <FieldLabel>Employee ID Preview</FieldLabel>
          <Typography>
  Test Value : {form.employee_number}
</Typography>
          <EmpIdPreview
  location={form.location}
  employeeNumber={form.employee_number}
/>
        </Grid>
        <Grid item xs={12}>
          <Box sx={{
            p: 2, borderRadius: 2,
            bgcolor: form.role === "manager" ? "#fffbeb" : "#f0fdf4",
            border: `1px solid ${form.role === "manager" ? "#fde68a" : "#86efac"}`,
            display: "flex", alignItems: "center", gap: 1.5,
          }}>
            <Typography fontSize={22}>{form.role === "manager" ? "👔" : "👤"}</Typography>
            <Box>
              <Typography fontWeight={700} fontSize={14}>
                {form.role.charAt(0).toUpperCase() + form.role.slice(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {form.role === "manager"
                  ? "Can oversee team data — section access configured in Step 4."
                  : "Standard access — sees only sections enabled in Step 4."}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    );

    
    // Step 2 — Permissions
    if (step === 2) return (
      <Box>
        <Box sx={{
          mb: 2.5, p: 2, bgcolor: "#f8fafc", borderRadius: 2,
          border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Typography fontSize={18}>💡</Typography>
          <Typography variant="caption" color="text.secondary" lineHeight={1.5}>
            Chairman always has full access. The employee will only see sections checked below.
            You can update permissions anytime from the employee profile.
          </Typography>
        </Box>
        <Grid container spacing={1.5}>
          {ALL_PERMISSIONS.map((p) => {
            const checked = !!form.permissions[p.key];
            return (
              <Grid item xs={12} sm={6} key={p.key}>
                <Box onClick={() => togglePerm(p.key)} sx={{
                  display: "flex", alignItems: "center", gap: 2,
                  p: 2, borderRadius: 2, cursor: "pointer",
                  border: `2px solid ${checked ? "#4f46e5" : "#e2e8f0"}`,
                  bgcolor: checked ? "#eef2ff" : "#fafafa",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: "#4f46e5", bgcolor: "#f0f0ff" },
                }}>
                  <Typography fontSize={20}>{p.icon}</Typography>
                  <Typography fontWeight={600} flex={1} fontSize={14}
                    color={checked ? "#3730a3" : "#374151"}>
                    {p.label}
                  </Typography>
                  <Checkbox checked={checked} onChange={() => togglePerm(p.key)}
                    sx={{ p: 0, color: checked ? "#4f46e5" : "#cbd5e1" }}
                    onClick={(e) => e.stopPropagation()} />
                </Box>
              </Grid>
            );
          })}
        </Grid>
        {errors.submit && <Alert severity="error" sx={{ mt: 2.5 }}>{errors.submit}</Alert>}
      </Box>
    );
  };

  const stepMeta = [
  { icon: "👤", title: "Basic Information",  sub: "Name, login credentials and department" },
  { icon: "🏢", title: "Role & Location",    sub: "Determines employee ID format and permission defaults" },
  { icon: "🔐", title: "Access Permissions", sub: "Select which sections this employee can access" },
];

  return (
    <Box component="form" autoComplete="off" sx={{ maxWidth: 820, mx: "auto" }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={800} color="#0f172a">Add Invoice Employee</Typography>
        <Typography variant="body2" color="text.secondary">
          Step {step + 1} of 4 — {STEP_LABELS[step].label}
        </Typography>
      </Box>

      <StepBar step={step} />

      <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ px: 3, py: 2.5, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <Typography fontWeight={700} color="#0f172a">
            {stepMeta[step].icon} {stepMeta[step].title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {stepMeta[step].sub}
          </Typography>
        </Box>
        <Box sx={{ p: 3 }}>{stepContent()}</Box>
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}>
        <Button onClick={back} variant="outlined" disabled={step === 0}
          sx={{ px: 4, borderRadius: 2, color: "#64748b", borderColor: "#e2e8f0" }}>
          ← Back
        </Button>
        {step < 2 ? (
          <Button variant="contained" onClick={next}
            sx={{ px: 5, borderRadius: 2, bgcolor: "#4f46e5", "&:hover": { bgcolor: "#4338ca" } }}>
            Next →
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={saving}
            sx={{ px: 5, borderRadius: 2, bgcolor: "#16a34a", "&:hover": { bgcolor: "#15803d" }, minWidth: 180 }}>
            {saving ? <CircularProgress size={20} color="inherit" /> : "Create Employee →"}
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default Employees;
