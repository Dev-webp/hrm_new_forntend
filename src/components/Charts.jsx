import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";

function AttendanceTrendChart({ labels, present, late, absent }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Present",
            data: present,
            backgroundColor: "rgba(34,197,94,0.7)",
            borderRadius: 3,
          },
          {
            label: "Late",
            data: late,
            backgroundColor: "rgba(245,158,11,0.7)",
            borderRadius: 3,
          },
          {
            label: "Absent",
            data: absent,
            backgroundColor: "rgba(239,68,68,0.5)",
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: { color: "#8890b0", font: { size: 10 } },
          },
        },
        scales: {
          x: {
            stacked: true,
            ticks: { color: "#8890b0", font: { size: 9 } },
            grid: { color: "rgba(255,255,255,0.03)" },
          },
          y: {
            stacked: true,
            ticks: { color: "#8890b0", font: { size: 9 } },
            grid: { color: "rgba(255,255,255,0.05)" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [labels, present, late, absent]);

  return <canvas ref={canvasRef} />;
}

function StatusPieChart({ full, half, late, absent }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: ["Full Day", "Half Day", "Late", "Absent"],
        datasets: [
          {
            data: [full, half, late, absent],
            backgroundColor: ["#22c55e", "#86efac", "#f59e0b", "#ef4444"],
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: "#8890b0", font: { size: 10 }, padding: 10 },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [full, half, late, absent]);

  return <canvas ref={canvasRef} />;
}

function EmployeeDonut({ employeeId, attPct, ringColor }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [attPct, 100 - attPct],
            backgroundColor: [ringColor, "rgba(255,255,255,0.05)"],
            borderWidth: 0,
            borderRadius: 3,
          },
        ],
      },
      options: {
        cutout: "72%",
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        animation: { duration: 600 },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [employeeId, attPct, ringColor]);

  return (
    <canvas ref={canvasRef} width={88} height={88} aria-hidden="true" />
  );
}

export { AttendanceTrendChart, StatusPieChart, EmployeeDonut };
