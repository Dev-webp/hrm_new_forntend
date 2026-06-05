import { useChart } from "./useChart";

const GOLD_LEGEND = { color: "#D4AF37", font: { size: 11 } };
const GRID_X = { ticks: { color: "#9B9EC2" }, grid: { color: "rgba(255,255,255,0.04)" } };
const GRID_Y = { ticks: { color: "#9B9EC2" }, grid: { color: "rgba(255,255,255,0.04)" } };

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
            borderColor: "#4ADE80",
            backgroundColor: "rgba(74,222,128,0.1)",
            fill: true,
            tension: 0.3,
          },
          {
            label: "Late",
            data: late,
            borderColor: "#FFB347",
            backgroundColor: "rgba(255,179,71,0.08)",
            fill: true,
            tension: 0.3,
          },
          {
            label: "Absent",
            data: absent,
            borderColor: "#FF6B6B",
            backgroundColor: "rgba(255,107,107,0.08)",
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
  const presentRecs = (records || []).filter((r) => r.checkIn !== "--");
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
            borderColor: "#D4AF37",
            backgroundColor: "rgba(212,175,55,0.08)",
            pointBackgroundColor: "#D4AF37",
            pointRadius: 4,
            fill: true,
            tension: 0.3,
          },
          {
            label: "9:00 AM",
            data: labels.map(() => 9),
            borderColor: "#FF6B6B",
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
            title: { display: true, text: "Date", color: "#9B9EC2" },
            ...GRID_X,
          },
          y: {
            title: { display: true, text: "Hour", color: "#9B9EC2" },
            ticks: {
              color: "#9B9EC2",
              callback: (v) => `${v}:00`,
            },
            min: 7,
            max: 12,
            grid: { color: "rgba(255,255,255,0.04)" },
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
  const labels = (records || []).map((r) => parseInt(r.date.slice(8, 10), 10));
  const breakData = (records || []).map((r) => r.breaks);
  const breakColors = breakData.map((v) => (v > 60 ? "#FF6B6B" : "#4ADE80"));

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
            borderColor: "#FF6B6B",
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
            borderColor: "#D4AF37",
            backgroundColor: "rgba(212,175,55,0.08)",
            fill: true,
            tension: 0.3,
          },
          {
            label: "60 min limit",
            data: labels.map(() => 60),
            borderColor: "#FF6B6B",
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
        plugins: { legend: { labels: { color: "#D4AF37" } } },
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
          { label: "Hours Worked", data: hoursData, backgroundColor: "#D4AF37" },
        ],
      },
      options: {
        responsive: true,
        animation: { duration: 300 },
        scales: { x: GRID_X, y: GRID_Y },
        plugins: { legend: { labels: { color: "#D4AF37" } } },
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
          { label: "Break (min)", data: breakData, backgroundColor: "#4A8FE8" },
        ],
      },
      options: {
        responsive: true,
        animation: { duration: 300 },
        scales: { x: GRID_X, y: GRID_Y },
        plugins: { legend: { labels: { color: "#D4AF37" } } },
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
            backgroundColor: ["#D4AF37", "#4ADE80", "#FFB347", "#818cf8"],
          },
        ],
      },
      options: {
        animation: { duration: 300 },
        plugins: { legend: { labels: { color: "#D4AF37" } } },
      },
    }),
    [pieData.join(",")]
  );

  return <canvas ref={canvasRef} />;
}

export default AttendanceTrendChart;
