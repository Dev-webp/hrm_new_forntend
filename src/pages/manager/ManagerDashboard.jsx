import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AttendanceTrendChart,
  EmployeeDonut,
  StatusPieChart,
} from "../../components/Charts";
import {
  EmployeeCardSkeleton,
  MonthStripSkeleton,
  StripTile,
  Toast,
  WelcomeStat,
} from "../../components/Cards";
import { useToast } from "../../hooks/useToast";
import LeaveApprovalPreviewModal from "../../components/leaves/LeaveApprovalPreviewModal";
import {
  fetchManagerBulkMonthlyAttendance,
  fetchManagerDashboardStats,
  fetchManagerEmployees,
  fetchManagerHolidays,
  fetchManagerLeaves,
  fetchManagerLeaveApprovalPreview,
  fetchManagerNotifications,
  fetchManagerProfile,
  fetchManagerTodayAttendance,
  markManagerNotificationRead,
  updateManagerLeaveStatus,
} from "../../services/managerApi";
import {
  attPctColor,
  buildDateStr,
  computeEmpStats,
  computeMonthStats,
  getGreeting,
  getInitials,
  isSunday,
  monthDays,
} from "../../utils/dashboardHelpers";
import "./ManagerDashboard.css";

function buildNotificationChips(todaySummary, pendingLeaves, todayStr) {
  const lateCount = Number(todaySummary.late);
  const absentCount = Number(todaySummary.absent);
  const chips = [];

  if (isSunday(todayStr)) {
    chips.push({
      cls: "info",
      icon: "fa-calendar",
      text: "Today is Sunday — Office Holiday",
    });
    return chips;
  }

  if (lateCount > 0) {
    chips.push({
      cls: "warn",
      icon: "fa-clock",
      text: `${lateCount} employees late today`,
    });
  }

  if (absentCount > 0) {
    chips.push({
      cls: "urgent",
      icon: "fa-user-times",
      text: `${absentCount} employees absent today`,
    });
  }

  if (pendingLeaves > 0) {
    chips.push({
      cls: "warn",
      icon: "fa-umbrella-beach",
      text: `${pendingLeaves} leave request${pendingLeaves > 1 ? "s" : ""} pending`,
    });
  }

  const total = Number(todaySummary.total);
  const pct = total
    ? Math.round((Number(todaySummary.present) / total) * 100)
    : 0;

  if (pct >= 90) {
    chips.push({
      cls: "success",
      icon: "fa-circle-check",
      text: `${pct}% attendance — Excellent!`,
    });
  } else if (pct >= 70) {
    chips.push({
      cls: "info",
      icon: "fa-chart-line",
      text: `${pct}% attendance today`,
    });
  }

  if (chips.length === 0) {
    chips.push({
      cls: "success",
      icon: "fa-circle-check",
      text: "All systems normal",
    });
  }

  return chips;
}

export default function ManagerDashboard() {
  const today = useMemo(() => new Date(), []);

  const [currentDate, setCurrentDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [currentMonthStr, setCurrentMonthStr] = useState(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [managerProfile, setManagerProfile] = useState(null);
  const [stats, setStats] = useState({});
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [notifications, setNotifications] = useState([
    { cls: "info", icon: "fa-spinner fa-spin", text: "Loading…" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentDept, setCurrentDept] = useState("all");
  const { toast, showToast } = useToast(2500);

  const [allEmployees, setAllEmployees] = useState([]);
  const [holidaySet, setHolidaySet] = useState(new Set());
  const [attendanceMap, setAttendanceMap] = useState(new Map());
  const [monthKpi, setMonthKpi] = useState(null);
  const [leaveItems, setLeaveItems] = useState([]);
  const [leaveApproval, setLeaveApproval] = useState({ open: false, leave: null, preview: null, loading: false, error: "" });
  const [leaveApproving, setLeaveApproving] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const [clock, setClock] = useState({
    time: "--:-- --",
    greeting: "Morning",
    dateLabel: "",
  });

  const [year, monthNum] = currentMonthStr.split("-").map(Number);
  const managerBranch = managerProfile?.branch || selectedBranch;
  const branchLabel = managerBranch ? `${managerBranch} Branch` : "Your Branch";

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const ampm = hours >= 12 ? "PM" : "AM";

      setCurrentDate(now.toISOString().slice(0, 10));
      setClock({
        time: `${String(hours % 12 || 12).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} ${ampm}`,
        greeting: getGreeting(hours),
        dateLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const buildAlerts = useCallback(
    (employees, attendanceData, holidays, todayRecords) => {
      const alertList = [];

      todayRecords
        .filter((record) => (record.late_minutes || 0) > 30)
        .slice(0, 3)
        .forEach((record) => {
          alertList.push({
            color: "#FF8C00",
            text: `${record.full_name} — ${record.late_minutes}m late`,
            time: "Today",
          });
        });

      employees
        .map((employee) => ({
          ...employee,
          stats: computeEmpStats(
            employee.id,
            year,
            monthNum,
            attendanceData,
            holidays,
            currentDate
          ),
        }))
        .filter(
          (employee) =>
            employee.stats.attPct < 50 && employee.stats.workingDays > 5
        )
        .slice(0, 3)
        .forEach((employee) => {
          alertList.push({
            color: "#DC2626",
            text: `${employee.full_name} — only ${employee.stats.attPct}% MTD`,
            time: "MTD",
          });
        });

      return alertList;
    },
    [currentDate, monthNum, year]
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let profile = managerProfile;
      if (!profile) {
        profile = await fetchManagerProfile();
        setManagerProfile(profile);
        if (profile.branch) setSelectedBranch(profile.branch);
      }

      const branch = profile?.branch || selectedBranch;
      if (!branch || branch === "all") {
        throw new Error("Manager branch not found on profile");
      }

      const lastDay = monthDays(year, monthNum);
      const startDate = `${currentMonthStr}-01`;
      const endDate = `${currentMonthStr}-${String(lastDay).padStart(2, "0")}`;

      const [
        employees,
        holidays,
        summary,
        bulkAttendance,
        todayAttendance,
        leaves,
        apiNotifications,
      ] = await Promise.all([
        fetchManagerEmployees(),
        fetchManagerHolidays(year, monthNum).catch(() => []),
        fetchManagerDashboardStats(branch, currentDate),
        fetchManagerBulkMonthlyAttendance(startDate, endDate, branch),
        fetchManagerTodayAttendance(branch, currentDate),
        fetchManagerLeaves("all"),
        fetchManagerNotifications().catch(() => []),
      ]);

      const nextHolidaySet = new Set(
        holidays.map((holiday) =>
          holiday.date ? holiday.date.slice(0, 10) : ""
        )
      );

      const nextAttendanceMap = new Map();
      Object.entries(bulkAttendance || {}).forEach(([userId, rows]) => {
        nextAttendanceMap.set(parseInt(userId, 10), rows);
      });

      const normalizedEmployees = employees
        .filter((employee) => employee.role !== "SUPER_ADMIN")
        .map((employee) => ({
          id: employee.id,
          full_name: employee.full_name,
          department: employee.department,
          branch: employee.branch,
        }));

      const pendingLeaves = leaves.filter((leave) => leave.status === "pending");

      setAllEmployees(normalizedEmployees);
      setHolidaySet(nextHolidaySet);
      setAttendanceMap(nextAttendanceMap);
      setMonthKpi(summary.monthKpi);
      setRecentAttendance(todayAttendance);
      setLeaveItems(pendingLeaves.slice(0, 5));

      setStats({
        presentToday: summary.today?.present,
        absentToday: summary.today?.absent,
        lateToday: summary.today?.late,
        onLeave: summary.today?.on_leave ?? summary.today?.leave,
        totalEmployees: summary.totalEmployees ?? normalizedEmployees.length,
        pendingLeaves: summary.pendingLeaves ?? pendingLeaves.length,
      });

      setNotifications(
        buildNotificationChips(
          summary.today || {},
          summary.pendingLeaves ?? pendingLeaves.length,
          currentDate
        )
      );

      setAlerts(
        buildAlerts(
          normalizedEmployees,
          nextAttendanceMap,
          nextHolidaySet,
          todayAttendance
        )
      );

      if (apiNotifications.length > 0) {
        const unread = apiNotifications.filter((item) => !item.is_read).slice(0, 3);
        if (unread.length > 0) {
          setNotifications((prev) => [
            ...prev,
            ...unread.map((item) => ({
              id: item.id,
              cls: "info",
              icon: "fa-bell",
              text: item.description || item.action_type,
              unread: true,
            })),
          ]);
        }
      }

      showToast("✓ Dashboard updated");
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || "Failed to load dashboard";
      setError(message);
      showToast(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [
    buildAlerts,
    currentDate,
    currentMonthStr,
    managerProfile,
    monthNum,
    selectedBranch,
    showToast,
    year,
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const intervalId = window.setInterval(loadDashboard, 60_000);
    return () => window.clearInterval(intervalId);
  }, [loadDashboard]);

  const handleLeaveAction = async (leave, status) => {
    if (status === "approved") {
      setLeaveApproval({ open: true, leave, preview: null, loading: true, error: "" });
      try {
        const preview = await fetchManagerLeaveApprovalPreview(leave.id);
        setLeaveApproval((current) => ({ ...current, preview, loading: false }));
      } catch (err) {
        setLeaveApproval((current) => ({ ...current, loading: false, error: err?.response?.data?.message || "Failed to calculate leave" }));
      }
      return;
    }
    const reason = window.prompt(`Reason for rejecting ${leave.full_name}'s leave:`);
    if (reason === null) return;
    try {
      await updateManagerLeaveStatus(leave.id, status, { rejection_reason: reason.trim() });
      window.dispatchEvent(new Event("manager-pending-leave-count-changed"));
      showToast("Leave rejected");
      loadDashboard();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to update leave");
    }
  };

  const confirmDashboardLeaveApproval = async () => {
    if (!leaveApproval.leave || !leaveApproval.preview) return;
    const preview = leaveApproval.preview;
    setLeaveApproving(true);
    try {
      await updateManagerLeaveStatus(leaveApproval.leave.id, "approved", {
        paid_days: preview.paid_days,
        unpaid_days: preview.unpaid_days,
        salary_deduction_days: preview.salary_deduction_days,
        leave_category: preview.final_category,
        include_sunday_penalty: preview.include_sunday_penalty,
        penalty_days: preview.penalty_days,
      });
      setLeaveApproval({ open: false, leave: null, preview: null, loading: false, error: "" });
      window.dispatchEvent(new Event("manager-pending-leave-count-changed"));
      showToast("Leave approved");
      loadDashboard();
    } catch (err) {
      showToast(err?.response?.data?.message || "Failed to approve leave");
    } finally {
      setLeaveApproving(false);
    }
  };

  const handleNotificationClick = async (chip) => {
    if (!chip.id || !chip.unread) return;
    try {
      await markManagerNotificationRead(chip.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === chip.id ? { ...item, unread: false } : item
        )
      );
    } catch {
      showToast("Failed to mark notification as read");
    }
  };

  const monthStats = useMemo(
    () => computeMonthStats(year, monthNum, holidaySet),
    [holidaySet, monthNum, year]
  );

  const monthTiles = useMemo(() => {
    let totalLate = 0;
    let totalAbsent = 0;

    allEmployees.forEach((employee) => {
      const employeeStats = computeEmpStats(
        employee.id,
        year,
        monthNum,
        attendanceMap,
        holidaySet,
        currentDate
      );
      totalLate += employeeStats.late;
      totalAbsent += employeeStats.absent;
    });

    return [
      {
        icon: "fas fa-calendar",
        label: "Total Days",
        value: monthStats.total,
        accent: "#0D47A1",
      },
      {
        icon: "fas fa-sun",
        label: "Sundays",
        value: monthStats.sundays,
        accent: "#8b5cf6",
      },
      {
        icon: "fas fa-star-and-crescent",
        label: "Holidays",
        value: monthStats.holidays,
        accent: "#06b6d4",
      },
      {
        icon: "fas fa-briefcase",
        label: "Working Days",
        value: monthStats.working,
        accent: "#FF8C00",
      },
      {
        icon: "fas fa-clock",
        label: "Late (MTD)",
        value: monthKpi ? Number(monthKpi.total_late) : totalLate,
        accent: "#FF8C00",
      },
      {
        icon: "fas fa-user-times",
        label: "Absences (MTD)",
        value: monthKpi ? Number(monthKpi.total_absent) : totalAbsent,
        accent: "#DC2626",
      },
    ];
  }, [
    allEmployees,
    attendanceMap,
    currentDate,
    holidaySet,
    monthKpi,
    monthNum,
    monthStats,
    year,
  ]);

  const topPerformers = useMemo(
    () =>
      allEmployees
        .map((employee) => ({
          ...employee,
          stats: computeEmpStats(
            employee.id,
            year,
            monthNum,
            attendanceMap,
            holidaySet,
            currentDate
          ),
        }))
        .filter((employee) => employee.stats.attPct > 0)
        .sort((a, b) => b.stats.attPct - a.stats.attPct)
        .slice(0, 5),
    [allEmployees, attendanceMap, currentDate, holidaySet, monthNum, year]
  );

  const departmentLeaderboard = useMemo(() => {
    const grouped = new Map();

    allEmployees.forEach((employee) => {
      const department = employee.department || "Unassigned";
      const employeeStats = computeEmpStats(
        employee.id,
        year,
        monthNum,
        attendanceMap,
        holidaySet,
        currentDate
      );
      const current = grouped.get(department) || {
        department,
        employees: 0,
        present: 0,
        late: 0,
        absent: 0,
        attendanceTotal: 0,
      };

      current.employees += 1;
      current.present += employeeStats.present;
      current.late += employeeStats.late;
      current.absent += employeeStats.absent;
      current.attendanceTotal += employeeStats.attPct;
      grouped.set(department, current);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        averageAttendance: item.employees
          ? Math.round(item.attendanceTotal / item.employees)
          : 0,
      }))
      .sort((a, b) => b.averageAttendance - a.averageAttendance)
      .slice(0, 6);
  }, [allEmployees, attendanceMap, currentDate, holidaySet, monthNum, year]);

  const departments = useMemo(
    () => [
      "all",
      ...new Set(
        allEmployees.map((employee) => employee.department).filter(Boolean)
      ),
    ],
    [allEmployees]
  );

  const filteredEmployees = useMemo(
    () =>
      allEmployees.filter(
        (employee) =>
          currentDept === "all" || employee.department === currentDept
      ),
    [allEmployees, currentDept]
  );

  const trendChartData = useMemo(() => {
    const lastDay = monthDays(year, monthNum);
    const isCurrentMonth =
      year === today.getFullYear() && monthNum === today.getMonth() + 1;

    const labels = [];
    const present = [];
    const late = [];
    const absent = [];

    for (let day = 1; day <= lastDay; day += 1) {
      const dateStr = buildDateStr(year, monthNum, day);
      if (isCurrentMonth && dateStr > currentDate) break;
      if (isSunday(dateStr) || holidaySet.has(dateStr)) continue;

      labels.push(day);

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      allEmployees.forEach((employee) => {
        const records = attendanceMap.get(employee.id) || [];
        const record = records.find(
          (row) => row.date && row.date.slice(0, 10) === dateStr
        );

        if (!record || record.status === "absent") {
          absentCount += 1;
          return;
        }

        if (["full_day", "half_day"].includes(record.status)) {
          presentCount += 1;
          if ((record.late_minutes || 0) > 0) lateCount += 1;
        }
      });

      present.push(presentCount);
      late.push(lateCount);
      absent.push(absentCount);
    }

    return { labels, present, late, absent };
  }, [
    allEmployees,
    attendanceMap,
    currentDate,
    holidaySet,
    monthNum,
    today,
    year,
  ]);

  const pieStats = useMemo(() => {
    let full = 0;
    let half = 0;
    let late = 0;
    let absent = 0;

    allEmployees.forEach((employee) => {
      const employeeStats = computeEmpStats(
        employee.id,
        year,
        monthNum,
        attendanceMap,
        holidaySet,
        currentDate
      );
      full += employeeStats.present;
      half += employeeStats.half;
      late += employeeStats.late;
      absent += employeeStats.absent;
    });

    return { full, half, late, absent };
  }, [allEmployees, attendanceMap, currentDate, holidaySet, monthNum, year]);

  const displayName = managerProfile?.full_name || "Manager";
  const showStat = (value) =>
    loading && (value === undefined || value === null) ? "--" : (value ?? "--");

  return (
    <>
      <div className="topbar manager-dashboard-topbar">
        <div className="topbar-left">
          <div className="topbar-title">
            <h1>
              <i
                className="fas fa-chart-line"
                style={{ color: "var(--gold)", marginRight: "6px" }}
              />
              Manager Dashboard
            </h1>
            <p>Month-to-date · Your branch performance · {branchLabel}</p>
          </div>
        </div>

        <div className="topbar-controls">
          <div className="month-picker-wrap">
            <i className="fas fa-calendar-alt" style={{ color: "var(--gold)" }} />
            <input
              type="month"
              value={currentMonthStr}
              onChange={(event) => setCurrentMonthStr(event.target.value)}
            />
          </div>

          <div className="branch-pill">
            <i className="fas fa-store" /> {managerBranch || "—"}
          </div>

          <div className="live-pill">
            <div className="live-dot" />
            <span>Live</span>
          </div>
        </div>
      </div>

        <div className="scroll-content manager-dashboard-page manager-portal-page">
        {error ? (
          <div className="manager-error-banner" role="alert">
            <i className="fas fa-triangle-exclamation" /> {error}
          </div>
        ) : null}

        <div className="welcome-banner">
          <div className="welcome-left">
            <div className="welcome-avatar">{getInitials(displayName)}</div>

            <div className="welcome-text">
              <h2>
                Good <span>{clock.greeting}</span>, <span>{displayName}</span> 👋
              </h2>
              <p>
                Manager · {branchLabel} · {clock.dateLabel}
              </p>
            </div>

            <div className="datetime-pill">
              <i className="fas fa-clock" />
              <span className="live-clock">{clock.time}</span>
            </div>
          </div>

          <div className="welcome-right">
            <WelcomeStat
              value={showStat(stats.presentToday)}
              label="Present Today"
              colorClass="ws-green"
            />
            <WelcomeStat
              value={showStat(stats.absentToday)}
              label="Absent Today"
              colorClass="ws-red"
            />
            <WelcomeStat
              value={showStat(stats.lateToday)}
              label="Late Today"
              colorClass="ws-orange"
            />
            <WelcomeStat
              value={showStat(stats.pendingLeaves)}
              label="Leave Requests"
              colorClass="ws-gold"
            />
          </div>
        </div>

        <div className="notif-strip">
          <div className="notif-strip-title">
            <i className="fas fa-bell" /> Alerts &amp; Notifications
          </div>
          <div className="notif-items">
            {notifications.map((chip, index) => (
              <div
                key={chip.id || index}
                className={`notif-chip ${chip.cls}${chip.unread ? " unread" : ""}`}
                role={chip.id ? "button" : undefined}
                tabIndex={chip.id ? 0 : undefined}
                onClick={() => handleNotificationClick(chip)}
                onKeyDown={(event) => {
                  if (chip.id && (event.key === "Enter" || event.key === " ")) {
                    handleNotificationClick(chip);
                  }
                }}
              >
                <i className={`fas ${chip.icon}`} />
                {chip.text}
              </div>
            ))}
          </div>
        </div>

        <div className="month-strip">
          {loading && !monthKpi ? (
            <MonthStripSkeleton />
          ) : (
            monthTiles.map((tile) => (
              <StripTile
                key={tile.label}
                icon={tile.icon}
                label={tile.label}
                value={tile.value}
                accentColor={tile.accent}
              />
            ))
          )}
        </div>

        <div className="chart-row">
          <div className="chart-panel">
            <div className="panel-title">
              <i className="fas fa-chart-bar" /> Monthly Attendance Trend
            </div>
            <AttendanceTrendChart {...trendChartData} />
          </div>

          <div className="chart-panel">
            <div className="panel-title">
              <i className="fas fa-chart-pie" /> Status Distribution (MTD)
            </div>
            <StatusPieChart {...pieStats} />
          </div>
        </div>

        <div className="triple-row">
          <div className="panel manager-department-panel">
            <div className="panel-title">
              <i className="fas fa-ranking-star" /> Department Leaderboard
            </div>

            {loading && departmentLeaderboard.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                Loading…
              </div>
            ) : departmentLeaderboard.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                No data
              </div>
            ) : (
              departmentLeaderboard.map((department, index) => (
                <div key={department.department} className="leaderboard-item department-leaderboard-item">
                  <div
                    className={`lb-rank ${["gold", "silver", "bronze"][index] || ""}`}
                  >
                    {index + 1}
                  </div>
                  <div className="lb-name">
                    {department.department}
                    <small>{department.employees} employee{department.employees === 1 ? "" : "s"}</small>
                  </div>
                  <div className="lb-bar-wrap">
                    <div
                      className="lb-bar"
                      style={{
                        width: `${department.averageAttendance}%`,
                        background:
                          department.averageAttendance >= 90 ? "#16A34A" : "#FF8C00",
                      }}
                    />
                  </div>
                  <div className="lb-pct">{department.averageAttendance}%</div>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-title">
              <i className="fas fa-umbrella-beach" /> Leave Requests
            </div>

            {loading && leaveItems.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                Loading…
              </div>
            ) : leaveItems.length === 0 ? (
              <div
                style={{
                  color: "var(--green)",
                  fontSize: "0.78rem",
                  padding: "8px 0",
                }}
              >
                <i className="fas fa-circle-check" /> No pending leave requests
              </div>
            ) : (
              leaveItems.map((leave) => (
                <div key={leave.id} className="leave-item">
                  <div className="leave-avatar">
                    {getInitials(leave.full_name)}
                  </div>
                  <div className="leave-info">
                    <div className="li-name">{leave.full_name}</div>
                    <div className="li-type">
                      {leave.leave_type} · {leave.days} day
                      {leave.days > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn-approve"
                      onClick={() => handleLeaveAction(leave, "approved")}
                    >
                      ✓ Approve
                    </button>
                    <button
                      type="button"
                      className="btn-reject"
                      onClick={() => handleLeaveAction(leave, "rejected")}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-title">
              <i className="fas fa-triangle-exclamation" /> Attendance Alerts
            </div>

            {loading && alerts.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                Loading…
              </div>
            ) : alerts.length === 0 ? (
              <div
                style={{
                  color: "var(--green)",
                  fontSize: "0.78rem",
                  padding: "8px 0",
                }}
              >
                <i className="fas fa-circle-check" /> No critical alerts
              </div>
            ) : (
              alerts.map((alert, index) => (
                <div key={index} className="alert-item">
                  <div
                    className="alert-dot"
                    style={{ background: alert.color }}
                  />
                  <div>
                    <div className="alert-text">{alert.text}</div>
                    <div className="alert-time">{alert.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {recentAttendance.length > 0 ? (
          <div className="panel manager-today-panel">
            <div className="panel-title">
              <i className="fas fa-clipboard-list" /> Attendance Register
            </div>
            <div className="manager-attendance-list">
              {recentAttendance.map((record) => (
                <div
                  key={record.id || `${record.user_id}-${record.date}`}
                  className="manager-att-row"
                >
                  <span className="manager-att-name">{record.full_name}</span>
                  <span
                    className={`manager-att-status status-${record.status}`}
                  >
                    {record.status?.replace("_", " ") || "—"}
                  </span>
                  <span className="manager-att-time">
                    {(record.late_minutes || 0) > 0
                      ? `${record.late_minutes}m late`
                      : record.check_in || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="section-hdr">
          <h2>
            <span /> Employee Performance — Month to Date
          </h2>

          <div className="dept-filter-row">
            {departments.map((department) => (
              <button
                key={department}
                type="button"
                className={`dept-chip${currentDept === department ? " active" : ""}`}
                onClick={() => setCurrentDept(department)}
              >
                {department === "all" ? "All" : department}
              </button>
            ))}
          </div>
        </div>

        <div className="employees-grid">
          {loading && filteredEmployees.length === 0 ? (
            <EmployeeCardSkeleton />
          ) : filteredEmployees.length === 0 ? (
            <div
              className="emp-card"
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "32px",
                color: "var(--muted)",
              }}
            >
              No employees found
            </div>
          ) : (
            filteredEmployees.map((employee) => {
              const employeeStats = computeEmpStats(
                employee.id,
                year,
                monthNum,
                attendanceMap,
                holidaySet,
                currentDate
              );
              const { cls, ring } = attPctColor(employeeStats.attPct);
              return <div key={employee.id} className="emp-card">
                  <div className="emp-card-top">
                    <div className="emp-avatar">
                      {getInitials(employee.full_name)}
                    </div>
                    <div className="emp-info">
                      <div className="emp-name">{employee.full_name}</div>
                      <div className="emp-dept">
                        {employee.department || employee.branch}
                      </div>
                    </div>
                  </div>

                  <div className="donut-wrap">
                    <EmployeeDonut
                      employeeId={employee.id}
                      attPct={employeeStats.attPct}
                      ringColor={ring}
                    />
                    <div className="donut-pct">
                      <span className={`pct-num ${cls}`}>
                        {employeeStats.attPct}%
                      </span>
                      <span className="pct-lbl">Att.</span>
                    </div>
                  </div>

                  <div className="emp-mini-stats">
                    <div className="mini-stat">
                      <div className="msv" style={{ color: "#16A34A" }}>
                        {employeeStats.present}
                      </div>
                      <div className="msl">Present</div>
                    </div>
                    <div className="mini-stat">
                      <div className="msv" style={{ color: "#FF8C00" }}>
                        {employeeStats.late}
                      </div>
                      <div className="msl">Late</div>
                    </div>
                    <div className="mini-stat">
                      <div className="msv" style={{ color: "#DC2626" }}>
                        {employeeStats.absent}
                      </div>
                      <div className="msl">Absent</div>
                    </div>
                  </div>
                  </div>;
            })
          )}
        </div>
      </div>

      <LeaveApprovalPreviewModal
        open={leaveApproval.open}
        preview={leaveApproval.preview}
        loading={leaveApproval.loading}
        error={leaveApproval.error}
        saving={leaveApproving}
        onClose={() => !leaveApproving && setLeaveApproval({ open: false, leave: null, preview: null, loading: false, error: "" })}
        onConfirm={confirmDashboardLeaveApproval}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}
