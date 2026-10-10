import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

function SalesChart({ data }) {
  const chartData = data?.chart || [];
  const totalSales = data?.totalSales || 0;
  const totalReceipts = data?.totalReceipts || 0;
  const totalExpenses = data?.totalExpenses || 0;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "30px",
            fontWeight: "700",
          }}
        >
          Sales & Expenses Overview
        </h2>

        <span
          style={{
            color: "#64748b",
            fontWeight: "600",
          }}
        >
         Revenue Insights
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          display: "flex",
          minHeight: "500px",
        }}
      >
        {/* Chart Section */}
        <div
          style={{
            flex: 1,
            padding: "25px",
          }}
        >
          <ResponsiveContainer
            width="100%"
            height={400}
          >
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
              />

              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip formatter={(v) => fmt(v)} />

              <Legend />

              <Bar
                dataKey="sales"
                fill="#2563eb"
                name="Sales"
                radius={[6, 6, 0, 0]}
              />

              <Bar
                dataKey="receipts"
                fill="#22c55e"
                name="Receipts"
                radius={[6, 6, 0, 0]}
              />

              <Bar
                dataKey="expenses"
                fill="#ef4444"
                name="Expenses"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Right Summary Panel */}
        <div
          style={{
            width: "260px",
            borderLeft: "1px solid #e5e7eb",
            padding: "30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "40px",
          }}
        >
          <div>
            <h4
              style={{
                color: "#2563eb",
                marginBottom: "8px",
              }}
            >
              Total Sales
            </h4>

            <h2
              style={{
                margin: 0,
              }}
            >
              {fmt(totalSales)}
            </h2>
          </div>

          <div>
            <h4
              style={{
                color: "#22c55e",
                marginBottom: "8px",
              }}
            >
              Total Receipts
            </h4>

            <h2
              style={{
                margin: 0,
              }}
            >
              {fmt(totalReceipts)}
            </h2>
          </div>

          <div>
            <h4
              style={{
                color: "#ef4444",
                marginBottom: "8px",
              }}
            >
              Total Expenses
            </h4>

            <h2
              style={{
                margin: 0,
              }}
            >
              {fmt(totalExpenses)}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesChart;