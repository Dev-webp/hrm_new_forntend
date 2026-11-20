import { useState, useEffect } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, Checkbox, Stack, CircularProgress, Alert,
  FormGroup, FormControlLabel, Select, InputLabel, FormControl,
Tabs, Tab, InputAdornment, Divider, IconButton, Badge, Popover,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import CallIcon from "@mui/icons-material/Call";
import BusinessIcon from "@mui/icons-material/Business";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import EmailIcon from "@mui/icons-material/Email";
import WcIcon from "@mui/icons-material/Wc";
import CampaignIcon from "@mui/icons-material/Campaign";
import SchoolIcon from "@mui/icons-material/School";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import DescriptionIcon from "@mui/icons-material/Description";
import PublicIcon from "@mui/icons-material/Public";
import CategoryIcon from "@mui/icons-material/Category";
import BadgeIcon from "@mui/icons-material/Badge";
import SearchIcon from "@mui/icons-material/Search";
import GroupsIcon from "@mui/icons-material/Groups";
import AddIcon from "@mui/icons-material/Add";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import ListAltIcon from "@mui/icons-material/ListAlt";
import ShareIcon from "@mui/icons-material/Share";   // NEW
import EventIcon from "@mui/icons-material/Event";   // NEW
import FlagIcon from "@mui/icons-material/Flag";   // NEW
import AccessTimeIcon from "@mui/icons-material/AccessTime";   // NEW
import CheckIcon from "@mui/icons-material/Check";   // NEW — Followup "mark done" button
import Switch from "@mui/material/Switch";   // NEW — Client Meeting Mode toggle
import TeamMonitorTab from "./TeamMonitorTab";   // NEW — Team Monitor tab
const API = import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api";
// ── Assumption: after login you store the logged-in user's basic info here.
// If your Login.jsx stores it under a different key / shape, just change
// this one line below (getCurrentUser) — nothing else needs to change.
const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("vjc_invoice_user")) || {};
  } catch {
    return {};
  }
};

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("vjc_invoice_auth")}`,
});

const SOURCES = [
  "Direct Call", "Facebook", "Instagram", "LinkedIn",
  "Reference", "Walk-in", "Google Ad", "WhatsApp",
];

const DEPARTMENTS = [
  { label: "Study Visas", subOptions: ["UK", "USA", "Canada", "Australia", "Europe"] },
  { label: "Immigration / PR", subOptions: ["Canada PR", "Australia PR", "Germany Opportunity Card"] },
  { label: "Visitor Visas / Tourism Packages", subOptions: [] },
  { label: "Air Tickets Enquiries", subOptions: [] },
  { label: "Forex Enquiries", subOptions: [] },
];

const COUNTRIES = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Andorra",
  "Angola",
  "Antigua and Barbuda",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Bahamas",
  "Bahrain",
  "Bangladesh",
  "Barbados",
  "Belarus",
  "Belgium",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivia",
  "Bosnia and Herzegovina",
  "Botswana",
  "Brazil",
  "Brunei",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Cambodia",
  "Cameroon",
  "Canada",
  "Cape Verde",
  "Central African Republic",
  "Chad",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Congo",
  "Costa Rica",
  "Croatia",
  "Cuba",
  "Cyprus",
  "Czech Republic",
  "Denmark",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Estonia",
  "Eswatini",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "Gabon",
  "Gambia",
  "Georgia",
  "Germany",
  "Ghana",
  "Greece",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Jordan",
  "Kazakhstan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Kyrgyzstan",
  "Laos",
  "Latvia",
  "Lebanon",
  "Lesotho",
  "Liberia",
  "Libya",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Madagascar",
  "Malawi",
  "Malaysia",
  "Maldives",
  "Mali",
  "Malta",
  "Marshall Islands",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Moldova",
  "Monaco",
  "Mongolia",
  "Montenegro",
  "Morocco",
  "Mozambique",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Netherlands",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "North Korea",
  "North Macedonia",
  "Norway",
  "Oman",
  "Pakistan",
  "Palau",
  "Palestine",
  "Panama",
  "Papua New Guinea",
  "Paraguay",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Qatar",
  "Romania",
  "Russia",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Samoa",
  "San Marino",
  "Sao Tome and Principe",
  "Saudi Arabia",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "Solomon Islands",
  "Somalia",
  "South Africa",
  "South Korea",
  "South Sudan",
  "Spain",
  "Sri Lanka",
  "Sudan",
  "Suriname",
  "Sweden",
  "Switzerland",
  "Syria",
  "Taiwan",
  "Tajikistan",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Uzbekistan",
  "Vanuatu",
  "Vatican City",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Zimbabwe",
];

const STATUS_OPTIONS = ["New", "Warm", "Cold", "Prospect", "HOLD", "Pending Agreement", "Closed", "Dead"];
// Sticky-column layout for the View Enquiry table — Checkbox / Created-Updated /
// Name / Mobile stay pinned on the left while the remaining columns scroll.
const STICKY_COL = {
  checkbox: { width: 56, left: 0 },
  action: { width: 80, left: 56 },       // NEW
  created: { width: 190, left: 136 },    // was 56
  name: { width: 200, left: 326 },       // was 246
  mobile: { width: 130, left: 526 },     // was 446
};

// Row background color per status — matches the reference screenshots
const statusRowColor = (status) => {
  switch (status) {
    case "Warm": return "#f6d9a7";
    case "Cold": return "#ffffff";
    case "Prospect": return "#a9d6d1";
    case "HOLD": return "#e3a6a1";
    case "Pending Agreement": return "#ffffff";
    case "Dead": return "#d9d9d9";
    default: return "#ffffff";
  }
};

const chipColor = (status) => {
  switch (status) {
    case "Warm": return "warning";
    case "Cold": return "info";
    case "Prospect": return "success";
    case "HOLD": return "error";
    case "Dead": return "default";
    default: return "default";
  }
};

// AFTER
const EMPTY_LEAD_FORM = {
  lead_name: "",
  contact_number: "",
  alternate_contact_number: "",
  email: "",
  gender: "",
  source: "",
  education_qualification: "",
  work_experience: "",
  work_description: "",
  interested_countries: [],
  service_type: "",
  direct_assign_staff_id: "",   // NEW — optional, skips round-robin if set
};

// Small reusable section header — light teal bar, matches reference screenshot
function SectionHeader({ icon, label }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: "#e6f3f2",
        borderLeft: "4px solid #0f9b8e",
        px: 2,
        py: 1,
        borderRadius: "6px 6px 0 0",
        mb: 2.5,
      }}
    >
      {icon}
      <Typography variant="subtitle1" fontWeight={700} color="#0f6f65">
        {label}
      </Typography>
    </Box>
  );
}

// ── Boxed field wrapper — matches reference screenshot 2 exactly ───────────
// Label sits as PLAIN STATIC TEXT above the box (never moves).
// Inside the box: icon + input showing a placeholder (not a floating label),
// so nothing jumps or overlaps the border while typing.
function BoxedField({ icon, label, required, error, helperText, children }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, color: "#555", mb: 0.5, display: "block" }}
      >
        {label}
        {required && <span style={{ color: "#d32f2f" }}> *</span>}
      </Typography>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          border: "1px solid",
          borderColor: error ? "#d32f2f" : "#d9dee3",
          borderRadius: 2,
          px: 1.5,
          py: 0.25,
          bgcolor: "#fff",
          "&:hover": { borderColor: "#0f9b8e" },
          "&:focus-within": { borderColor: "#0f9b8e", boxShadow: "0 0 0 2px rgba(15,155,142,0.15)" },
        }}
      >
        <Box sx={{ color: "#7b8794", display: "flex", flexShrink: 0 }}>{icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>{children}</Box>
      </Box>
      {error && helperText && (
        <Typography variant="caption" color="error" sx={{ ml: 0.5 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}

// Underlying input, styled to sit borderless inside BoxedField's own box.
// No label-related CSS needed anymore — we only ever show a placeholder now.
// ── Department picker — replaces the old Service Type dropdown + the
// separate Interested Country dropdown. Selecting a department shows its
// country/program chips inline, so one field now captures both values.
function DepartmentPicker({ value, subValue, onSelect, error, departments, onAddOption }) {
  const selectedDept = departments.find((d) => d.label === value);
  const [addingOption, setAddingOption] = useState(false);
  const [newOption, setNewOption] = useState("");
  return (
    <Box>
      <Typography variant="caption" sx={{ fontWeight: 600, color: "#555", mb: 0.5, display: "block" }}>
        Service Type <span style={{ color: "#d32f2f" }}> *</span>
      </Typography>
      <Grid container spacing={1.5}>
        {DEPARTMENTS.map((d) => (
          <Grid item xs={6} sm={4} md={2.4} key={d.label}>
            <Box
              onClick={() => onSelect(d.label, "")}
              sx={{
                cursor: "pointer",
                border: "1px solid",
                borderColor: value === d.label ? "#0f9b8e" : "#d9dee3",
                borderWidth: value === d.label ? 2 : 1,
                borderRadius: 2,
                px: 1.5,
                py: 1.25,
                textAlign: "center",
                bgcolor: value === d.label ? "#e6f3f2" : "#fff",
                "&:hover": { borderColor: "#0f9b8e" },
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.label}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      {error && (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {error}
        </Typography>
      )}
      {selectedDept && (
        <Box sx={{ mt: 1.5, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {selectedDept.subOptions.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              clickable
              onClick={() => onSelect(value, opt)}
              color={subValue === opt ? "primary" : "default"}
              variant={subValue === opt ? "filled" : "outlined"}
              size="small"
            />
          ))}

          {!addingOption && (
            <Chip
              label="+ Add"
              size="small"
              variant="outlined"
              onClick={() => setAddingOption(true)}
              sx={{ borderStyle: "dashed", color: "#0f9b8e", borderColor: "#0f9b8e" }}
            />
          )}

          {addingOption && (
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              <TextField
                size="small"
                autoFocus
                placeholder="e.g. Ireland"
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                sx={{ width: 130 }}
              />
              <Button
                size="small"
                variant="contained"
                sx={{ minWidth: 32, px: 1 }}
                onClick={() => {
                  if (!newOption.trim()) return;
                  onAddOption(value, newOption.trim());
                  onSelect(value, newOption.trim());
                  setNewOption("");
                  setAddingOption(false);
                }}
              >
                ✓
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
const boxedFieldSx = {
  width: "100%",

  "& .MuiInput-root": {
    fontSize: 14,
    width: "100%",
  },

  "& .MuiInput-root:before, & .MuiInput-root:after": {
    display: "none",
  },

  "& .MuiSelect-select": {
    padding: "8px 32px 8px 4px !important",
    display: "flex",
    alignItems: "center",
  },

  "& .MuiSelect-icon": {
    right: "4px",
    top: "50%",
    transform: "translateY(-50%)",
  },
};

// ── Add Enquiry Form — inline (lives inside the "Add Enquiry" tab, not a popup) ──
// AFTER
function AddEnquiryForm({ onSaved, isChairman }) {
  const [form, setForm] = useState(EMPTY_LEAD_FORM);
  const [departments, setDepartments] = useState(DEPARTMENTS);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState([]);   // NEW — for direct-assign dropdown
  const [dup, setDup] = useState([]);   // NEW — existing leads that match the typed number
  const [choice, setChoice] = useState("");   // NEW — "new" = user chose "Create new enquiry (same customer)"
  const [reopening, setReopening] = useState(false);   // NEW
  // NEW — only chairman/mis-executive can fetch the employee list
  useEffect(() => {
    if (!isChairman) return;
    fetch(`${API}/auth/employees`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStaffList(d.employees || []); })
      .catch(() => {});
  }, [isChairman]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // NEW — duplicate check: when a number has 10+ digits, look it up (waits 0.5 s after typing stops)
  useEffect(() => {
    const digits = (v) => String(v || "").replace(/\D/g, "");
    const n1 = digits(form.contact_number);
    const n2 = digits(form.alternate_contact_number);
    if (n1.length < 10 && n2.length < 10) { setDup([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const q = new URLSearchParams();
        if (n1.length >= 10) q.set("number", n1);
        if (n2.length >= 10) q.set("alt", n2);
        const res = await fetch(`${API}/leads/check-duplicate?${q.toString()}`, { headers: authHeader() });
        const data = await res.json();
        if (!cancelled) setDup(data.success ? (data.duplicates || []) : []);
      } catch {
        if (!cancelled) setDup([]);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.contact_number, form.alternate_contact_number]);
  

    // NEW — a changed number resets the "create new enquiry" choice
  useEffect(() => { setChoice(""); }, [form.contact_number, form.alternate_contact_number]);

  // NEW — repeat-enquiry rules:
  //  • ACTIVE enquiry, SAME service      -> blocked (existing details are shown)
  //  • ACTIVE enquiry, DIFFERENT service -> allowed (separate enquiry, history kept)
  //  • Closed / Dead enquiry             -> choose: Reopen it, or create a new enquiry (same customer)
  const norm = (v) => String(v || "").trim().toLowerCase();
  const isInactiveLead = (d) => d.status === "Closed" || d.status === "Dead";
  const blocking = dup.filter(
    (d) => !isInactiveLead(d) && (!norm(d.service_type) || (form.service_type && norm(d.service_type) === norm(form.service_type)))
  );
  const inactiveMatches = dup.filter(isInactiveLead);
  const needsChoice = blocking.length === 0 && inactiveMatches.length > 0 && choice !== "new";

  const handleReopen = async (leadId) => {
    if (!window.confirm("Reopen this enquiry? Old follow-ups, notes and history stay as they are.")) return;
    setReopening(true);
    try {
      const res = await fetch(`${API}/leads/${leadId}/reopen`, { method: "PUT", headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        if (data.assigned === false) {
          alert("Enquiry reopened, but no consultant was available. It is now in Pending Assignment.");
        }
        setForm(EMPTY_LEAD_FORM);
        setErrors({});
        onSaved(); // refreshes the list + switches to "View Enquiry" tab
      } else {
        alert("❌ " + (data.message || "Failed to reopen enquiry"));
      }
    } catch {
      alert("❌ Failed to reopen enquiry");
    } finally {
      setReopening(false);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.lead_name.trim()) e.lead_name = "Lead Name is required";
    if (!form.contact_number.trim()) e.contact_number = "Contact Number is required";
    if (!form.source) e.source = "Source is required";
    if (!form.service_type) e.service_type = "Service Type is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
        if (blocking.length > 0 || needsChoice) return;   // NEW — only an active same-service enquiry (or an unanswered choice) stops saving   // NEW — number already exists, do not create a duplicate
    setSaving(true);
    try {
      const res = await fetch(`${API}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
               body: JSON.stringify({ ...form, confirm_new_enquiry: choice === "new" }),
      });
      const data = await res.json();
      if (data.success) {
        setForm(EMPTY_LEAD_FORM);
        setErrors({});
               onSaved(); // refreshes the list + switches to "View Enquiry" tab
      } else if (data.duplicate) {
        setDup(data.duplicates || []);   // NEW — server says this number already exists
      } else {
        alert("❌ " + (data.message || "Failed to save enquiry"));
      }
    } catch (err) {
      alert("❌ Failed to save enquiry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ width: "100%", borderRadius: 2, boxShadow: 3 }}>
      {/* Breadcrumb-style header bar, matches reference screenshot */}
      <Box sx={{ bgcolor: "#0f9b8e", color: "#fff", px: 3, py: 1.5, borderRadius: "8px 8px 0 0" }}>
        <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
          Lead &raquo; Add Enquiry
        </Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
                       {/* NEW — existing enquiries for this number (repeat-enquiry rules) */}
        {dup.length > 0 && (
          <Alert severity={blocking.length > 0 ? "error" : "warning"} sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              {blocking.length > 0
                ? "An active enquiry already exists for this customer and service, so a duplicate cannot be created."
                : "This customer already exists in the system. Earlier enquiry details are kept."}
            </Typography>

            {dup.map((d) => (
              <Box key={d.id} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", py: 0.25 }}>
                <Typography variant="body2">
                  {d.lead_name} · {d.contact_number} · {d.service_type || "Service not set"} · Status: {d.status || "New"} · Consultant: {d.assigned_to_name || "Not assigned"} · Created {fmtDateTime(d.created_at)}
                </Typography>
                <Button size="small" onClick={() => window.open(`/lead-history/${d.id}`, "_blank")} sx={{ textTransform: "none" }}>
                  View details
                </Button>
                {isInactiveLead(d) && (
                  <Button size="small" variant="outlined" color="inherit" disabled={reopening} onClick={() => handleReopen(d.id)} sx={{ textTransform: "none" }}>
                    {reopening ? "Reopening..." : "Reopen enquiry"}
                  </Button>
                )}
              </Box>
            ))}

            {blocking.length === 0 && inactiveMatches.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {choice === "new"
                    ? "A new enquiry will be created under this customer. Fill the details and save."
                    : "Choose Reopen enquiry, or create a new enquiry for this customer, to continue."}
                </Typography>
                <Button size="small" variant="contained" disabled={choice === "new"} onClick={() => setChoice("new")} sx={{ textTransform: "none" }}>
                  Create new enquiry (same customer)
                </Button>
              </Box>
            )}

            {blocking.length === 0 && inactiveMatches.length === 0 && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                This customer has an active enquiry for another service. You can save a separate enquiry; the earlier history stays.
              </Typography>
            )}
          </Alert>
        )}

        {/* ── SECTION 1: Personal Details — 3 fields per row, side by side ── */}
        <SectionHeader icon={<PersonIcon sx={{ color: "#0f9b8e" }} />} label="Personal Details" />
        <Grid container spacing={2.5} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={6} md={4}>
            <BoxedField
              icon={<PersonIcon fontSize="small" />}
              label="Lead Name"
              required
              error={!!errors.lead_name}
              helperText={errors.lead_name}
            >
              <TextField
                variant="standard" fullWidth placeholder="Lead Name" sx={boxedFieldSx}
                value={form.lead_name} onChange={set("lead_name")}
                InputProps={{ disableUnderline: true }}
              />
            </BoxedField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <BoxedField
              icon={<CallIcon fontSize="small" />}
                           label="Contact Number"
              required
                            error={!!errors.contact_number || blocking.length > 0}
              helperText={errors.contact_number || "An active enquiry for this service already exists"}
            >
              <TextField
                variant="standard" fullWidth placeholder="Contact Number" sx={boxedFieldSx}
                value={form.contact_number} onChange={set("contact_number")}
                InputProps={{ disableUnderline: true }}
              />
            </BoxedField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <BoxedField icon={<PhoneAndroidIcon fontSize="small" />} label="Alternate Contact Number">
              <TextField
                variant="standard" fullWidth placeholder="Alternate Contact Number" sx={boxedFieldSx}
                value={form.alternate_contact_number} onChange={set("alternate_contact_number")}
                InputProps={{ disableUnderline: true }}
              />
            </BoxedField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <BoxedField icon={<EmailIcon fontSize="small" />} label="Email Id">
              <TextField
                variant="standard" fullWidth placeholder="Email Id" sx={boxedFieldSx}
                value={form.email} onChange={set("email")}
                InputProps={{ disableUnderline: true }}
              />
            </BoxedField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <BoxedField icon={<WcIcon fontSize="small" />} label="Gender">
              <TextField
                select
                variant="standard"
                fullWidth
                sx={boxedFieldSx}
                value={form.gender}
                onChange={set("gender")}
                SelectProps={{ displayEmpty: true }}
                InputProps={{ disableUnderline: true }}
              >
                <MenuItem value="" disabled><em>Select Gender</em></MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </BoxedField>
          </Grid>

                   <Grid item xs={12} sm={6} md={4}>
            <BoxedField
              icon={<CampaignIcon fontSize="small" />}
              label="Source"
              required
              error={!!errors.source}
              helperText={errors.source}
            >
              <TextField
                select
                variant="standard"
                fullWidth
                sx={boxedFieldSx}
                value={form.source}
                onChange={set("source")}
                SelectProps={{ displayEmpty: true }}
                InputProps={{ disableUnderline: true }}
              >
                <MenuItem value="" disabled><em>Select Source</em></MenuItem>
                {SOURCES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </BoxedField>
          </Grid>

          {/* NEW — Direct Assign, chairman/mis-executive only. Leave blank
              for normal round-robin behaviour (unchanged for everyone else). */}
          {isChairman && (
            <Grid item xs={12} sm={6} md={4}>
              <BoxedField icon={<PersonIcon fontSize="small" />} label="Assign Directly To (Optional)">
                <TextField
                  select
                  variant="standard"
                  fullWidth
                  sx={boxedFieldSx}
                  value={form.direct_assign_staff_id}
                  onChange={set("direct_assign_staff_id")}
                  SelectProps={{ displayEmpty: true }}
                  InputProps={{ disableUnderline: true }}
                >
                  <MenuItem value=""><em>Auto (Round Robin)</em></MenuItem>
                  {staffList.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </TextField>
              </BoxedField>
            </Grid>
          )}
        </Grid>

        {/* ── SECTION 2: Other Details — 3 fields per row, side by side ── */}
        <SectionHeader icon={<BadgeIcon sx={{ color: "#0f9b8e" }} />} label="Other Details" />
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6} md={4}>
            <BoxedField icon={<SchoolIcon fontSize="small" />} label="Education Qualification">
              <TextField
                variant="standard" fullWidth placeholder="Education Qualification" sx={boxedFieldSx}
                value={form.education_qualification} onChange={set("education_qualification")}
                InputProps={{ disableUnderline: true }}
              />
            </BoxedField>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <BoxedField icon={<WorkHistoryIcon fontSize="small" />} label="Work Experience (In Years)">
              <TextField
                variant="standard" fullWidth placeholder="Work Experience (In Years)" sx={boxedFieldSx}
                value={form.work_experience} onChange={set("work_experience")}
                InputProps={{ disableUnderline: true }}
              />
            </BoxedField>
          </Grid>

          <Grid item xs={12}>
            <DepartmentPicker
              value={form.service_type}
              subValue={form.interested_countries[0] || ""}
              error={errors.service_type}
              departments={departments}
              onAddOption={(deptLabel, newOpt) =>
                setDepartments((prev) =>
                  prev.map((d) =>
                    d.label === deptLabel
                      ? { ...d, subOptions: [...d.subOptions, newOpt] }
                      : d
                  )
                )
              }
              onSelect={(dept, subOpt) =>
                setForm({
                  ...form,
                  service_type: dept,
                  interested_countries: subOpt ? [subOpt] : [],
                })
              }
            />
          </Grid>
          {/* Work Description — wider box, own row */}
          <Grid item xs={12} md={8}>
            <BoxedField icon={<DescriptionIcon fontSize="small" sx={{ mt: 1 }} />} label="Work Description">
              <TextField
                variant="standard" fullWidth multiline rows={2} placeholder="Work Description" sx={boxedFieldSx}
                value={form.work_description} onChange={set("work_description")}
                InputProps={{ disableUnderline: true }}
              />
            </BoxedField>
          </Grid>

          {/* Interested Country — full width row, own box, matches reference */}
         
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            size="large"
            sx={{ bgcolor: "#0f9b8e", "&:hover": { bgcolor: "#0c7d72" } }}
                       onClick={handleSave}
            disabled={saving || blocking.length > 0 || needsChoice}
          >
            {saving ? "Saving..." : "Save Enquiry"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Assign Enquiry Modal (Branch + Staff) ───────────────────────────────
function AssignEnquiryDialog({ open, onClose, selectedIds, onAssigned }) {
  const [branch, setBranch] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const BRANCHES = ["Hyderabad", "Bangalore"];

  useEffect(() => {
    if (!open) return;
    setBranch(""); setStaffId(""); setStaffList([]);
    // Confirmed from auth.js: GET /api/auth/employees (chairman/mis-executive only)
    // returns { success, employees: [{id, name, location, ...}] } — field is "location", not "branch"
    fetch(`${API}/auth/employees`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStaffList(d.employees || []); })
      .catch(() => {});
  }, [open]);

  const staffForBranch = branch
    ? staffList.filter((s) => !s.location || s.location === branch)
    : staffList;

  const doAssign = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/leads/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ ids: selectedIds, branch, staff_id: staffId }),
      });
      const data = await res.json();
      if (data.success) {
        onAssigned();
        onClose();
      } else {
        alert("❌ " + (data.message || "Failed to assign"));
      }
    } catch {
      alert("❌ Failed to assign enquiry");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <Box
          sx={{
            bgcolor: "#1a2472",
            color: "#fff",
            px: 3,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6" fontWeight={600}>Assign Enquiry</Typography>
          <IconButton onClick={onClose} sx={{ color: "#fff" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Branch <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  displayEmpty
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <BusinessIcon fontSize="small" sx={{ color: "#7b8794" }} />
                    </InputAdornment>
                  }
                  renderValue={(v) => v || <em style={{ color: "#9aa4ae" }}>Select Branch</em>}
                >
                  {BRANCHES.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Staff <span style={{ color: "#d32f2f" }}>*</span>
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  displayEmpty
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" sx={{ color: "#7b8794" }} />
                    </InputAdornment>
                  }
                  renderValue={(v) =>
                    staffForBranch.find((s) => s.id === v)?.name || <em style={{ color: "#9aa4ae" }}>Select Option</em>
                  }
                >
                  {staffForBranch.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button variant="contained" color="error" onClick={onClose}>Close</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: "#1a2472", "&:hover": { bgcolor: "#141c5c" } }}
            disabled={!branch || !staffId}
            onClick={() => setConfirmOpen(true)}
          >
            Assign Enquiry
          </Button>
        </DialogActions>
      </Dialog>
      {/* "Are you sure" confirm popup — matches screenshot 5 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" fontWeight={700}>Are you sure</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            You want to assign this enquiry?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 2 }}>
          <Button variant="contained" color="primary" onClick={doAssign} disabled={saving}>
            {saving ? "Assigning..." : "Yes, Assign it!"}
          </Button>
          <Button variant="contained" color="error" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
// ── Add Notes Dialog — matches reference screenshot 3 exactly ─────────────
function NotesDialog({ open, onClose, lead, onSaved }) {
  const [remark, setRemark] = useState("");
  const [addToReminder, setAddToReminder] = useState(true);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !lead) return;
    setRemark(""); setAddToReminder(true); setReminderDate(""); setReminderTime("");
    fetch(`${API}/leads/${lead.id}/notes`, { headers: authHeader() })
      .then((r) => r.json())
      .then((d) => { if (d.success) setNotes(d.notes || []); })
      .catch(() => {});
  }, [open, lead]);

  const handleSave = async () => {
    if (!remark.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          remark,
          add_to_reminder: addToReminder,
          reminder_date: addToReminder ? reminderDate : null,
          reminder_time: addToReminder ? reminderTime : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
        onClose();
      } else {
        alert("❌ " + (data.message || "Failed to save note"));
      }
    } catch {
      alert("❌ Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <Box
        sx={{
          bgcolor: "#0f9b8e",
          color: "#fff",
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" fontWeight={600}>Add Notes</Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
          Remark <span style={{ color: "#d32f2f" }}>*</span>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Enter Remark"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          sx={{ mb: 2 }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={addToReminder}
              onChange={(e) => setAddToReminder(e.target.checked)}
            />
          }
          label="Add to Reminder"
          sx={{ mb: 1 }}
        />

        {addToReminder && (
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Reminder Date
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Reminder Time
              </Typography>
              <TextField
                fullWidth
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </Grid>
          </Grid>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#f5f5f5" }}>
                <TableCell sx={{ fontWeight: 700, width: 60 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Remark</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reminder</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Commented By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {notes.map((n, i) => (
                <TableRow key={n.id || i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{n.remark}</TableCell>
                  <TableCell>
                    <Chip label={n.stage || "Enquiry"} size="small" color="info" variant="outlined" />
                  </TableCell>
                  <TableCell>{n.reminder || "—"}</TableCell>
                  <TableCell>{n.commented_by || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" color="error" onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          sx={{ bgcolor: "#0f9b8e", "&:hover": { bgcolor: "#0c7d72" } }}
          onClick={handleSave}
          disabled={saving || !remark.trim()}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
// ── Departments tab — chairman assigns staff to each of the 5 departments ──
function DepartmentsTab() {
  const [deptList, setDeptList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingFor, setAddingFor] = useState(null);
  const [pickedStaff, setPickedStaff] = useState("");

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/departments`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setDeptList(data.departments);
    } catch {
      // silent — page still usable
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API}/auth/employees`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setStaffList(data.employees || []);
    } catch {
      // silent
    }
  };

  useEffect(() => { fetchDepartments(); fetchStaff(); }, []);

  const addStaff = async (departmentId) => {
    if (!pickedStaff) return;
    await fetch(`${API}/departments/${departmentId}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ staff_id: pickedStaff }),
    });
    setAddingFor(null);
    setPickedStaff("");
    fetchDepartments();
  };

  const removeStaff = async (departmentId, staffId) => {
    await fetch(`${API}/departments/${departmentId}/staff/${staffId}`, {
      method: "DELETE",
      headers: authHeader(),
    });
    fetchDepartments();
  };

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <Grid container spacing={2.5}>
      {deptList.map((dept) => {
        const assignedIds = (dept.staff || []).map((s) => s.staff_id);
        const availableStaff = staffList.filter((s) => !assignedIds.includes(s.id));
        return (
          <Grid item xs={12} md={6} key={dept.id}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <Box sx={{ bgcolor: "#0f9b8e", color: "#fff", px: 2.5, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <GroupsIcon fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>{dept.name}</Typography>
              </Box>
              <CardContent>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  {(dept.staff || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">No staff assigned yet.</Typography>
                  )}
                  {(dept.staff || []).map((s) => (
                    <Chip
                      key={s.staff_id}
                      label={s.name || `Staff #${s.staff_id}`}
                      onDelete={() => removeStaff(dept.id, s.staff_id)}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </Stack>

                {addingFor === dept.id ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      size="small"
                      value={pickedStaff}
                      onChange={(e) => setPickedStaff(e.target.value)}
                      sx={{ minWidth: 180 }}
                      SelectProps={{ displayEmpty: true }}
                    >
                      <MenuItem value="" disabled><em>Select staff</em></MenuItem>
                      {availableStaff.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </TextField>
                    <Button size="small" variant="contained" sx={{ bgcolor: "#0f9b8e" }} onClick={() => addStaff(dept.id)}>Add</Button>
                    <Button size="small" onClick={() => { setAddingFor(null); setPickedStaff(""); }}>Cancel</Button>
                  </Stack>
                ) : (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingFor(dept.id)} sx={{ textTransform: "none" }}>
                    Add Staff
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
// ── Pending Assignment tab — leads nobody was online to receive (chairman only) ──
function PendingAssignmentTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesLead, setNotesLead] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);   // NEW
  const [assignOpen, setAssignOpen] = useState(false);  // NEW

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads/pending-assignment`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setLeads(data.leads || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  // NEW — checkbox select helpers (same pattern as View Enquiry tab)
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === leads.length ? [] : leads.map((l) => l.id));
  };

  const openHistory = (lead) => {
    window.open(`/lead-history/${lead.id}`, "_blank");
  };

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>;
  }

  return (
    <>
    {/* NEW — manual Assign Enquiry action bar, same as View Enquiry tab */}
    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
      <Button
        variant="outlined"
        disabled={selectedIds.length === 0}
        onClick={() => setAssignOpen(true)}
      >
        Assign Enquiry {selectedIds.length > 0 && `(${selectedIds.length})`}
      </Button>
    </Box>
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ borderRadius: 2, boxShadow: "none", border: "1px solid #e0e0e0" }}
    >
      <Table
        size="small"
        sx={{
          tableLayout: "fixed",
          borderCollapse: "separate",
          borderSpacing: 0,
          "& .MuiTableCell-root": {
            borderRight: "1px solid #c4c4c4",
            borderBottom: "1px solid #c4c4c4",
          },
          "& .MuiTableHead-root .MuiTableCell-root": { borderBottom: "none" },
        }}
      >
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
          <TableRow>
            <TableCell padding="none" sx={{ width: 56, textAlign: "center" }}>
              <Checkbox
                checked={leads.length > 0 && selectedIds.length === leads.length}
                onChange={toggleSelectAll}
              />
            </TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 190 }}>Created - Updated</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 200 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 130 }}>Mobile</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 320 }}>Email</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 160 }}>Interested Country</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 140 }}>Service Type</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 120 }}>Source</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 160 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 160 }}>Department</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 230 }}>Review</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 180 }}>Branch</TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 400 }}>Last Remark</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={13} align="center" sx={{ py: 4, color: "text.secondary" }}>
                No pending leads — everything got assigned.
              </TableCell>
            </TableRow>
          )}
                    {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell padding="none" sx={{ textAlign: "center" }}>
                <Checkbox
                  checked={selectedIds.includes(lead.id)}
                  onChange={() => toggleSelect(lead.id)}
                />
              </TableCell>
              <TableCell sx={{ lineHeight: 1.8 }}>
                <Typography variant="body2">
                  {lead.created_at
                    ? new Date(lead.created_at).toLocaleString("en-GB", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                      })
                    : "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lead.updated_at
                    ? new Date(lead.updated_at).toLocaleString("en-GB", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                      })
                    : "—"}
                </Typography>
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.lead_name}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.contact_number}</TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.email || "—"}</TableCell>
              <TableCell>
                {(lead.interested_countries || []).map((c) => (
                  <Chip key={c} label={c} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                ))}
              </TableCell>
              <TableCell>{lead.service_type || "—"}</TableCell>
              <TableCell>{lead.source}</TableCell>
              <TableCell>
                <Chip label={lead.status || "New"} size="small" variant="outlined" />
              </TableCell>
              <TableCell>{lead.department_name || "—"}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<HistoryIcon fontSize="small" />}
                    onClick={() => openHistory(lead)}
                    sx={{ textTransform: "none", height: 32, minWidth: "auto", px: 1, borderRadius: 1 }}
                  >
                    History
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<StickyNote2Icon fontSize="small" />}
                    onClick={() => { setNotesLead(lead); setNotesOpen(true); }}
                    sx={{ textTransform: "none", minWidth: "auto", px: 1, height: 32, borderRadius: 1 }}
                  >
                    Notes
                  </Button>
                </Stack>
              </TableCell>
              <TableCell>{lead.branch || "—"}</TableCell>
              <TableCell>{lead.last_remark || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>

        <NotesDialog
      open={notesOpen}
      onClose={() => setNotesOpen(false)}
      lead={notesLead}
      onSaved={fetchPending}
    />

    {/* NEW — manual assignment, moves lead out of Pending once assigned */}
    <AssignEnquiryDialog
      open={assignOpen}
      onClose={() => setAssignOpen(false)}
      selectedIds={selectedIds}
      onAssigned={() => { setSelectedIds([]); fetchPending(); }}
    />
    </>
  );
}

// ── Live SLA Countdown badge — updates every second ─────────────────────
function SlaCountdown({ deadline, status }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline || status !== "New") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [deadline, status]);

  if (!deadline) {
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  }

  // Agent already acted (status changed away from "New") — timer no longer matters
  if (status && status !== "New") {
    return <Chip label="✅ Responded" size="small" color="success" variant="outlined" />;
  }

  const diffMs = new Date(deadline).getTime() - now;

  if (diffMs <= 0) {
    return <Chip label="Overdue" size="small" color="error" />;
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const color = minutes < 5 ? "error" : minutes < 15 ? "warning" : "success";

  return <Chip label={display} size="small" color={color} variant="outlined" sx={{ fontFamily: "monospace" }} />;
}
// ── Follow-up Reminder Bell — polls every 45s for due reminders ──────────
function ReminderBell() {
  const [reminders, setReminders] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchDue = async () => {
    try {
      const res = await fetch(`${API}/leads/reminders/due`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setReminders(data.reminders || []);
    } catch {
      // silent — don't disrupt the page if this fails
    }
  };

  useEffect(() => {
    fetchDue();
    const interval = setInterval(fetchDue, 45000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = async (noteId) => {
    try {
      await fetch(`${API}/leads/reminders/${noteId}/dismiss`, {
        method: "PUT",
        headers: authHeader(),
      });
      setReminders((prev) => prev.filter((r) => r.note_id !== noteId));
    } catch {
      alert("❌ Failed to dismiss reminder");
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
<IconButton onClick={() => setOpen(!open)}>
        <Badge badgeContent={reminders.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      {open && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute", right: 0, top: 44, width: 320, zIndex: 10,
            maxHeight: 360, overflowY: "auto", borderRadius: 2,
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #eee" }}>
            <Typography variant="subtitle2" fontWeight={700}>Follow-up Reminders</Typography>
          </Box>
          {reminders.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">No due reminders.</Typography>
            </Box>
          )}
          {reminders.map((r) => (
            <Box key={r.note_id} sx={{ px: 2, py: 1.5, borderBottom: "1px solid #f0f0f0" }}>
              <Typography variant="body2" fontWeight={600}>{r.lead_name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{r.remark}</Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Due {r.reminder_date ? new Date(r.reminder_date).toLocaleDateString("en-GB") : ""} {r.reminder_time || ""}
                </Typography>
                <Button size="small" onClick={() => dismiss(r.note_id)}>Dismiss</Button>
              </Stack>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}

// ── Desktop Notification — pops up when a lead gets assigned to YOU,
// whether via round-robin auto-assign or manual "Assign Enquiry" ──────────
function AssignmentDesktopNotifier() {
  useEffect(() => {
    // Ask for browser permission once (no-op if already granted/denied)
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const checkNew = async () => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      try {
        const res = await fetch(`${API}/leads/assignments/new`, { headers: authHeader() });
        const data = await res.json();
        if (!data.success) return;

        for (const a of data.assignments || []) {
          new Notification("New Lead Assigned", {
            body: `${a.lead_name} has been assigned to you (${a.reason === "manual" ? "manual" : "auto"})`,
            icon: "/vjc-overseas-logo.png",
          });
          // mark as notified so it doesn't pop up again on next poll
          fetch(`${API}/leads/assignments/${a.history_id}/notified`, {
            method: "PUT",
            headers: authHeader(),
          }).catch(() => {});
        }
      } catch {
        // silent — don't disrupt the page if this fails
      }
    };

    checkNew();
    const interval = setInterval(checkNew, 20000);
    return () => clearInterval(interval);
  }, []);

  return null; // no visible UI — purely a background notifier
}

// ── Chairman-only: Today's Assignments feed (no popup, silent poll) ──────
function ChairmanAssignmentFeed() {
  const [assignments, setAssignments] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API}/leads/assignments/today`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setAssignments(data.assignments || []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ position: "relative" }}>
      <IconButton onClick={() => setOpen(!open)}>
        <Badge badgeContent={assignments.length} color="secondary">
          <ListAltIcon />
        </Badge>
      </IconButton>

      {open && (
        <Paper
          elevation={4}
          sx={{
            position: "absolute", right: 0, top: 44, width: 340, zIndex: 10,
            maxHeight: 400, overflowY: "auto", borderRadius: 2,
          }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #eee" }}>
            <Typography variant="subtitle2" fontWeight={700}>Today's Assignments</Typography>
          </Box>
          {assignments.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">No assignments today yet.</Typography>
            </Box>
          )}
          {assignments.map((a) => (
            <Box key={a.history_id} sx={{ px: 2, py: 1.5, borderBottom: "1px solid #f0f0f0" }}>
              <Typography variant="body2" fontWeight={600}>{a.lead_name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                → {a.assigned_to_name || "Unassigned"} ({a.reason || "manual"})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {a.assigned_date ? new Date(a.assigned_date).toLocaleTimeString("en-GB") : ""}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
// ── Client Meeting Mode toggle ───────────────────────────────────────────
// ON  = this person is skipped by round-robin (no new leads while in a client meeting)
// OFF = back in the round-robin. Hidden for people who are not in any department.
function ClientMeetingToggle({ onModeChange }) {
  const [isStaff, setIsStaff] = useState(false);
  const [inMeeting, setInMeeting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState(null);   // NEW — when Meeting Mode was turned ON
  const [now, setNow] = useState(Date.now());          // NEW — ticks every second while in meeting
  const [snoozeUntil, setSnoozeUntil] = useState(0);   // NEW — "Still in meeting" hides popup for 30 min
  const [endedMin, setEndedMin] = useState(null);      // NEW — shows "Meeting ended · X min" briefly

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/departments/meeting-mode`, { headers: authHeader() });
        const data = await res.json();
        if (data.success) {
          setIsStaff(true);
          setInMeeting(!!data.in_meeting);
          // NEW — keep the counter correct after a page refresh
          if (data.in_meeting) setStartedAt(Date.now() - (Number(data.elapsed_seconds) || 0) * 1000);
          if (onModeChange) onModeChange(!!data.in_meeting);
        }
      } catch {
        // silent — the toggle simply stays hidden if this fails
      }
    };
    load();
  }, [onModeChange]);

  // NEW — tick every second only while in a meeting
  useEffect(() => {
    if (!inMeeting) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inMeeting]);

  // NEW — hide "Meeting ended" text after 15 seconds
  useEffect(() => {
    if (endedMin === null) return;
    const t = setTimeout(() => setEndedMin(null), 15000);
    return () => clearInterval(t);
  }, [endedMin]);

  const elapsedMin = inMeeting && startedAt ? Math.floor((now - startedAt) / 60000) : 0;
    const overdue = inMeeting && !!startedAt && now - startedAt >= 30 * 60 * 1000;
  const showPopup = overdue && now >= snoozeUntil;
  // NEW — timer colour: green 0-15 min, orange 15-30 min, red 30+ min
  const meetingColor = !inMeeting ? "#0f6e56" : elapsedMin >= 30 ? "#d32f2f" : elapsedMin >= 15 ? "#eb6834" : "#1e9e5a";

  // NEW — browser tab title changes while the popup is showing
  useEffect(() => {
    if (!showPopup) return;
    const original = document.title;
    document.title = "(!) Meeting 30+ min - turn OFF?";
    return () => { document.title = original; };
  }, [showPopup]);

  const updateMode = async (next) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/departments/meeting-mode`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ in_meeting: next }),
      });
      const data = await res.json();
      if (data.success) {
        if (next) {
          setStartedAt(Date.now());
          setSnoozeUntil(0);
          setEndedMin(null);
        } else {
          setEndedMin(startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : null);
          setStartedAt(null);
        }
        setInMeeting(next);
        if (onModeChange) onModeChange(next);
      } else {
        alert("❌ " + (data.message || "Failed to update Client Meeting Mode"));
      }
    } catch {
      alert("❌ Failed to update Client Meeting Mode");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (e) => updateMode(e.target.checked);

  if (!isStaff) return null;

  return (
    <>
      <Box
        sx={{
          display: "flex", alignItems: "center", gap: 1,
                   border: "1px solid", borderColor: inMeeting ? meetingColor : "#c9cfd9",
          borderRadius: 5, pl: 1.5, pr: 0.5, py: 0.25, bgcolor: overdue ? "#fdecea" : "#fff",
        }}
      >
        <Box>
          <Typography variant="caption" fontWeight={700} sx={{ display: "block", lineHeight: 1.2 }}>
            Client Meeting Mode
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", lineHeight: 1.2, fontSize: 10.5, fontWeight: inMeeting ? 700 : 400, color: meetingColor }}          >
            ● {inMeeting
              ? `In meeting · ${elapsedMin} min · leads paused`
              : endedMin !== null
                ? `Meeting ended · ${endedMin} min`
                : "Available · receiving leads"}
          </Typography>
        </Box>
        <Switch size="small" color="warning" checked={inMeeting} onChange={handleToggle} disabled={saving} />
      </Box>

      {/* NEW — 30 min reminder. Does not auto-close: stays until a button is clicked. */}
      <Dialog open={showPopup} onClose={() => {}} disableEscapeKeyDown maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, bgcolor: "#d32f2f", color: "#fff" }}>
          Is your meeting over? ({elapsedMin} min)
        </DialogTitle>       <DialogContent>
          <Typography variant="body2">
            Client Meeting Mode has been ON for {elapsedMin} minutes. New leads are paused for you.
            Turn it OFF if the meeting is finished.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSnoozeUntil(Date.now() + 30 * 60 * 1000)}>
            Still in meeting (remind in 30 min)
          </Button>
          <Button variant="contained" color="warning" onClick={() => updateMode(false)} disabled={saving}>
            Turn OFF now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
// ── NEW: helpers for Followup popup + Calendar ──
const FU_HEADER = "#0f9b8e";
const FU_CAL = "#00a8a5";
const FU_PAGE_SIZE = 10;
const CAL_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad2 = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtDMY = (ymd) => {
  if (!ymd) return "—";
  const [y, m, d] = String(ymd).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const fmtTime12 = (t, padHour) => {
  if (!t) return "";
  const [h, m] = String(t).split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return padHour ? `${pad2(h12)}:${pad2(m)} ${ap}` : `${h12}:${pad2(m)}${ap}`;
};
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso)
        .toLocaleString("en-GB", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit", hour12: true,
        })
        .replace(",", "")
    : "—";
const calAddDays = (d, n) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
};
const calStartOfWeek = (d) => calAddDays(d, -d.getDay());

// ── NEW: Followup / Appointment popup (share icon click chesthe open avtundi) ──
function FollowupDialog({ open, onClose, lead }) {
  const [info, setInfo] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [doneId, setDoneId] = useState(null);           // NEW — followup being completed
  const [doneRemark, setDoneRemark] = useState("");     // NEW
  const [doneSaving, setDoneSaving] = useState(false);  // NEW
  const leadId = lead?.id;

  const load = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads/${leadId}/followups`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) {
        setInfo(data.lead);
        setFollowups(data.followups || []);
        const ic = data.lead?.interested_countries;
        setCountry(Array.isArray(ic) ? (ic[0] || "") : (ic || ""));
      } else {
        alert("❌ " + (data.message || "Failed to load followups"));
      }
    } catch {
      alert("❌ Failed to load followups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !leadId) return;
    setInfo(null); setFollowups([]); setCountry("");
    setDate(""); setTime(""); setRemarks(""); setPage(1);
    load();
    // eslint-disable-next-line
  }, [open, leadId]);

  const handleSave = async () => {
    if (!date || !time || !remarks.trim()) {
      alert("Next Followup Date, Time and Remarks are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/leads/${leadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ followup_date: date, followup_time: time, remarks }),
      });
      const data = await res.json();
      if (data.success) {
        setDate(""); setTime(""); setRemarks(""); setPage(1);
        load();
      } else {
        alert("❌ " + (data.message || "Failed to save followup"));
      }
    } catch {
      alert("❌ Failed to save followup");
    } finally {
      setSaving(false);
    }
  };

  const markDone = async (id) => {
    try {
      const res = await fetch(`${API}/leads/followups/${id}/done`, {
        method: "PUT",
        headers: authHeader(),
      });
      const data = await res.json();
      if (data.success) {
        setFollowups((prev) => prev.map((f) => (f.id === id ? { ...f, done: true } : f)));
      } else {
        alert("❌ " + (data.message || "Not authorized"));
      }
       } catch {
      alert("❌ Failed to mark done");
    }
  };

  // NEW — tick opens the Remarks popup; OK saves the reason and marks the row Completed
  const completeFollowup = async () => {
    if (!doneRemark.trim()) { alert("Remarks are required"); return; }
    setDoneSaving(true);
    try {
      const res = await fetch(`${API}/leads/followups/${doneId}/done`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ remark: doneRemark.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDoneId(null);
        setDoneRemark("");
        load();
      } else {
        alert("❌ " + (data.message || "Not authorized"));
      }
    } catch {
      alert("❌ Failed to complete followup");
    } finally {
      setDoneSaving(false);
    }
  };

  const name = info?.lead_name || lead?.lead_name || "";
  const email = info?.email || "";
  const mobile = info?.contact_number || lead?.contact_number || "";
    const stage = "Enquiry";   // CHANGED — always "Enquiry" in the followup popup

  const totalPages = Math.max(1, Math.ceil(followups.length / FU_PAGE_SIZE));
  const pageRows = followups.slice((page - 1) * FU_PAGE_SIZE, page * FU_PAGE_SIZE);

  // 30-minute slots, saved as "HH:MM" (same format as before)
  const timeSlots = Array.from({ length: 48 }, (_, i) => `${pad2(Math.floor(i / 2))}:${i % 2 ? "30" : "00"}`);
  // all countries, plus the lead's own value if it is not in the list (e.g. "Canada PR")
  const countryOptions = country && !COUNTRIES.includes(country) ? [country, ...COUNTRIES] : COUNTRIES;

  const FU_ICON_BG = "#e4f5f5";
  const FU_LINE = "#ced4da";

  // plain input/select styling: no underline, no MUI quirks
  const plainSx = {
    width: "100%", border: "none", outline: "none", background: "transparent",
    fontSize: 16, fontFamily: "inherit", color: "#495057", p: 0, m: 0,
    "&::placeholder": { color: "#9aa1a9", opacity: 1 },
  };

  // icon box on the left + field on the right
  const fuField = (icon, content, grey) => (
    <Box sx={{ display: "flex", alignItems: "stretch", height: 44, width: "100%" }}>
      <Box
        sx={{
          width: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          bgcolor: FU_ICON_BG, color: "#3d4a52",
          border: `1px solid ${FU_LINE}`, borderRight: "none", borderRadius: "4px 0 0 4px",
        }}
      >
        {icon}
      </Box>
      <Box
        sx={{
          flex: 1, minWidth: 0, display: "flex", alignItems: "center", px: 1.75,
          bgcolor: grey ? "#e9ecef" : "#fff",
          border: `1px solid ${FU_LINE}`, borderRadius: "0 4px 4px 0",
        }}
      >
        {content}
      </Box>
    </Box>
  );

  const roField = (icon, value, placeholder) =>
    fuField(
      icon,
      <Typography noWrap sx={{ fontSize: 16, color: value ? "#495057" : "#9aa1a9" }}>
        {value || placeholder}
      </Typography>,
      true
    );

  const lbl = (text, req) => (
    <Typography sx={{ fontWeight: 500, mb: 0.75, fontSize: 17, color: "#343a40" }}>
      {text}{req && <span style={{ color: "#d32f2f" }}> *</span>}
    </Typography>
  );

  const badge = (n) => (
    <Box sx={{ bgcolor: "#343a40", color: "#fff", borderRadius: 1, fontSize: 12, fontWeight: 700, px: 0.9, py: 0.1 }}>
      {n}
    </Box>
  );

  const cardSx = { border: "1px solid #cfd4d9", borderRadius: 1.5, boxShadow: "0 1px 6px rgba(0,0,0,0.35)", p: 2.5, mb: 2, bgcolor: "#fff" };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <Box sx={{ bgcolor: FU_HEADER, color: "#fff", px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={600}>Followup / Appointment</Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }} size="small"><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ pt: 2.5 }}>
        {/* Top info: 4 equal full-width columns */}
        <Box sx={cardSx}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, gap: 2.5 }}>
            <Box sx={{ minWidth: 0 }}>{lbl("Name")}{roField(<PersonIcon fontSize="small" />, name, "Name")}</Box>
            <Box sx={{ minWidth: 0 }}>{lbl("Email")}{roField(<EmailIcon fontSize="small" />, email, "Email")}</Box>
            <Box sx={{ minWidth: 0 }}>{lbl("Mobile")}{roField(<CallIcon fontSize="small" />, mobile, "Mobile")}</Box>
            <Box sx={{ minWidth: 0 }}>
              {lbl("Interested Country")}
              {fuField(
                <FlagIcon fontSize="small" />,
                <Box component="select" value={country} onChange={(e) => setCountry(e.target.value)} sx={{ ...plainSx, cursor: "pointer" }}>
                  <option value="">—</option>
                  {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </Box>,
                true
              )}
            </Box>
          </Box>
        </Box>

        {/* Followups header (Appointments removed) */}
        <Box sx={{ borderBottom: "1px solid #e0e0e0", mb: 2 }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, px: 8, py: 1.5, borderBottom: `3px solid ${FU_HEADER}`, mb: "-1px" }}>
            <Typography sx={{ fontSize: 18, color: FU_HEADER }}>Followups</Typography>
            {badge(followups.length)}
          </Box>
        </Box>

        {/* Date / Time / Remarks: 1 : 1 : 2 */}
        <Box sx={cardSx}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 2fr" }, gap: 2.5 }}>
            <Box sx={{ minWidth: 0 }}>
              {lbl("Next Followup Date", true)}
              {fuField(
                <EventIcon fontSize="small" />,
                <Box component="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} sx={plainSx} />
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              {lbl("Next Followup Time", true)}
              {fuField(
                <AccessTimeIcon fontSize="small" />,
                <Box component="select" value={time} onChange={(e) => setTime(e.target.value)}
                  sx={{ ...plainSx, cursor: "pointer", color: time ? "#495057" : "#9aa1a9" }}>
                  <option value="">Follow Up Time</option>
                  {timeSlots.map((t) => <option key={t} value={t} style={{ color: "#495057" }}>{fmtTime12(t)}</option>)}
                </Box>
              )}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              {lbl("Remarks", true)}
              {fuField(
                <StickyNote2Icon fontSize="small" />,
                <Box component="input" type="text" placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} sx={plainSx} />
              )}
            </Box>
          </Box>
        </Box>

        <TableContainer sx={{ border: "1px solid #dee2e6", borderRadius: 1, p: 1 }}>
          <Table
            size="small"
            sx={{
              tableLayout: "fixed",
              minWidth: 900,
              "& .MuiTableCell-root": { border: "1px solid #dee2e6", fontSize: 15, color: "#343a40", verticalAlign: "top", py: 1.25 },
              "& .MuiTableHead-root .MuiTableCell-root": { fontWeight: 700, borderBottom: "2px solid #c9ced3", verticalAlign: "bottom" },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 70 }}>S.No.</TableCell>
                <TableCell sx={{ width: 110 }}>Action</TableCell>
                <TableCell sx={{ width: 230 }}>Created By</TableCell>
                <TableCell>Remarks</TableCell>
                <TableCell sx={{ width: 120 }}>Stage</TableCell>
                <TableCell sx={{ width: 150 }}>Attempt<br />Date / Time</TableCell>
                <TableCell sx={{ width: 150 }}>Next Follow Up<br />Date / Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3 }}><CircularProgress size={24} /></TableCell></TableRow>
              )}
              {!loading && followups.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>No followups yet.</TableCell></TableRow>
              )}
              {!loading && pageRows.map((f, i) => (
                <TableRow key={f.id} sx={f.done ? { bgcolor: "#5cb85c" } : undefined}>
                  <TableCell>{(page - 1) * FU_PAGE_SIZE + i + 1}</TableCell>
                                    <TableCell>
                    {f.done ? (
                      <Box sx={{ display: "inline-block", bgcolor: "#3d9a3d", color: "#fff", borderRadius: 1, px: 1, py: 0.5, fontSize: 14, fontWeight: 600 }}>
                        Completed
                      </Box>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => { setDoneId(f.id); setDoneRemark(""); }}
                        title="Mark as done"
                        sx={{ width: 34, height: 34, bgcolor: FU_HEADER, color: "#fff", borderRadius: 1, "&:hover": { bgcolor: "#0c7d72" } }}
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell>
                    {f.created_by_name || f.commented_by || "—"}
                    {f.department && (<><br />({f.department})</>)}
                  </TableCell>
                  <TableCell>
                    {f.remark}
                    {f.done && f.completion_remark && (
                      <Box sx={{ mt: 0.75, fontSize: 14, fontWeight: 600 }}>
                        Completed: {f.completion_remark}
                      </Box>
                    )}
                  </TableCell>                  <TableCell>
                    <Box sx={{ display: "inline-block", border: "1px solid #3d4a6b", color: "#3d4a6b", borderRadius: "4px", px: 1.25, py: 0.25, fontSize: 14, fontWeight: 600 }}>{stage}</Box>
                  </TableCell>
                  <TableCell>{fmtDateTime(f.created_at)}</TableCell>
                  <TableCell>{fmtDMY(f.reminder_date)} {fmtTime12(f.reminder_time)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" spacing={0} justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button size="small" variant="outlined" disabled={page <= 1} onClick={() => setPage(page - 1)}
            sx={{ textTransform: "none", borderRadius: "4px 0 0 4px", color: "#555", borderColor: "#ddd" }}>Previous</Button>
          {Array.from({ length: totalPages }, (_, k) => k + 1).map((p) => (
            <Button key={p} size="small" variant={p === page ? "contained" : "outlined"} onClick={() => setPage(p)}
              sx={{ textTransform: "none", minWidth: 40, borderRadius: 0, bgcolor: p === page ? FU_HEADER : undefined, borderColor: "#ddd", color: p === page ? "#fff" : "#555", "&:hover": { bgcolor: p === page ? "#0c7d72" : undefined } }}>{p}</Button>
          ))}
          <Button size="small" variant="outlined" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            sx={{ textTransform: "none", borderRadius: "0 4px 4px 0", color: "#555", borderColor: "#ddd" }}>Next</Button>
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button variant="contained" onClick={onClose}
          sx={{ textTransform: "none", minWidth: 84, bgcolor: "#ff6b7d", "&:hover": { bgcolor: "#e85a6b" } }}>
          Close
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}
          sx={{ textTransform: "none", minWidth: 84, bgcolor: FU_HEADER, "&:hover": { bgcolor: "#0c7d72" } }}>
          {saving ? "Saving..." : "Save"}
        </Button>
            </DialogActions>

      {/* NEW — Remarks popup: opens when the green tick is clicked */}
      <Dialog open={doneId !== null} onClose={() => setDoneId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ textAlign: "center", fontWeight: 600 }}>Remarks</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            placeholder="Complete Remarks"
            value={doneRemark}
            onChange={(e) => setDoneRemark(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 1 }}>
          <Button variant="contained" onClick={completeFollowup} disabled={doneSaving || !doneRemark.trim()}
            sx={{ textTransform: "none", minWidth: 84, bgcolor: FU_HEADER, "&:hover": { bgcolor: "#0c7d72" } }}>
            {doneSaving ? "Saving..." : "OK"}
          </Button>
          <Button variant="contained" onClick={() => setDoneId(null)}
            sx={{ textTransform: "none", minWidth: 84, bgcolor: "#6c7a89", "&:hover": { bgcolor: "#59656f" } }}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
// ── NEW: Calendar (month / day / week / list) ──
function FollowupCalendarDialog({ open, onClose }) {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
    const [fuOpen, setFuOpen] = useState(false);
  const [fuLead, setFuLead] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [moreDay, setMoreDay] = useState(null);

  const monthFirst = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthLast = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  let rangeStart;
  let rangeEnd;
  if (view === "month") {
    rangeStart = calStartOfWeek(monthFirst);
    rangeEnd = calAddDays(calStartOfWeek(monthLast), 6);
  } else if (view === "week") {
    rangeStart = calStartOfWeek(cursor);
    rangeEnd = calAddDays(rangeStart, 6);
  } else if (view === "day") {
    rangeStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    rangeEnd = rangeStart;
  } else {
    rangeStart = monthFirst;
    rangeEnd = monthLast;
  }
  const fromStr = toYMD(rangeStart);
  const toStr = toYMD(rangeEnd);
  const todayYmd = toYMD(new Date());

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads/calendar?from=${fromStr}&to=${toStr}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setEvents(data.events || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadEvents();
    // eslint-disable-next-line
  }, [open, fromStr, toStr]);

  useEffect(() => {
    if (open) { setView("month"); setCursor(new Date()); }
  }, [open]);

  const byDate = {};
  events.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });

  const shift = (dir) => {
    if (view === "month" || view === "list") setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else if (view === "week") setCursor(calAddDays(cursor, 7 * dir));
    else setCursor(calAddDays(cursor, dir));
  };

  const title =
    view === "day"
      ? cursor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : view === "week"
        ? `${rangeStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${rangeEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
        : cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const openEvent = (e) => {
    setMoreAnchor(null); setMoreDay(null);
    setFuLead({ id: e.lead_id, lead_name: e.lead_name });
    setFuOpen(true);
  };

  const renderEvent = (e, extra) => (
    <Box
      key={e.id}
      onClick={() => openEvent(e)}
      title={`${e.lead_name}${e.remark ? " – " + e.remark : ""}`}
      sx={{
        bgcolor: FU_CAL, color: "#fff", borderRadius: 0.5, px: 1, py: 0.5, mb: 0.5,
        fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden",
        textOverflow: "ellipsis", "&:hover": { opacity: 0.9 },
      }}
    >
      <b>{fmtTime12(e.time, true)}</b> {e.lead_name}{extra}
    </Box>
  );

  const days = [];
  if (view === "month" || view === "week") {
    for (let d = rangeStart; d <= rangeEnd; d = calAddDays(d, 1)) days.push(d);
  }

  const toolBtn = (label, active, onClick) => (
    <Button
      key={label}
      size="small"
      onClick={onClick}
      sx={{
        textTransform: "none", borderRadius: 0, px: 1.5, minWidth: 0,
        bgcolor: active ? FU_CAL : "#fff", color: active ? "#fff" : "#333",
        border: "1px solid #ddd", "&:hover": { bgcolor: active ? FU_CAL : "#f5f5f5" },
      }}
    >
      {label}
    </Button>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <Box sx={{ bgcolor: FU_HEADER, color: "#fff", px: 3, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={600}>Followup Calendar</Typography>
          <IconButton onClick={onClose} sx={{ color: "#fff" }} size="small"><CloseIcon /></IconButton>
        </Box>

        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
            <Typography variant="h5" sx={{ color: "#333" }}>{title}</Typography>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {loading && <CircularProgress size={18} />}
              <Box sx={{ display: "flex" }}>
                {["month", "day", "week", "list"].map((v) => toolBtn(v, view === v, () => setView(v)))}
              </Box>
              <Box sx={{ display: "flex" }}>
                {toolBtn("‹", false, () => shift(-1))}
                {toolBtn("›", false, () => shift(1))}
              </Box>
              <Button size="small" onClick={() => setCursor(new Date())}
                sx={{ textTransform: "none", border: "1px solid #ddd", color: "#777", bgcolor: "#fff" }}>today</Button>
            </Stack>
          </Box>

          {(view === "month" || view === "week") && (
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderLeft: "1px solid #ddd", borderTop: "1px solid #ddd" }}>
              {CAL_DAYS.map((d, i) => (
                <Box key={d} sx={{ bgcolor: FU_CAL, color: "#fff", fontWeight: 700, textAlign: "center", py: 1.25, borderRight: "1px solid #ddd" }}>
                  {view === "week" ? `${d} ${days[i] ? days[i].getDate() : ""}` : d}
                </Box>
              ))}
              {days.map((d) => {
                const ymd = toYMD(d);
                const list = byDate[ymd] || [];
                const isToday = ymd === todayYmd;
                const other = view === "month" && d.getMonth() !== cursor.getMonth();
                const limit = view === "month" ? 2 : list.length;
                return (
                  <Box key={ymd} sx={{ minHeight: view === "month" ? 130 : 320, p: 0.5, minWidth: 0, borderRight: "1px solid #ddd", borderBottom: "1px solid #ddd", bgcolor: isToday ? "#fcf8e3" : "#fff" }}>
                    {view === "month" && (
                      <Typography variant="body2" align="right" sx={{ pr: 0.5, mb: 0.5, color: other ? "#aaa" : "#333" }}>{d.getDate()}</Typography>
                    )}
                    {list.slice(0, limit).map((e) => renderEvent(e))}
                    {list.length > limit && (
                      <Typography
                        variant="body2"
                        onClick={(ev) => { setMoreAnchor(ev.currentTarget); setMoreDay(ymd); }}
                        sx={{ color: "#555", cursor: "pointer", px: 0.5, "&:hover": { textDecoration: "underline" } }}
                      >
                        +{list.length - limit} more
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          )}

          {view === "day" && (
            <Box sx={{ border: "1px solid #ddd", p: 1.5, minHeight: 200 }}>
              {(byDate[toYMD(cursor)] || []).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No followups on this day.</Typography>
              )}
              {(byDate[toYMD(cursor)] || []).map((e) =>
                renderEvent(e, `${e.agent_name ? "  ·  " + e.agent_name : ""}${e.remark ? "  ·  " + e.remark : ""}`)
              )}
            </Box>
          )}

          {view === "list" && (
            <Box sx={{ border: "1px solid #ddd" }}>
              {Object.keys(byDate).length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No followups this month.</Typography>
              )}
              {Object.keys(byDate).sort().map((ymd) => (
                <Box key={ymd}>
                  <Box sx={{ bgcolor: "#f5f5f5", px: 1.5, py: 0.75, fontWeight: 700, borderBottom: "1px solid #ddd" }}>{fmtDMY(ymd)}</Box>
                  <Box sx={{ p: 1 }}>
                    {byDate[ymd].map((e) =>
                      renderEvent(e, `${e.agent_name ? "  ·  " + e.agent_name : ""}${e.remark ? "  ·  " + e.remark : ""}`)
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <Popover
          open={Boolean(moreAnchor)}
          anchorEl={moreAnchor}
          onClose={() => { setMoreAnchor(null); setMoreDay(null); }}
          anchorOrigin={{ vertical: "top", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          PaperProps={{ sx: { width: 300, maxHeight: 420, bgcolor: "#f0f0f0", p: 1 } }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 0.5, pb: 1 }}>
            <Typography sx={{ fontSize: 17, color: "#333" }}>
              {moreDay
                ? new Date(moreDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                : ""}
            </Typography>
            <IconButton size="small" onClick={() => { setMoreAnchor(null); setMoreDay(null); }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ overflowY: "auto", maxHeight: 340 }}>
            {(byDate[moreDay] || []).map((e) =>
              renderEvent(e, e.agent_name ? `  ·  ${e.agent_name}` : "")
            )}
          </Box>
        </Popover>
      </Dialog>

      <FollowupDialog
        open={fuOpen}
        onClose={() => { setFuOpen(false); loadEvents(); }}
        lead={fuLead}
      />
    </>
  );
}
// ── NEW: Dead Enquiry tab — all leads with status "Dead" ─────────────────
function DeadEnquiryTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fuOpen, setFuOpen] = useState(false);
  const [fuLead, setFuLead] = useState(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesLead, setNotesLead] = useState(null);

  const fetchDead = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/leads?status=Dead`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setLeads(data.leads || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDead(); }, []);

  // changing status away from Dead sends the lead back to View Enquiry
  const changeStatus = async (leadId, newStatus) => {
    if (newStatus === "Dead") return;
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    try {
      await fetch(`${API}/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      alert("❌ Failed to update status");
      fetchDead();
    }
  };

  const shown = leads.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.lead_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.contact_number?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search Name / Email / Mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          Total Number of Records - {shown.length}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, boxShadow: "none", border: "1px solid #e0e0e0" }}>
          <Table
            size="small"
            sx={{
              minWidth: 1500,
              "& .MuiTableCell-root": { borderRight: "1px solid #c4c4c4", borderBottom: "1px solid #c4c4c4" },
            }}
          >
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                {["Action", "Created - Updated", "Name", "Mobile", "Email", "Service Type", "Interested Country", "Assigned To", "Status", "Review", "Last Remark"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No dead enquiries.
                  </TableCell>
                </TableRow>
              )}
              {shown.map((lead) => (
                <TableRow key={lead.id} sx={{ bgcolor: statusRowColor("Dead") }}>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      title="Followup / Appointment (see reason)"
                      onClick={() => { setFuLead(lead); setFuOpen(true); }}
                      sx={{ bgcolor: "#28a745", color: "#fff", borderRadius: 1, "&:hover": { bgcolor: "#1e7e34" } }}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ lineHeight: 1.8, whiteSpace: "nowrap" }}>
                    <Typography variant="body2">{fmtDateTime(lead.created_at)}</Typography>
                    <Typography variant="body2" color="text.secondary">{fmtDateTime(lead.updated_at)}</Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.lead_name}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.contact_number}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{lead.email || "—"}</TableCell>
                  <TableCell>{lead.service_type || "—"}</TableCell>
                  <TableCell>
                    {(lead.interested_countries || []).map((c) => (
                      <Chip key={c} label={c} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </TableCell>
                  <TableCell>{lead.assigned_to_name || "Not Assigned"}</TableCell>
                  <TableCell>
                    <TextField
                      select size="small" value="Dead"
                      onChange={(e) => changeStatus(lead.id, e.target.value)}
                      sx={{ minWidth: 140, bgcolor: "#fff" }}
                    >
                      {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small" variant="outlined"
                        startIcon={<HistoryIcon fontSize="small" />}
                        onClick={() => window.open(`/lead-history/${lead.id}`, "_blank")}
                        sx={{ textTransform: "none", height: 32, minWidth: "auto", px: 1, borderRadius: 1 }}
                      >
                        History
                      </Button>
                      <Button
                        size="small" variant="outlined"
                        startIcon={<StickyNote2Icon fontSize="small" />}
                        onClick={() => { setNotesLead(lead); setNotesOpen(true); }}
                        sx={{ textTransform: "none", height: 32, minWidth: "auto", px: 1, borderRadius: 1 }}
                      >
                        Notes
                      </Button>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ minWidth: 300 }}>{lead.last_remark || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <FollowupDialog open={fuOpen} onClose={() => setFuOpen(false)} lead={fuLead} />
      <NotesDialog open={notesOpen} onClose={() => setNotesOpen(false)} lead={notesLead} onSaved={fetchDead} />
    </>
  );
}

// ── Main Lead Management Page ────────────────────────────────────────────
function LeadManagement() {
  const currentUser = getCurrentUser();
  const isChairman = currentUser.role === "chairman" || currentUser.role === "mis-executive";

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0); // 0 = Add Enquiry, 1 = View Enquiry
  const [inMeeting, setInMeeting] = useState(false); // NEW — drives the "In meeting" banner
  const [assignOpen, setAssignOpen] = useState(false);  const [selectedIds, setSelectedIds] = useState([]);
const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState(""); // Name / Email / Mobile search — client-side filter
  const [followupOpen, setFollowupOpen] = useState(false);   // NEW
  const [followupLead, setFollowupLead] = useState(null);    // NEW
  const [calendarOpen, setCalendarOpen] = useState(false);   // NEW
    const [notesOpen, setNotesOpen] = useState(false);
    //   const [notesOpen, setNotesOpen] = useState(false);
  const [notesLead, setNotesLead] = useState(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.append("status", statusFilter);
      const res = await fetch(`${API}/leads?${params}`, { headers: authHeader() });
      const data = await res.json();
      if (data.success) setLeads(data.leads);
      else setError(data.message || "Failed to load leads");
    } catch {
      setError("Unable to connect to backend server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, [statusFilter]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === filteredLeads.length ? [] : filteredLeads.map((l) => l.id));
  };

  // Opens the full profile-history page in a NEW TAB, same layout as
  // screenshot 4. This points to a route "/lead-history/:id" — you need to
  // add that route in your router (App.jsx / wherever your <Routes> live)
  // pointing to the new LeadProfileHistory component given separately below.
  const openHistory = (lead) => {
    window.open(`/lead-history/${lead.id}`, "_blank");
  };

  const handleStatusChange = async (leadId, newStatus) => {
    // optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
    try {
      await fetch(`${API}/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      alert("❌ Failed to update status");
      fetchLeads();
    }
  };

  // Client-side search — filters by Name / Email / Mobile, matches the "Search Customers" bar style
    const filteredLeads = leads.filter((l) => {
    if (l.status === "Dead") return false;   // NEW — Dead leads live in the Dead Enquiry tab
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.lead_name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.contact_number?.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>Lead Management</Typography>

      <AssignmentDesktopNotifier />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, borderBottom: "1px solid #e0e0e0" }}>
                <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: "none" }}
        >
          <Tab label="Add Enquiry" />
          <Tab label="View Enquiry" />
                    {isChairman && <Tab label="Departments" />}
          {isChairman && <Tab label="Pending Assignment" />}
          <Tab label="Lead Monitor" value={4} />
          <Tab label="Dead Enquiry" value={5} />
                  </Tabs>
        <Stack direction="row" spacing={1} alignItems="center">
          {!isChairman && <ClientMeetingToggle onModeChange={setInMeeting} />}          {isChairman && <ChairmanAssignmentFeed />}
          <Button
            variant="outlined"
            size="small"
            startIcon={<EventIcon fontSize="small" />}
            onClick={() => setCalendarOpen(true)}
            sx={{ textTransform: "none", color: "#fff", bgcolor: "#0f9b8e", borderColor: "#0f9b8e", "&:hover": { bgcolor: "#0c7d72", borderColor: "#0c7d72" } }}
          >
            Calendar
          </Button>
          <ReminderBell />        </Stack>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {inMeeting && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Client Meeting Mode is ON — you are skipped in lead assignment. Turn it OFF after the meeting to start receiving leads again.
        </Alert>
      )}
      {/* ── Tab 0: Add Enquiry ── */}

      {tab === 0 && (
        <AddEnquiryForm
          isChairman={isChairman}
          onSaved={() => {
            fetchLeads();   // refresh the list so the new lead is already there
            setTab(1);      // jump straight to "View Enquiry" to show it
          }}
        />
      )}

            {/* ── Tab 2: Departments (chairman only) ── */}
      {tab === 2 && isChairman && <DepartmentsTab />}

           {/* ── Tab 3: Pending Assignment (chairman only) ── */}
      {tab === 3 && isChairman && <PendingAssignmentTab />}

      {/* ── Tab 4: Team Monitor (chairman / mis-executive only) ── */}
      {tab === 4 && <TeamMonitorTab onGoPending={isChairman ? () => setTab(3) : undefined} onGoView={() => setTab(1)} />}
      {/* NEW — Tab 5: Dead Enquiry (chairman + employee) */}
      {tab === 5 && <DeadEnquiryTab />}

      {/* ── Tab 1: View Enquiry ── */}
      {tab === 1 && (
      <>
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search Name / Email / Mobile"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />

        <TextField select label="Status" size="small" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 180 }}>
          <MenuItem value="All">All</MenuItem>
          {STATUS_OPTIONS.filter((s) => s !== "Dead").map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>

        {isChairman && (
          <Button
            variant="outlined"
            disabled={selectedIds.length === 0}
            onClick={() => setAssignOpen(true)}
          >
            Assign Enquiry {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Button>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          Total Number of Records - {filteredLeads.length}
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
  component={Paper}
  elevation={0}
  sx={{
    borderRadius: 2,
    boxShadow: "none",
    border: "1px solid #e0e0e0",
  }}
>
          <Table
  size="small"
  stickyHeader
  sx={{
    tableLayout: "fixed",
    borderCollapse: "separate",
    borderSpacing: 0,
   "& .MuiTableCell-root": {
  borderRight: "1px solid #c4c4c4",
  borderBottom: "1px solid #c4c4c4",
},
"& .MuiTableHead-root .MuiTableCell-root": {
  borderBottom: "none",
},
  }}
>
           <TableHead
  sx={{
    bgcolor: "#f5f5f5",
    
    "& th": {
      borderTop: "none",
    },
  }}
>
  <TableRow>
<TableCell
      padding="none"
      sx={{
        position: "sticky",
        left: STICKY_COL.checkbox.left,
        width: STICKY_COL.checkbox.width,
        textAlign: "center",
        zIndex: 3,
        bgcolor: "#f5f5f5",
        borderBottom: "none",
      }}
    >    <Checkbox
                    checked={filteredLeads.length > 0 && selectedIds.length === filteredLeads.length}
                    onChange={toggleSelectAll}
                  />
                </TableCell>
<TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", position: "sticky", left: STICKY_COL.action.left, width: STICKY_COL.action.width, zIndex: 3, bgcolor: "#f5f5f5", borderRight: "1px solid #c4c4c4", textAlign: "center" }}>Action</TableCell>
<TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", position: "sticky", left: STICKY_COL.created.left, width: STICKY_COL.created.width, zIndex: 3, bgcolor: "#f5f5f5", borderRight: "1px solid #c4c4c4" }}>Created - Updated</TableCell>
<TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", position: "sticky", left: STICKY_COL.name.left, width: STICKY_COL.name.width, zIndex: 3, bgcolor: "#f5f5f5", borderRight: "1px solid #c4c4c4" }}>Name</TableCell>

<TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", position: "sticky", left: STICKY_COL.mobile.left, width: STICKY_COL.mobile.width, zIndex: 3, bgcolor: "#f5f5f5", borderRight: "1px solid #c4c4c4" }}>Mobile</TableCell>
<TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 320, pl: 3 }}>Email</TableCell>
                <TableCell
  sx={{
    fontWeight: 700,
    whiteSpace: "nowrap",
    width: 160,
    pl: 2,
  }}
>
  Interested Country
</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 140 }}>Service Type</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 120 }}>Source</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 160 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 120 }}>Assigned By</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 120 }}>Assigned To</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 110 }}>SLA Timer</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 230 }}>Review</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 180 }}>Branch</TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", width: 400 }}>Last Remark</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeads.length === 0 && (
                <TableRow>
<TableCell colSpan={15} align="center" sx={{ py: 4, color: "text.secondary" }}>                    No enquiries found. Click "+ Add Enquiry" to create one.
                  </TableCell>
                </TableRow>
              )}
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id} sx={{ bgcolor: statusRowColor(lead.status) }}>
<TableCell
                    padding="none"
                    sx={{ position: "sticky", left: STICKY_COL.checkbox.left, width: STICKY_COL.checkbox.width, textAlign: "center", zIndex: 1, bgcolor: statusRowColor(lead.status) }}
                  >
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                    />
                  </TableCell>
                  {/* NEW — Action column (share icon) */}
                  <TableCell
                    padding="none"
                    sx={{
                      position: "sticky",
                      left: STICKY_COL.action.left,
                      width: STICKY_COL.action.width,
                      zIndex: 1,
                      bgcolor: statusRowColor(lead.status),
                      textAlign: "center",
                      borderRight: "1px solid #c4c4c4",
                    }}
                  >
                    <IconButton
                      size="small"
                      title="Followup / Appointment"
                      onClick={() => { setFollowupLead(lead); setFollowupOpen(true); }}
                      sx={{ bgcolor: "#28a745", color: "#fff", borderRadius: 1, "&:hover": { bgcolor: "#1e7e34" } }}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                 <TableCell
  
  sx={{
    position: "sticky",
    left: STICKY_COL.created.left,
    width: STICKY_COL.created.width,
    zIndex: 1,
    bgcolor: statusRowColor(lead.status),
    lineHeight: 1.8,
    borderRight: "1px solid #c4c4c4",
  }}
>
  <Typography variant="body2">
    {lead.created_at
      ? new Date(lead.created_at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—"}
  </Typography>

  <Typography variant="body2" color="text.secondary">
    {lead.updated_at
      ? new Date(lead.updated_at).toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—"}
  </Typography>
</TableCell>
<TableCell
  sx={{
    position: "sticky",
    left: STICKY_COL.name.left,
    width: STICKY_COL.name.width,
    zIndex: 1,
    bgcolor: statusRowColor(lead.status),
    whiteSpace: "nowrap",
    borderRight: "1px solid #c4c4c4",
  }}
>
  {lead.lead_name}
</TableCell>                 
<TableCell
  sx={{
    position: "sticky",
    left: STICKY_COL.mobile.left,
    width: STICKY_COL.mobile.width,
    zIndex: 1,
    bgcolor: statusRowColor(lead.status),
    whiteSpace: "nowrap",
    borderRight: "1px solid #c4c4c4",
  }}
>
  {lead.contact_number}
</TableCell>
<TableCell
  sx={{
    pl: 3,
    width: 320,
    whiteSpace: "nowrap",
  }}
>
  {lead.email || "—"}
</TableCell>
                  <TableCell sx={{ pl: 2 }}>
  {(lead.interested_countries || []).map((c) => (
    <Chip key={c} label={c} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
  ))}
</TableCell>
                  <TableCell>{lead.service_type || "—"}</TableCell>
                  <TableCell>{lead.source}</TableCell>
                  <TableCell>
                    <TextField
                      select size="small" value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      sx={{ minWidth: 140, bgcolor: "#fff" }}
                    >
                      {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </TextField>
                  </TableCell>
                  <TableCell>{lead.assigned_by_name || "—"}</TableCell>
                  <TableCell>{lead.assigned_to_name || "Not Assigned"}</TableCell>
                  <TableCell>
                    <SlaCountdown deadline={lead.sla_deadline} status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <Stack
  direction="row"
  spacing={0.5}
  alignItems="center"
>
                      <Button
  size="small"
  variant="outlined"
  startIcon={<HistoryIcon fontSize="small" />}
  onClick={() => openHistory(lead)}
  sx={{
    textTransform: "none",
    height: 32,
    minWidth: "auto",
    px: 1,
    borderRadius: 1,
  }}
>
  History
</Button>
                      {/* Assumption: backend GET /leads should also return
                          notes_count per lead. Falls back to 0 if missing. */}
                      <Button
  size="small"
  variant="outlined"
  startIcon={<StickyNote2Icon fontSize="small" />}
  onClick={() => {
    setNotesLead(lead);
    setNotesOpen(true);
  }}
  sx={{
    textTransform: "none",
    minWidth: "auto",
    px: 1,
    height: 32,
    borderRadius: 1,
    display: "flex",
    alignItems: "center",
    gap: 0.5,
  }}
>
  <span>Notes</span>

  <Box
    sx={{
      width: 16,
      height: 16,
      borderRadius: "3px",
      bgcolor: "#1a2472",
      color: "#fff",
      fontSize: "10px",
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1,
    }}
  >
    {lead.notes_count || 0}
  </Box>
</Button>
                    </Stack>
                  </TableCell>
                  <TableCell>{lead.branch || "—"}</TableCell>
                  {/* No remarks/comments system exists in the backend yet — this
                      column is a placeholder so the layout matches the reference.
                      Tell me if you want a real "Add Remark" feature built
                      (needs a small new table + API, not wired up yet). */}
                  <TableCell>{lead.last_remark || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      </>
      )}

      <AssignEnquiryDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        selectedIds={selectedIds}
        onAssigned={() => { setSelectedIds([]); fetchLeads(); }}
      />

           <NotesDialog
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        lead={notesLead}
        onSaved={fetchLeads}
      />

      {/* NEW — Followup popup + Calendar */}
      <FollowupDialog
        open={followupOpen}
        onClose={() => setFollowupOpen(false)}
        lead={followupLead}
      />
      <FollowupCalendarDialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />
    </Box>
  );
}

export default LeadManagement;
