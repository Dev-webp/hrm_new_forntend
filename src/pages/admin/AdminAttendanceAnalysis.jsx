import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  formatTimeDisplay,
} from "../../utils/attendanceAnalysisHelpers";
import { formatProductionHours } from "../../utils/timeFormat";
import { getStoredUser } from "../../utils/auth";
import "../../styles/adminAttendanceAnalysis.css";

function AdminAttendanceAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  const user = useMemo(() => getStoredUser(), []);
  const isOperationalManager = user?.role === "OPERATIONAL_MANAGER";
  const headerInitials = isOperationalManager ? "OM" : "SA";
  const headerName = isOperationalManager
    ? "Operational Manager"
    : "Super Admin";
  const headerSubtitle = isOperationalManager
    ? "Operations · Live"
    : "Chairman · Live";

  // URL quick-action parameters
  const quickActionEmployeeId = searchParams.get("employeeId");
  const quickActionBranch = searchParams.get("branch") || "all";
  const quickActionMonth = searchParams.get("month") || defaultMonth;

  const [currentBranch, setCurrentBranch] = useState(quickActionBranch);
  const [currentMonth, setCurrentMonth] = useState(quickActionMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    quickActionEmployeeId ? String(quickActionEmployeeId) : "all"
  );

  const [employees, setEmployees] = useState([]);
  const [viewMode, setViewMode] = useState(
    quickActionEmployeeId ? "individual" : "branch"
  );

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
    if (abortRef.current) {
      abortRef.current.abort();
    }

    abortRef.current = new AbortController();

    return abortRef.current.signal;
  }, []);

  const clearEmployeeQuickActionFromUrl = useCallback(
    (branch, month) => {
      const nextParams = new URLSearchParams();

      if (branch && branch !== "all") {
        nextParams.set("branch", branch);
      }

      if (month) {
        nextParams.set("month", month);
      }

      setSearchParams(nextParams, { replace: true });
    },
    [setSearchParams]
  );

  const loadEmployees = useCallback(
    async (branch = currentBranch) => {
      try {
        const signal = getSignal();

        const data = await fetchAnalysisEmployees(branch, signal);

        console.log(
          "Loaded users for attendance:",
          data.map((u) => ({
            name: u.full_name,
            role: u.role,
          }))
        );

        const mapped = data
          .filter((e) => e.role !== "SUPER_ADMIN")
          .map(mapEmployeeOption);

        setEmployees(mapped);

        return mapped;
      } catch (err) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          return [];
        }

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
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          return;
        }

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
      const normalizedEmpId = Number(empId);

      if (!Number.isInteger(normalizedEmpId) || normalizedEmpId <= 0) {
        setLoadError("Invalid employee ID.");
        showToast("Invalid employee ID.");
        setViewMode("branch");
        return false;
      }

      const emp = employeeList.find(
        (employee) => Number(employee.id) === normalizedEmpId
      );

      if (!emp) {
        setLoadError("Selected employee was not found for the current branch.");
        showToast("Selected employee was not found for the current branch.");
        setViewMode("branch");
        return false;
      }

      const cacheKey = `${normalizedEmpId}-${monthStr}`;

      if (recordsCacheRef.current[cacheKey]) {
        try {
          const signal = getSignal();

          const monthlyLeaves = await fetchEmployeeLeaves(
            normalizedEmpId,
            monthStr,
            signal
          );

          setCurrentRecords(recordsCacheRef.current[cacheKey]);
          setCurrentLeaves(monthlyLeaves || []);
          setCurrentEmpId(normalizedEmpId);
          setSelectedEmployeeId(String(normalizedEmpId));
          setViewMode("individual");
          setWeeksCache(buildWeeksCache(monthStr));

          showToast(`Loaded ${emp.name} (cached)`);

          return true;
        } catch (err) {
          if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
            return false;
          }

          setLoadError(err.response?.data?.message || err.message);
          showToast(`Failed to load data: ${err.message}`);

          return false;
        }
      }

      setLoading(true);
      setLoadError("");
      setViewMode("individual");
      setCurrentEmpId(normalizedEmpId);
      setSelectedEmployeeId(String(normalizedEmpId));

      showToast(`Loading ${emp.name}…`);

      const fetchId = ++fetchIdRef.current;

      try {
        const signal = getSignal();

        const [data, monthlyLeaves] = await Promise.all([
          fetchAnalysisIndividual(normalizedEmpId, monthStr, signal),
          fetchEmployeeLeaves(normalizedEmpId, monthStr, signal),
        ]);

        if (fetchId !== fetchIdRef.current) {
          return false;
        }

        const transformedRecords = normalizeAttendanceAnalysisRecords(
          data.records || []
        );

        recordsCacheRef.current[cacheKey] = transformedRecords;

        setCurrentRecords(transformedRecords);
        setCurrentLeaves(monthlyLeaves || []);
        setWeeksCache(buildWeeksCache(monthStr));

        showToast(`Loaded ${emp.name}`);

        return true;
      } catch (err) {
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          return false;
        }

        if (fetchId !== fetchIdRef.current) {
          return false;
        }

        const message =
          err.response?.data?.message ||
          err.message ||
          "Failed to load employee attendance analysis.";

        setLoadError(message);

        showToast(`Failed to load data: ${message}`);

        return false;
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [employees, getSignal, showToast]
  );

  const handleLoad = useCallback(async () => {
    if (selectedEmployeeId === "all") {
      clearEmployeeQuickActionFromUrl(currentBranch, currentMonth);

      await loadBranchSummary();
      return;
    }

    const empId = Number(selectedEmployeeId);

    const loaded = await loadIndividual(
      empId,
      currentMonth,
      employees
    );

    if (loaded) {
      const nextParams = new URLSearchParams({
        employeeId: String(empId),
        month: currentMonth,
      });

      if (currentBranch && currentBranch !== "all") {
        nextParams.set("branch", currentBranch);
      }

      setSearchParams(nextParams, { replace: true });
    }
  }, [
    selectedEmployeeId,
    currentBranch,
    currentMonth,
    employees,
    clearEmployeeQuickActionFromUrl,
    loadBranchSummary,
    loadIndividual,
    setSearchParams,
  ]);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const branch = quickActionBranch;
      const month = quickActionMonth;
      const employeeId = quickActionEmployeeId;

      setCurrentBranch(branch);
      setCurrentMonth(month);

      if (employeeId) {
        const parsedEmployeeId = Number(employeeId);

        if (
          !Number.isInteger(parsedEmployeeId) ||
          parsedEmployeeId <= 0
        ) {
          if (cancelled) return;

          setSelectedEmployeeId("all");
          setCurrentEmpId(null);
          setViewMode("branch");
          setLoadError("Invalid employee ID in the attendance analysis URL.");

          showToast("Invalid employee ID.");

          await loadBranchSummary(month, branch);

          return;
        }

        const loadedEmployees = await loadEmployees(branch);

        if (cancelled) return;

        const employeeExists = loadedEmployees.some(
          (employee) => Number(employee.id) === parsedEmployeeId
        );

        if (!employeeExists) {
          setSelectedEmployeeId("all");
          setCurrentEmpId(null);
          setViewMode("branch");

          setLoadError(
            "The requested employee was not found for the selected branch."
          );

          showToast(
            "The requested employee was not found for the selected branch."
          );

          await loadBranchSummary(month, branch);

          return;
        }

        setSelectedEmployeeId(String(parsedEmployeeId));

        await loadIndividual(
          parsedEmployeeId,
          month,
          loadedEmployees
        );

        return;
      }

      setSelectedEmployeeId("all");

      await loadEmployees(branch);

      if (cancelled) return;

      await loadBranchSummary(month, branch);
    };

    initialize();

    return () => {
      cancelled = true;
    };

    // Run once for initial/direct URL loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }

      if (monthChangeTimerRef.current) {
        window.clearTimeout(monthChangeTimerRef.current);
      }
    };
  }, []);

  const handleBranchChange = async (branch) => {
    setCurrentBranch(branch);
    setSelectedEmployeeId("all");
    setCurrentEmpId(null);

    invalidateAnalysisCache("employees");
    invalidateAnalysisCache("summary");
    invalidateAnalysisCache("trends");

    clearEmployeeQuickActionFromUrl(branch, currentMonth);

    const loadedEmployees = await loadEmployees(branch);

    if (!loadedEmployees.length && branch !== "all") {
      showToast("No employees found for the selected branch.");
    }

    await loadBranchSummary(currentMonth, branch);
  };

  const handleMonthChange = (month) => {
    if (monthChangeTimerRef.current) {
      clearTimeout(monthChangeTimerRef.current);
    }

    monthChangeTimerRef.current = setTimeout(async () => {
      setCurrentMonth(month);

      invalidateAnalysisCache("summary");
      invalidateAnalysisCache("individual");

      if (selectedEmployeeId === "all") {
        clearEmployeeQuickActionFromUrl(currentBranch, month);

        await loadBranchSummary(month, currentBranch);
        return;
      }

      const employeeId = currentEmpId || Number(selectedEmployeeId);

      if (!employeeId) {
        await loadBranchSummary(month, currentBranch);
        return;
      }

      const loaded = await loadIndividual(
        employeeId,
        month,
        employees
      );

      if (loaded) {
        const nextParams = new URLSearchParams({
          employeeId: String(employeeId),
          month,
        });

        if (currentBranch && currentBranch !== "all") {
          nextParams.set("branch", currentBranch);
        }

        setSearchParams(nextParams, { replace: true });
      }
    }, 200);
  };

  const handleGlobalSearch = (value) => {
    setGlobalSearch(value);

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    searchTimerRef.current = window.setTimeout(async () => {
      const q = value.toLowerCase().trim();

      if (!q) {
        return;
      }

      const match = employees.find(
        (emp) =>
          emp.name.toLowerCase().includes(q) ||
          emp.dept.toLowerCase().includes(q)
      );

      if (match) {
        setSelectedEmployeeId(String(match.id));

        const loaded = await loadIndividual(
          match.id,
          currentMonth,
          employees
        );

        if (loaded) {
          const nextParams = new URLSearchParams({
            employeeId: String(match.id),
            month: currentMonth,
          });

          if (currentBranch && currentBranch !== "all") {
            nextParams.set("branch", currentBranch);
          }

          setSearchParams(nextParams, { replace: true });
        }
      }
    }, 300);
  };

  const handleViewFullAnalysis = useCallback(
    async (userId) => {
      const employeeId = Number(userId);

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        setLoadError("Invalid employee ID.");
        showToast("Invalid employee ID.");
        return;
      }

      setLoadError("");

      const nextParams = new URLSearchParams({
        employeeId: String(employeeId),
        month: currentMonth,
      });

      if (currentBranch && currentBranch !== "all") {
        nextParams.set("branch", currentBranch);
      }

      setSearchParams(nextParams);

      setSelectedEmployeeId(String(employeeId));
      setCurrentEmpId(employeeId);

      let employeeList = employees;

      let employeeExists = employeeList.some(
        (employee) => Number(employee.id) === employeeId
      );

      if (!employeeExists) {
        employeeList = await loadEmployees(currentBranch);

        employeeExists = employeeList.some(
          (employee) => Number(employee.id) === employeeId
        );
      }

      if (!employeeExists) {
        setViewMode("branch");

        const message =
          "The selected employee could not be found for the current branch.";

        setLoadError(message);
        showToast(message);

        return;
      }

      await loadIndividual(
        employeeId,
        currentMonth,
        employeeList
      );
    },
    [
      currentBranch,
      currentMonth,
      employees,
      loadEmployees,
      loadIndividual,
      setSearchParams,
      showToast,
    ]
  );

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

    const emp = employees.find(
      (e) => e.id == currentEmpId
    );

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
        formatTimeDisplay(rec.checkIn),
        formatProductionHours(rec.workHours),
        formatTimeDisplay(rec.checkOut),
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
            <span style={{ fontSize: 11 }}>
              {headerSubtitle}
            </span>
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
              onChange={(e) =>
                handleGlobalSearch(e.target.value)
              }
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
          branch={currentBranch}
          kpi={summaryKpi}
          employees={summaryEmployees}
          trends={showTrends ? trends : []}
          loading={loading}
          error={loadError}
          showTrends={showTrends}
          onToggleTrends={() =>
            setShowTrends((prev) => !prev)
          }
          onViewFullAnalysis={handleViewFullAnalysis}
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

      <Toast
        message={toast.message}
        visible={toast.visible}
      />
    </div>
  );
}

export default AdminAttendanceAnalysis;