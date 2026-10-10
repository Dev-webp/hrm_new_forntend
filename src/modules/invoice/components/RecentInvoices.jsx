import { useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Box,
  Button,
} from "@mui/material";

const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

function RecentInvoices({ invoices = [] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? invoices : invoices.slice(0, 5);

  return (
    <Paper
      sx={{
        mt: 5,
        p: 3,
        borderRadius: 4,
        boxShadow: "0px 6px 15px rgba(0,0,0,0.08)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          Recent Invoices
        </Typography>

        <Button
          variant="text"
          onClick={() => setShowAll(v => !v)}
          sx={{
            fontWeight: "bold",
            textTransform: "none",
            color: "#2563eb",
            fontSize: "15px",
          }}
        >
          {showAll ? "Show Less ↑" : "View All →"}
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
                        <TableRow>
              <TableCell sx={{ borderRight: "1px solid #e5e7eb" }}><b>Invoice No</b></TableCell>
              <TableCell sx={{ borderRight: "1px solid #e5e7eb" }}><b>Original Invoice</b></TableCell>
<TableCell sx={{ borderRight: "1px solid #e5e7eb" }}><b>Customer Name</b></TableCell>
              <TableCell align="right" sx={{ borderRight: "1px solid #e5e7eb" }}><b>Amount</b></TableCell>
              <TableCell align="right" sx={{ borderRight: "1px solid #e5e7eb" }}><b>Paid</b></TableCell>
              <TableCell><b>Status</b></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
<TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                  No invoices yet
                </TableCell>
              </TableRow>
            ) : displayed.map((invoice) => (
              <TableRow
                key={invoice.invoiceNo}
                hover
                sx={{ "&:hover": { backgroundColor: "#f8fafc" } }}
              >
                <TableCell sx={{ color: "#2563eb", fontWeight: 600, cursor: "pointer", borderRight: "1px solid #e5e7eb" }}>
                  {invoice.invoiceNo}
                </TableCell>

                <TableCell sx={{ borderRight: "1px solid #e5e7eb" }}>
  {invoice.original_invoice_number ? invoice.original_invoice_number : "Original"}
</TableCell>
<TableCell sx={{ borderRight: "1px solid #e5e7eb" }}>{invoice.customerName}</TableCell>

                <TableCell align="right" sx={{ fontWeight: 700, borderRight: "1px solid #e5e7eb" }}>
                  {fmt(invoice.amount)}
                </TableCell>

                <TableCell align="right" sx={{ fontWeight: 700, color: "#16a34a", borderRight: "1px solid #e5e7eb" }}>
                  {fmt(invoice.paidAmount)}
                </TableCell>

                <TableCell>
                  <Chip
                    label={invoice.status}
                    color={
                      invoice.status === "Paid"
                        ? "success"
                        : invoice.status === "Overdue"
                        ? "error"
                        : "warning"
                    }
                    size="small"
                    sx={{ fontWeight: "bold" }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default RecentInvoices;
