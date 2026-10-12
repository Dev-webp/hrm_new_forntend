import { useMemo } from "react";
import {
  dayName,
  formatDateReadable,
  formatDateYMD,
  formatTimeDisplay,
  getAttendanceStyle,
  isGraceLateAttendanceRecord,
  isPaidLeaveRecord,
  isUnpaidLeaveRecord,
  normalizeAttendanceAnalysisRecord,
} from "../../utils/attendanceAnalysisHelpers";
import { getCalendarAttendanceStatus } from "../../utils/calendarStatusColors";
import { hasAppliedSandwichPenalty } from "../../utils/sandwichCalendar";
import { formatProductionHours } from "../../utils/timeFormat";

/** O(1) lookup map: "YYYY-MM-DD" → record */
function buildRecordMap(records) {
  const map = {};
  for (const r of records || []) {
    if (r?.date) {
      map[r.date] = r;
    }
  }
  return map;
}

/** Pure day cell — no state, no hooks */
function CalendarDay({ dateStr, dayNum, record, sandwichResults = [] }) {
  const safeRecord = normalizeAttendanceAnalysisRecord(record, dateStr);
  const style = getAttendanceStyle(safeRecord);
  const hasSandwichPolicy = sandwichResults.length > 0;
  const hasAppliedPenalty = hasAppliedSandwichPenalty(sandwichResults);
  const className = [
    "cal-day",
    style.className,
    hasSandwichPolicy ? "has-sandwich-policy" : "",
    hasAppliedPenalty ? "sandwich-lop" : "",
  ].filter(Boolean).join(" ");

  const resolvedStatus = getCalendarAttendanceStatus(safeRecord);
  const statusLabel =
    resolvedStatus === "half_day"
      ? "Half Day"
      : resolvedStatus === "paid_leave" || isPaidLeaveRecord(safeRecord)
      ? "Paid Leave"
      : resolvedStatus === "unpaid_leave" || isUnpaidLeaveRecord(safeRecord)
      ? "Unpaid Leave"
      : resolvedStatus === "full_day"
      ? "Full Day"
      : resolvedStatus === "no_record"
        ? "No Record"
        : resolvedStatus === "sunday"
          ? "Sunday"
          : resolvedStatus === "holiday"
            ? "Holiday"
            : "Absent";

  return (
    <div className={className}>
      <div className={`day-num ${style.numClass}`}>{dayNum}</div>
      {hasSandwichPolicy ? (
        <span className="sandwich-indicator" aria-label="Sandwich policy result">
          ◇
        </span>
      ) : null}
      <div className="cal-tooltip-custom">
        {safeRecord ? (
          <>
            <strong>
              {formatDateReadable(dateStr)} · {dayName(dateStr)}
            </strong>
            <hr />
            Status: <strong>{statusLabel}</strong>
            {isGraceLateAttendanceRecord(safeRecord) ? (
              <>
                <br />
                Late by {safeRecord.lateMinutes} min
              </>
            ) : null}
            {safeRecord.checkIn !== "--" ? (
              <>
                <br />
                Login: {formatTimeDisplay(safeRecord.checkIn)}
              </>
            ) : null}
            {safeRecord.checkOut !== "--" ? (
              <> &nbsp; Logout: {formatTimeDisplay(safeRecord.checkOut)}</>
            ) : null}
            {safeRecord.workHours > 0 ? (
              <>
                <br />
                Hours: {formatProductionHours(safeRecord.workHours)}
              </>
            ) : null}
            <hr />
            Break1: {safeRecord.breakDetails.b1.in}→{safeRecord.breakDetails.b1.out} (
            {safeRecord.breakMins.b1}m)
            <br />
            Lunch: {safeRecord.breakDetails.lunch.in}→
            {safeRecord.breakDetails.lunch.out} ({safeRecord.breakMins.lunch}m)
            <br />
            Break2: {safeRecord.breakDetails.b2.in}→{safeRecord.breakDetails.b2.out} (
            {safeRecord.breakMins.b2}m)
            <br />
            Break3: {safeRecord.breakDetails.b3.in}→{safeRecord.breakDetails.b3.out} (
            {safeRecord.breakMins.b3}m)
            <br />
            Total Break: <strong>{safeRecord.breaks}m</strong>
            {hasSandwichPolicy ? (
              <>
                <hr />
                <div className="sandwich-policy-detail"><strong>Sandwich policy</strong></div>
                {sandwichResults.map((result, index) => (
                  <div key={`${result.anchorType}-${result.reason}-${index}`}>
                    {result.applied ? "Applied" : "Not applied"}: {result.reason}
                  </div>
                ))}
              </>
            ) : null}
          </>
        ) : (
          <>
            {formatDateReadable(dateStr)}
            <br />
            No record
            {hasSandwichPolicy ? (
              <>
                <hr />
                <div className="sandwich-policy-detail"><strong>Sandwich policy</strong></div>
                {sandwichResults.map((result, index) => (
                  <div key={`${result.anchorType}-${result.reason}-${index}`}>
                    {result.applied ? "Applied" : "Not applied"}: {result.reason}
                  </div>
                ))}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function AttendanceCalendarHeatmap({ monthStr, records, sandwichByDate = new Map() }) {
  const [y, m] = monthStr.split("-").map(Number);

  const recordMap = useMemo(() => buildRecordMap(records), [records]);

  const cells = useMemo(() => {
    const result = [];
    const startOffset = new Date(y, m - 1, 1).getDay();
    const lastDateOfMonth = new Date(y, m, 0).getDate();

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
      result.push(
        <div className="cal-dow-header" key={`h-${d}`}>
          {d}
        </div>
      );
    });

    for (let i = 0; i < startOffset; i++) {
      result.push(<div className="cal-day cal-empty" key={`e-${i}`} />);
    }

    for (let d = 1; d <= lastDateOfMonth; d++) {
      const dateStr = formatDateYMD(new Date(y, m - 1, d));
      const rec = recordMap[dateStr] ?? null;
      result.push(
        <CalendarDay
          key={dateStr}
          dateStr={dateStr}
          dayNum={d}
          record={rec}
          sandwichResults={sandwichByDate.get(dateStr) || []}
        />
      );
    }

    const totalCells = startOffset + lastDateOfMonth;
    const rem = totalCells % 7;
    if (rem) {
      for (let i = 0; i < 7 - rem; i++) {
        result.push(<div className="cal-day cal-empty" key={`t-${i}`} />);
      }
    }

    return result;
  }, [y, m, recordMap, sandwichByDate]);

  return <div className="cal-grid">{cells}</div>;
}

export default AttendanceCalendarHeatmap;
