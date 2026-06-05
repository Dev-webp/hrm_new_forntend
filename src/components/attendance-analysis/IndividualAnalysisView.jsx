import { useMemo, useState } from "react";
import AttendanceAnalysisCards from "./AttendanceAnalysisCards";
import AttendanceCalendarHeatmap from "./AttendanceCalendarHeatmap";
import {
  AttendanceTrendChart,
  BreakDurationChart,
  BreakPieChart,
  CheckInChart,
  WeekBreakChart,
  WeekHoursChart,
} from "./AttendanceTrendChart";
import {
  ANALYSIS_TABS,
  WEEK_FILTER_OPTIONS,
  computeOverviewStats,
  dayName,
  formatDateReadable,
  formatDateYMD,
  formatTimeDisplay,
  getDailyLogStatus,
  getWeekNumber,
} from "../../utils/attendanceAnalysisHelpers";

function WeekFilter({ id, value, onChange }) {
  return (
    <div className="week-filter" id={id}>
      {WEEK_FILTER_OPTIONS.map((w) => (
        <button
          key={w.value}
          type="button"
          data-week={w.value}
          className={value === w.value ? "active" : ""}
          onClick={() => onChange(w.value)}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}

function IndividualAnalysisView({
  employee,
  records,
  leaves,
  monthStr,
  weeksCache,
  loading,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [weekOffset, setWeekOffset] = useState(0);
  const [dailyWeekFilter, setDailyWeekFilter] = useState("all");
  const [breakWeekFilter, setBreakWeekFilter] = useState("all");

  const overview = useMemo(
    () => computeOverviewStats(records || []),
    [records]
  );

  const overviewKpis = [
    { label: "Attendance Rate", value: `${overview.attRate}%` },
    { label: "Present Days", value: overview.presentDays },
    { label: "Late Arrivals", value: overview.lateDays },
    { label: "Break Exceeded", value: overview.exceed },
  ];

  const week = weeksCache[weekOffset];
  const weekView = useMemo(() => {
    if (!week) return { daysHtml: [], labels: [], hoursData: [], breakWeek: [] };

    let hoursData = [];
    const labels = [];
    const dayCards = [];
    const totalDays = Math.ceil((week.end - week.start) / 86400000) + 1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(week.start);
      d.setDate(d.getDate() + i);
      const ds = formatDateYMD(d);
      const rec = records.find((r) => r.date === ds);
      const dayLabel = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];

      if (!rec || rec.status === "absent") {
        dayCards.push({
          key: ds,
          dayLabel,
          dayNum: d.getDate(),
          absent: true,
        });
        hoursData.push(0);
        labels.push(dayLabel);
      } else {
        hoursData.push(parseFloat(rec.workHours.toFixed(1)));
        labels.push(dayLabel);
        const badge =
          rec.lateMinutes > 0
            ? "b-late"
            : rec.status === "half_day"
              ? "b-halfday"
              : "b-present";
        const statusLabel =
          rec.lateMinutes > 0
            ? "Late"
            : rec.status === "half_day"
              ? "Half Day"
              : "Present";
        dayCards.push({
          key: ds,
          dayLabel,
          dayNum: d.getDate(),
          checkIn: rec.checkIn,
          checkOut: rec.checkOut,
          badge,
          statusLabel,
        });
      }
    }

    const breakWeek = labels.map((_, i) => {
      const d = new Date(week.start);
      d.setDate(d.getDate() + i);
      const rec = records.find((r) => r.date === formatDateYMD(d));
      return rec ? rec.breaks : 0;
    });

    return { dayCards, labels, hoursData, breakWeek };
  }, [week, records]);

  const dailyFiltered = useMemo(
    () =>
      records.filter(
        (r) =>
          dailyWeekFilter === "all" ||
          getWeekNumber(r.date) == dailyWeekFilter
      ),
    [records, dailyWeekFilter]
  );

  const breakFiltered = useMemo(
    () =>
      records.filter(
        (r) =>
          breakWeekFilter === "all" ||
          getWeekNumber(r.date) == breakWeekFilter
      ),
    [records, breakWeekFilter]
  );

  const breakStats = useMemo(() => {
    const workFiltered = breakFiltered.filter(
      (r) => !["absent", "sunday", "holiday"].includes(r.status)
    );
    let sumB1 = 0;
    let sumL = 0;
    let sumB2 = 0;
    let sumB3 = 0;
    workFiltered.forEach((r) => {
      sumB1 += r.breakMins.b1;
      sumL += r.breakMins.lunch;
      sumB2 += r.breakMins.b2;
      sumB3 += r.breakMins.b3;
    });
    const totalBreak = sumB1 + sumL + sumB2 + sumB3;
    const avg = workFiltered.length
      ? Math.round(totalBreak / workFiltered.length)
      : 0;
    const exceed = workFiltered.filter((r) => r.breaks > 60).length;
    return { sumB1, sumL, sumB2, sumB3, avg, exceed, workFiltered };
  }, [breakFiltered]);

  const leaveStats = useMemo(() => {
    const DAILY_DEDUCTION = 6400;
    const leavesTaken = leaves.reduce((s, l) => s + (l.days || 0), 0);
    const extra = Math.max(0, leavesTaken - 1);
    const deduction = extra * DAILY_DEDUCTION;
    return { leavesTaken, extra, deduction };
  }, [leaves]);

  if (!employee) return null;

  return (
    <div id="individualView">
      <div className="hero-strip show" id="heroStrip">
        <div className="hero-avatar" id="heroAvatar">
          {employee.initials}
        </div>
        <div className="hero-info">
          <h2 id="heroName">{employee.name}</h2>
          <p id="heroMeta">
            {employee.dept} · {employee.branch}
          </p>
        </div>
        <div className="hero-meta">
          <div className="hero-meta-item">
            <div className="val" id="indPresent">
              {overview.presentDays + overview.halfDays}
            </div>
            <div className="lbl">Present</div>
          </div>
          <div className="hero-meta-item">
            <div className="val" id="indLate">
              {overview.lateDays}
            </div>
            <div className="lbl">Late In</div>
          </div>
          <div className="hero-meta-item">
            <div className="val" id="indAbsent">
              {overview.absent}
            </div>
            <div className="lbl">Absent</div>
          </div>
          <div className="hero-meta-item">
            <div className="val" id="indBreakAvg">
              {overview.avgBreak}m
            </div>
            <div className="lbl">Avg Break</div>
          </div>
          <div className="hero-meta-item">
            <div className="val" id="indAttRate">
              {overview.attRate}%
            </div>
            <div className="lbl">Att. Rate</div>
          </div>
        </div>
      </div>

      <div className="tabs-row">
        {ANALYSIS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
            data-tab={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        id="tab-overview"
        className={`tab-pane${activeTab === "overview" ? " active" : ""}`}
      >
        <AttendanceAnalysisCards items={overviewKpis} loading={loading} />
        <div className="chart-row">
          <div className="card" style={{ maxHeight: 320 }}>
            <div className="chart-subtitle">Check-In Time (Hour of Day)</div>
            <CheckInChart records={records} />
          </div>
          <div className="card" style={{ maxHeight: 320 }}>
            <div className="chart-subtitle">Daily Break Duration (min)</div>
            <BreakDurationChart records={records} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            Attendance Heatmap — hover for details
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
      </div>

      <div
        id="tab-weekly"
        className={`tab-pane${activeTab === "weekly" ? " active" : ""}`}
      >
        <div className="card">
          <div className="card-title">
            Week Overview
            <div className="week-nav">
              <button
                type="button"
                id="prevWeekBtn"
                className="load-btn week-nav-btn"
                disabled={weekOffset === 0}
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                ←
              </button>
              <span id="weekLabel">
                {week
                  ? `${week.start.getDate()}/${week.start.getMonth() + 1} – ${week.end.getDate()}/${week.end.getMonth() + 1}`
                  : "—"}
              </span>
              <button
                type="button"
                id="nextWeekBtn"
                className="load-btn week-nav-btn"
                disabled={weekOffset >= weeksCache.length - 1}
                onClick={() => setWeekOffset((o) => o + 1)}
              >
                →
              </button>
            </div>
          </div>
          <div className="week-cards" id="weekCardsContainer">
            {weekView.dayCards?.map((card) =>
              card.absent ? (
                <div className="week-day-card" key={card.key}>
                  <div>{card.dayLabel}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {card.dayNum}
                  </div>
                  <div style={{ color: "#FF6B6B" }}>Absent</div>
                </div>
              ) : (
                <div className="week-day-card" key={card.key}>
                  <div>{card.dayLabel}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {card.dayNum}
                  </div>
                  <div style={{ fontSize: 10, color: "#9B9EC2" }}>
                    {formatTimeDisplay(card.checkIn)}→
                    {formatTimeDisplay(card.checkOut)}
                  </div>
                  <span
                    className={`badge ${card.badge}`}
                    style={{ marginTop: 4 }}
                  >
                    {card.statusLabel}
                  </span>
                </div>
              )
            )}
          </div>
          <div className="chart-row">
            <div className="card">
              <WeekHoursChart
                labels={weekView.labels}
                hoursData={weekView.hoursData}
              />
            </div>
            <div className="card">
              <WeekBreakChart
                labels={weekView.labels}
                breakData={weekView.breakWeek}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        id="tab-dailylog"
        className={`tab-pane${activeTab === "dailylog" ? " active" : ""}`}
      >
        <div className="card">
          <div className="card-title">
            Complete Day Log
            <WeekFilter
              id="dailyWeekFilter"
              value={dailyWeekFilter}
              onChange={setDailyWeekFilter}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" id="dailyLogTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                  <th>Login</th>
                  <th>Logout</th>
                  <th>Hours</th>
                  <th>Late</th>
                  <th>Break (min)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8}>Loading…</td>
                  </tr>
                ) : (
                  dailyFiltered.map((r) => {
                    const st = getDailyLogStatus(r);
                    return (
                      <tr key={r.date}>
                        <td style={{ color: "#D4AF37" }}>
                          {formatDateReadable(r.date)}
                        </td>
                        <td style={{ color: "#9B9EC2" }}>{dayName(r.date)}</td>
                        <td>
                          <span className={`badge ${st.badge}`}>{st.label}</span>
                        </td>
                        <td>
                          {r.checkIn !== "--"
                            ? formatTimeDisplay(r.checkIn)
                            : "--"}
                        </td>
                        <td>
                          {r.checkOut !== "--"
                            ? formatTimeDisplay(r.checkOut)
                            : "--"}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {r.workHours > 0
                            ? `${r.workHours.toFixed(1)}h`
                            : "--"}
                        </td>
                        <td
                          style={{
                            color: r.lateMinutes > 0 ? "#FFB347" : "#7B8199",
                          }}
                        >
                          {r.lateMinutes > 0 ? `${r.lateMinutes} min` : "--"}
                        </td>
                        <td
                          style={{
                            color: r.breaks > 60 ? "#FF6B6B" : "#4ADE80",
                          }}
                        >
                          {r.breaks > 0 ? r.breaks : "--"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        id="tab-breakanalytics"
        className={`tab-pane${activeTab === "breakanalytics" ? " active" : ""}`}
      >
        <AttendanceAnalysisCards
          items={[
            { label: "Avg Daily Break", value: `${breakStats.avg}m` },
            {
              label: "Days >60m",
              value: breakStats.exceed,
              valueStyle: { color: "#FF6B6B" },
            },
            { label: "Break1 Total", value: `${breakStats.sumB1}m` },
            { label: "Lunch Total", value: `${breakStats.sumL}m` },
            { label: "Break2 Total", value: `${breakStats.sumB2}m` },
            { label: "Break3 Total", value: `${breakStats.sumB3}m` },
          ]}
          loading={loading}
        />
        <div className="chart-row">
          <div className="card">
            <BreakPieChart
              pieData={[
                breakStats.sumB1,
                breakStats.sumL,
                breakStats.sumB2,
                breakStats.sumB3,
              ]}
            />
          </div>
          <div className="card">
            <AttendanceTrendChart
              labels={breakFiltered.map((r) =>
                parseInt(r.date.slice(8, 10), 10)
              )}
              values={breakFiltered.map((r) => r.breaks)}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            Detailed Break Log — Full Month
            <WeekFilter
              id="breakWeekFilter"
              value={breakWeekFilter}
              onChange={setBreakWeekFilter}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" id="breakDetailTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Break 1 In</th>
                  <th>Break 1 Out</th>
                  <th>B1 Dur</th>
                  <th>Lunch In</th>
                  <th>Lunch Out</th>
                  <th>Lunch Dur</th>
                  <th>Break 2 In</th>
                  <th>Break 2 Out</th>
                  <th>B2 Dur</th>
                  <th>Break 3 In</th>
                  <th>Break 3 Out</th>
                  <th>B3 Dur</th>
                  <th>Total (min)</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {breakFiltered.map((r) => {
                  const remaining = Math.max(0, 60 - r.breaks);
                  const isAbsent = r.status === "absent";
                  const bCell = (v) =>
                    v === "—" ? (
                      <span style={{ color: "#3A3D55" }}>—</span>
                    ) : (
                      <span className="break-time-cell">{v}</span>
                    );
                  const dCell = (d) =>
                    d > 0 ? (
                      <span className="break-dur">{d}m</span>
                    ) : (
                      <span style={{ color: "#3A3D55" }}>0m</span>
                    );

                  return (
                    <tr
                      key={r.date}
                      style={isAbsent ? { opacity: 0.4 } : undefined}
                    >
                      <td style={{ color: "#D4AF37" }}>
                        {formatDateReadable(r.date)}
                      </td>
                      <td style={{ color: "#9B9EC2" }}>{dayName(r.date)}</td>
                      <td>{bCell(r.breakDetails.b1.in)}</td>
                      <td>{bCell(r.breakDetails.b1.out)}</td>
                      <td>{dCell(r.breakMins.b1)}</td>
                      <td>{bCell(r.breakDetails.lunch.in)}</td>
                      <td>{bCell(r.breakDetails.lunch.out)}</td>
                      <td>{dCell(r.breakMins.lunch)}</td>
                      <td>{bCell(r.breakDetails.b2.in)}</td>
                      <td>{bCell(r.breakDetails.b2.out)}</td>
                      <td>{dCell(r.breakMins.b2)}</td>
                      <td>{bCell(r.breakDetails.b3.in)}</td>
                      <td>{bCell(r.breakDetails.b3.out)}</td>
                      <td>{dCell(r.breakMins.b3)}</td>
                      <td
                        style={{
                          fontWeight: 700,
                          color: r.breaks > 60 ? "#FF6B6B" : "#F0F2F8",
                        }}
                      >
                        {r.breaks || 0}m
                      </td>
                      <td
                        style={{
                          color: remaining <= 0 ? "#FF6B6B" : "#4ADE80",
                        }}
                      >
                        {remaining}m
                      </td>
                      <td>
                        {isAbsent ? (
                          <span className="badge b-absent">Absent</span>
                        ) : r.breaks > 60 ? (
                          <span className="badge b-absent">Exceeded</span>
                        ) : (
                          <span className="badge b-present">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        id="tab-leavesalary"
        className={`tab-pane${activeTab === "leavesalary" ? " active" : ""}`}
      >
        <div className="card">
          <div className="card-title">Leave Balance & Salary Impact</div>
          <AttendanceAnalysisCards
            items={[
              { label: "Leaves Taken", value: leaveStats.leavesTaken },
              {
                label: "Paid Leaves Left",
                value: Math.max(0, 1 - leaveStats.leavesTaken),
              },
              { label: "Extra Days", value: leaveStats.extra },
              {
                label: "Salary Deduction",
                value: `₹${leaveStats.deduction.toLocaleString("en-IN")}`,
                valueStyle: { fontSize: 22 },
              },
            ]}
          />
          <div className="leave-policy-box">
            <i className="fas fa-info-circle" />
        
          </div>
          <div style={{ marginTop: 24 }}>
            <div className="card-title">Approved Leaves</div>
            <table className="data-table" id="leaveTable">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!leaves.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ color: "#9B9EC2", textAlign: "center" }}
                    >
                      No approved leaves
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id || `${l.from_date}-${l.to_date}`}>
                      <td>{l.leave_type}</td>
                      <td>{formatDateReadable(l.from_date.slice(0, 10))}</td>
                      <td>{formatDateReadable(l.to_date.slice(0, 10))}</td>
                      <td>{l.days}</td>
                      <td>{l.reason || "—"}</td>
                      <td>
                        <span className="badge b-present">{l.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndividualAnalysisView;
