import { useState, useEffect } from "react";
import { Box, IconButton, Badge, Paper, Typography, Button } from "@mui/material";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import { useInvoiceAuth } from "../context/InvoiceAuthContext";

const INVOICE_API_URL = import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api";

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.3, 0.6].forEach((startOffset) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      const startTime = ctx.currentTime + startOffset;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.25);
    });
  } catch {
    // Silent if browser blocks audio
  }
};

// Lead-assignment "round robin" notifier — ported from the original Invoice
// Sidebar.jsx's AssignmentNotifier. Two changes from the original:
//   1. Reads the token from useInvoiceAuth() context instead of localStorage
//      directly, and never starts polling until `ready` is true — this is
//      what prevents it from firing immediately on mount (before the SSO
//      exchange finishes) and re-triggering the same "Invalid token on
//      first load" race we spent a long time fixing elsewhere.
//   2. Uses INVOICE_API_URL (env-driven) instead of a hardcoded production
//      URL, matching the rest of the integrated app.
export default function AssignmentNotifier() {
  const { ready, token, user } = useInvoiceAuth();
  const [assignments, setAssignments] = useState([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [permissionState, setPermissionState] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  const enableNotifications = () => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((result) => setPermissionState(result));
  };

  const fetchNew = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${INVOICE_API_URL}/leads/assignments/new`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) return;

      const newOnes = data.assignments || [];
      newOnes.forEach((a) => {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("New Lead Assigned", {
            body: `${a.lead_name} has been assigned to you.`,
          });
          playNotificationSound();
        }
        fetch(`${INVOICE_API_URL}/leads/assignments/${a.history_id}/notified`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      });

      if (newOnes.length > 0) {
        setAssignments((prev) => [...newOnes, ...prev].slice(0, 20));
        setUnseenCount((prev) => prev + newOnes.length);
      }
    } catch {
      // Silent — don't surface transient polling failures as UI errors
    }
  };

  useEffect(() => {
    // Do not poll until the SSO exchange has actually completed.
    if (!ready) return undefined;

    fetchNew();
    const interval = setInterval(fetchNew, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Nothing to show until authenticated, or for people who can't see Leads.
  if (!ready) return null;
  if (!user?.permissions?.customers) return null;

  return (
    <Box sx={{ position: "relative", display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
      {permissionState === "default" && (
        <Button
          size="small"
          variant="outlined"
          onClick={enableNotifications}
          sx={{ textTransform: "none", color: "#fff", borderColor: "rgba(255,255,255,0.3)", fontSize: 12 }}
        >
          🔔 Enable Notifications
        </Button>
      )}

      <IconButton
        onClick={() => {
          setOpen(!open);
          if (!open) setUnseenCount(0);
        }}
        sx={{ color: "#fff" }}
      >
        <Badge badgeContent={unseenCount} color="primary">
          <AssignmentIndIcon />
        </Badge>
      </IconButton>

      {open && (
        <Paper
          elevation={4}
          sx={{ position: "absolute", left: 0, top: 44, width: 300, zIndex: 2000, maxHeight: 360, overflowY: "auto", borderRadius: 2 }}
        >
          <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid #eee" }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Lead Assignments
            </Typography>
          </Box>

          {assignments.length === 0 && (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No new assignments.
              </Typography>
            </Box>
          )}

          {assignments.map((a) => (
            <Box key={a.history_id} sx={{ px: 2, py: 1.5, borderBottom: "1px solid #f0f0f0" }}>
              <Typography variant="body2" fontWeight={600}>
                {a.lead_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Assigned {a.assigned_date ? new Date(a.assigned_date).toLocaleString("en-GB") : ""}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}