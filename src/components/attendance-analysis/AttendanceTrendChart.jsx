import { useChart } from "./useChart";
import { CALENDAR_STATUS_COLORS } from "../../utils/calendarStatusColors";

const GOLD_LEGEND = { color: "#64748B", font: { size: 11, family: "Inter" } };
const GRID_X = { ticks: { color: "#64748B" }, grid: { color: "#E5E7EB" } };
const GRID_Y = { ticks: { color: "#64748B" }, grid: { color: "#E5E7EB" } };

/** Branch-level 6-month trends — present / late / absent (optional) */
export function BranchTrendsChart({ trends }) {
  const labels = (trends || []).map((t) => t.month);
  const present = (trends || []).map((t) => Number(t.present) || 0);
  const late = (trends || []).map((t) => Number(t.late) || 0);
  const absent = (trends || []).map((t) => Number(t.absent) || 0);

  const canvasRef = useChart(
    () => ({
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Present",
            data: present,
            borderColor: CALENDAR_STATUS_COLORS.present.border,
            backgroundColor: CALENDAR_STATUS_COLORS.present.background,
            fill: true,
            tension: 0.3,
          },
          {
            label: "Late",
            data: late,
            borderColor: CALENDAR_STATUS_COLORS.late.border,
            backgroundColor: CALENDAR_STATUS_COLORS.late.background,
            fill: true,
            tension: 0.3,
          },
          {
            label: "Absent",
            data: absent,
            borderColor: CALENDAR_STATUS_COLORS.absent.border,
            backgroundColor: CALENDAR_STATUS_COLORS.absent.background,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { labels: GOLD_LEGEND } },
        scales: { x: GRID_X, y: GRID_Y },
      },
    }),
    [labels.join(","), present.join(","), late.join(","), absent.join(",")]
  );

  if (!trends?.length) {
    return (
      <p className="analysis-empty-chart">No trend data for this branch</p>
    );
  }

  return <canvas ref={canvasRef} />;
}

/** Individual: check-in time line chart */
export function CheckInChart({ records }) {
  const presentRecs = (records || []).filter((r) => r?.date && r?.checkIn && r.checkIn !== "--");
  const labels = presentRecs.map((r) => parseInt(r.date.slice(8, 10), 10));
  const ciData = presentRecs.map((r) => {
    const [h, mi] = r.checkIn.split(":").map(Number);
    return parseFloat((h + mi / 60).toFixed(2));
  });

  const canvasRef = useChart(
    () => ({
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Check-In (hr)",
            data: ciData,
            borderColor: CALENDAR_STATUS_COLORS.late.border,
            backgroundColor: CALENDAR_STATUS_COLORS.late.background,
            pointBackgroundColor: CALENDAR_STATUS_COLORS.late.border,
            pointRadius: 4,
            fill: true,
            tension: 0.3,
          },
          {
            label: "9:00 AM",
            data: labels.map(() => 9),
            borderColor: CALENDAR_STATUS_COLORS.absent.border,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 400 },
        scales: {
          x: {
            title: { display: true, text: "Date", color: "#64748B" },
            ...GRID_X,
          },
          y: {
            title: { display: true, text: "Hour", color: "#64748B" },
            ticks: {
              color: "#64748B",
              callback: (v) => `${v}:00`,
            },
            min: 7,
            max: 12,
            grid: { color: "#E5E7EB" },
          },
        },
        plugins: { legend: { labels: GOLD_LEGEND } },
      },
    }),
    [labels.join(","), ciData.join(",")]
  );

  return <canvas ref={canvasRef} />;
}

/** Individual: daily break duration bar chart */
export function BreakDurationChart({ records }) {
  const safeRecords = (records || []).filter((r) => r?.date);
  const labels = safeRecords.map((r) => parseInt(r.date.slice(8, 10), 10));
  const breakData = safeRecords.map((r) => Number(r.breaks) || 0);
  const breakColors = breakData.map((v) =>
    v > 60 ? CALENDAR_STATUS_COLORS.absent.border : CALENDAR_STATUS_COLORS.present.border
  );

  const canvasRef = useChart(
    () => ({
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Break (min)",
            data: breakData,
            backgroundColor: breakColors,
          },
          {
            label: "60 min limit",
            data: labels.map(() => 60),
            type: "line",
            borderColor: CALENDAR_STATUS_COLORS.absent.border,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 400 },
        scales: { x: GRID_X, y: GRID_Y },
        plugins: { legend: { labels: GOLD_LEGEND } },
      },
    }),
    [labels.join(","), breakData.join(",")]
  );

  return <canvas ref={canvasRef} />;
}

/** Break analytics: trend line with 60m limit */
export function AttendanceTrendChart({ labels, values }) {
  const canvasRef = useChart(
    () => ({
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Break (min)",
            data: values,
            borderColor: CALENDAR_STATUS_COLORS.late.border,
            backgroundColor: CALENDAR_STATUS_COLORS.late.background,
            fill: true,
            tension: 0.3,
          },
          {
            label: "60 min limit",
            data: labels.map(() => 60),
            borderColor: CALENDAR_STATUS_COLORS.absent.border,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        animation: { duration: 300 },
        scales: { x: GRID_X, y: GRID_Y },
        plugins: { legend: { labels: GOLD_LEGEND } },
      },
    }),
    [labels.join(","), values.join(",")]
  );

  return <canvas ref={canvasRef} />;
}

export function WeekHoursChart({ labels, hoursData }) {
  const canvasRef = useChart(
    () => ({
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Hours Worked", data: hoursData, backgroundColor: CALENDAR_STATUS_COLORS.present.background, borderColor: CALENDAR_STATUS_COLORS.present.border },
        ],
      },
      options: {
        responsive: true,
        animation: { duration: 300 },
        scales: { x: GRID_X, y: GRID_Y },
        plugins: { legend: { labels: GOLD_LEGEND } },
      },
    }),
    [labels.join(","), hoursData.join(",")]
  );

  return <canvas ref={canvasRef} />;
}

export function WeekBreakChart({ labels, breakData }) {
  const canvasRef = useChart(
    () => ({
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Break (min)", data: breakData, backgroundColor: CALENDAR_STATUS_COLORS.holiday.background, borderColor: CALENDAR_STATUS_COLORS.holiday.border },
        ],
      },
      options: {
        responsive: true,
        animation: { duration: 300 },
        scales: { x: GRID_X, y: GRID_Y },
        plugins: { legend: { labels: GOLD_LEGEND } },
      },
    }),
    [labels.join(","), breakData.join(",")]
  );

  return <canvas ref={canvasRef} />;
}

export function BreakPieChart({ pieData }) {
  const canvasRef = useChart(
    () => ({
      type: "doughnut",
      data: {
        labels: ["Break1", "Lunch", "Break2", "Break3"],
        datasets: [
          {
            data: pieData,
            backgroundColor: [
              CALENDAR_STATUS_COLORS.late.background,
              CALENDAR_STATUS_COLORS.present.background,
              CALENDAR_STATUS_COLORS.holiday.background,
              CALENDAR_STATUS_COLORS.absent.background,
            ],
          },
        ],
      },
      options: {
        animation: { duration: 300 },
        plugins: { legend: { labels: GOLD_LEGEND } },
      },
    }),
    [pieData.join(",")]
  );

  return <canvas ref={canvasRef} />;
}

export default AttendanceTrendChart;
