import { useState, useEffect } from "react";
import axios from "axios";
import SalesChart from "./SalesChart";
import RecentInvoices from "./components/RecentInvoices";

import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  TextField,
  MenuItem,
} from "@mui/material";
import PaidIcon from "@mui/icons-material/Paid";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonIcon from "@mui/icons-material/Person";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
const API = axios.create({
  baseURL:  "http://localhost:5000/api"
});

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

function Dashboard() {
  const [kpis, setKpis] = useState({
    totalCustomers: 0,
    totalInvoices: 0,
    paymentsReceived: 0,
    pendingAmount: 0,

  });
  const [chartData, setChartData] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());   // NEW
  const user = JSON.parse(
  localStorage.getItem("vjc_invoice_user")
);
const hour = new Date().getHours();

let greeting = "Good Evening";

if (hour < 12) {
  greeting = "Good Morning";
} else if (hour < 17) {
  greeting = "Good Afternoon";
} else {
  greeting = "Good Evening";
}
  useEffect(() => {
    fetchAll();
  }, [selectedYear]);   // CHANGED — refetch when year changes

const fetchAll = async () => {
  setLoading(true);
  const token = localStorage.getItem("vjc_invoice_auth");
  const config = { headers: { Authorization: `Bearer ${token}` } };

  try {
    const kpiRes = await API.get("/dashboard/kpis", config);
    setKpis(kpiRes.data.data);
  } catch (err) {
    console.log("KPI Error", err);
  }

  try {
    const chartRes = await API.get(`/dashboard/sales-overview?year=${selectedYear}`, config);   // CHANGED — pass year
    setChartData(chartRes.data.data);
  } catch (err) {
    console.log("Chart Error", err);
  }
  try {
    const invRes = await API.get("/dashboard/recent-invoices", config);
    setRecentInvoices(invRes.data.data || []);
  } catch (err) {
    console.log("Invoice Error", err);
  }

  setLoading(false);
};
    const cards = [
    { title: "Total Customers", value: kpis.totalCustomers, icon: <GroupsIcon sx={{ fontSize: 18 }} />, color: "#185FA5", bg: "#E6F1FB" },
    { title: "Total Invoices", value: kpis.totalInvoices, icon: <ReceiptLongIcon sx={{ fontSize: 18 }} />, color: "#534AB7", bg: "#EEEDFE" },
    { title: "Payments Received", value: fmt(kpis.paymentsReceived), icon: <PaidIcon sx={{ fontSize: 18 }} />, color: "#3B6D11", bg: "#EAF3DE" },
    { title: "Pending Amount", value: fmt(kpis.pendingAmount), icon: <HourglassEmptyIcon sx={{ fontSize: 18 }} />, color: "#A32D2D", bg: "#FCEBEB" },
  ];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      {/* Welcome Banner */}

            <Box
        sx={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          p: 3,
          borderRadius: 4,
          mb: 4,
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexWrap: "wrap",
          boxShadow: "0px 4px 12px rgba(0,0,0,0.06)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "#1e3a8a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PersonIcon sx={{ color: "#fff", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ whiteSpace: "nowrap" }}>
              {greeting}, <span style={{ color: "#F5820C" }}>{user?.role === "chairman" ? "Dr.Mani" : (user?.name || "User")}</span> 👋
            </Typography>
            <Typography sx={{ fontSize: "13px", color: "#6b7280", whiteSpace: "nowrap" }}>
              Welcome back to VJC Invoice Software
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap", mt: 0.3 }}>
              📅 {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}  •  🕐 {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ width: "1px", alignSelf: "stretch", background: "#e5e7eb" }} />

                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Box sx={{ borderLeft: "4px solid #F5820C", borderRadius: "8px", px: 2.5, py: 1.75, display: "flex", alignItems: "center", gap: 2, background: "#fff", boxShadow: "0px 2px 6px rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
            <Box sx={{ width: 42, height: 42, borderRadius: "10px", background: "#FEF3E8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <PaidIcon sx={{ color: "#F5820C", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: "#111827" }}>{fmt(kpis.paymentsReceived)}</Typography>
              <Typography sx={{ fontSize: "12px", color: "#F5820C", fontWeight: 600 }}>Total Revenue</Typography>
            </Box>
          </Box>

          <Box sx={{ borderLeft: "4px solid #dc2626", borderRadius: "8px", px: 2.5, py: 1.75, display: "flex", alignItems: "center", gap: 2, background: "#fff", boxShadow: "0px 2px 6px rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
            <Box sx={{ width: 42, height: 42, borderRadius: "10px", background: "#FEECEC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <HourglassEmptyIcon sx={{ color: "#dc2626", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: "#111827" }}>{fmt(kpis.pendingAmount)}</Typography>
              <Typography sx={{ fontSize: "12px", color: "#dc2626", fontWeight: 600 }}>Pending Amount</Typography>
            </Box>
          </Box>

          <Box sx={{ borderLeft: "4px solid #16a34a", borderRadius: "8px", px: 2.5, py: 1.75, display: "flex", alignItems: "center", gap: 2, background: "#fff", boxShadow: "0px 2px 6px rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
            <Box sx={{ width: 42, height: 42, borderRadius: "10px", background: "#EAF7EE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <GroupsIcon sx={{ color: "#16a34a", fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ color: "#111827" }}>{kpis.totalCustomers}</Typography>
              <Typography sx={{ fontSize: "12px", color: "#16a34a", fontWeight: 600 }}>Total Customers</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
      {/* Business Overview */}

<Typography
  variant="h4"
  fontWeight="700"
  sx={{
    mb: 4,
    mt: 2,
    color: "#111827",
  }}
>
  Business Overview
</Typography>

      {/* KPI Cards */}

            <Grid container spacing={3}>
        {cards.map((card) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={3}
            key={card.title}
          >
            <Card
              sx={{
                borderRadius: 2,
                borderLeft: `4px solid ${card.color}`,
                boxShadow:
                  "0px 4px 12px rgba(0,0,0,0.08)",
                minHeight: "110px",
                transition: "0.3s",
                display: "flex",
                alignItems: "center",
                "&:hover": {
                  transform: "translateY(-5px)",
                },
              }}
            >
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%" }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: "10px",
                    background: card.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: card.color,
                  }}
                >
                  {card.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap" }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{ fontSize: "16px", whiteSpace: "nowrap" }}
                  >
                    {card.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Sales Chart */}

     <Box sx={{ mt: 5, display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <TextField
          select size="small" label="Year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          sx={{ width: 130 }}
        >
          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + 9 - i).map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
      </Box>
     <Box sx={{ mt: 1 }}>
  <SalesChart data={chartData} />
</Box>

<Box sx={{ mt: 5 }}>
  <RecentInvoices invoices={recentInvoices} />
</Box>


    </div>
  );
}

export default Dashboard;