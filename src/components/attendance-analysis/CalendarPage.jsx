import { useCallback, useEffect, useRef, useState } from "react";
import AttendanceCalendarHeatmap from "./AttendanceCalendarHeatmap";
import { fetchAttendanceRange } from "../../services/calendarApi";
import { monthLabel } from "../../utils/attendanceAnalysisHelpers";
import {
  buildCalendarCacheKey,
  monthRangeBounds,
  transformAttendanceRangeRecord,
} from "../../utils/calendarRecordTransform";

const DEBOUNCE_MS = 200;

function CalendarPage({ userId, branch = "all", initialMonth }) {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [monthStr, setMonthStr] = useState(initialMonth ?? defaultMonth);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const cacheRef = useRef({});
  const debounceRef = useRef(null);
  const fetchIdRef = useRef(0);

  const loadMonth = useCallback(
    async (targetMonth) => {
      const cacheKey = buildCalendarCacheKey(branch, userId, targetMonth);

      if (cacheRef.current[cacheKey]) {
        setRecords(cacheRef.current[cacheKey]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const fetchId = ++fetchIdRef.current;
      const { start, end } = monthRangeBounds(targetMonth);

      try {
        const raw = await fetchAttendanceRange(start, end, branch);
        if (fetchId !== fetchIdRef.current) return;

        let rows = raw || [];
        if (userId) {
          rows = rows.filter((r) => String(r.user_id) === String(userId));
        }

        const transformed = rows.map(transformAttendanceRangeRecord);
        cacheRef.current[cacheKey] = transformed;
        setRecords(transformed);
      } catch (err) {
        if (fetchId !== fetchIdRef.current) return;
        console.error("Failed to load calendar:", err);
        // Never setRecords([]) — keep previous month visible
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [branch, userId]
  );

  useEffect(() => {
    loadMonth(monthStr);
  }, [monthStr, loadMonth]);

  useEffect(() => {
    if (initialMonth && initialMonth !== monthStr) {
      setMonthStr(initialMonth);
    }
    // Only sync when parent month changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMonth]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      fetchIdRef.current += 1;
    },
    []
  );

  const changeMonth = (delta) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const [y, m] = monthStr.split("-").map(Number);
      const next = new Date(y, m - 1 + delta, 1);
      const nextStr = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

      const cacheKey = buildCalendarCacheKey(branch, userId, nextStr);
      if (cacheRef.current[cacheKey]) {
        setRecords(cacheRef.current[cacheKey]);
        setLoading(false);
      } else {
        setLoading(true);
      }

      setMonthStr(nextStr);
    }, DEBOUNCE_MS);
  };

  return (
    <div className="card">
      <div className="card-title">Attendance Heatmap — hover for details</div>

      <div className="month-nav cal-month-nav">
        <button type="button" onClick={() => changeMonth(-1)}>
          <i className="fas fa-chevron-left" /> Prev
        </button>
        <span>{monthLabel(monthStr)}</span>
        <button type="button" onClick={() => changeMonth(1)}>
          Next <i className="fas fa-chevron-right" />
        </button>
      </div>

      <div className="cal-heatmap-wrap">
        <AttendanceCalendarHeatmap monthStr={monthStr} records={records} />
        {loading ? (
          <div className="cal-loading-overlay" aria-busy="true">
            <div className="loading-spinner" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default CalendarPage;
