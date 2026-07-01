import { Chart } from "chart.js/auto";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAttendanceAnalysisIndividual,
  fetchAttendanceAnalysisSummary,
  fetchManagerEmployees,
  fetchManagerLeaves,
} from "../../services/managerApi";
import {
  calculateLeaveSalaryImpact,
  formatLeaveNumber,
  getLeaveDays,
  getLeavePaidDays,
  getLeaveUnpaidDays,
  normalizeAttendanceAnalysisRecords,
} from "../../utils/attendanceAnalysisHelpers";
import { CALENDAR_STATUS_COLORS } from "../../utils/calendarStatusColors";
import { isGraceLateAttendanceRecord } from "../../utils/dashboardHelpers";
import {
  formatProductionHours,
  formatTime12Hour,
} from "../../utils/timeFormat";
import "./ManagerAttendanceAnalysis.css";

function getChart() {
  return Promise.resolve(Chart);
}

// ─── Chart.js lazy import ───────────────────────────────────────────────────
// ─── Pure helpers (unchanged) ────────────────────────────────────────────────
function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateReadable(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[m - 1]} ${d}`;
}

function dayName(dateStr) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days[new Date(y, m - 1, d).getDay()];
}

function formatTimeDisplay(t) {
  return formatTime12Hour(t);
}

function getWeekNumber(dateStr) {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  return Math.ceil((d + (first.getDay() === 0 ? 6 : first.getDay() - 1)) / 7);
}

// ─── Status helpers ──────────────────────────────────────────────────────────
function isPaidLeaveRecord(r = {}) {
  const safe = r || {};
  const status = String(safe.status || safe.day_status || "").toLowerCase();
  const leaveType = String(safe.leave_type || safe.leaveType || safe.leave_category || safe.leaveCategory || "").toLowerCase();
  return (
    safe.is_paid_leave === true ||
    safe.isPaidLeave === true ||
    status === "paid_leave" ||
    leaveType === "paid" ||
    Number(safe.paid_days || safe.paidDays || 0) > 0
  );
}

function isUnpaidLeaveRecord(r = {}) {
  const safe = r || {};
  const status = String(safe.status || safe.day_status || "").toLowerCase();
  const leaveType = String(safe.leave_type || safe.leaveType || safe.leave_category || safe.leaveCategory || "").toLowerCase();
  return (
    safe.is_paid_leave === false ||
    safe.isPaidLeave === false ||
    status === "unpaid_leave" ||
    leaveType === "unpaid" ||
    Number(safe.unpaid_days || safe.unpaidDays || 0) > 0
  );
}

function statusLabel(r) {
  const safe = r || { status: "absent", lateMinutes: 0 };
  if (isPaidLeaveRecord(safe)) return "Paid Leave";
  if (isUnpaidLeaveRecord(safe)) return "Unpaid Leave";
  if (safe.status === "absent") return "Absent";
  if (safe.status === "half_day") return "Half Day";
  if (safe.status === "sunday") return "Sunday";
  if (safe.status === "holiday") return "Holiday";
  if (isGraceLateAttendanceRecord(safe)) return "Late";
  return "Present";
}
function statusBadgeClass(r) {
  const safe = r || { status: "absent", lateMinutes: 0 };
  if (isPaidLeaveRecord(safe)) return "b-paid-leave";
  if (isUnpaidLeaveRecord(safe)) return "b-unpaid-leave";
  if (safe.status === "absent") return "b-absent";
  if (safe.status === "half_day") return "b-halfday";
  if (isGraceLateAttendanceRecord(safe)) return "b-late";
  return "b-present";
}
function heatmapColor(r) {
  if (!r) return CALENDAR_STATUS_COLORS.no_record.background;

  if (isPaidLeaveRecord(r)) return CALENDAR_STATUS_COLORS.paid_leave.background;
  if (isUnpaidLeaveRecord(r)) return CALENDAR_STATUS_COLORS.unpaid_leave.background;
  if (r.status === "sunday" || r.status === "holiday") return CALENDAR_STATUS_COLORS.holiday.background;
  if (r.status === "absent") return CALENDAR_STATUS_COLORS.absent.background;
  if (r.status === "half_day") return CALENDAR_STATUS_COLORS.half_day.background;
  if (isGraceLateAttendanceRecord(r)) return CALENDAR_STATUS_COLORS.late.background;

  return CALENDAR_STATUS_COLORS.present.background;
}

export default function ManagerAttendanceAnalysis() {
  const today = useMemo(() => new Date(), []);
  const currentMonthStr = useMemo(
    () => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
    [today]
  );

  const [monthStr, setMonthStr] = useState(currentMonthStr);
  const [employees, setEmployees] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState("all");
  const [summary, setSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dailyWeekFilter, setDailyWeekFilter] = useState("all");
  const [breakWeekFilter, setBreakWeekFilter] = useState("all");

  const branch = localStorage.getItem("branch") || "Hyderabad";
  const managerName = localStorage.getItem("full_name") || "Manager";

  const cacheRef = useRef({});
  const monthNavTimeoutRef = useRef(null);
  const chartInstances = useRef({});

  const checkinChartRef = useRef(null);
  const breakBarChartRef = useRef(null);
  const weekHoursChartRef = useRef(null);
  const weekBreakChartRef = useRef(null);
  const breakPieChartRef = useRef(null);
  const breakTrendChartRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  // ── Destroy a specific chart instance ──────────────────────────────────────
  const destroyChart = useCallback((key) => {
    if (chartInstances.current[key]) {
      try { chartInstances.current[key].destroy(); } catch (_) {}
      delete chartInstances.current[key];
    }
  }, []);

  // ── Cleanup all charts on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      Object.keys(chartInstances.current).forEach(destroyChart);
    };
  }, [destroyChart]);

  // ─── Load employees ─────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    try {
      const data = await fetchManagerEmployees();
      const filtered = data
        .filter((e) => e.role !== "SUPER_ADMIN")
        .map((e) => ({
          id: e.id,
          name: e.full_name,
          dept: e.department,
          branch: e.branch,
          initials: getInitials(e.full_name || "EM"),
          salary: e.salary,
          monthly_salary: e.monthly_salary,
          daily_salary: e.daily_salary,
          paid_leave_balance: e.paid_leave_balance,
          paidLeaveBalance: e.paidLeaveBalance,
          leave_balance: e.leave_balance,
          leaveBalance: e.leaveBalance,
          available_paid_leaves: e.available_paid_leaves,
          availablePaidLeaves: e.availablePaidLeaves,
          earned_leave_balance: e.earned_leave_balance,
          earnedLeaveBalance: e.earnedLeaveBalance,
        }));
      setEmployees(filtered);
    } catch (err) {
      showToast("Error loading employees: " + err.message);
    }
  }, [showToast]);

  // ─── Load branch summary ────────────────────────────────────────────────────
  // BUG FIX: accept month/branch as params so callers can pass fresh values
  // instead of relying on stale closure values after state updates.
  const loadBranchSummary = useCallback(
    async (month = monthStr, br = branch) => {
      setSummaryLoading(true);
      try {
        const cacheKey = `summary|${month}|${br}`;
        let data = cacheRef.current[cacheKey];
        if (!data) {
          data = await fetchAttendanceAnalysisSummary(month, br);
          cacheRef.current[cacheKey] = data;
        }
        setSummary(data);
      } catch (err) {
        showToast("Failed to load summary: " + err.message);
      } finally {
        setSummaryLoading(false);
      }
    },
    [monthStr, branch, showToast]
  );

  // ─── Load individual employee ───────────────────────────────────────────────
  // BUG FIX: accept month as explicit param to avoid stale closure after month change.
  const loadIndividual = useCallback(
    async (empId, month = monthStr) => {
      setLoading(true);
      try {
        const cacheKey = `individual|${empId}|${month}`;
        let data = cacheRef.current[cacheKey];
        if (!data) {
          data = await fetchAttendanceAnalysisIndividual(empId, month);
          cacheRef.current[cacheKey] = data;
        }
        // The API (analysisRoutes.js) already returns camelCase field names:
        // checkIn, checkOut, workHours, breaks, breakMins, breakDetails, lateMinutes, status
        // No transformation needed — just set directly.
        setRecords(normalizeAttendanceAnalysisRecords(data.records || []));

        const leavesData = await fetchManagerLeaves("all");
        const empLeaves = leavesData.filter(
          (l) => l.user_id == empId && l.status === "approved"
        );
        setLeaves(empLeaves);
      } catch (err) {
        showToast("Failed to load data: " + err.message);
      } finally {
        setLoading(false);
      }
    },
    [monthStr, showToast]
  );

  // ─── Month change handler ────────────────────────────────────────────────────
  // BUG FIX: pass newMonth explicitly to load functions so they use the fresh
  // value instead of stale monthStr from the closure.
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    if (monthNavTimeoutRef.current) clearTimeout(monthNavTimeoutRef.current);
    monthNavTimeoutRef.current = setTimeout(() => {
      setMonthStr(newMonth);
      cacheRef.current = {};
      if (selectedEmail === "all") {
        loadBranchSummary(newMonth);
      } else if (selectedEmail) {
        loadIndividual(selectedEmail, newMonth);
      }
    }, 200);
  };

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setSelectedEmail(empId);
    setWeekOffset(0);
    if (empId === "all") {
      loadBranchSummary();
    } else {
      loadIndividual(empId);
    }
  };

  const handleLoadData = () => {
    if (selectedEmail === "all") {
      loadBranchSummary();
    } else if (selectedEmail) {
      loadIndividual(selectedEmail);
    }
  };

  // ─── Export CSV ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (selectedEmail === "all") {
      if (!summary) return;
      const headers = ["Employee","Department","Present","Late","Absent","Avg Break (min)","Exceeded 60m"];
      const rows = [headers];
      summary.employees.forEach((e) => {
        rows.push([
          `"${e.full_name.replace(/,/g, ";")}"`,
          `"${e.department.replace(/,/g, ";")}"`,
          e.present_days, e.late_days, e.absent_days, e.avg_break_mins, e.break_exceeded_days,
        ]);
      });
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employee_summary_${branch}_${monthStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${branch} branch summary`);
    } else {
      if (!records.length) { showToast("No data to export"); return; }
      const headers = ["Date","Day","Status","Check In","Check Out","Hours","Late Minutes","Break Minutes"];
      const rows = [headers];
      records.forEach((r) => {
        rows.push([r.date, dayName(r.date), r.status, formatTimeDisplay(r.checkIn), formatTimeDisplay(r.checkOut),
          formatProductionHours(r.workHours), r.lateMinutes, r.breaks]);
      });
      const csv = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_${monthStr}_full.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Exported full month records");
    }
  };

  // ─── Derived data ────────────────────────────────────────────────────────────
  const weeksCache = useMemo(() => {
    if (!records.length) return [];
    const [y, m] = monthStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const weeks = [];
    let startDay = 1;
    while (startDay <= lastDay) {
      weeks.push({
        start: new Date(y, m - 1, startDay),
        end: new Date(y, m - 1, Math.min(startDay + 6, lastDay)),
      });
      startDay += 7;
    }
    return weeks;
  }, [records, monthStr]);

  const recordMap = useMemo(() => {
    const map = {};
    for (const r of records) map[r.date] = r;
    return map;
  }, [records]);

  const overviewKpi = useMemo(() => {
    if (!records.length) return null;
    const workDays = records.filter((r) => !["absent","sunday","holiday"].includes(r.status));
    const presentDays = records.filter((r) => r.status === "full_day").length;
    const lateDays = records.filter(isGraceLateAttendanceRecord).length;
    const halfDays = records.filter((r) => r.status === "half_day").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const totalDays = records.filter((r) => !["sunday","holiday"].includes(r.status)).length;
    const attRate = totalDays ? Math.round(((presentDays + halfDays) / totalDays) * 100) : 0;
    const avgBreak = workDays.length
      ? Math.round(workDays.reduce((s, r) => s + r.breaks, 0) / workDays.length) : 0;
    const exceed = workDays.filter((r) => r.breaks > 60).length;
    return { attRate, presentDays, lateDays, halfDays, absent, avgBreak, exceed };
  }, [records]);

  const breakSummaryKpi = useMemo(() => {
    if (!records.length) return null;
    const workFiltered = records.filter((r) => !["absent","sunday","holiday"].includes(r.status));
    let sumB1 = 0, sumL = 0, sumB2 = 0, sumB3 = 0;
    workFiltered.forEach((r) => {
      sumB1 += r.breakMins?.b1 || 0;
      sumL  += r.breakMins?.lunch || 0;
      sumB2 += r.breakMins?.b2 || 0;
      sumB3 += r.breakMins?.b3 || 0;
    });
    const totalBreak = sumB1 + sumL + sumB2 + sumB3;
    const avg = workFiltered.length ? Math.round(totalBreak / workFiltered.length) : 0;
    const exceed = workFiltered.filter((r) => r.breaks > 60).length;
    return { avg, exceed, sumB1, sumL, sumB2, sumB3 };
  }, [records]);

  const filteredDailyLog = useMemo(
    () => records.filter((r) => dailyWeekFilter === "all" || getWeekNumber(r.date) == dailyWeekFilter),
    [records, dailyWeekFilter]
  );

  const filteredBreakDetail = useMemo(
    () => records.filter((r) => breakWeekFilter === "all" || getWeekNumber(r.date) == breakWeekFilter),
    [records, breakWeekFilter]
  );

  // ─── Current week records for weekly tab ────────────────────────────────────
  const currentWeekRecords = useMemo(() => {
    if (!weeksCache.length || weekOffset >= weeksCache.length) return [];
    const week = weeksCache[weekOffset];
    const startStr = week.start.toISOString().slice(0, 10);
    const endStr = week.end.toISOString().slice(0, 10);
    return records.filter((r) => r.date >= startStr && r.date <= endStr);
  }, [records, weeksCache, weekOffset]);

  // ─── Calendar grid data ──────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    if (!monthStr) return [];
    const [y, m] = monthStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const days = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      days.push({ dateStr, record: recordMap[dateStr] || null });
    }
    return days;
  }, [monthStr, recordMap]);

  // ─── Chart.js: Check-In time distribution ───────────────────────────────────
  // BUG FIX: Chart instances now properly created and destroyed in useEffect.
  useEffect(() => {
    if (activeTab !== "overview" || !records.length || !checkinChartRef.current) return;
    let cancelled = false;
    getChart().then((ChartJS) => {
      if (cancelled || !checkinChartRef.current) return;
      destroyChart("checkin");
      const hourBuckets = Array(24).fill(0);
      records.forEach((r) => {
        if (r.checkIn && r.checkIn !== "--") {
          const h = parseInt(r.checkIn.split(":")[0], 10);
          if (!isNaN(h)) hourBuckets[h]++;
        }
      });
      const labels = hourBuckets.map((_, i) => `${i}:00`).slice(7, 21);
      const data = hourBuckets.slice(7, 21);
      chartInstances.current["checkin"] = new ChartJS(checkinChartRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Check-ins",
            data,
            backgroundColor: data.map((_, i) =>
              i < 3
                ? CALENDAR_STATUS_COLORS.present.background
                : i < 5
                  ? CALENDAR_STATUS_COLORS.late.background
                  : CALENDAR_STATUS_COLORS.absent.background
            ),
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#64748B", font: { size: 10 } }, grid: { color: "#E5E7EB" } },
            y: { ticks: { color: "#64748B", font: { size: 10 } }, grid: { color: "#E5E7EB" } },
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, [activeTab, records, destroyChart]);

  // ─── Chart.js: Daily break duration bar chart ───────────────────────────────
  useEffect(() => {
    if (activeTab !== "overview" || !records.length || !breakBarChartRef.current) return;
    let cancelled = false;
    getChart().then((ChartJS) => {
      if (cancelled || !breakBarChartRef.current) return;
      destroyChart("breakBar");
      const workDays = records.filter((r) => !["absent","sunday","holiday"].includes(r.status));
      const labels = workDays.map((r) => formatDateReadable(r.date));
      const data = workDays.map((r) => r.breaks);
      chartInstances.current["breakBar"] = new ChartJS(breakBarChartRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "Break (min)",
            data,
            backgroundColor: data.map((v) =>
              v > 60 ? CALENDAR_STATUS_COLORS.absent.background : CALENDAR_STATUS_COLORS.present.background
            ),
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: "#64748B", font: { size: 9 }, maxRotation: 45 }, grid: { color: "#E5E7EB" } },
            y: { ticks: { color: "#64748B", font: { size: 10 } }, grid: { color: "#E5E7EB" } },
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, [activeTab, records, destroyChart]);

  // ─── Chart.js: Weekly hours and breaks charts ───────────────────────────────
  useEffect(() => {
    if (activeTab !== "weekly" || !currentWeekRecords.length) return;
    let cancelled = false;
    getChart().then((ChartJS) => {
      if (cancelled) return;
      const workDays = currentWeekRecords.filter(
        (r) => !["absent","sunday","holiday"].includes(r.status)
      );
      const labels = workDays.map((r) => `${dayName(r.date)} ${formatDateReadable(r.date)}`);

      if (weekHoursChartRef.current) {
        destroyChart("weekHours");
        chartInstances.current["weekHours"] = new ChartJS(weekHoursChartRef.current, {
          type: "line",
          data: {
            labels,
            datasets: [{
              label: "Work Hours",
              data: workDays.map((r) => Number(r.workHours || 0)),
              borderColor: CALENDAR_STATUS_COLORS.late.border,
              backgroundColor: CALENDAR_STATUS_COLORS.late.background,
              borderWidth: 2,
              tension: 0.3,
              fill: true,
              pointBackgroundColor: CALENDAR_STATUS_COLORS.late.border,
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { labels: { color: "#64748B" } },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    `Work Hours: ${formatProductionHours(ctx.parsed.y)}`,
                },
              },
            },
            scales: {
              x: { ticks: { color: "#64748B", font: { size: 9 } }, grid: { color: "#E5E7EB" } },
              y: { ticks: { color: "#64748B" }, grid: { color: "#E5E7EB" }, min: 0, max: 10 },
            },
          },
        });
      }

      if (weekBreakChartRef.current) {
        destroyChart("weekBreak");
        chartInstances.current["weekBreak"] = new ChartJS(weekBreakChartRef.current, {
          type: "bar",
          data: {
            labels,
            datasets: [{
              label: "Break (min)",
              data: workDays.map((r) => r.breaks),
              backgroundColor: workDays.map((r) =>
                r.breaks > 60 ? CALENDAR_STATUS_COLORS.absent.background : CALENDAR_STATUS_COLORS.present.background
              ),
              borderRadius: 4,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#64748B", font: { size: 9 } }, grid: { color: "#E5E7EB" } },
              y: { ticks: { color: "#64748B" }, grid: { color: "#E5E7EB" } },
            },
          },
        });
      }
    });
    return () => { cancelled = true; };
  }, [activeTab, currentWeekRecords, destroyChart]);

  // ─── Chart.js: Break pie and trend charts ───────────────────────────────────
  useEffect(() => {
    if (activeTab !== "breakanalytics" || !breakSummaryKpi || !records.length) return;
    let cancelled = false;
    getChart().then((ChartJS) => {
      if (cancelled) return;
      if (breakPieChartRef.current) {
        destroyChart("breakPie");
        chartInstances.current["breakPie"] = new ChartJS(breakPieChartRef.current, {
          type: "doughnut",
          data: {
            labels: ["Break 1","Lunch","Break 2","Break 3"],
            datasets: [{
              data: [
                breakSummaryKpi.sumB1,
                breakSummaryKpi.sumL,
                breakSummaryKpi.sumB2,
                breakSummaryKpi.sumB3,
              ],
              backgroundColor: [
                CALENDAR_STATUS_COLORS.late.background,
                CALENDAR_STATUS_COLORS.present.background,
                CALENDAR_STATUS_COLORS.holiday.background,
                CALENDAR_STATUS_COLORS.paid_leave.background,
              ],
              borderWidth: 0,
            }],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { labels: { color: "#64748B" }, position: "bottom" },
            },
          },
        });
      }

      if (breakTrendChartRef.current) {
        destroyChart("breakTrend");
        const workDays = records.filter((r) => !["absent","sunday","holiday"].includes(r.status));
        chartInstances.current["breakTrend"] = new ChartJS(breakTrendChartRef.current, {
          type: "line",
          data: {
            labels: workDays.map((r) => formatDateReadable(r.date)),
            datasets: [{
              label: "Total break (min)",
              data: workDays.map((r) => r.breaks),
              borderColor: CALENDAR_STATUS_COLORS.late.border,
              backgroundColor: CALENDAR_STATUS_COLORS.late.background,
              borderWidth: 2,
              tension: 0.3,
              fill: true,
              pointRadius: 2,
            }, {
              label: "60 min limit",
              data: workDays.map(() => 60),
              borderColor: CALENDAR_STATUS_COLORS.absent.border,
              borderDash: [6, 3],
              borderWidth: 1,
              pointRadius: 0,
            }],
          },
          options: {
            responsive: true,
            plugins: { legend: { labels: { color: "#64748B" } } },
            scales: {
              x: { ticks: { color: "#64748B", font: { size: 9 }, maxRotation: 45 }, grid: { color: "#E5E7EB" } },
              y: { ticks: { color: "#64748B" }, grid: { color: "#E5E7EB" } },
            },
          },
        });
      }
    });
    return () => { cancelled = true; };
  }, [activeTab, breakSummaryKpi, records, destroyChart]);

  // ─── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (selectedEmail === "all") loadBranchSummary();
  }, [selectedEmail, loadBranchSummary]);

  useEffect(() => {
    if (selectedEmail !== "all" && selectedEmail) {
      loadIndividual(selectedEmail, monthStr);
    }
  }, [monthStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id == selectedEmail),
    [employees, selectedEmail]
  );

  const leaveSalaryKpi = useMemo(() => {
    return calculateLeaveSalaryImpact(leaves, selectedEmployee);
  }, [leaves, selectedEmployee]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="main-panel manager-portal-page manager-analysis-page">
        {/* Header */}
        <div className="exec-header">
          <div className="emp-profile">
            <div className="avatar-sm">{getInitials(managerName)}</div>
            <div>
              <strong>{managerName}</strong>
              <span className="online-dot"></span>
              <br />
              <span style={{ fontSize: "11px" }}>Branch Manager · Live</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", marginRight: "16px" }}>
            <div className="branch-pill">
              <i className="fas fa-building"></i> <span>{branch} Branch</span>
            </div>
          </div>
          <div className="header-actions">
            <div>
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search employee..."
                style={{ background: "#F5F7FA", border: "none", borderRadius: "40px", padding: "6px 14px", color: "white" }}
              />
            </div>
            <div className="icon-btn"><i className="fas fa-bell"></i></div>
            <div className="export-btn" onClick={handleExport}>
              <i className="fas fa-download"></i> Export
            </div>
          </div>
        </div>

        {/* Page title */}
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(135deg,#FFF4E5,#FF8C00)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Manager Attendance Analysis
          </h1>
          <p style={{ color: "#64748B", fontSize: "13px", marginTop: "4px" }}>
            Your branch only — {branch} Branch
          </p>
        </div>

        {/* Filters */}
        <div className="filter-card">
          <input type="month" id="monthPicker" value={monthStr} onChange={handleMonthChange} />
          <div className="filter-group">
            <label>Employee</label>
            <select value={selectedEmail} onChange={handleEmployeeChange}>
              <option value="all">📊 All Employees (Branch Summary)</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} · {e.dept}</option>
              ))}
            </select>
          </div>
          <button className="load-btn" onClick={handleLoadData}>
            <i className="fas fa-chart-simple"></i> Load Data
          </button>
        </div>

        {/* ═══ BRANCH VIEW ═══ */}
        {selectedEmail === "all" ? (
          <div id="branchView">
            <div className="kpi-grid">
              {summaryLoading ? (
                ["Employees","Total Present","Total Late","Break Exceeded"].map((label) => (
                  <div key={label} className="kpi-tile">
                    <div className="label">{label}</div>
                    <div style={{ height: "36px", background: "linear-gradient(90deg,#F5F7FA,#EAF4FF,#F5F7FA)", backgroundSize: "200%", animation: "shimmer 1.4s infinite", borderRadius: "8px", marginTop: "6px" }}></div>
                  </div>
                ))
              ) : summary ? (
                <>
                  <div className="kpi-tile"><div className="label">Employees</div><div className="value">{summary.employees.length}</div></div>
                  <div className="kpi-tile"><div className="label">Total Present</div><div className="value">{summary.kpi.total_present || 0}</div></div>
                  <div className="kpi-tile"><div className="label">Total Late</div><div className="value">{summary.kpi.total_late || 0}</div></div>
                  <div className="kpi-tile"><div className="label">Break Exceeded</div><div className="value">{summary.kpi.total_exceeded || 0}</div></div>
                </>
              ) : null}
            </div>
            <div className="card">
              <div className="card-title">Employee Summary — {monthStr}</div>
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Employee</th><th>Dept</th><th>Present</th><th>Late</th><th>Absent</th><th>Avg Break</th><th>Exceeded 60m</th></tr>
                  </thead>
                  <tbody>
                    {summaryLoading
                      ? Array(5).fill(null).map((_, i) => (
                          <tr key={i}>{Array(7).fill(null).map((_, j) => (
                            <td key={j}><div style={{ height: "14px", background: "#EAF4FF", borderRadius: "6px" }}></div></td>
                          ))}</tr>
                        ))
                      : summary && summary.employees.length
                        ? summary.employees.map((e) => (
                            <tr key={e.user_id}>
                              <td><strong>{e.full_name}</strong><br /><span style={{ fontSize: "10px" }}>{e.department}</span></td>
                              <td>{e.department}</td>
                              <td style={{ color: "#16A34A" }}>{e.present_days}</td>
                              <td style={{ color: "#FF8C00" }}>{e.late_days}</td>
                              <td style={{ color: "#DC2626" }}>{e.absent_days}</td>
                              <td>{e.avg_break_mins}m</td>
                              <td>{e.break_exceeded_days}</td>
                            </tr>
                          ))
                        : <tr><td colSpan="7" style={{ color: "#64748B", textAlign: "center" }}>No data</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ═══ INDIVIDUAL VIEW ═══ */
          <div id="individualView">
            {/* Hero strip */}
            <div className="hero-strip show">
              <div className="hero-avatar">{selectedEmployee?.initials || "EM"}</div>
              <div className="hero-info">
                <h2>{selectedEmployee?.name || "Employee"}</h2>
                <p>{selectedEmployee?.dept || "Department"} · {selectedEmployee?.branch || branch}</p>
              </div>
              <div className="hero-meta">
                {[
                  { val: overviewKpi ? (overviewKpi.presentDays + overviewKpi.halfDays) : "—", lbl: "Present" },
                  { val: overviewKpi?.lateDays ?? "—", lbl: "Late In" },
                  { val: overviewKpi?.absent ?? "—", lbl: "Absent" },
                  { val: overviewKpi ? `${overviewKpi.avgBreak}m` : "—", lbl: "Avg Break" },
                  { val: overviewKpi ? `${overviewKpi.attRate}%` : "—", lbl: "Att. Rate" },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="hero-meta-item">
                    <div className="val">{val}</div>
                    <div className="lbl">{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs-row">
              {[
                ["overview", "📅 Monthly Overview"],
                ["weekly", "📆 Weekly Deep Dive"],
                ["dailylog", "📋 Day Log"],
                ["breakanalytics", "☕ Break Analytics"],
                ["leavesalary", "🌿 Leave & Salary"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={`tab-btn ${activeTab === id ? "active" : ""}`}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab: Overview ── */}
            {activeTab === "overview" && (
              <div className="tab-pane active">
                {overviewKpi && (
                  <div className="kpi-grid">
                    <div className="kpi-tile"><div className="label">Attendance Rate</div><div className="value">{overviewKpi.attRate}%</div></div>
                    <div className="kpi-tile"><div className="label">Present Days</div><div className="value">{overviewKpi.presentDays}</div></div>
                    <div className="kpi-tile"><div className="label">Late Arrivals</div><div className="value">{overviewKpi.lateDays}</div></div>
                    <div className="kpi-tile"><div className="label">Break Exceeded</div><div className="value">{overviewKpi.exceed}</div></div>
                  </div>
                )}
                <div className="chart-row">
                  <div className="card" style={{ maxHeight: "320px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#FF8C00", marginBottom: "12px", paddingLeft: "4px" }}>
                      Check-In Time (Hour of Day)
                    </div>
                    <canvas ref={checkinChartRef}></canvas>
                  </div>
                  <div className="card" style={{ maxHeight: "320px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#FF8C00", marginBottom: "12px", paddingLeft: "4px" }}>
                      Daily Break Duration (min)
                    </div>
                    <canvas ref={breakBarChartRef}></canvas>
                  </div>
                </div>

                {/* ── Calendar Heatmap (BUG FIX: was empty placeholder comment) ── */}
                <div className="card">
                  <div className="card-title">Attendance Heatmap</div>
                  <div className="cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                      <div key={d} style={{ textAlign: "center", fontSize: "10px", color: "#7B8199", paddingBottom: "4px" }}>{d}</div>
                    ))}
                    {/* Offset the first day */}
                    {(() => {
                      if (!calendarDays.length) return null;
                    const firstDate = new Date(calendarDays[0].dateStr);
const offset = firstDate.getDay(); // Sunday = 0

return Array(offset)
  .fill(null)
  .map((_, i) => <div key={`off-${i}`} />);
                   
                   })()}
                  


                {calendarDays.map(({ dateStr, record }) => {
  const r = record || {
    date: dateStr,
    status: "absent",
    checkIn: "--",
    checkOut: "--",
    lateMinutes: 0,
    workHours: 0,
    breaks: 0,
    breakMins: { b1: 0, lunch: 0, b2: 0, b3: 0 },
    breakDetails: {
      b1: { in: "—", out: "—" },
      lunch: { in: "—", out: "—" },
      b2: { in: "—", out: "—" },
      b3: { in: "—", out: "—" },
    },
  };

  let className = "cal-day";
  let numClass = "default-num";

const isSunday = new Date(dateStr).getDay() === 0;

if (isSunday || r.status === "sunday") {
  className += " cal-sunday";
  numClass = "blue-num";
} else if (r.status === "holiday") {
  className += " cal-holiday";
} else if (isPaidLeaveRecord(r)) {
  className += " cal-paid-leave paid-leave";
  numClass = "white-num";
} else if (isUnpaidLeaveRecord(r)) {
  className += " cal-unpaid-leave unpaid-leave";
} else if (r.status === "absent") {
    className += " cal-absent";
    numClass = "red-num";
} else if (r.status === "half_day") {
    className += " cal-halfday";
    numClass = "yellow-num";
} else if (isGraceLateAttendanceRecord(r)) {
    className += " cal-late";
    numClass = "orange-num";
  } else {
    className += " cal-present";
    numClass = "green-num";
  }

  return (
    <div key={dateStr} className={className}>
      <div className={`day-num ${numClass}`}>
        {new Date(dateStr).getDate()}
      </div>

      <div className="cal-tooltip-custom">
        <strong>{formatDateReadable(dateStr)} ({dayName(dateStr)})</strong>
        <br />
        Status: {statusLabel(r)}
        <hr />
        Login: {r.checkIn !== "--" ? formatTimeDisplay(r.checkIn) : "—"}
        <br />
        Logout: {r.checkOut !== "--" ? formatTimeDisplay(r.checkOut) : "—"}
        <br />
        Production: {formatProductionHours(r.workHours)}
        <br />
        Total Break: {r.breaks || 0} min
        <hr />
        Break 1: {r.breakDetails?.b1?.in || "—"} → {r.breakDetails?.b1?.out || "—"}
        <br />
        Lunch: {r.breakDetails?.lunch?.in || "—"} → {r.breakDetails?.lunch?.out || "—"}
        <br />
        Break 2: {r.breakDetails?.b2?.in || "—"} → {r.breakDetails?.b2?.out || "—"}
        <br />
        Break 3: {r.breakDetails?.b3?.in || "—"} → {r.breakDetails?.b3?.out || "—"}
      </div>
    </div>
  );
})}
</div>
                  {/* Legend */}
                  <div style={{ display: "flex", gap: "16px", marginTop: "12px", flexWrap: "wrap", fontSize: "11px", color: "#7B8199" }}>
                    {[
                      [CALENDAR_STATUS_COLORS.present.background, "Present"],
                      [CALENDAR_STATUS_COLORS.late.background, "Late"],
                      [CALENDAR_STATUS_COLORS.half_day.background, "Half Day"],
                      [CALENDAR_STATUS_COLORS.absent.background, "Absent"],
                      [CALENDAR_STATUS_COLORS.holiday.background, "Holiday/Sun"],
                      [CALENDAR_STATUS_COLORS.paid_leave.background, "Paid Leave"],
                      [CALENDAR_STATUS_COLORS.unpaid_leave.background, "Unpaid Leave"],
                    ].map(([c, l]) => (
                      <span key={l} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: c, display: "inline-block" }}></span>{l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Weekly Deep Dive (BUG FIX: was empty placeholder) ── */}
            {activeTab === "weekly" && (
              <div className="tab-pane active">
                <div className="card">
                  <div className="card-title">
                    Week Overview
                    <div className="week-nav" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <button className="load-btn" style={{ padding: "4px 12px" }}
                        onClick={() => setWeekOffset((p) => Math.max(0, p - 1))}
                        disabled={weekOffset === 0}>←</button>
                      <span>
                        {weeksCache[weekOffset]
                          ? `${weeksCache[weekOffset].start.getDate()}/${weeksCache[weekOffset].start.getMonth() + 1} – ${weeksCache[weekOffset].end.getDate()}/${weeksCache[weekOffset].end.getMonth() + 1}`
                          : "Week 1"}
                      </span>
                      <button className="load-btn" style={{ padding: "4px 12px" }}
                        onClick={() => setWeekOffset((p) => Math.min(p + 1, weeksCache.length - 1))}
                        disabled={weekOffset >= weeksCache.length - 1}>→</button>
                    </div>
                  </div>

                  {/* Week day cards */}
                  <div className="week-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                    {currentWeekRecords.map((r) => {
                      const st = statusLabel(r);
                      const isWork = !["absent","sunday","holiday"].includes(r.status);
                      return (
                        <div key={r.date} style={{
                          background: "#F5F7FA", borderRadius: "12px", padding: "12px",
                          border: isGraceLateAttendanceRecord(r) ? "1px solid #FF8C0044" : isWork ? "1px solid #16A34A22" : "1px solid #EAF4FF",
                        }}>
                          <div style={{ fontSize: "11px", color: "#7B8199" }}>{dayName(r.date)}</div>
                          <div style={{ fontSize: "13px", color: "#FF8C00", fontWeight: 700 }}>{formatDateReadable(r.date)}</div>
                          <div style={{ marginTop: "8px" }}>
                            <span className={`badge ${statusBadgeClass(r)}`}>{st}</span>
                          </div>
                          {isWork && (
                            <>
                              <div style={{ fontSize: "11px", color: "#64748B", marginTop: "8px" }}>
                                {r.checkIn !== "--" ? `In: ${formatTimeDisplay(r.checkIn)}` : "No check-in"}
                              </div>
                              <div style={{ fontSize: "11px", color: "#64748B" }}>
                                {r.checkOut !== "--" ? `Out: ${formatTimeDisplay(r.checkOut)}` : "No check-out"}
                              </div>
                              <div style={{ fontSize: "12px", fontWeight: 700, marginTop: "4px" }}>
                                {r.workHours > 0 ? formatProductionHours(r.workHours) : "--"}
                                {r.breaks > 0 && (
                                  <span style={{ fontSize: "10px", color: r.breaks > 60 ? "#DC2626" : "#16A34A", marginLeft: "6px" }}>
                                    {r.breaks}m break
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    {currentWeekRecords.length === 0 && (
                      <div style={{ color: "#64748B", fontSize: "13px", gridColumn: "1/-1", padding: "12px" }}>
                        No data for this week
                      </div>
                    )}
                  </div>

                  <div className="chart-row">
                    <div className="card">
                      <div style={{ fontSize: "12px", color: "#FF8C00", marginBottom: "8px" }}>Work Hours This Week</div>
                      <canvas ref={weekHoursChartRef}></canvas>
                    </div>
                    <div className="card">
                      <div style={{ fontSize: "12px", color: "#FF8C00", marginBottom: "8px" }}>Break Minutes This Week</div>
                      <canvas ref={weekBreakChartRef}></canvas>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Daily Log ── */}
            {activeTab === "dailylog" && (
              <div className="tab-pane active">
                <div className="card">
                  <div className="card-title">
                    Complete Day Log
                    <div className="week-filter">
                      {["all","1","2","3","4","5"].map((w) => (
                        <button key={w} className={dailyWeekFilter === w ? "active" : ""}
                          onClick={() => setDailyWeekFilter(w)}>
                          {w === "all" ? "All" : `Week${w}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Date</th><th>Day</th><th>Status</th><th>Login</th><th>Logout</th><th>Hours</th><th>Late</th><th>Break (min)</th></tr>
                      </thead>
                      <tbody>
                        {filteredDailyLog.map((r) => (
                          <tr key={r.date}>
                            <td style={{ color: "#FF8C00" }}>{formatDateReadable(r.date)}</td>
                            <td style={{ color: "#64748B" }}>{dayName(r.date)}</td>
                            <td><span className={`badge ${statusBadgeClass(r)}`}>{statusLabel(r)}</span></td>
                            <td>{r.checkIn !== "--" ? formatTimeDisplay(r.checkIn) : "--"}</td>
                            <td>{r.checkOut !== "--" ? formatTimeDisplay(r.checkOut) : "--"}</td>
                            <td style={{ fontWeight: 700 }}>{r.workHours > 0 ? formatProductionHours(r.workHours) : "--"}</td>
                            <td style={{ color: r.lateMinutes > 0 ? "#FF8C00" : "#7B8199" }}>
                              {r.lateMinutes > 0 ? r.lateMinutes + " min" : "--"}
                            </td>
                            <td style={{ color: r.breaks > 60 ? "#DC2626" : "#16A34A" }}>
                              {r.breaks > 0 ? r.breaks : "--"}
                            </td>
                          </tr>
                        ))}
                        {filteredDailyLog.length === 0 && (
                          <tr><td colSpan="8" style={{ color: "#64748B", textAlign: "center" }}>No records</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Break Analytics ── */}
            {activeTab === "breakanalytics" && (
              <div className="tab-pane active">
                {breakSummaryKpi && (
                  <div className="kpi-grid">
                    <div className="kpi-tile"><div className="label">Avg Daily Break</div><div className="value">{breakSummaryKpi.avg}m</div></div>
                    <div className="kpi-tile"><div className="label">Days &gt;60m</div><div className="value" style={{ color: "#DC2626" }}>{breakSummaryKpi.exceed}</div></div>
                    <div className="kpi-tile"><div className="label">Break1 Total</div><div className="value">{breakSummaryKpi.sumB1}m</div></div>
                    <div className="kpi-tile"><div className="label">Lunch Total</div><div className="value">{breakSummaryKpi.sumL}m</div></div>
                    <div className="kpi-tile"><div className="label">Break2 Total</div><div className="value">{breakSummaryKpi.sumB2}m</div></div>
                    <div className="kpi-tile"><div className="label">Break3 Total</div><div className="value">{breakSummaryKpi.sumB3}m</div></div>
                  </div>
                )}
                <div className="chart-row">
                  <div className="card"><canvas ref={breakPieChartRef}></canvas></div>
                  <div className="card"><canvas ref={breakTrendChartRef}></canvas></div>
                </div>
                <div className="card">
                  <div className="card-title">
                    Detailed Break Log — Full Month
                    <div className="week-filter">
                      {["all","1","2","3","4","5"].map((w) => (
                        <button key={w} className={breakWeekFilter === w ? "active" : ""}
                          onClick={() => setBreakWeekFilter(w)}>
                          {w === "all" ? "All" : `Week${w}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th><th>Day</th>
                          <th>B1 In</th><th>B1 Out</th><th>B1 Dur</th>
                          <th>Lunch In</th><th>Lunch Out</th><th>Lunch Dur</th>
                          <th>B2 In</th><th>B2 Out</th><th>B2 Dur</th>
                          <th>B3 In</th><th>B3 Out</th><th>B3 Dur</th>
                          <th>Total</th><th>Remaining</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBreakDetail.map((r) => {
                          const remaining = Math.max(0, 60 - r.breaks);
                          const isAbsent = r.status === "absent";
                          const bCell = (v) => v && v !== "—" && v !== "--"
                            ? <span className="break-time-cell">{v}</span>
                            : <span style={{ color: "#3A3D55" }}>—</span>;
                          const dCell = (d) => d > 0
                            ? <span className="break-dur">{d}m</span>
                            : <span style={{ color: "#3A3D55" }}>0m</span>;
                          return (
                            <tr key={r.date}>
                              <td style={{ color: "#0D47A1", fontWeight: 600 }}>{formatDateReadable(r.date)}</td>
                              <td style={{ color: "#64748B" }}>{dayName(r.date)}</td>
                              <td>{bCell(r.breakDetails?.b1?.in)}</td>
                              <td>{bCell(r.breakDetails?.b1?.out)}</td>
                              <td>{dCell(r.breakMins?.b1 || 0)}</td>
                              <td>{bCell(r.breakDetails?.lunch?.in)}</td>
                              <td>{bCell(r.breakDetails?.lunch?.out)}</td>
                              <td>{dCell(r.breakMins?.lunch || 0)}</td>
                              <td>{bCell(r.breakDetails?.b2?.in)}</td>
                              <td>{bCell(r.breakDetails?.b2?.out)}</td>
                              <td>{dCell(r.breakMins?.b2 || 0)}</td>
                              <td>{bCell(r.breakDetails?.b3?.in)}</td>
                              <td>{bCell(r.breakDetails?.b3?.out)}</td>
                              <td>{dCell(r.breakMins?.b3 || 0)}</td>
                              <td style={{ fontWeight: 700, color: r.breaks > 60 ? "#DC2626" : "#334155" }}>{r.breaks || 0}m</td>
                              <td style={{ color: remaining <= 0 ? "#DC2626" : "#16A34A" }}>{remaining}m</td>
                              <td>
                                {isAbsent
                                  ? <span className="badge b-absent">Absent</span>
                                  : r.breaks > 60
                                    ? <span className="badge b-absent">Exceeded</span>
                                    : <span className="badge b-present">OK</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredBreakDetail.length === 0 && (
                          <tr><td colSpan="17" style={{ color: "#64748B", textAlign: "center" }}>No records</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Tab: Leave & Salary ── */}
            {activeTab === "leavesalary" && (
              <div className="tab-pane active">
                <div className="card">
                  <div className="card-title">Leave Balance & Salary Impact</div>
                  {leaveSalaryKpi && (
                    <div className="kpi-grid">
                      <div className="kpi-tile"><div className="label">Leaves Taken</div><div className="value">{formatLeaveNumber(leaveSalaryKpi.totalLeaves)}</div></div>
                      <div className="kpi-tile"><div className="label">Paid Leaves Left</div><div className="value">{formatLeaveNumber(leaveSalaryKpi.paidLeavesLeft)}</div></div>
                      <div className="kpi-tile"><div className="label">Extra Days</div><div className="value">{formatLeaveNumber(leaveSalaryKpi.extraDays)}</div></div>
                      <div className="kpi-tile"><div className="label">Salary Deduction</div><div className="value" style={{ fontSize: "22px" }}>₹{Math.round(leaveSalaryKpi.salaryDeduction).toLocaleString("en-IN")}</div></div>
                    </div>
                  )}
                 
                  <div style={{ marginTop: "24px" }}>
                    <div className="card-title">Approved Leaves</div>
                    <table className="data-table">
                      <thead>
                        <tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Paid Days</th><th>Unpaid Days</th><th>Reason</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {leaves.length
                          ? leaves.map((l) => (
                              <tr key={l.id}>
                                <td>{l?.leave_type || l?.leaveType || "—"}</td>
                                <td>{formatDateReadable(String(l?.from_date || "").slice(0, 10)) || "—"}</td>
                                <td>{formatDateReadable(String(l?.to_date || "").slice(0, 10)) || "—"}</td>
                                <td>{formatLeaveNumber(getLeaveDays(l))}</td>
                                <td>{formatLeaveNumber(getLeavePaidDays(l))}</td>
                                <td>{formatLeaveNumber(getLeaveUnpaidDays(l))}</td>
                                <td>{l?.reason || "—"}</td>
                                <td><span className="badge b-present">{l?.status || "approved"}</span></td>
                              </tr>
                            ))
                          : <tr><td colSpan="8" style={{ color: "#64748B", textAlign: "center" }}>No approved leaves</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}
