import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
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
import api from "../../services/api";
import { fetchDepartmentCount } from "../../services/departmentApi";
import { getStoredUser } from "../../utils/auth";
import {
  attPctColor,
  BRANCH_LABELS,
  buildDateStr,
  computeEmpStats,
  computeMonthStats,
  getGreeting,
  getInitials,
  isGraceLateAttendanceRecord,
  isSunday,
  monthDays,
} from "../../utils/dashboardHelpers";

function AdminDashboard() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const todayStr = today.toISOString().slice(0, 10);

  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentMonthStr, setCurrentMonthStr] = useState(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });
  const [currentDept, setCurrentDept] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast(2500);

  const [allEmployees, setAllEmployees] = useState([]);
  const [holidaySet, setHolidaySet] = useState(new Set());
  const [attendanceMap, setAttendanceMap] = useState(new Map());

  const [welcomeStats, setWelcomeStats] = useState({
    present: "--",
    absent: "--",
    late: "--",
    pendingLeaves: "--",
    departments: "--",
  });
  const [notifications, setNotifications] = useState([
    { cls: "info", icon: "fa-spinner fa-spin", text: "Loading notifications…" },
  ]);
  const [monthKpi, setMonthKpi] = useState(null);
  const [leaveItems, setLeaveItems] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [clock, setClock] = useState({
    time: "--:-- --",
    greeting: "Morning",
    dateLabel: "",
  });

  const user = useMemo(() => getStoredUser(), []);
  const isOperationalManager = user?.role === "OPERATIONAL_MANAGER";

  const [year, monthNum] = currentMonthStr.split("-").map(Number);

  // Live clock — replaces setInterval(updateClock) from original admin.html
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = String(hours % 12 || 12).padStart(2, "0");
      const displayMinutes = String(minutes).padStart(2, "0");
      const displaySeconds = String(seconds).padStart(2, "0");

      setClock({
        time: `${displayHours}:${displayMinutes}:${displaySeconds} ${ampm}`,
        greeting: getGreeting(hours),
        dateLabel: now.toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      });
    };

    updateClock();
    const intervalId = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const buildNotifications = useCallback((todaySummary, pendingLeaves) => {
    const lateCount = Number(todaySummary.late);
    const absentCount = Number(todaySummary.absent);
    const chips = [];

    if (isSunday(todayStr)) {
      chips.push({
        cls: "info",
        icon: "fa-calendar",
        text: "Today is Sunday — Office Holiday",
      });
    } else {
      if (lateCount > 0) {
        chips.push({
          cls: "warn",
          icon: "fa-clock",
          text: `${lateCount} employees arrived late today`,
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
          text: `${pct}% attendance rate today — Excellent!`,
        });
      } else if (pct >= 70) {
        chips.push({
          cls: "info",
          icon: "fa-chart-line",
          text: `${pct}% attendance rate today`,
        });
      }

      if (chips.length === 0) {
        chips.push({
          cls: "success",
          icon: "fa-circle-check",
          text: "All systems normal — Great day ahead!",
        });
      }
    }

    return chips;
  }, [todayStr]);

  const buildAlerts = useCallback(
    (employees, attendanceData, holidays) => {
      const alertList = [];
      const todayRecords = [];

      employees.forEach((employee) => {
        const rows = attendanceData.get(employee.id) || [];
        const record = rows.find((row) => row.date === todayStr);

        if (record) {
          todayRecords.push({ ...employee, ...record });
        }
      });

      todayRecords
        .filter(isGraceLateAttendanceRecord)
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
            todayStr
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

      return alertList.slice(0, 5);
    },
    [monthNum, todayStr, year]
  );

  const loadLeavePanel = useCallback(async () => {
    try {
      const response = await api.get("/leaves", {
        params: { status: "all", branch: currentBranch },
      });
      const leaves = response.data;
      const pending = leaves.filter((leave) => leave.status === "pending");

      setWelcomeStats((prev) => ({
        ...prev,
        pendingLeaves: pending.length,
      }));

      setLeaveItems(pending.slice(0, 5));
    } catch {
      setLeaveItems([]);
    }
  }, [currentBranch]);

  const loadDepartmentCount = useCallback(async () => {
    try {
      const count = await fetchDepartmentCount({ branch: currentBranch });
      setWelcomeStats((prev) => ({
        ...prev,
        departments: count,
      }));
    } catch {
      setWelcomeStats((prev) => ({
        ...prev,
        departments: "--",
      }));
    }
  }, [currentBranch]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    showToast("Loading dashboard…");

    try {
      const lastDay = monthDays(year, monthNum);
      const startDate = `${currentMonthStr}-01`;
      const endDate = `${currentMonthStr}-${String(lastDay).padStart(2, "0")}`;

      const [employeesRes, holidaysRes, summaryRes, bulkAttRes] =
        await Promise.all([
          api.get(`/admin/employees?branch=${currentBranch}`),
          api
            .get(`/holidays?year=${year}&month=${monthNum}`)
            .catch(() => ({ data: [] })),
          api.get(
            `/dashboard/summary?month=${currentMonthStr}&branch=${currentBranch}&today=${todayStr}`
          ),
          api.get(
            `/attendance/bulk-monthly?start=${startDate}&end=${endDate}&branch=${currentBranch}`
          ),
        ]);

      const employees = employeesRes.data;
      const holidays = holidaysRes.data;
      const summary = summaryRes.data;
      const bulkAttendance = bulkAttRes.data;

      const nextHolidaySet = new Set(
        holidays.map((holiday) =>
          holiday.date ? holiday.date.slice(0, 10) : ""
        )
      );

      const nextAttendanceMap = new Map();
      Object.entries(bulkAttendance).forEach(([userId, rows]) => {
        nextAttendanceMap.set(parseInt(userId, 10), rows);
      });

      setAllEmployees(employees);
      setHolidaySet(nextHolidaySet);
      setAttendanceMap(nextAttendanceMap);
      setMonthKpi(summary.monthKpi);

      setWelcomeStats((prev) => ({
        present: summary.today.present,
        absent: summary.today.absent,
        late: summary.today.late,
        pendingLeaves: summary.pendingLeaves,
        departments: prev.departments,
      }));

      setNotifications(
        buildNotifications(summary.today, summary.pendingLeaves)
      );
      setAlerts(buildAlerts(employees, nextAttendanceMap, nextHolidaySet));

      showToast("✓ Dashboard updated");
    } catch (error) {
      showToast(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    buildAlerts,
    buildNotifications,
    currentBranch,
    currentMonthStr,
    monthNum,
    showToast,
    todayStr,
    year,
  ]);

  // Initial load + reload when branch/month changes
  useEffect(() => {
    loadDashboard();
    loadLeavePanel();
    loadDepartmentCount();
  }, [loadDashboard, loadLeavePanel, loadDepartmentCount]);

  // Lightweight 60s poll for live banner stats (same as original admin.html)
  useEffect(() => {
    const pollBannerStats = async () => {
      try {
        const response = await api.get(
          `/dashboard/summary?month=${currentMonthStr}&branch=${currentBranch}&today=${todayStr}`
        );
        const data = response.data;

        setWelcomeStats((prev) => ({
          ...prev,
          present: data.today.present,
          absent: data.today.absent,
          late: data.today.late,
          pendingLeaves: data.pendingLeaves,
        }));

        setNotifications(buildNotifications(data.today, data.pendingLeaves));
      } catch {
        // Silent fail — UI keeps last known values
      }
    };

    const intervalId = window.setInterval(pollBannerStats, 60_000);
    return () => window.clearInterval(intervalId);
  }, [buildNotifications, currentBranch, currentMonthStr, todayStr]);

  const monthStats = useMemo(
    () => computeMonthStats(year, monthNum, holidaySet),
    [holidaySet, monthNum, year]
  );

  const monthTiles = useMemo(
    () => [
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
        accent: "#16A34A",
      },
      {
        icon: "fas fa-clock",
        label: "Late (MTD)",
        value: monthKpi ? Number(monthKpi.total_late) : "--",
        accent: "#FF8C00",
      },
      {
        icon: "fas fa-user-times",
        label: "Absences (MTD)",
        value: monthKpi ? Number(monthKpi.total_absent) : "--",
        accent: "#DC2626",
      },
    ],
    [monthKpi, monthStats]
  );

  const branchLeaderboard = useMemo(() => {
    const branchMap = new Map();

    allEmployees.forEach((employee) => {
      const branchName = employee.branch || "Unknown";

      if (!branchMap.has(branchName)) {
        branchMap.set(branchName, { total: 0, pctSum: 0 });
      }

      const stats = computeEmpStats(
        employee.id,
        year,
        monthNum,
        attendanceMap,
        holidaySet,
        todayStr
      );

      const entry = branchMap.get(branchName);
      entry.total += 1;
      entry.pctSum += stats.attPct;
    });

    return Array.from(branchMap.entries())
      .map(([name, data]) => ({
        name,
        pct: data.total ? Math.round(data.pctSum / data.total) : 0,
        count: data.total,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [allEmployees, attendanceMap, holidaySet, monthNum, todayStr, year]);

  const topPerformers = useMemo(() => {
    return allEmployees
      .map((employee) => ({
        ...employee,
        stats: computeEmpStats(
          employee.id,
          year,
          monthNum,
          attendanceMap,
          holidaySet,
          todayStr
        ),
      }))
      .filter((employee) => employee.stats.attPct > 0)
      .sort((a, b) => b.stats.attPct - a.stats.attPct)
      .slice(0, 5);
  }, [allEmployees, attendanceMap, holidaySet, monthNum, todayStr, year]);

  const departments = useMemo(
    () => [
      "all",
      ...new Set(allEmployees.map((employee) => employee.department).filter(Boolean)),
    ],
    [allEmployees]
  );

  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(
      (employee) =>
        currentDept === "all" || employee.department === currentDept
    );
  }, [allEmployees, currentDept]);

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

      if (isCurrentMonth && dateStr > todayStr) break;
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
          if (isGraceLateAttendanceRecord(record)) lateCount += 1;
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
    holidaySet,
    monthNum,
    today,
    todayStr,
    year,
  ]);

  const pieStats = useMemo(() => {
    let full = 0;
    let half = 0;
    let late = 0;
    let absent = 0;

    allEmployees.forEach((employee) => {
      const stats = computeEmpStats(
        employee.id,
        year,
        monthNum,
        attendanceMap,
        holidaySet,
        todayStr
      );

      full += stats.present;
      half += stats.half;
      late += stats.late;
      absent += stats.absent;
    });

    return { full, half, late, absent };
  }, [allEmployees, attendanceMap, holidaySet, monthNum, todayStr, year]);

  const branchLabel = BRANCH_LABELS[currentBranch] || currentBranch;
  const displayName = user?.full_name || user?.name || "Admin";
  const dashboardTitle = isOperationalManager
    ? "Operational Manager Dashboard"
    : "Executive Dashboard";
  const profileName = isOperationalManager ? "Operational Manager" : "Super Admin";
  const profileSubtitle = isOperationalManager
    ? "Operations · All Branches"
    : "VJC Overseas";
  const actionBasePath = isOperationalManager ? "/operations" : "/admin";

  return (
    <>
      <Navbar
        title={dashboardTitle}
        subtitle={`Month-to-date · Employee performance & attendance intelligence · ${branchLabel}`}
        branch={currentBranch}
        onBranchChange={setCurrentBranch}
        month={currentMonthStr}
        onMonthChange={setCurrentMonthStr}
        showAdminActions
        showActivityLogsAction={!isOperationalManager}
        actionBasePath={actionBasePath}
        profileName={profileName}
        profileSubtitle={profileSubtitle}
      />

      <div className="scroll-content admin-portal-page admin-dashboard-page">
        <div className="welcome-banner">
          <div className="welcome-left">
            <div className="welcome-avatar">
              <i className="fas fa-user" />
            </div>

            <div className="welcome-text">
              <h2>
                Good {clock.greeting}, <span>{displayName} 👋</span>
              </h2>
              <div className="welcome-meta">
                <span>
                  <i className="fas fa-calendar-day" />
                  {clock.dateLabel}
                </span>
                <span>
                  <i className="fas fa-clock" />
                  {clock.time}
                </span>
              </div>
            </div>
          </div>

          <div className="welcome-right">
            <WelcomeStat
              value={welcomeStats.present}
              label="Present Today"
              colorClass="ws-green"
              icon="fas fa-users"
              accentColor="#10b981"
            />
            <WelcomeStat
              value={welcomeStats.absent}
              label="Absent Today"
              colorClass="ws-red"
              icon="fas fa-user-minus"
              accentColor="#ef4444"
            />
            <WelcomeStat
              value={welcomeStats.late}
              label="Late Today"
              colorClass="ws-orange"
              icon="fas fa-clock"
              accentColor="#ff8c00"
            />
            <WelcomeStat
              value={welcomeStats.pendingLeaves}
              label="Leave Requests"
              colorClass="ws-gold"
              icon="fas fa-briefcase"
              accentColor="#7c3aed"
            />
            <WelcomeStat
              value={welcomeStats.departments}
              label="Departments"
              colorClass="ws-blue"
              icon="fas fa-building"
              accentColor="#0d47a1"
            />
          </div>
        </div>

        <div className="notif-strip">
          <div className="notif-strip-title">
            <i className="fas fa-bell" /> Alerts &amp; Notifications
          </div>
          <div className="notif-items">
            {notifications.map((chip, index) => (
              <div key={index} className={`notif-chip ${chip.cls}`}>
                <i className={`fas ${chip.icon}`} />
                {chip.text}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="notif-view-all"
            onClick={() => navigate(`${actionBasePath}/notifications`)}
          >
            <span>View All</span>
            <i className="fas fa-arrow-right" />
          </button>
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
            <div className="panel-title" style={{ marginBottom: "12px" }}>
              <i className="fas fa-chart-bar" /> Monthly Attendance Trend — All
              Employees
            </div>
            <AttendanceTrendChart {...trendChartData} />
          </div>

          <div className="chart-panel">
            <div className="panel-title" style={{ marginBottom: "12px" }}>
              <i className="fas fa-chart-pie" /> Status Distribution
            </div>
            <StatusPieChart {...pieStats} />
          </div>
        </div>

        <div className="branch-panel">
          <div className="panel-title">
            <i className="fas fa-building" /> Branch Overview
          </div>

          {branchLeaderboard.length === 0 ? (
            <div className="empty-state">No data</div>
          ) : (
            branchLeaderboard.map((branch, index) => (
              <div key={branch.name} className="leaderboard-item">
                <div
                  className={`lb-rank ${["gold", "silver", "bronze"][index] || ""}`}
                >
                  {index + 1}
                </div>
                <div className="lb-name">
                  {branch.name}{" "}
                  <span style={{ color: "var(--muted)", fontSize: "0.65rem" }}>
                    ({branch.count} emp)
                  </span>
                </div>
                <div className="lb-bar-wrap">
                  <div className="lb-bar" style={{ width: `${branch.pct}%` }} />
                </div>
                <div className="lb-pct">{branch.pct}%</div>
              </div>
            ))
          )}
        </div>

        <div className="triple-row">
          <div className="panel">
            <div className="panel-title">
              <i className="fas fa-trophy" /> Top Performers (MTD)
            </div>

            {topPerformers.length === 0 ? (
              <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                No data
              </div>
            ) : (
              topPerformers.map((employee, index) => (
                <div key={employee.id} className="leaderboard-item">
                  <div
                    className={`lb-rank ${["gold", "silver", "bronze"][index] || ""}`}
                  >
                    {index + 1}
                  </div>
                  <div className="lb-name">{employee.full_name}</div>
                  <div className="lb-bar-wrap">
                    <div
                      className="lb-bar"
                      style={{
                        width: `${employee.stats.attPct}%`,
                        background:
                          employee.stats.attPct >= 90 ? "#16A34A" : "#FF8C00",
                      }}
                    />
                  </div>
                  <div className="lb-pct">{employee.stats.attPct}%</div>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-title">
              <i className="fas fa-umbrella-beach" /> Leave Requests
            </div>

            {leaveItems.length === 0 ? (
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
                  <span className="leave-badge lb-pending">Pending</span>
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-title">
              <i className="fas fa-triangle-exclamation" /> Attendance Alerts
            </div>

            {alerts.length === 0 ? (
              <div
                style={{
                  color: "var(--green)",
                  fontSize: "0.78rem",
                  padding: "8px 0",
                }}
              >
                <i className="fas fa-circle-check" /> No critical alerts today
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
              const stats = computeEmpStats(
                employee.id,
                year,
                monthNum,
                attendanceMap,
                holidaySet,
                todayStr
              );
              const { cls, ring } = attPctColor(stats.attPct);
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
                      attPct={stats.attPct}
                      ringColor={ring}
                    />
                    <div className="donut-pct">
                      <span className={`pct-num ${cls}`}>{stats.attPct}%</span>
                      <span className="pct-lbl">Att.</span>
                    </div>
                  </div>

                  <div className="emp-mini-stats">
                    <div className="mini-stat">
                      <div className="msv" style={{ color: "#16A34A" }}>
                        {stats.present}
                      </div>
                      <div className="msl">Present</div>
                    </div>
                    <div className="mini-stat">
                      <div className="msv" style={{ color: "#FF8C00" }}>
                        {stats.late}
                      </div>
                      <div className="msl">Late</div>
                    </div>
                    <div className="mini-stat">
                      <div className="msv" style={{ color: "#DC2626" }}>
                        {stats.absent}
                      </div>
                      <div className="msl">Absent</div>
                    </div>
                  </div>
                  </div>;
            })
          )}
        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />
    </>
  );
}

export default AdminDashboard;
