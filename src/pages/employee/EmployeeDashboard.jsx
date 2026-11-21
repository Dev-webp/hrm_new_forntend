import { useCallback, useEffect, useMemo, useState } from "react";
import LiveWorkTimer from "../../components/LiveWorkTimer";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { parseJwt } from "../../utils/parseJwt";
import api from "../../services/api";
import {
  formatProductionHours,
  formatTime12Hour,
} from "../../utils/timeFormat";
import { MONTH_NAMES, normalizeArray, WEEK_DAYS } from "./employeeUtils";
import { getCalendarAttendanceStatus } from "../../utils/calendarStatusColors";
import {
  CalendarCheck,
  Clock,
  Calendar,
  MapPin,
  Mail,
  IdCard,
  ChevronRight,
  ListChecks,
  FileText,
  Umbrella,
  Zap,
  AlertCircle,
  ArrowRight,
  Play,
  Square,
  Clock4,
  UserPlus,
  LogOut,
  Briefcase,
} from "lucide-react";
import "../../styles/EmployeeDashboard.css";
import "../../styles/LiveWorkTimer.css";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function isPaidLeaveDay(rec = {}) {
  return getCalendarAttendanceStatus(rec) === "paid_leave";
}

function isUnpaidLeaveDay(rec = {}) {
  return getCalendarAttendanceStatus(rec) === "unpaid_leave";
}

export default function EmployeeDashboard({ embedded = false }) {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const [profileData, setProfileData] = useState(null);

  const userProfile = useMemo(() => {
    const decoded = parseJwt(token) || {};
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      storedUser = {};
    }
    const source = { ...decoded, ...storedUser, ...(profileData || {}) };
    const employeeCode =
      source.employee_code ||
      source.employeeId ||
      localStorage.getItem("employee_code") ||
      "—";
    return {
      full_name: source.full_name || "Employee",
      department: source.department || "",
      branch: source.branch || "Hyderabad",
      email: source.email || "",
      role: source.role || "",
      employee_code: employeeCode,
      userId: source.id || source.userId || source.employee_id || "",
      firstName: (source.full_name || "Employee").split(" ")[0],
    };
  }, [token, profileData]);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [allAttendance, setAllAttendance] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [holidayList, setHolidayList] = useState([]);
  const [greetingMsg, setGreetingMsg] = useState("");
  const [liveDateLabel, setLiveDateLabel] = useState("—");
  const [liveTimeLabel, setLiveTimeLabel] = useState("—");
  const [birthdayInfo, setBirthdayInfo] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [timerData, setTimerData] = useState(null);

  // Handle timer updates from LiveWorkTimer
  const handleTimerUpdate = useCallback((data) => {
    setTimerData(data);

    // Update DOM elements directly for real-time display
    const digitalTimer = document.getElementById('digital-timer');
    const attendanceStatus = document.getElementById('attendance-status');
    const statusText = attendanceStatus?.querySelector('.status-text');
    const detailCheckIn = document.getElementById('detail-check-in');
    const detailCheckOut = document.getElementById('detail-check-out');
    const workHoursValue = document.getElementById('work-hours-value');
    const btnCheckIn = document.getElementById('btn-check-in');

    const isClockedIn = data.is_clocked_in || false;
    const isOnBreak = data.break_status !== null && data.break_status !== undefined;
    const hasClockedOut = data.clock_out_time !== null && data.clock_out_time !== undefined;

    // Calculate display time - preserve worked hours after check-out
    let displaySeconds = 0;

    if (isClockedIn) {
      // When clocked in and NOT on break: show elapsed work time
      if (!isOnBreak) {
        displaySeconds = data.elapsed_seconds || 0;
      }
      // When clocked in and ON break: show elapsed work time (preserved at break start)
      else {
        displaySeconds = data.elapsed_seconds || 0;
      }
    } else if (hasClockedOut) {
      // When clocked out, preserve the final work time
      // Priority 1: Use production_hours from todayData if available
      if (todayData?.production_hours && todayData.production_hours > 0) {
        displaySeconds = Math.floor(todayData.production_hours * 3600);
      }
      // Priority 2: Use elapsed_seconds from API (should contain final work time)
      else if (data.elapsed_seconds && data.elapsed_seconds > 0) {
        displaySeconds = data.elapsed_seconds;
      }
      // Priority 3: Calculate from timestamps (subtract break time if available)
      else if (data.clock_in_time && data.clock_out_time) {
        try {
          const clockIn = new Date(data.clock_in_time);
          const clockOut = new Date(data.clock_out_time);
          if (!isNaN(clockIn.getTime()) && !isNaN(clockOut.getTime())) {
            let diffMs = clockOut - clockIn;
            // Subtract total break time if available
            if (data.total_break_minutes && data.total_break_minutes > 0) {
              diffMs -= (data.total_break_minutes * 60 * 1000);
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

    // Update digital timer
    if (digitalTimer) {
      const hours = Math.floor(displaySeconds / 3600);
      const minutes = Math.floor((displaySeconds % 3600) / 60);
      const seconds = displaySeconds % 60;
      digitalTimer.textContent = `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;

      // Update work hours
      if (workHoursValue) {
        workHoursValue.textContent = `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
      }
    }

    // Update status badge
    if (attendanceStatus && statusText) {
      let status = "Not Checked In";
      if (hasClockedOut) {
        status = "Checked Out";
        attendanceStatus.style.background = "#6B7280";
      } else if (isOnBreak) {
        status = "On Break";
        attendanceStatus.style.background = "#F59E0B";
      } else if (isClockedIn) {
        status = "Checked In";
        attendanceStatus.style.background = "#16A36A";
      } else {
        attendanceStatus.style.background = "#EF4444";
      }
      statusText.textContent = status;
    }

    // Update check-in time
    if (detailCheckIn) {
      try {
        const timeStr = data.clock_in_time || todayData?.clock_in_time;
        detailCheckIn.textContent = timeStr ? formatTime12Hour(timeStr) : '--';
      } catch (err) {
        detailCheckIn.textContent = '--';
      }
    }

    // Update check-out time
    if (detailCheckOut) {
      try {
        const timeStr = data.clock_out_time || todayData?.clock_out_time;
        detailCheckOut.textContent = timeStr ? formatTime12Hour(timeStr) : '--';
      } catch (err) {
        detailCheckOut.textContent = '--';
      }
    }

    // Update button state
    if (btnCheckIn) {
      btnCheckIn.disabled = isClockedIn || hasClockedOut;
    }
  }, [todayData]);

  // Clock In handler
  const handleClockIn = useCallback(async () => {
    try {
      await apiFetch("/attendance/timer/clock-in", { method: "POST" });
      // Refresh timer status
      const timerStatus = await apiFetch("/attendance/timer/status");
      handleTimerUpdate(timerStatus);
    } catch (err) {
      console.error("Clock in failed:", err);
      alert("Failed to clock in. Please try again.");
    }
  }, [apiFetch, handleTimerUpdate]);

  // Clock Out handler
  const handleClockOut = useCallback(async () => {
    try {
      await apiFetch("/attendance/timer/clock-out", { method: "POST" });
      // Refresh timer status
      const timerStatus = await apiFetch("/attendance/timer/status");
      handleTimerUpdate(timerStatus);
      // Refresh attendance data to get updated production_hours
      const today = new Date().toISOString().split('T')[0];
      const attendanceData = await apiFetch(`/attendance?start=${today}&end=${today}`);
      if (attendanceData && attendanceData.length > 0) {
        setTodayData(attendanceData[0]);
      }
    } catch (err) {
      console.error("Clock out failed:", err);
      alert("Failed to clock out. Please try again.");
    }
  }, [apiFetch, handleTimerUpdate]);

  const safeAttendance = useMemo(
    () => (Array.isArray(allAttendance) ? allAttendance.filter(Boolean) : []),
    [allAttendance]
  );
  const safeLeaves = useMemo(
    () => (Array.isArray(allLeaves) ? allLeaves.filter(Boolean) : []),
    [allLeaves]
  );

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch("/employee/profile")
      .then((profile) => {
        if (cancelled || !profile) return;
        setProfileData(profile);
        let storedUser = {};
        try {
          storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
        } catch {
          storedUser = {};
        }
        const nextUser = { ...storedUser, ...profile };
        localStorage.setItem("user", JSON.stringify(nextUser));
        if (profile.employee_code) {
          localStorage.setItem("employee_code", profile.employee_code);
        }
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
      });

    api.get("/birthdays/my-birthday")
      .then((response) => {
        if (!cancelled) {
          setBirthdayInfo(response.data);
        }
      })
      .catch((err) => {
        console.error("Birthday fetch error:", err);
        setBirthdayInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, token]);

  const updateDateTime = useCallback(() => {
    const now = new Date();
    setGreetingMsg(`${getGreeting()}, ${userProfile.firstName}`);
    setLiveDateLabel(
      now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
    setLiveTimeLabel(
      now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    );
  }, [userProfile.firstName]);

  useEffect(() => {
    updateDateTime();
    const id = setInterval(updateDateTime, 1000);
    return () => clearInterval(id);
  }, [updateDateTime]);

  const loadAll = useCallback(async () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const mm = String(m + 1).padStart(2, "0");
    const start = `${y}-${mm}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${mm}-${lastDay}`;

    try {
      setTodayData(await apiFetch("/attendance/self/today"));
    } catch {
      setTodayData(null);
    }
    try {
      setAllAttendance(normalizeArray(await apiFetch(`/attendance/self/history?start=${start}&end=${end}`)));
    } catch {
      setAllAttendance([]);
    }
    try {
      setAllLeaves(normalizeArray(await apiFetch("/leaves/my")));
    } catch {
      setAllLeaves([]);
    }
    try {
      setHolidayList(normalizeArray(await apiFetch(`/holidays?year=${y}&month=${m + 1}`)));
    } catch {
      setHolidayList([]);
    }
  }, [apiFetch, viewDate]);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 60000);
    return () => clearInterval(id);
  }, [loadAll]);

  // Fetch and update timer status
  const fetchTimerStatus = useCallback(async () => {
    try {
      const timerStatus = await apiFetch("/attendance/timer/status");
      handleTimerUpdate(timerStatus);
    } catch (err) {
      console.error("Timer status fetch error:", err);
    }
  }, [apiFetch, handleTimerUpdate]);

  useEffect(() => {
    fetchTimerStatus();
    const id = setInterval(fetchTimerStatus, 1000); // Update every second
    return () => clearInterval(id);
  }, [fetchTimerStatus]);

  // Fetch pending tasks
  const fetchPendingTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      const response = await api.get("/tasks");
      const allTasks = response.data.tasks || [];
      // Filter tasks assigned to current employee that are not completed
      const employeeTasks = allTasks.filter(task => {
        const taskStatus = (task.status || "").toLowerCase();
        const isCompleted = taskStatus === "completed" || taskStatus === "done";
        const isCancelled = taskStatus === "cancelled";
        return !isCompleted && !isCancelled;
      });
      // Sort by due date and priority, take first 5
      const sortedTasks = employeeTasks
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const aPriority = priorityOrder[a.priority?.toLowerCase()] || 1;
          const bPriority = priorityOrder[b.priority?.toLowerCase()] || 1;
          if (aPriority !== bPriority) return aPriority - bPriority;
          // If same priority, sort by due date
          const aDue = new Date(a.due_date || "9999-12-31");
          const bDue = new Date(b.due_date || "9999-12-31");
          return aDue - bDue;
        })
        .slice(0, 5);
      setPendingTasks(sortedTasks);
    } catch (error) {
      console.error("Error fetching pending tasks:", error);
      setPendingTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingTasks();
  }, [fetchPendingTasks]);

  const monthMeta = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const mm = String(m + 1).padStart(2, "0");
    const lastDay = new Date(y, m + 1, 0).getDate();
    return { y, m, mm, lastDay };
  }, [viewDate]);

  const analytics = useMemo(() => {
    const { y, m, mm, lastDay } = monthMeta;
    const holidaySet = new Set(
      holidayList.map((h) => {
        const d = h.date;
        return typeof d === "string" ? d.slice(0, 10) : d?.toISOString?.()?.slice(0, 10);
      })
    );

    // Build a set of approved leave dates
    const approvedLeaveDates = new Set();
    for (const leave of safeLeaves) {
      if (leave?.status === "approved") {
        const start = new Date(leave.from_date + "T00:00:00");
        const end = new Date(leave.to_date + "T00:00:00");
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          approvedLeaveDates.add(`${year}-${month}-${day}`);
        }
      }
    }

    let workingDays = 0;
    let fullDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let lateMinutes = 0;

    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${mm}-${String(d).padStart(2, "0")}`;
      const dow = new Date(ds).getDay();
      const isSun = dow === 0;
      const isHol = holidaySet.has(ds);
      if (!isSun && !isHol) workingDays++;
      const rec = safeAttendance.find((r) => r?.date === ds);
      if (rec) {
        const status = String(rec?.status || "").toLowerCase();
        if (["full_day", "present", "in_progress", "working"].includes(status)) fullDays++;
        else if (status === "half_day") halfDays++;
        else if (isPaidLeaveDay(rec)) {
          paidLeaveDays++;
          leaveDays++;
        } else if (isUnpaidLeaveDay(rec)) {
          unpaidLeaveDays++;
          leaveDays++;
        } else if (status === "leave") leaveDays++;
        else if (!isSun && !isHol) absentDays++;
        lateMinutes += Number(rec?.late_minutes || 0);
      } else if (!isSun && !isHol) {
        // Check if there's approved leave for this date
        if (approvedLeaveDates.has(ds)) {
          leaveDays++;
          // Try to determine if paid or unpaid from leave request
          const leaveForDate = safeLeaves.find(l => {
            if (l?.status !== "approved") return false;
            const start = new Date(l.from_date + "T00:00:00");
            const end = new Date(l.to_date + "T00:00:00");
            const checkDate = new Date(ds + "T00:00:00");
            return checkDate >= start && checkDate <= end;
          });
          if (leaveForDate) {
            const type = String(leaveForDate.leave_type || "").toLowerCase();
            const category = String(leaveForDate.leave_category || "").toLowerCase();
            if (type === "paid" || category === "paid") {
              paidLeaveDays++;
            } else {
              unpaidLeaveDays++;
            }
          }
        } else {
          absentDays++;
        }
      }
    }

    const effectivePresentDays = fullDays + (halfDays * 0.5);
    const rate = workingDays > 0 ? Math.round((effectivePresentDays / workingDays) * 100) : 0;
    const approvedDays = safeLeaves
      .filter((l) => l?.status === "approved")
      .reduce((s, l) => s + Number(l.requested_days ?? l.days ?? 0), 0);
    const leaveBalance = Math.max(0, 24 - approvedDays);
    const lateCount = safeAttendance.filter(isGraceLateLogin).length;

    return {
      workingDays,
      fullDays,
      halfDays,
      absentDays,
      leaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      rate,
      leaveBalance,
      approvedLeaveDays: approvedDays,
      lateCount,
      lateMinutes,
      holidayCount: holidayList.length,
      totalDays: lastDay,
    };
  }, [safeAttendance, safeLeaves, holidayList, monthMeta]);

  const actionBase = userProfile.role === "SUB_ADMIN" ? "/sub-admin" : "/employee";

  return (
    <div className={embedded ? "employee-dashboard" : "employee-dashboard"}>
      <div className="main">
        <div className="content">
          {/* Birthday Widget */}
          {birthdayInfo && birthdayInfo.hasBirthday && birthdayInfo.isToday && (
            <section className="birthday-widget today">
              <div className="birthday-greeting">
                <div className="birthday-icon-large">
                  <i className="fas fa-birthday-cake" />
                </div>
                <div className="birthday-message">
                  <h2>🎉 Happy Birthday, {userProfile.firstName}! 🎉</h2>
                  <p>Wishing you a wonderful birthday from the entire VJC Overseas team!</p>
                  <p className="birthday-age">Turning {birthdayInfo.age} today</p>
                </div>
              </div>
            </section>
          )}

          {/* Employee Profile Header */}
          <section className="employee-header">
            {/* Left - Employee Greeting */}
            <div className="header-left">
              <h1>{getGreeting()}, {userProfile.firstName}! 👋</h1>
              <div className="header-date">
                <span>{liveDateLabel}</span>
                <span className="separator">|</span>
                <span>{userProfile.department}</span>
                <span className="employee-live-time">{liveTimeLabel}</span>
              </div>
            </div>

            {/* Right - Employee Information */}
            <div className="header-right">
              <div className="info-block">
                <Mail className="info-icon" />
                <div>
                  <span className="info-label">EMAIL</span>
                  <span className="info-value">{userProfile.email}</span>
                </div>
              </div>
              <div className="separator-line"></div>
              <div className="info-block">
                <MapPin className="info-icon" />
                <div>
                  <span className="info-label">LOCATION</span>
                  <span className="info-value">{userProfile.branch}</span>
                </div>
              </div>
              <div className="separator-line"></div>
              <div className="info-block">
                <IdCard className="info-icon" />
                <div>
                  <span className="info-label">EMPLOYEE ID</span>
                  <span className="info-value">{userProfile.employee_code}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Work Timer Section - Redesigned Corporate Design */}
          <section className="work-timer-card">
            {/* Section 1: Work Timer Header */}
            <div className="timer-section-header">
              <div className="timer-icon-container">
                <Clock4 className="timer-icon" />
              </div>
              <div className="timer-header-text">
                <h3 className="timer-title">Work Timer</h3>
                <p className="timer-subtitle">Track and manage your work hours</p>
              </div>
            </div>

            {/* Section 2: Digital Timer */}
            <div className="timer-section-digital">
              <div className="digital-timer-display" id="digital-timer">
                00 : 00 : 00
              </div>
              <div className="timer-labels">
                <span className="timer-label">Hours</span>
                <span className="timer-label">Minutes</span>
                <span className="timer-label">Seconds</span>
              </div>
            </div>

            {/* Section 3: Attendance Controls */}
            <div className="timer-section-controls">
              <div className="attendance-status-pill" id="attendance-status">
                <span className="status-indicator"></span>
                <span className="status-text">Not Checked In</span>
              </div>
              <div className="control-buttons">
                <button className="btn-check-in" id="btn-check-in" onClick={handleClockIn}>
                  <Play className="btn-icon" />
                  Check In
                </button>
              </div>
            </div>

            {/* Section 4: Attendance Details */}
            <div className="timer-section-details">
              <div className="detail-row">
                <Clock className="detail-icon" />
                <span className="detail-label">Check In:</span>
                <span className="detail-value" id="detail-check-in">--</span>
              </div>
              <div className="detail-row">
                <LogOut className="detail-icon" />
                <span className="detail-label">Check Out:</span>
                <span className="detail-value" id="detail-check-out">--</span>
              </div>
            </div>

            {/* Section 5: Work Hours */}
            <div className="timer-section-work-hours">
              <Briefcase className="work-hours-icon" />
              <div className="work-hours-content">
                <span className="work-hours-label">Work Hours</span>
                <span className="work-hours-value" id="work-hours-value">00h 00m</span>
              </div>
            </div>
          </section>

          {/* Attendance Summary Cards - 6 Cards in One Row */}
          <section className="summary-cards-row">
            <div className="summary-card total">
              <div className="summary-icon">
                <Calendar />
              </div>
              <div className="summary-content">
                <div className="summary-value">{analytics.totalDays}</div>
                <div className="summary-label">Total Days</div>
                <div className="summary-trend">Month</div>
              </div>
            </div>
            <div className="summary-card working">
              <div className="summary-icon">
                <CalendarCheck />
              </div>
              <div className="summary-content">
                <div className="summary-value">{analytics.workingDays}</div>
                <div className="summary-label">Working Days</div>
                <div className="summary-trend">Excl. Sun/Hol</div>
              </div>
            </div>
            <div className="summary-card present">
              <div className="summary-icon">
                <CalendarCheck />
              </div>
              <div className="summary-content">
                <div className="summary-value">{analytics.fullDays}</div>
                <div className="summary-label">Present Days</div>
                <div className="summary-trend">Full Days</div>
              </div>
            </div>
            <div className="summary-card absent">
              <div className="summary-icon">
                <Clock />
              </div>
              <div className="summary-content">
                <div className="summary-value">{analytics.absentDays}</div>
                <div className="summary-label">Absent Days</div>
                <div className="summary-trend">Without information</div>
              </div>
            </div>
            <div className="summary-card late">
              <div className="summary-icon">
                <Clock />
              </div>
              <div className="summary-content">
                <div className="summary-value">{analytics.lateCount}</div>
                <div className="summary-label">Late Logins</div>
              
              </div>
            </div>
            <div className="summary-card holiday">
              <div className="summary-icon">
                <Calendar />
              </div>
              <div className="summary-content">
                <div className="summary-value">{analytics.holidayCount}</div>
                <div className="summary-label">Holidays</div>
                <div className="summary-trend">This Month</div>
              </div>
            </div>
          </section>

          {/* Pending Tasks and Quick Actions - Two Column Layout */}
          <section className="tasks-actions-layout">
            {/* Pending Tasks Section */}
            <div className="pending-tasks-section">
              <div className="section-header">
                <AlertCircle className="section-icon" />
                <div>
                  <h2>Pending Tasks</h2>
                  <p>{pendingTasks.length} task{pendingTasks.length !== 1 ? 's' : ''} pending</p>
                </div>
              </div>
              {tasksLoading ? (
                <div className="tasks-loading">Loading tasks...</div>
              ) : pendingTasks.length === 0 ? (
                <div className="tasks-empty">
                  <ListChecks className="empty-icon" />
                  <p>No pending tasks. You're all caught up!</p>
                </div>
              ) : (
                <div className="tasks-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Task Title</th>
                        <th>Priority</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTasks.slice(0, 5).map((task) => {
                        const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                        const priorityClass = (task.priority || "").toLowerCase();
                        const statusClass = (task.status || "").toLowerCase();
                        return (
                          <tr key={task.id} className={isOverdue ? 'overdue' : ''}>
                            <td className="task-title-cell">{task.title || "Untitled Task"}</td>
                            <td>
                              <span className={`priority-badge priority-${priorityClass}`}>
                                {task.priority || "Medium"}
                              </span>
                            </td>
                            <td className={isOverdue ? 'overdue-date' : ''}>
                              {task.due_date ? new Date(task.due_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) : '--'}
                            </td>
                            <td>
                              <span className={`status-badge status-${statusClass}`}>
                                {task.status || "Not Started"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {pendingTasks.length > 0 && (
                <div className="view-all-link" onClick={() => navigate("../tasks")}>
                  View All Tasks
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <div className="quick-actions-header">
                <Zap className="quick-actions-icon" />
                <h2>Quick Actions</h2>
              </div>
              <div className="quick-actions-grid">
                <div className="quick-action-card" onClick={() => navigate("../attendance")}>
                  <div className="action-icon-container blue">
                    <CalendarCheck className="action-icon" />
                  </div>
                  <div className="action-content">
                    <h3>Attendance</h3>
                    <p>View & manage attendance</p>
                  </div>
                  <ChevronRight className="action-arrow" />
                </div>
                <div className="quick-action-card" onClick={() => navigate("../leave")}>
                  <div className="action-icon-container green">
                    <Umbrella className="action-icon" />
                  </div>
                  <div className="action-content">
                    <h3>Apply Leave</h3>
                    <p>Request for leave</p>
                  </div>
                  <ChevronRight className="action-arrow" />
                </div>
                <div className="quick-action-card" onClick={() => navigate("../tasks")}>
                  <div className="action-icon-container blue">
                    <ListChecks className="action-icon" />
                  </div>
                  <div className="action-content">
                    <h3>My Tasks</h3>
                    <p>View assigned tasks</p>
                  </div>
                  <ChevronRight className="action-arrow" />
                </div>
                <div className="quick-action-card" onClick={() => navigate("../payslip")}>
                  <div className="action-icon-container purple">
                    <FileText className="action-icon" />
                  </div>
                  <div className="action-content">
                    <h3>My Payslips</h3>
                    <p>View & download payslips</p>
                  </div>
                  <ChevronRight className="action-arrow" />
                </div>
                <div className="quick-action-card" onClick={() => navigate("../onboarding")}>
                  <div className="action-icon-container green">
                    <UserPlus className="action-icon" />
                  </div>
                  <div className="action-content">
                    <h3>Onboarding</h3>
                    <p>View onboarding checklist</p>
                  </div>
                  <ChevronRight className="action-arrow" />
                </div>
                <div className="quick-action-card" onClick={() => navigate("../offboarding")}>
                  <div className="action-icon-container red">
                    <LogOut className="action-icon" />
                  </div>
                  <div className="action-content">
                    <h3>Offboarding</h3>
                    <p>View offboarding checklist</p>
                  </div>
                  <ChevronRight className="action-arrow" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function isGraceLateLogin(rec = {}) {
  const status = String(rec?.status || "").toLowerCase();
  const lateMinutes = Number(rec?.late_minutes || 0);
  return lateMinutes > 0 && ["full_day", "present", "in_progress", "working"].includes(status);
}
