import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import GpsFixedRoundedIcon from "@mui/icons-material/GpsFixedRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import QueryStatsRoundedIcon from "@mui/icons-material/QueryStatsRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";

const API = import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("vjc_invoice_auth")}`,
});

const RANGES = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "Last 7 days" },
];

const COLORS = {
  navy: "#0b3471",
  blue: "#246bfa",
  green: "#08a66b",
  orange: "#ff7900",
  purple: "#8747f5",
  pink: "#f05282",
  ink: "#10264d",
  muted: "#657a9d",
  border: "#e4ecf7",
  pale: "#f4f8ff",
};

const initials = (name = "") =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const pct = (a, b) =>
  b ? Math.round((Number(a || 0) / Number(b)) * 100) : 0;

const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

function Metric({ icon, label, value, note, color, progress }) {
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        p: 2,
        minWidth: 0,
        boxShadow: "0 5px 18px rgba(31,77,140,.045)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 54,
            height: 54,
            flex: "0 0 auto",
            borderRadius: 2.5,
            bgcolor: `${color}16`,
            color,
            display: "grid",
            placeItems: "center",
            "& svg": { fontSize: 29 },
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontSize: 12, fontWeight: 650, color: COLORS.ink }}
          >
            {label}
          </Typography>

          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 800,
              lineHeight: 1.35,
              color:
                label === "Unassigned Leads" ? "#d51f2b" : COLORS.ink,
            }}
          >
            {value}
          </Typography>

          <Typography
            sx={{
              fontSize: 11,
              color: note?.includes("attention")
                ? "#d51f2b"
                : COLORS.muted,
            }}
          >
            {note}
          </Typography>
        </Box>
      </Box>

      {progress !== undefined && (
        <Box
          sx={{
            mt: 1.4,
            height: 6,
            bgcolor: "#e6edf8",
            borderRadius: 9,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${Math.max(0, Math.min(100, progress))}%`,
              bgcolor: color,
              borderRadius: 9,
            }}
          />
        </Box>
      )}
    </Box>
  );
}

function Panel({ title, subtitle, icon, children, action }) {
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: `1px solid ${COLORS.border}`,
        borderRadius: 3,
        p: 2,
        minWidth: 0,
        boxShadow: "0 5px 18px rgba(31,77,140,.04)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1.5,
        }}
      >
        <Box sx={{ color: COLORS.navy, display: "flex" }}>{icon}</Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{ fontSize: 15, fontWeight: 800, color: COLORS.ink }}
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography sx={{ fontSize: 11, color: COLORS.muted }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {action}
      </Box>

      {children}
    </Box>
  );
}

export default function TeamMonitorTab({ onGoPending }) {
  const [range, setRange] = useState("today");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [dept, setDept] = useState("");
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentRedFlags, setAgentRedFlags] = useState([]);
  const [redFlagsLoading, setRedFlagsLoading] = useState(false);
  const [redFlagsError, setRedFlagsError] = useState("");

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);

      try {
        const res = await fetch(
          `${API}/leads/team-monitor?range=${range}`,
          { headers: authHeader() }
        );

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(
            json.message || "Unable to load Team Monitor data"
          );
        }

        setData(json);
        setUpdatedAt(new Date());
        setError("");
      } catch (e) {
        setError(e.message || "Failed to load Team Monitor");
      } finally {
        setLoading(false);
      }
    },
    [range]
  );

  useEffect(() => {
    load(true);

    const timer = setInterval(() => load(false), 30000);

    return () => clearInterval(timer);
  }, [load]);

  if (loading && !data) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const s = data?.summary || {};
  const prev = data?.previous || {};
  const allAgents = data?.agents || [];

  const departments = [
    ...new Set(allAgents.map((a) => a.department).filter(Boolean)),
  ];

  const agents = allAgents.filter(
    (a) =>
      (!dept || a.department === dept) &&
      (!search ||
        `${a.name} ${a.department}`
          .toLowerCase()
          .includes(search.toLowerCase()))
  );

  const sources = data?.by_source || [];
  const maxSource = Math.max(
    1,
    ...sources.map((x) => Number(x.count || 0))
  );

  const byDept = data?.by_department || [];
  const maxDept = Math.max(
    1,
    ...byDept.map((x) => Number(x.new_leads || 0))
  );

  const hoursMap = Object.fromEntries(
    (data?.by_hour || []).map((x) => [x.hour, x.count])
  );

  const hours = Array.from({ length: 10 }, (_, i) => ({
    hour: i + 9,
    count: Number(hoursMap[i + 9] || 0),
  }));

  const maxHour = Math.max(1, ...hours.map((x) => x.count));

  const openLeads = data?.open_leads || [];
  const redFlags = data?.red_flag_feed || [];

  const pending = Number(s.pending_assignment || 0);
  const sla = pct(s.contacted, s.assigned);
  const self = data?.scope === "self";

  const openLead = (id) => window.open(`/lead-history/${id}`, "_blank");

  const openAgentRedFlags = async (agent) => {
    setSelectedAgent(agent);
    setAgentRedFlags([]);
    setRedFlagsError("");
    setRedFlagsLoading(true);

    try {
      const res = await fetch(
        `${API}/leads/team-monitor/${encodeURIComponent(agent.id)}/red-flags`,
        { headers: authHeader() }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Unable to load today's red flags");
      }

      setAgentRedFlags(json.redFlags || []);
    } catch (err) {
      setRedFlagsError(err.message || "Failed to load red flags");
    } finally {
      setRedFlagsLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        "Agent",
        "Department",
        "Leads",
        "Avg reply (min)",
        "Red flags",
        "SLA met %",
      ],
      ...agents.map((a) => [
        a.name,
        a.department || "",
        a.leads ?? 0,
        a.avg_reply_min ?? "",
        a.flags ?? 0,
        a.sla_met_pct ?? "",
      ]),
    ];

    const csv = rows
      .map((r) =>
        r
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const a = document.createElement("a");
    a.href = url;
    a.download = `team-monitor-${range}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const buttonSx = {
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 2,
    px: 2,
    bgcolor: COLORS.blue,
    color: "#fff",
    boxShadow: "none",
    "&:hover": {
      bgcolor: COLORS.navy,
      boxShadow: "none",
    },
  };

  const tag = (text, bg, color) => (
    <Box
      component="span"
      sx={{
        px: 1.1,
        py: 0.45,
        borderRadius: 1.5,
        bgcolor: bg,
        color,
        fontSize: 11,
        fontWeight: 750,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </Box>
  );

  const rangeLabel =
    RANGES.find((r) => r.key === range)?.label || "Today";

  return (
    <Box
      sx={{
        color: COLORS.ink,
        fontFamily: "Inter, Arial, sans-serif",
        background: "linear-gradient(135deg,#f7faff 0%,#edf5ff 100%)",
        p: { xs: 1.5, md: 2.25 },
        borderRadius: 2,
        minHeight: "calc(100vh - 125px)",
        "& *": { boxSizing: "border-box" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: { xs: 26, md: 32 },
              lineHeight: 1.15,
              fontWeight: 850,
              letterSpacing: -0.7,
              color: COLORS.ink,
            }}
          >
            Team Monitor
          </Typography>

          <Typography
            sx={{ fontSize: 13, color: COLORS.muted, mt: 0.45 }}
          >
            Live team performance, lead distribution and follow-up tracking
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box
            component="select"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            sx={{
              height: 40,
              px: 1.5,
              bgcolor: "#fff",
              color: COLORS.ink,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 2,
              fontSize: 12,
              outline: "none",
            }}
          >
            {RANGES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </Box>

          <Typography
            sx={{ fontSize: 11, color: COLORS.muted, px: 1 }}
          >
            {updatedAt
              ? `Updated ${updatedAt.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Live data"}
          </Typography>

          <Button
            onClick={exportCsv}
            variant="contained"
            sx={buttonSx}
          >
            ↓ &nbsp; Export Report
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
          <Button size="small" onClick={() => load(true)}>
            Retry
          </Button>
        </Alert>
      )}

      {/* KPI Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr 1fr",
            md: "repeat(5,minmax(0,1fr))",
          },
          gap: 1.25,
          mb: 1.5,
        }}
      >
        <Metric
          icon={<GroupsRoundedIcon />}
          label="Active Agents"
          value={`${s.agents_online || 0} / ${s.agents_total || 0}`}
          note={`${pct(s.agents_online, s.agents_total)}% active today`}
          color={COLORS.blue}
          progress={pct(s.agents_online, s.agents_total)}
        />

        <Metric
          icon={<DescriptionRoundedIcon />}
          label="Leads Today"
          value={fmt(s.received)}
          note={`${diffText(s.received, prev.received)} from previous period`}
          color={COLORS.green}
        />

        <Metric
          icon={<WarningAmberRoundedIcon />}
          label="Unassigned Leads"
          value={fmt(pending)}
          note={
            pending ? "Needs immediate attention" : "All caught up"
          }
          color={COLORS.orange}
        />

        <Metric
          icon={<GpsFixedRoundedIcon />}
          label="SLA Met"
          value={`${sla}%`}
          note="Contacted vs assigned"
          color="#08b89a"
          progress={sla}
        />

        <Metric
          icon={<FactCheckRoundedIcon />}
          label="Pending Assessments"
          value={fmt(
            s.pending_assessments ?? s.pending_assessment ?? 0
          )}
          note="Awaiting review"
          color={COLORS.purple}
        />
      </Box>

      {/* Team Performance Table */}
      <Panel
        title="Team Performance"
        subtitle="Agent-wise lead status and follow-up overview"
        icon={<GroupsRoundedIcon />}
        action={
          <Box
            sx={{
              display: "flex",
              gap: 0.75,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <input
              aria-label="Search agent"
              placeholder="Search agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: 130,
                minWidth: 100,
                padding: "8px 10px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                fontSize: 12,
              }}
            />

            <select
              aria-label="Filter department"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              style={{
                maxWidth: 135,
                padding: "8px",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                color: COLORS.ink,
                background: "white",
                fontSize: 12,
              }}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Box>
        }
      >
        <Box sx={{ overflowX: "auto" }}>
          <Box sx={{ minWidth: 700 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "28px minmax(125px,1.3fr) minmax(110px,1.1fr) 58px 65px 82px 65px 95px 30px",
                gap: 0.7,
                px: 0.5,
                py: 1,
                bgcolor: "#f5f8fd",
                borderRadius: 1.5,
                color: COLORS.muted,
                fontSize: 10,
                fontWeight: 750,
              }}
            >
              <span>#</span>
              <span>Agent</span>
              <span>Department</span>
              <span>Assigned</span>
              <span>Contacted</span>
              <span>Warm / Prospect</span>
              <span>Overdue</span>
              <span>SLA Status</span>
              <span />
            </Box>

            {agents.map((a, i) => {
              const status = a.is_online
                ? Number(a.flags || 0) > 0
                  ? "Follow-up due"
                  : "On track"
                : "Offline";

              const statusColor = !a.is_online
                ? ["#e9eef6", "#60718b"]
                : Number(a.flags || 0) > 0
                  ? ["#fff0c2", "#956000"]
                  : ["#d9f8ec", "#07865a"];

              return (
                <Box
                  key={a.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns:
                      "28px minmax(125px,1.3fr) minmax(110px,1.1fr) 58px 65px 82px 65px 95px 30px",
                    gap: 0.7,
                    alignItems: "center",
                    px: 0.5,
                    py: 1.05,
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontSize: 11,
                  }}
                >
                  <Typography
                    sx={{ fontSize: 11, color: COLORS.muted }}
                  >
                    {i + 1}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 31,
                        height: 31,
                        flex: "0 0 auto",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: [
                          "#e2edff",
                          "#ffe3eb",
                          "#fff0d6",
                          "#d8f8ed",
                          "#e9e4ff",
                        ][i % 5],
                        color: [
                          "#1753a8",
                          "#c42c53",
                          "#a66500",
                          "#07865a",
                          "#6e43d5",
                        ][i % 5],
                        fontWeight: 800,
                        fontSize: 10,
                        position: "relative",
                      }}
                    >
                      {initials(a.name)}

                      <Box
                        sx={{
                          position: "absolute",
                          width: 8,
                          height: 8,
                          bgcolor: a.is_online
                            ? "#10a66a"
                            : "#9aa7b8",
                          border: "2px solid white",
                          borderRadius: "50%",
                          right: -1,
                          bottom: 0,
                        }}
                      />
                    </Box>

                    <Typography
                      noWrap
                      sx={{ fontSize: 11, fontWeight: 750 }}
                    >
                      {a.name}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{ fontSize: 11, color: COLORS.muted }}
                  >
                    {a.department || "-"}
                  </Typography>

                  <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                    {a.leads ?? 0}
                  </Typography>

                  <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                    {a.contacted ?? 0}
                  </Typography>

                  <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                    {a.warm ?? 0}
                  </Typography>

                  <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                    {a.overdue ?? 0}
                  </Typography>

                  <Box
                    sx={{
                      px: 0.8,
                      py: 0.4,
                      borderRadius: 2,
                      bgcolor: statusColor[0],
                      color: statusColor[1],
                      fontSize: 10,
                      fontWeight: 750,
                      textAlign: "center",
                    }}
                  >
                    {status}
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => openAgentRedFlags(a)}
                    sx={{ p: 0.5 }}
                  >
                    <MoreHorizRoundedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Panel>

      {/* Agent Red Flags Dialog */}
      <Dialog
        open={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {selectedAgent?.name} - Red Flags
        </DialogTitle>
        <DialogContent>
          {redFlagsLoading ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : redFlagsError ? (
            <Alert severity="error">{redFlagsError}</Alert>
          ) : agentRedFlags.length === 0 ? (
            <Alert severity="success">No red flags today</Alert>
          ) : (
            <Box sx={{ mt: 1 }}>
              {agentRedFlags.map((flag, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 1.5,
                    mb: 1,
                    bgcolor: "#fff5f5",
                    border: "1px solid #fed7d7",
                    borderRadius: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                    {flag.type}
                  </Typography>
                  <Typography sx={{ fontSize: 11, mt: 0.5 }}>
                    {flag.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAgent(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function diffText(current, previous) {
  const curr = Number(current || 0);
  const prev = Number(previous || 0);
  if (!prev) return "No previous data";
  const diff = curr - prev;
  const pct = prev ? Math.round((diff / prev) * 100) : 0;
  if (diff > 0) return `+${pct}% increase`;
  if (diff < 0) return `${pct}% decrease`;
  return "No change";
}
