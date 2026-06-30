import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "../../components/Cards";
import AttendanceAnalysisFilters from "../../components/attendance-analysis/AttendanceAnalysisFilters";
import { useToast } from "../../hooks/useToast";
import BranchSummaryView from "../../components/attendance-analysis/BranchSummaryView";
import IndividualAnalysisView from "../../components/attendance-analysis/IndividualAnalysisView";
import {
  fetchAnalysisEmployees,
  fetchAnalysisIndividual,
  fetchAnalysisSummary,
  fetchAnalysisTrends,
  fetchEmployeeLeaves,
  invalidateAnalysisCache,
} from "../../services/attendanceAnalysisApi";
import {
  buildWeeksCache,
  downloadCSV,
  dayName,
  mapEmployeeOption,
  normalizeAttendanceAnalysisRecord,
  normalizeAttendanceAnalysisRecords,
} from "../../utils/attendanceAnalysisHelpers";
import { formatProductionHours } from "../../utils/timeFormat";
import { getStoredUser } from "../../utils/auth";
import "../../styles/adminAttendanceAnalysis.css";



function AdminAttendanceAnalysis() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const user = useMemo(() => getStoredUser(), []);
  const isOperationalManager = user?.role === "OPERATIONAL_MANAGER";
  const headerInitials = isOperationalManager ? "OM" : "SA";
  const headerName = isOperationalManager ? "Operational Manager" : "Super Admin";
  const headerSubtitle = isOperationalManager ? "Operations · Live" : "Chairman · Live";

  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [viewMode, setViewMode] = useState("branch");

  const [summaryKpi, setSummaryKpi] = useState(null);
  const [summaryEmployees, setSummaryEmployees] = useState([]);
  const [trends, setTrends] = useState([]);

  const [showTrends, setShowTrends] = useState(false);



  const [currentEmpId, setCurrentEmpId] = useState(null);
  const [currentRecords, setCurrentRecords] = useState([]);
  const [currentLeaves, setCurrentLeaves] = useState([]);
  const [weeksCache, setWeeksCache] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { toast, showToast } = useToast(3000);
  const [globalSearch, setGlobalSearch] = useState("");

  const abortRef = useRef(null);
  const searchTimerRef = useRef(null);
  const recordsCacheRef = useRef({});
  const monthChangeTimerRef = useRef(null);
  const fetchIdRef = useRef(0);

  const getSignal = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }, []);

  const loadEmployees = useCallback(
    async (branch = currentBranch) => {
      try {
        const signal = getSignal();
        const data = await fetchAnalysisEmployees(branch, signal);
        console.log(
          "Loaded users for attendance:",
          data.map((u) => ({ name: u.full_name, role: u.role }))
        );
        const mapped = data
          .filter((e) => e.role !== "SUPER_ADMIN")
          .map(mapEmployeeOption);
        setEmployees(mapped);
        return mapped;
      } catch (err) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return [];
        showToast(`Error loading employees: ${err.message}`);
        return [];
      }
    },
    [currentBranch, getSignal, showToast]
  );

  const loadBranchSummary = useCallback(
    async (month = currentMonth, branch = currentBranch) => {
      setLoading(true);
      setLoadError("");
      setViewMode("branch");

      try {
        const signal = getSignal();
        const [summaryData, trendsData] = await Promise.all([
          fetchAnalysisSummary(month, branch, signal),
          fetchAnalysisTrends(branch, 6, signal).catch(() => ({
            trends: [],
          })),
        ]);

        setSummaryKpi(summaryData.kpi);
        setSummaryEmployees(summaryData.employees || []);
        setTrends(trendsData.trends || []);
      } catch (err) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
        setLoadError(err.response?.data?.message || err.message);
        showToast(`Failed to load summary: ${err.message}`);
        setSummaryKpi(null);
        setSummaryEmployees([]);
        setTrends([]);
      } finally {
        setLoading(false);
      }
    },
    [currentBranch, currentMonth, getSignal, showToast]
  );

  const loadIndividual = useCallback(
    async (empId, monthStr, employeeList = employees) => {
      const emp = employeeList.find((e) => e.id == empId);
      if (!emp) return;

      const cacheKey = `${empId}-${monthStr}`;

      // Check cache first
      if (recordsCacheRef.current[cacheKey]) {
        const signal = getSignal();
        const monthlyLeaves = await fetchEmployeeLeaves(empId, monthStr, signal);
        setCurrentRecords(recordsCacheRef.current[cacheKey]);
        setCurrentLeaves(monthlyLeaves || []);
        setCurrentEmpId(empId);
        setViewMode("individual");
        setWeeksCache(buildWeeksCache(monthStr));
        showToast(`Loaded ${emp.name} (cached)`);
        return;
      }

      setLoading(true);
      setLoadError("");
      setViewMode("individual");
      setCurrentEmpId(empId);
      showToast(`Loading ${emp.name}…`);

      const fetchId = ++fetchIdRef.current;

      try {
        const signal = getSignal();
        const [data, monthlyLeaves] = await Promise.all([
          fetchAnalysisIndividual(empId, monthStr, signal),
          fetchEmployeeLeaves(empId, monthStr, signal),
        ]);

        if (fetchId !== fetchIdRef.current) return;
        const transformedRecords = normalizeAttendanceAnalysisRecords(data.records || []);
        // Store in cache
        recordsCacheRef.current[cacheKey] = transformedRecords;

        setCurrentRecords(transformedRecords);
        setCurrentLeaves(monthlyLeaves || []);
        setWeeksCache(buildWeeksCache(monthStr));
        showToast(`Loaded ${emp.name}`);
      } catch (err) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
        if (fetchId !== fetchIdRef.current) return;
        showToast(`Failed to load data: ${err.message}`);
        // NEVER set records to [] - keep previous data visible
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [currentBranch, employees, getSignal, showToast]
  );

  const handleLoad = useCallback(async () => {
    if (selectedEmployeeId === "all") {
      await loadBranchSummary();
    } else {
      await loadIndividual(parseInt(selectedEmployeeId, 10), currentMonth);
    }
  }, [
    selectedEmployeeId,
    currentMonth,
    loadBranchSummary,
    loadIndividual,
  ]);

  useEffect(() => {
    loadEmployees();
    loadBranchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
      if (monthChangeTimerRef.current) window.clearTimeout(monthChangeTimerRef.current);
    };
  }, []);

  const handleBranchChange = async (branch) => {
    setCurrentBranch(branch);
    setSelectedEmployeeId("all");
    invalidateAnalysisCache("employees");
    invalidateAnalysisCache("summary");
    invalidateAnalysisCache("trends");
    await loadEmployees(branch);
    await loadBranchSummary(currentMonth, branch);
  };

  const handleMonthChange = (month) => {
    // Debounce month changes by 200ms
    if (monthChangeTimerRef.current) {
      clearTimeout(monthChangeTimerRef.current);
    }

    monthChangeTimerRef.current = setTimeout(async () => {
      setCurrentMonth(month);
      invalidateAnalysisCache("summary");
      invalidateAnalysisCache("individual");
      if (selectedEmployeeId === "all") {
        await loadBranchSummary(month, currentBranch);
      } else if (currentEmpId) {
        await loadIndividual(currentEmpId, month);
      }
    }, 200);
  };

  const handleGlobalSearch = (value) => {
    setGlobalSearch(value);
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      const q = value.toLowerCase().trim();
      if (!q) return;
      const match = employees.find(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.dept.toLowerCase().includes(q)
      );
      if (match) {
        setSelectedEmployeeId(String(match.id));
        loadIndividual(match.id, currentMonth, employees);
      }
    }, 300);
  };

  const handleExport = () => {
    if (viewMode === "branch") {
      const headers = [
        "Employee",
        "Department",
        "Present",
        "Late",
        "Absent",
        "Avg Break (min)",
        "Exceeded 60m",
      ];
      const rows = [headers];
      summaryEmployees.forEach((e) => {
        rows.push([
          e.full_name,
          e.department,
          e.present_days,
          e.late_days,
          e.absent_days,
          e.avg_break_mins,
          e.break_exceeded_days,
        ]);
      });
      downloadCSV(
        rows,
        `employee_summary_${currentBranch}_${currentMonth}.csv`
      );
      showToast("Exported employee summary");
      return;
    }

    const emp = employees.find((e) => e.id == currentEmpId);
    if (!currentRecords.length) {
      showToast("No data to export");
      return;
    }

    const rows = [
      [
        "Date",
        "Day",
        "Status",
        "Check In",
        "Check Out",
        "Hours",
        "Late Minutes",
        "Break Minutes",
      ],
    ];
    currentRecords.forEach((r) => {
      const rec = normalizeAttendanceAnalysisRecord(r);
      rows.push([
        rec.date,
        dayName(rec.date),
        rec.status,
        rec.checkIn,
        rec.checkOut,
        formatProductionHours(rec.workHours),
        rec.lateMinutes,
        rec.breaks,
      ]);
    });
    downloadCSV(
      rows,
      `attendance_${emp?.name || "employee"}_${currentMonth}_full.csv`
    );
    showToast("Exported full month records");
  };

  const selectedEmployee =
    viewMode === "individual"
      ? employees.find((e) => e.id == currentEmpId)
      : null;

  return (
    <div className="admin-analysis-page main-panel-content admin-portal-page">
      <div className="exec-header">
        <div className="emp-profile">
          <div className="avatar-sm" id="headerAvatar">
            {headerInitials}
          </div>
          <div>
            <strong>{headerName}</strong>
            <span className="online-dot" />
            <br />
            <span style={{ fontSize: 11 }}>{headerSubtitle}</span>
          </div>
        </div>
        <div className="header-actions">
          <div className="search-wrap">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="Search employee..."
              id="globalSearch"
              value={globalSearch}
              onChange={(e) => handleGlobalSearch(e.target.value)}
            />
          </div>
          <div className="icon-btn">
            <i className="fas fa-bell" />
          </div>
          <button
            type="button"
            className="export-btn"
            id="exportReportBtn"
            onClick={handleExport}
          >
            <i className="fas fa-download" /> Export
          </button>
          <div className="icon-btn">
            <i className="fas fa-magic" />
          </div>
        </div>
      </div>

      <AttendanceAnalysisFilters
        branch={currentBranch}
        onBranchChange={handleBranchChange}
        month={currentMonth}
        onMonthChange={handleMonthChange}
        employees={employees}
        selectedEmployeeId={selectedEmployeeId}
        onEmployeeChange={setSelectedEmployeeId}
        onLoad={handleLoad}
        loading={loading}
      />

      {viewMode === "branch" ? (
       <BranchSummaryView
  monthStr={currentMonth}
  kpi={summaryKpi}
  employees={summaryEmployees}
  trends={showTrends ? trends : []}
  loading={loading}
  error={loadError}
  showTrends={showTrends}
  onToggleTrends={() => setShowTrends((prev) => !prev)}
/>

      ) : (
        <IndividualAnalysisView
          employee={selectedEmployee}
          records={currentRecords}
          leaves={currentLeaves}
          monthStr={currentMonth}
          weeksCache={weeksCache}
          loading={loading}
        />
      )}

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

export default AdminAttendanceAnalysis;
