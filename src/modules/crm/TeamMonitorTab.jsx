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

// Lead history route is nested under the portal prefix (/admin or /manager).
const leadHistoryUrl = (id) => {
  const base = window.location.pathname.startsWith("/manager") ? "/manager" : "/admin";
  return `${base}/crm/lead-history/${id}`;
};

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
  const [selectedDate, setSelectedDate] = useState("");
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
      const params = new URLSearchParams();

      if (selectedDate) {
        params.set("date", selectedDate);
      } else {
        params.set("range", range);
      }

      const res = await fetch(
        `${API}/leads/team-monitor?${params.toString()}`,
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
    [range, selectedDate]
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

  const openLead = (id) => window.open(leadHistoryUrl(id), "_blank");
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
            Lead Monitor
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
          {/* NEW: Calendar Date Picker */}
          <input
            type="date"
            aria-label="Select dashboard date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              height: 40,
              padding: "0 10px",
              background: "#fff",
              color: COLORS.ink,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          />

          {/* EXISTING: Date Range Dropdown — unchanged */}
          <Box
            component="select"
            value={range}
onChange={(e) => {
  setRange(e.target.value);
  setSelectedDate("");
}}            sx={{
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

      {/* Team Performance and Actions */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            xl: "minmax(0,2.1fr) minmax(290px,.9fr)",
          },
          gap: 1.5,
          mb: 1.5,
        }}
      >
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
                      noWrap
                      sx={{ fontSize: 10, color: COLORS.muted }}
                    >
                      {a.department || "Unassigned"}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: COLORS.blue,
                      }}
                    >
                      {fmt(a.leads)}
                    </Typography>

                    <Typography
                      sx={{ fontSize: 12, fontWeight: 700 }}
                    >
                      {fmt(a.contacted ?? 0)}
                    </Typography>

                    <Typography sx={{ fontSize: 11 }}>
                      {fmt(a.warm ?? 0)} / {fmt(a.prospect ?? 0)}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: Number(a.flags || 0)
                          ? "#e12d39"
                          : COLORS.green,
                      }}
                    >
                      {fmt(a.flags)}
                    </Typography>

                    <Box>{tag(status, statusColor[0], statusColor[1])}</Box>

                   <IconButton
  size="small"
  aria-label={`View today's red flags for ${a.name}`}
  onClick={() => openAgentRedFlags(a)}
  sx={{ color: COLORS.muted }}
>
  <MoreHorizRoundedIcon fontSize="small" />
</IconButton>
                  </Box>
                );
              })}

              {!agents.length && (
                <Typography
                  sx={{ p: 2, color: COLORS.muted, fontSize: 12 }}
                >
                  No agents match the selected filters.
                </Typography>
              )}
            </Box>
          </Box>
        </Panel>

        {/* Immediate Action Required */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Panel
            title="Immediate Action Required"
            subtitle="Items that need your attention"
            icon={
              <NotificationsActiveRoundedIcon
                sx={{ color: "#e33b48" }}
              />
            }
            action={tag("LIVE", "#e5f8ee", "#07865a")}
          >
            <ActionCard
              icon={<GroupsRoundedIcon />}
              count={pending}
              title="Unassigned Leads"
              detail="Waiting to assign to agents"
              color={COLORS.orange}
              button="Assign Now"
              onClick={onGoPending}
            />

            <ActionCard
              icon={<AccessTimeRoundedIcon />}
              count={
                openLeads.filter(
                  (l) => Number(l.minutes_left) <= 10
                ).length
              }
              title="Follow-ups Due"
              detail="Open leads nearing SLA"
              color={COLORS.blue}
              button="View Leads"
              onClick={() =>
                openLeads[0] && openLead(openLeads[0].lead_id)
              }
            />

            <ActionCard
              icon={<FactCheckRoundedIcon />}
              count={Number(
                s.pending_assessments ?? s.pending_assessment ?? 0
              )}
              title="Pending Assessments"
              detail="Awaiting review and approval"
              color={COLORS.purple}
              button="Review Now"
              onClick={onGoPending}
            />
          </Panel>

          <Box
            sx={{
              p: 1.75,
              bgcolor: "#e8f8f1",
              border: "1px solid #ccefe0",
              borderRadius: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{ fontSize: 12, fontWeight: 800, color: "#08764f" }}
              >
                System Status
              </Typography>

              <Typography sx={{ fontSize: 11, color: "#08764f" }}>
                ● &nbsp; Monitoring active · refreshes every 30 sec
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 10,
                color: COLORS.muted,
                textAlign: "right",
              }}
            >
              {updatedAt
                ? updatedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Pipeline, Department and Source */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1.2fr 1fr 1fr",
          },
          gap: 1.5,
        }}
      >
        <Panel
          title="Lead Pipeline"
          subtitle={`Current status overview · ${rangeLabel}`}
          icon={<QueryStatsRoundedIcon />}
          action={tag(`Total ${fmt(s.received)}`, "#e4efff", COLORS.blue)}
        >
          {[
            ["New / Received", s.received, COLORS.blue],
            ["Assigned", s.assigned, COLORS.green],
            ["Contacted", s.contacted, "#0ab89b"],
            ["Warm / Prospect", s.warm_prospect, COLORS.orange],
            ["Pending Agreement", s.pending_agreement, COLORS.purple],
            ["Closed", s.closed, COLORS.pink],
          ].map(([label, value, color]) => (
            <Box
              key={label}
              sx={{
                display: "grid",
                gridTemplateColumns: "112px 1fr 34px",
                gap: 1,
                alignItems: "center",
                mb: 1.2,
              }}
            >
              <Typography
                sx={{ fontSize: 11, color: COLORS.muted }}
              >
                {label}
              </Typography>

              <Box
                sx={{
                  height: 9,
                  bgcolor: "#e9eff8",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${pct(value, s.received)}%`,
                    height: "100%",
                    bgcolor: color,
                    borderRadius: 8,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  textAlign: "right",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {fmt(value)}
              </Typography>
            </Box>
          ))}
        </Panel>

        <Panel
          title="Department Performance"
          subtitle="Lead volume by department"
          icon={<TrendingUpRoundedIcon />}
        >
          {byDept.slice(0, 6).map((d) => (
            <Box key={d.department} sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 1,
                  mb: 0.5,
                }}
              >
                <Typography noWrap sx={{ fontSize: 11 }}>
                  {d.department}
                </Typography>

                <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
                  {fmt(d.new_leads)}
                </Typography>
              </Box>

              <Box
                sx={{
                  height: 8,
                  bgcolor: "#e9eff8",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${pct(d.new_leads, maxDept)}%`,
                    height: "100%",
                    bgcolor: COLORS.blue,
                    borderRadius: 8,
                  }}
                />
              </Box>
            </Box>
          ))}

          {!byDept.length && (
            <Typography sx={{ fontSize: 12, color: COLORS.muted }}>
              No department data for this period.
            </Typography>
          )}
        </Panel>

        <Panel
          title="Lead Source Performance"
          subtitle="Where enquiries are coming from"
          icon={<QueryStatsRoundedIcon />}
        >
          {sources.slice(0, 6).map((x, i) => (
            <Box
              key={x.source}
              sx={{
                display: "grid",
                gridTemplateColumns: "82px 1fr 28px",
                gap: 1,
                alignItems: "center",
                mb: 1.35,
              }}
            >
              <Typography noWrap sx={{ fontSize: 11 }}>
                {x.source}
              </Typography>

              <Box
                sx={{
                  height: 8,
                  bgcolor: "#e9eff8",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${pct(x.count, maxSource)}%`,
                    height: "100%",
                    bgcolor: [
                      COLORS.purple,
                      COLORS.blue,
                      COLORS.green,
                      COLORS.orange,
                      COLORS.pink,
                      "#8a9bb5",
                    ][i % 6],
                    borderRadius: 8,
                  }}
                />
              </Box>

              <Typography
                sx={{
                  textAlign: "right",
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {fmt(x.count)}
              </Typography>
            </Box>
          ))}

          {!sources.length && (
            <Typography sx={{ fontSize: 12, color: COLORS.muted }}>
              No lead source data for this period.
            </Typography>
          )}
        </Panel>
      </Box>

      {/* Leads by Hour and Recent Activity */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            lg: "1fr 1.2fr",
          },
          gap: 1.5,
          mt: 1.5,
        }}
      >
        <Panel
          title="Leads by Hour"
          subtitle="Lead arrival distribution"
          icon={<AccessTimeRoundedIcon />}
        >
          <Box
            sx={{
              height: 105,
              display: "flex",
              alignItems: "flex-end",
              gap: 0.8,
              px: 0.5,
            }}
          >
            {hours.map((x) => (
              <Box
                key={x.hour}
                title={`${x.hour}:00 — ${x.count} leads`}
                sx={{
                  flex: 1,
                  height: `${Math.max(4, pct(x.count, maxHour))}%`,
                  minHeight: 4,
                  bgcolor:
                    x.count === maxHour && x.count
                      ? COLORS.navy
                      : COLORS.blue,
                  borderRadius: "5px 5px 0 0",
                }}
              />
            ))}
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 1,
              color: COLORS.muted,
              fontSize: 10,
            }}
          >
            <span>9 AM</span>
            <span>12 PM</span>
            <span>3 PM</span>
            <span>6 PM</span>
          </Box>
        </Panel>

        <Panel
          title="Recent Team Activity"
          subtitle="Latest lead activity available in current monitoring data"
          icon={<AccessTimeRoundedIcon />}
        >
          {redFlags.slice(0, 4).map((f, i) => (
            <Box
              key={f.id || i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.2,
                py: 0.85,
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: 2,
                  bgcolor: i % 2 ? "#e5efff" : "#fff0e2",
                  color: i % 2 ? COLORS.blue : COLORS.orange,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <DescriptionRoundedIcon sx={{ fontSize: 17 }} />
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 750 }}>
                  {f.agent_name || "Agent"} ·{" "}
                  {f.lead_name || `Lead #${f.lead_id}`}
                </Typography>

                <Typography
                  sx={{ fontSize: 10, color: COLORS.muted }}
                >
                  {f.now_with
                    ? `Reassigned to ${f.now_with}`
                    : "Needs review / reassignment"}
                </Typography>
              </Box>

              {f.lead_id && (
                <Button
                  size="small"
                  onClick={() => openLead(f.lead_id)}
                  sx={{ textTransform: "none", fontSize: 10 }}
                >
                  Open
                </Button>
              )}
            </Box>
          ))}

          {!redFlags.length && (
            <Typography
              sx={{ py: 1, fontSize: 12, color: COLORS.muted }}
            >
              No red-flag activity to display right now.
            </Typography>
          )}
        </Panel>
      </Box>

      {self && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Showing your own team-monitor data based on your account permissions.
        </Alert>
      )}

      <Typography
        sx={{
          textAlign: "right",
          mt: 1.5,
          color: COLORS.muted,
          fontSize: 10,
        }}
      >
        VJC Invoice Portal · Live team monitoring
      </Typography>
      <Dialog
  open={Boolean(selectedAgent)}
  onClose={() => setSelectedAgent(null)}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle
    sx={{
      color: COLORS.ink,
      fontWeight: 800,
      borderBottom: `1px solid ${COLORS.border}`,
    }}
  >
    Today's Red Flags

    {selectedAgent && (
      <Typography
        sx={{
          fontSize: 13,
          color: COLORS.muted,
          mt: 0.5,
        }}
      >
        {selectedAgent.name}
      </Typography>
    )}
  </DialogTitle>

  <DialogContent sx={{ pt: "16px !important" }}>
    {redFlagsLoading && (
      <Box sx={{ textAlign: "center", py: 3 }}>
        <CircularProgress size={28} />

        <Typography
          sx={{
            mt: 1,
            fontSize: 12,
            color: COLORS.muted,
          }}
        >
          Loading red flags...
        </Typography>
      </Box>
    )}

    {!redFlagsLoading && redFlagsError && (
      <Alert severity="error">
        {redFlagsError}
      </Alert>
    )}

    {!redFlagsLoading &&
      !redFlagsError &&
      agentRedFlags.length === 0 && (
        <Alert severity="success">
          No red flags recorded for this agent today.
        </Alert>
      )}

    {!redFlagsLoading &&
      !redFlagsError &&
      agentRedFlags.map((flag) => (
        <Box
          key={flag.id}
          sx={{
            p: 1.5,
            mb: 1,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 2,
            bgcolor: COLORS.pale,
          }}
        >
          <Typography
            sx={{
              fontWeight: 750,
              fontSize: 13,
            }}
          >
            {flag.lead_name ||
              `Lead #${flag.lead_id ?? "N/A"}`}
          </Typography>

          <Typography
            sx={{
              fontSize: 12,
              color: COLORS.muted,
              mt: 0.5,
            }}
          >
            {flag.created_at
              ? new Date(flag.created_at).toLocaleString("en-IN")
              : "Time unavailable"}
          </Typography>

          {flag.now_with && (
            <Typography
              sx={{
                fontSize: 12,
                mt: 0.5,
              }}
            >
              Reassigned to: {flag.now_with}
            </Typography>
          )}

          {flag.lead_id && (
            <Button
              size="small"
              onClick={() => openLead(flag.lead_id)}
              sx={{
                textTransform: "none",
                mt: 0.5,
              }}
            >
              Open Lead
            </Button>
          )}
        </Box>
      ))}
  </DialogContent>

  <DialogActions sx={{ p: 2 }}>
    <Button
      onClick={() => setSelectedAgent(null)}
      sx={{ textTransform: "none" }}
    >
      Close
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}

function diffText(current = 0, previous = 0) {
  const d = Number(current || 0) - Number(previous || 0);
  return `${d >= 0 ? "+" : ""}${d}`;
}

function ActionCard({
  icon,
  count,
  title,
  detail,
  color,
  button,
  onClick,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.1,
        p: 1.15,
        mb: 1,
        borderRadius: 2.5,
        bgcolor: `${color}0c`,
        border: `1px solid ${color}18`,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: `${color}19`,
          color,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 0.75,
          }}
        >
          <Typography
            sx={{ fontSize: 20, fontWeight: 850, color }}
          >
            {count}
          </Typography>

          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              color: "#172d51",
            }}
          >
            {title}
          </Typography>
        </Box>

        <Typography sx={{ fontSize: 10, color: COLORS.muted }}>
          {detail}
        </Typography>
      </Box>

      <Button
        onClick={onClick}
        size="small"
        sx={{
          textTransform: "none",
          fontSize: 10,
          fontWeight: 800,
          px: 1.1,
          whiteSpace: "nowrap",
          borderRadius: 1.5,
          bgcolor: color,
          color: "white",
          "&:hover": { bgcolor: COLORS.navy },
        }}
      >
        {button}
      </Button>
    </Box>
  );
}