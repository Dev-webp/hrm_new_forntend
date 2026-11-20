import { useEffect, useState, useCallback } from "react";
import { Play, Square, Coffee, LogOut } from "lucide-react";
import { useEmployeeApi } from "../hooks/useEmployeeApi";

export default function LiveWorkTimer({ onTimerUpdate, productionHours, onUpdateDetails }) {
  const { apiFetch } = useEmployeeApi();
  const [timerStatus, setTimerStatus] = useState({
    is_clocked_in: false,
    clock_in_time: null,
    clock_out_time: null,
    elapsed_seconds: 0,
    break_status: null,
    break_start_time: null,
    break_elapsed_seconds: 0,
    total_break_minutes: 0,
    session_last_active: null,
    server_time: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
  };

  // Format seconds to Xh Ym format for work hours
  const formatWorkHours = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  };

  // Format time to 12-hour format
  const formatTime12Hour = (timeString) => {
    if (!timeString) return '--';
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return '--';
    }
  };

  // Fetch timer status
  const fetchTimerStatus = useCallback(async () => {
    try {
      const data = await apiFetch("/attendance/timer/status");
      setTimerStatus(data || {
        is_clocked_in: false,
        clock_in_time: null,
        clock_out_time: null,
        elapsed_seconds: 0,
        break_status: null,
        break_start_time: null,
        break_elapsed_seconds: 0,
        total_break_minutes: 0,
        session_last_active: null,
        server_time: new Date().toISOString(),
      });
      setError(null);
      
      // Notify parent component of timer update
      if (onTimerUpdate && data) {
        onTimerUpdate(data);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch timer status");
      // Set default status on error to prevent null reference
      setTimerStatus({
        is_clocked_in: false,
        clock_in_time: null,
        clock_out_time: null,
        elapsed_seconds: 0,
        break_status: null,
        break_start_time: null,
        break_elapsed_seconds: 0,
        total_break_minutes: 0,
        session_last_active: null,
        server_time: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, onTimerUpdate]);

  // Clock In
  const handleClockIn = useCallback(async () => {
    try {
      await apiFetch("/attendance/timer/clock-in", { method: "POST" });
      await fetchTimerStatus();
    } catch (err) {
      console.error("Clock in failed:", err);
      alert("Failed to clock in. Please try again.");
    }
  }, [apiFetch, fetchTimerStatus]);

  // Clock Out
  const handleClockOut = useCallback(async () => {
    try {
      await apiFetch("/attendance/timer/clock-out", { method: "POST" });
      await fetchTimerStatus();
    } catch (err) {
      console.error("Clock out failed:", err);
      alert("Failed to clock out. Please try again.");
    }
  }, [apiFetch, fetchTimerStatus]);

  // Break In
  const handleBreakIn = useCallback(async () => {
    try {
      await apiFetch("/attendance/timer/break-in", { method: "POST" });
      await fetchTimerStatus();
    } catch (err) {
      console.error("Break in failed:", err);
      alert("Failed to start break. Please try again.");
    }
  }, [apiFetch, fetchTimerStatus]);

  // Break Out
  const handleBreakOut = useCallback(async () => {
    try {
      await apiFetch("/attendance/timer/break-out", { method: "POST" });
      await fetchTimerStatus();
    } catch (err) {
      console.error("Break out failed:", err);
      alert("Failed to end break. Please try again.");
    }
  }, [apiFetch, fetchTimerStatus]);

  // Heartbeat for idle detection
  const sendHeartbeat = useCallback(async () => {
    if (timerStatus && timerStatus.is_clocked_in) {
      try {
        await apiFetch("/attendance/timer/heartbeat", { method: "POST" });
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    }
  }, [apiFetch, timerStatus?.is_clocked_in]);

  // Initial load and periodic refresh (every 1 second for smooth updates)
  useEffect(() => {
    fetchTimerStatus();
    const statusInterval = setInterval(fetchTimerStatus, 1000); // Refresh every 1 second
    return () => clearInterval(statusInterval);
  }, [fetchTimerStatus]);

  // Heartbeat every 30 seconds when clocked in
  useEffect(() => {
    if (timerStatus && timerStatus.is_clocked_in) {
      const heartbeatInterval = setInterval(sendHeartbeat, 30000);
      return () => clearInterval(heartbeatInterval);
    }
  }, [sendHeartbeat, timerStatus?.is_clocked_in]);

  if (loading) {
    return (
      <div className="timer-display-area">
        <div className="timer-digital">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="timer-display-area">
        <div className="timer-digital">Error</div>
        <div className="timer-buttons">
          <button onClick={fetchTimerStatus} className="timer-btn clock-in">Retry</button>
        </div>
      </div>
    );
  }

  const isClockedIn = timerStatus?.is_clocked_in || false;
  const isOnBreak = timerStatus?.break_status !== null && timerStatus?.break_status !== undefined;
  const hasClockedOut = timerStatus?.clock_out_time !== null && timerStatus?.clock_out_time !== undefined;

  // Determine status text
  let statusText = "Not Checked In";
  if (hasClockedOut) {
    statusText = "Checked Out";
  } else if (isOnBreak) {
    statusText = "On Break";
  } else if (isClockedIn) {
    statusText = "Checked In";
  }

  const statusClass = isClockedIn && !isOnBreak ? "working" : "";

  // Calculate display time
  let displaySeconds = 0;
  
  if (isClockedIn) {
    // When clocked in and NOT on break: show elapsed work time
    if (!isOnBreak) {
      displaySeconds = timerStatus?.elapsed_seconds || 0;
    }
    // When clocked in and ON break: show elapsed work time (preserved at break start)
    else {
      // Use elapsed_seconds which should be the work time excluding break
      displaySeconds = timerStatus?.elapsed_seconds || 0;
    }
  } else if (hasClockedOut) {
    // When clocked out, preserve the final work time
    // Priority 1: Use production_hours from prop if available
    if (productionHours && productionHours > 0) {
      displaySeconds = Math.floor(productionHours * 3600); // Convert hours to seconds
    }
    // Priority 2: Use elapsed_seconds from API (should contain final work time)
    else if (timerStatus?.elapsed_seconds && timerStatus.elapsed_seconds > 0) {
      displaySeconds = timerStatus.elapsed_seconds;
    }
    // Priority 3: Calculate from timestamps (subtract break time if available)
    else if (timerStatus?.clock_in_time && timerStatus?.clock_out_time) {
      try {
        const clockIn = new Date(timerStatus.clock_in_time);
        const clockOut = new Date(timerStatus.clock_out_time);
        if (!isNaN(clockIn.getTime()) && !isNaN(clockOut.getTime())) {
          let diffMs = clockOut - clockIn;
          // Subtract total break time if available
          if (timerStatus?.total_break_minutes && timerStatus.total_break_minutes > 0) {
            diffMs -= (timerStatus.total_break_minutes * 60 * 1000);
          }
          displaySeconds = Math.floor(diffMs / 1000);
          // Ensure non-negative
          displaySeconds = Math.max(0, displaySeconds);
        }
      } catch (err) {
        console.error("Error calculating time diff:", err);
        displaySeconds = 0;
      }
    }
  }

  return (
    <div className="timer-display-area">
      <div className="timer-digital">{formatTime(displaySeconds)}</div>
      <div className="timer-work-hours">Work Hours: {formatWorkHours(displaySeconds)}</div>
      <div className="timer-buttons">
        {!isClockedIn && !hasClockedOut && (
          <button
            className="timer-btn clock-in"
            onClick={handleClockIn}
            disabled={isClockedIn || hasClockedOut}
          >
            <Play className="btn-icon" />
            Check In
          </button>
        )}
        {isClockedIn && !isOnBreak && (
          <>
            <button
              className="timer-btn break-in"
              onClick={handleBreakIn}
            >
              <Coffee className="btn-icon" />
              Break In
            </button>
            <button
              className="timer-btn clock-out"
              onClick={handleClockOut}
            >
              <Square className="btn-icon" />
              Check Out
            </button>
          </>
        )}
        {isClockedIn && isOnBreak && (
          <button
            className="timer-btn break-out"
            onClick={handleBreakOut}
          >
            <LogOut className="btn-icon" />
            Break Out
          </button>
        )}
        {hasClockedOut && (
          <button
            className="timer-btn disabled"
            disabled
          >
            <Square className="btn-icon" />
            Checked Out
          </button>
        )}
      </div>
    </div>
  );
}
