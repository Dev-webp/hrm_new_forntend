import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { normalizeArray } from "./employeeUtils";
import "../../styles/EmployeeBreaks.css";

const SLOT_CONFIG = [
  { key: "break1", label: "Break 1", emoji: "🍵" },
  { key: "lunch", label: "Lunch Break", emoji: "🥗" },
  { key: "break2", label: "Break 2", emoji: "🧋" },
  { key: "break3", label: "Break 3", emoji: "🍫" },
];

const EMPTY_BREAKS = {
  break1: { start: "", end: "" },
  lunch: { start: "", end: "" },
  break2: { start: "", end: "" },
  break3: { start: "", end: "" },
  break3Sessions: [],
};

const SLOT_META = {
  break1: { label: "Tea Break 1", limit: 15, icon: "fa-mug-hot" },
  lunch: { label: "Lunch", limit: 30, icon: "fa-utensils" },
  break2: { label: "Tea Break 2", limit: 15, icon: "fa-mug-saucer" },
  break3: { label: "Break 3", limit: 0, icon: "fa-cookie-bite" },
};

const MAX_BREAK_MINUTES = 60;
const MAX_DAILY_BREAK_SESSIONS = 6;
const GAUGE_CIRCUMFERENCE = 226.2;

function getNow12h() {
  const now = new Date();
  let h = now.getHours();
  const m = now.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

function timeToMin(t) {
  if (!t) return 0;
  const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return hour * 60 + min;
}

function getDur(start, end) {
  if (!start || !end) return 0;
  return Math.max(0, timeToMin(end) - timeToMin(start));
}

function slotDuration(slot = {}) {
  return Number(slot.duration_minutes ?? slot.duration ?? getDur(slot.start, slot.end)) || 0;
}

function normalizeBreak3Sessions(list) {
  return Array.isArray(list)
    ? list
        .filter((item) => item?.start || item?.end)
        .slice(0, MAX_DAILY_BREAK_SESSIONS)
        .map((item, index) => ({ ...item, number: item.number || index + 1 }))
    : [];
}

function getWeekRange(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

function getMonthRange(offset) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end, year, month };
}

function fmt(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function EmployeeBreaks() {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const today = new Date().toISOString().slice(0, 10);

  const [myBreaks, setMyBreaks] = useState(EMPTY_BREAKS);
  const [allHistoryData, setAllHistoryData] = useState([]);
  const [histView, setHistView] = useState("week");
  const [histOffset, setHistOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    const t = setTimeout(
      () => setToast({ msg: "", visible: false, type: "" }),
      2800
    );
    return () => clearTimeout(t);
  }, []);

  const loadBreaks = useCallback(async () => {
    try {
      const data = await apiFetch(`/employee/my-breaks?date=${today}`);
      if (data) {
        setMyBreaks({
          break1: data.break1 || { start: "", end: "" },
          lunch: data.lunch || { start: "", end: "" },
          break2: data.break2 || { start: "", end: "" },
          break3: data.break3 || { start: "", end: "" },
          break3Sessions: normalizeBreak3Sessions(data.break3Sessions),
        });
      }
    } catch {
      showToast("Failed to load breaks");
    }
  }, [apiFetch, today, showToast]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await apiFetch("/employee/my-breaks-history");
      setAllHistoryData(normalizeArray(data));
    } catch {
      setAllHistoryData([]);
    }
  }, [apiFetch]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([loadBreaks(), loadHistory()]);
      setIsLoading(false);
    })();
  }, [loadBreaks, loadHistory]);

  const getTotal = useCallback(
    () => {
      const standardTotal = SLOT_CONFIG.filter((cfg) => cfg.key !== "break3").reduce(
        (s, c) => s + slotDuration(myBreaks[c.key]),
        0
      );
      const break3Total = normalizeBreak3Sessions(myBreaks.break3Sessions)
        .reduce((sum, item) => sum + slotDuration(item), 0);
      return standardTotal + break3Total;
    },
    [myBreaks]
  );

  const meter = useMemo(() => {
    const total = getTotal();
    const pct = Math.min(100, Math.round((total / MAX_BREAK_MINUTES) * 100));
    const rem = Math.max(0, MAX_BREAK_MINUTES - total);
    const stroke =
      total > 60 ? "#DC2626" : total > 45 ? "#FBB824" : "#FF8C00";
    const barBg =
      total > 60
        ? "linear-gradient(90deg,#DC2626,#ff4444)"
        : total > 45
          ? "linear-gradient(90deg,#FBB824,#f5a623)"
          : "linear-gradient(90deg,#FF8C00,#FF8C00)";
    return {
      total,
      pct,
      rem,
      stroke,
      barBg,
      offset: GAUGE_CIRCUMFERENCE - GAUGE_CIRCUMFERENCE * (pct / 100),
    };
  }, [getTotal]);

  const break3Sessions = useMemo(
    () => normalizeBreak3Sessions(myBreaks.break3Sessions),
    [myBreaks.break3Sessions]
  );

  const standardTotal = useMemo(
    () => SLOT_CONFIG
      .filter((cfg) => cfg.key !== "break3")
      .reduce((sum, cfg) => sum + slotDuration(myBreaks[cfg.key]), 0),
    [myBreaks]
  );

  const break3Total = useMemo(
    () => break3Sessions.reduce((sum, item) => sum + slotDuration(item), 0),
    [break3Sessions]
  );

  const standardSessionsUsed = useMemo(
    () =>
      SLOT_CONFIG.filter((cfg) => cfg.key !== "break3").reduce((sum, cfg) => {
        const b = myBreaks[cfg.key] || {};
        return sum + (b.start || b.end ? 1 : 0);
      }, 0),
    [myBreaks]
  );

  const totalBreakSessionsUsed = standardSessionsUsed + break3Sessions.length;

  const activeStandardKey = SLOT_CONFIG.filter((cfg) => cfg.key !== "break3").find((cfg) => {
    const b = myBreaks[cfg.key] || {};
    return b.start && !b.end;
  })?.key;
  const activeBreak3Index = break3Sessions.findIndex((item) => item.start && !item.end);
  const hasActiveBreak = Boolean(activeStandardKey) || activeBreak3Index >= 0;
  const canStartBreak3 =
    !hasActiveBreak &&
    meter.rem > 0 &&
    totalBreakSessionsUsed < MAX_DAILY_BREAK_SESSIONS;

  const handleBreak = async (key) => {
    const b = myBreaks[key];
    const now = getNow12h();
    const next = { ...myBreaks, [key]: { ...b } };
    if (!b.start) {
      if (hasActiveBreak) {
        showToast("End the current break before starting another");
        return;
      }
      if (meter.rem <= 0) {
        showToast("Daily break limit reached");
        return;
      }
      if (totalBreakSessionsUsed >= MAX_DAILY_BREAK_SESSIONS) {
        showToast("Daily break session limit reached");
        return;
      }
      next[key].start = now;
    }
    else if (!b.end) next[key].end = now;
    else return;

    setMyBreaks(next);
    try {
      await apiFetch("/employee/my-breaks", {
        method: "PUT",
        body: { date: today, breaks: next },
      });
      showToast(
        next[key].end ? "✅ Break ended" : "☕ Break started!",
        "success"
      );
    } catch {
      showToast("Failed to save break");
      await loadBreaks();
      return;
    }
    await loadHistory();
  };

  const handleBreak3Session = async () => {
    const now = getNow12h();
    const nextBreak3Sessions = break3Sessions.map((item) => ({ ...item }));
    const activeIndex = nextBreak3Sessions.findIndex((item) => item.start && !item.end);

    if (activeIndex >= 0) {
      nextBreak3Sessions[activeIndex].end = now;
    } else {
      if (!canStartBreak3) {
        showToast(
          meter.rem <= 0
            ? "Daily break limit reached"
            : totalBreakSessionsUsed >= MAX_DAILY_BREAK_SESSIONS
              ? "Daily break session limit reached"
              : "End the current break before starting another"
        );
        return;
      }
      nextBreak3Sessions.push({ start: now, end: "", number: nextBreak3Sessions.length + 1 });
    }

    const break3TotalNext = nextBreak3Sessions.reduce((sum, item) => sum + slotDuration(item), 0);
    const active = nextBreak3Sessions.find((item) => item.start && !item.end);
    const completed = nextBreak3Sessions.filter((item) => item.start && item.end);
    const next = {
      ...myBreaks,
      break3Sessions: nextBreak3Sessions,
      break3: {
        start: nextBreak3Sessions[0]?.start || "",
        end: active ? "" : completed.at(-1)?.end || "",
        duration_minutes: break3TotalNext,
      },
    };
    setMyBreaks(next);
    try {
      await apiFetch("/employee/my-breaks", {
        method: "PUT",
        body: { date: today, breaks: next },
      });
      showToast(activeIndex >= 0 ? "Break 3 ended" : "Break 3 started", "success");
    } catch (error) {
      showToast(error?.message || "Failed to save Break 3");
      await loadBreaks();
      return;
    }
    await loadHistory();
  };

  const filterByRange = useCallback(
    (start, end) =>
      allHistoryData.filter((d) => d.date >= start && d.date <= end),
    [allHistoryData]
  );

  const periodLabel = useMemo(() => {
    if (histView === "week") {
      const r = getWeekRange(histOffset);
      return `${fmt(r.start)} – ${fmt(r.end)}`;
    }
    const r = getMonthRange(histOffset);
    return new Date(`${r.start}T00:00:00`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [histView, histOffset]);

  const histStats = useMemo(() => {
    let days;
    if (histView === "week") {
      const r = getWeekRange(histOffset);
      days = filterByRange(r.start, r.end);
    } else if (histView === "month") {
      const r = getMonthRange(histOffset);
      days = filterByRange(r.start, r.end);
    } else {
      const endD = new Date();
      const startD = new Date();
      startD.setDate(endD.getDate() - 29);
      days = filterByRange(
        startD.toISOString().slice(0, 10),
        endD.toISOString().slice(0, 10)
      );
    }
    if (!days.length) return null;
    const totalMin = days.reduce((s, d) => s + (d.total || 0), 0);
    const avgMin = Math.round(totalMin / days.length);
    const daysOverLimit = days.filter((d) => (d.total || 0) > 60).length;
    const daysWithBreaks = days.filter((d) => (d.total || 0) > 0).length;
    return { totalMin, avgMin, daysOverLimit, daysWithBreaks };
  }, [histView, histOffset, filterByRange]);

  const histContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="empty-hist">
          <span className="spinner" />
        </div>
      );
    }

    if (histView === "week") {
      const { start, end } = getWeekRange(histOffset);
      const days = filterByRange(start, end);
      const dayMap = Object.fromEntries(days.map((d) => [d.date, d]));
      const startD = new Date(`${start}T00:00:00`);
      const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const cards = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startD);
        d.setDate(startD.getDate() + i);
        const ds = d.toISOString().slice(0, 10);
        const isTod = ds === today;
        const rec = dayMap[ds];
        const total = rec?.total || 0;
        const isOver = total > 60;
        const hasDat = total > 0;
        cards.push(
          <div
            key={ds}
            className={`day-card${hasDat ? " has-data" : ""}${isOver ? " over-limit" : ""}`}
          >
            <div className="dc-name">{dayNames[i]}</div>
            <div className="dc-date">{d.getDate()}</div>
            <div className={`dc-min${total === 0 ? " zero" : isOver ? " over" : ""}`}>
              {total}
            </div>
            <div className="dc-lbl">min</div>
            {isTod && (
              <div style={{ fontSize: "0.55rem", color: "var(--gold)", marginTop: 2 }}>
                TODAY
              </div>
            )}
          </div>
        );
      }

      if (!days.length) {
        return (
          <>
            <div className="week-cards">{cards}</div>
            <div className="empty-hist">No break data for this week</div>
          </>
        );
      }

      const fmtSlot = (day, slot) => {
        const b = day[slot] || {};
        return b.start && b.end ? (
          <>
            {b.start}
            <br />
            <span style={{ color: "#64748B" }}>→ {b.end}</span>
          </>
        ) : (
          <span style={{ color: "#1A2B4B" }}>—</span>
        );
      };
      const fmtBreak3Sessions = (day) => {
        const items = normalizeBreak3Sessions(day.break3Sessions);
        return items.length ? (
          <span className="break-time-cell">{items.length} entries / {items.reduce((sum, item) => sum + slotDuration(item), 0)}m</span>
        ) : (
          <span style={{ color: "#1A2B4B" }}>—</span>
        );
      };

      return (
        <>
          <div className="week-cards">{cards}</div>
          <table className="hist-table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Break 1</th>
                <th>Lunch</th>
                <th>Break 2</th>
                <th>Break 3</th>
                <th>Break 3 Sessions</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => {
                const totalCls =
                  day.total > 60
                    ? "over-cell"
                    : day.total > 0
                      ? "ok-cell"
                      : "total-cell";
                return (
                  <tr key={day.date}>
                    <td style={{ color: "var(--gold)", fontWeight: 600 }}>
                      {day.date}
                    </td>
                    <td>{fmtSlot(day, "break1")}</td>
                    <td>{fmtSlot(day, "lunch")}</td>
                    <td>{fmtSlot(day, "break2")}</td>
                    <td>{fmtSlot(day, "break3")}</td>
                    <td>{fmtBreak3Sessions(day)}</td>
                    <td className={totalCls}>{day.total} min</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      );
    }

    if (histView === "month") {
      const { start, end, year, month } = getMonthRange(histOffset);
      const days = filterByRange(start, end);
      const dayMap = Object.fromEntries(days.map((d) => [d.date, d]));
      const firstDow = new Date(`${start}T00:00:00`).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const cells = dayHeaders.map((h) => (
        <div key={h} className="mg-header">
          {h}
        </div>
      ));
      for (let i = 0; i < firstDow; i++) {
        cells.push(<div key={`e-${i}`} className="mg-cell empty" />);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const dow = new Date(`${ds}T00:00:00`).getDay();
        const rec = dayMap[ds];
        const total = rec?.total || 0;
        const isTod = ds === today;
        let cls = "mg-cell";
        if (dow === 0) cls += " sunday";
        else if (total > 60) cls += " over-break";
        else if (total > 0) cls += " has-break";
        if (isTod) cls += " today-cell";
        cells.push(
          <div key={ds} className={cls} title={`${ds}: ${total} min`}>
            <div className="mgc-day">{d}</div>
            {total > 0 && <div className="mgc-min">{total}m</div>}
          </div>
        );
      }

      return (
        <>
          <div className="month-grid">{cells}</div>
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 14,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: "rgba(255, 140, 0,.1)",
                  borderRadius: 4,
                  display: "inline-block",
                  border: "1px solid rgba(255, 140, 0,.4)",
                }}
              />
              Break taken (≤60 min)
            </span>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: "rgba(255,107,107,.1)",
                  borderRadius: 4,
                  display: "inline-block",
                  border: "1px solid rgba(255,107,107,.4)",
                }}
              />
              Over 60 min
            </span>
          </div>
          {days.length === 0 && (
            <div className="empty-hist" style={{ padding: "20px 0" }}>
              No break data this month
            </div>
          )}
        </>
      );
    }

    const endD = new Date();
    const startD = new Date();
    startD.setDate(endD.getDate() - 29);
    const days = filterByRange(
      startD.toISOString().slice(0, 10),
      endD.toISOString().slice(0, 10)
    );
    if (!days.length) {
      return <div className="empty-hist">No break history available</div>;
    }

    const fmtSlot = (day, slot) => {
      const b = day[slot] || {};
      return b.start && b.end ? (
        <>
          {b.start}
          <br />
          <span style={{ color: "#64748B" }}>→ {b.end}</span>
        </>
      ) : (
        <span style={{ color: "#1A2B4B" }}>—</span>
      );
    };
    const fmtBreak3Sessions = (day) => {
      const items = normalizeBreak3Sessions(day.break3Sessions);
      return items.length ? (
        <span className="break-time-cell">{items.length} entries / {items.reduce((sum, item) => sum + slotDuration(item), 0)}m</span>
      ) : (
        <span style={{ color: "#1A2B4B" }}>—</span>
      );
    };

    return (
      <table className="hist-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Break 1</th>
            <th>Lunch</th>
            <th>Break 2</th>
            <th>Break 3</th>
            <th>Break 3 Sessions</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const totalCls =
              day.total > 60
                ? "over-cell"
                : day.total > 0
                  ? "ok-cell"
                  : "total-cell";
            return (
              <tr key={day.date}>
                <td style={{ color: "var(--gold)", fontWeight: 600 }}>
                  {day.date}
                </td>
                <td>{fmtSlot(day, "break1")}</td>
                <td>{fmtSlot(day, "lunch")}</td>
                <td>{fmtSlot(day, "break2")}</td>
                <td>{fmtSlot(day, "break3")}</td>
                <td>{fmtBreak3Sessions(day)}</td>
                <td className={totalCls}>{day.total} min</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }, [histView, histOffset, filterByRange, isLoading, today]);

  const todayLabel =
    "Today: " +
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="layout employee-breaks-page">
      <EmployeeSidebar activePage="breaks" />
      <div className="main">
        <div className="topbar">
          <div>
            <h1>
              <i className="fas fa-coffee" style={{ fontSize: "1.3rem" }} /> My
              Breaks
            </h1>
            <p>Track your daily break usage · 60 min daily limit</p>
          </div>
          <div className="today-pill" id="todayLabel">
            {todayLabel}
          </div>
        </div>

        <div className="content">
       <div className="usage-banner">
  <div className="usage-ring">
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle className="ring-bg" cx="45" cy="45" r="36" />

      <circle
        className="ring-fill"
        cx="45"
        cy="45"
        r="36"
        strokeDasharray={GAUGE_CIRCUMFERENCE}
        strokeDashoffset={meter.offset}
        stroke={meter.stroke}
      />
    </svg>

    <div className="ring-center">
      <span className="ring-val">{meter.pct}%</span>
    </div>
  </div>

  <div className="usage-info">
    <h3>Daily Break Usage</h3>

    <div className="usage-bar-wrap">
      <div
        className="usage-bar"
        style={{
          width: `${meter.pct}%`,
          background: meter.barBg,
        }}
      />
    </div>

    <div className="usage-nums">
      <span>
        <strong>{meter.total}</strong> min used
      </span>

      <span>
        <strong>{meter.rem}</strong> min remaining
      </span>
    </div>
  </div>
</div>

          <div className="breaks-grid" id="breaksGrid">
            {SLOT_CONFIG.map((cfg) => {
              const b = myBreaks[cfg.key];
              const meta = SLOT_META[cfg.key] || cfg;
              const isBreak3 = cfg.key === "break3";
              const dur = isBreak3 ? break3Total : slotDuration(b);
              const isOnBreak = isBreak3 ? activeBreak3Index >= 0 : b.start && !b.end;
              const isDone = !isBreak3 && b.start && b.end;
              const cannotStartStandard =
                !isOnBreak &&
                (hasActiveBreak ||
                  meter.rem <= 0 ||
                  totalBreakSessionsUsed >= MAX_DAILY_BREAK_SESSIONS);
              let cardCls = "break-slot-card";
              if (isOnBreak) cardCls += " active-break";
              if (isDone) cardCls += " done-break";

              return (
                <div key={cfg.key} className={cardCls}>
                  <div className="bsc-header">
                    <div className="bsc-title">
                      <i className={`fas ${meta.icon}`} /> {meta.label}
                    </div>
                    <div className="bsc-dur">{dur ? `${dur} min` : "—"}</div>
                  </div>
                  <div className="time-display">
                    <div className="time-box">
                      <div className="tb-label">Start</div>
                      {b.start ? (
                        <div className="tb-val in">{b.start}</div>
                      ) : (
                        <div className="tb-val dash">—</div>
                      )}
                    </div>
                    <div className="time-box">
                      <div className="tb-label">End</div>
                      {b.end ? (
                        <div className="tb-val out">{b.end}</div>
                      ) : (
                        <div className="tb-val dash">—</div>
                      )}
                    </div>
                  </div>
                  {isBreak3 && (
                    <div className="break3-session-summary">
                      <span>Total Break Sessions Used: <strong>{totalBreakSessionsUsed} / {MAX_DAILY_BREAK_SESSIONS}</strong></span>
                      <span>Break 3 Used: <strong>{break3Total} min</strong></span>
                      <span>Remaining Daily Break Balance: <strong>{meter.rem} min</strong></span>
                    </div>
                  )}
                  {isBreak3 ? (
                    <button
                      type="button"
                      className={`break-btn ${isOnBreak ? "btn-end" : "btn-start"}`}
                      onClick={handleBreak3Session}
                      disabled={!isOnBreak && !canStartBreak3}
                    >
                      <i className={`fas ${isOnBreak ? "fa-stop" : "fa-play"}`} />
                      {isOnBreak ? "End Break 3" : "Start Break 3"}
                    </button>
                  ) : isDone ? (
                    <button type="button" className="break-btn btn-done" disabled>
                      <i className="fas fa-check" /> {dur} min done
                    </button>
                  ) : isOnBreak ? (
                    <button
                      type="button"
                      className="break-btn btn-end"
                      onClick={() => handleBreak(cfg.key)}
                    >
                      <i className="fas fa-stop" /> End Break
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="break-btn btn-start"
                      onClick={() => handleBreak(cfg.key)}
                      disabled={cannotStartStandard}
                    >
                      <i className="fas fa-play" /> Start Break
                    </button>
                  )}
                  {isBreak3 && (
                    <div className="break3-session-history">
                      <h4>Break 3 Session History</h4>
                      {break3Sessions.length ? (
                        break3Sessions.map((item, index) => (
                          <div className="break3-session-row" key={`${item.start}-${index}`}>
                            <span>Session {index + 1}</span>
                            <strong>{item.start || "--"} - {item.end || (item.start ? "Active" : "--")}</strong>
                            <em>{slotDuration(item)} min</em>
                          </div>
                        ))
                      ) : (
                        <div className="empty-break3-history">No Break 3 sessions used today</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="history-section">
            <div className="hist-header">
              <h3>
                <i className="fas fa-history" /> Break History
              </h3>
              <div className="hist-controls">
                <div className="hist-tabs">
                  {["week", "month", "table"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`hist-tab${histView === v ? " active" : ""}`}
                      onClick={() => {
                        setHistView(v);
                        setHistOffset(0);
                      }}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                {histView !== "table" && (
                  <div className="period-nav">
                    <button
                      type="button"
                      onClick={() => setHistOffset((o) => o - 1)}
                    >
                      <i className="fas fa-chevron-left" />
                    </button>
                    <span className="period-label">{periodLabel}</span>
                    <button
                      type="button"
                      onClick={() => setHistOffset((o) => o + 1)}
                    >
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {histStats && (
              <div className="hist-stats" id="histStats">
                <div className="hstat">
                  <div className="hs-val">{histStats.totalMin}</div>
                  <div className="hs-label">Total Minutes</div>
                </div>
                <div className="hstat">
                  <div className="hs-val">{histStats.avgMin}</div>
                  <div className="hs-label">Avg per Day</div>
                </div>
                <div className="hstat">
                  <div className="hs-val">{histStats.daysWithBreaks}</div>
                  <div className="hs-label">Days with Breaks</div>
                </div>
                <div className="hstat">
                  <div
                    className="hs-val"
                    style={{
                      color: histStats.daysOverLimit ? "#DC2626" : "#16A34A",
                    }}
                  >
                    {histStats.daysOverLimit}
                  </div>
                  <div className="hs-label">Over 60 min</div>
                </div>
              </div>
            )}

            <div id="histContent">{histContent}</div>
          </div>
        </div>
      </div>

      <div
        className={`toast${toast.visible ? " show" : ""}${toast.type ? ` ${toast.type}` : ""}`}
      >
        {toast.msg}
      </div>
    </div>
  );
}
