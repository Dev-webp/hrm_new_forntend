import { useMemo } from "react";
import {
  dayName,
  formatDateReadable,
  formatDateYMD,
  formatTimeDisplay,
  getAttendanceStyle,
} from "../../utils/attendanceAnalysisHelpers";

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
function CalendarDay({ dateStr, dayNum, record }) {
  const style = getAttendanceStyle(record);

  const statusLabel =
    record?.status === "full_day"
      ? "Full Day"
      : record?.status === "half_day"
        ? "Half Day"
        : record?.status === "sunday"
          ? "Sunday"
          : record?.status === "holiday"
            ? "Holiday"
            : "Absent";

  return (
    <div className={`cal-day ${style.className}`}>
      <div className={`day-num ${style.numClass}`}>{dayNum}</div>
      <div className="cal-tooltip-custom">
        {record ? (
          <>
            <strong>
              {formatDateReadable(dateStr)} · {dayName(dateStr)}
            </strong>
            <hr />
            Status: <strong>{statusLabel}</strong>
            {record.lateMinutes ? (
              <>
                <br />
                Late by {record.lateMinutes} min
              </>
            ) : null}
            {record.checkIn !== "--" ? (
              <>
                <br />
                Login: {formatTimeDisplay(record.checkIn)}
              </>
            ) : null}
            {record.checkOut !== "--" ? (
              <> &nbsp; Logout: {formatTimeDisplay(record.checkOut)}</>
            ) : null}
            {record.workHours > 0 ? (
              <>
                <br />
                Hours: {record.workHours.toFixed(1)}h
              </>
            ) : null}
            <hr />
            Break1: {record.breakDetails.b1.in}→{record.breakDetails.b1.out} (
            {record.breakMins.b1}m)
            <br />
            Lunch: {record.breakDetails.lunch.in}→
            {record.breakDetails.lunch.out} ({record.breakMins.lunch}m)
            <br />
            Break2: {record.breakDetails.b2.in}→{record.breakDetails.b2.out} (
            {record.breakMins.b2}m)
            <br />
            Break3: {record.breakDetails.b3.in}→{record.breakDetails.b3.out} (
            {record.breakMins.b3}m)
            <br />
            Total Break: <strong>{record.breaks}m</strong>
          </>
        ) : (
          <>
            {formatDateReadable(dateStr)}
            <br />
            No record
          </>
        )}
      </div>
    </div>
  );
}

function AttendanceCalendarHeatmap({ monthStr, records }) {
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
        <CalendarDay key={dateStr} dateStr={dateStr} dayNum={d} record={rec} />
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
  }, [y, m, recordMap]);

  return <div className="cal-grid">{cells}</div>;
}

export default AttendanceCalendarHeatmap;
