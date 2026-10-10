import { useState, useEffect } from "react";
import axios from "axios";

import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Pagination,
} from "@mui/material";

const API_BASE = "http://localhost:5000/api/items";
// ✅ Indian currency format
const formatPrice = (value) => {
  if (!value) return "₹0";
  return Number(value).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
};

// ✅ GST calculate
const calcGST = (price, gstPercent) => {
  const p = parseFloat(price) || 0;
  const g = parseFloat(gstPercent) || 0;
  return Math.round((p * g) / 100);
};

function Items() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total_items: 0, active_items: 0, total_revenue: 0 });
const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Snackbar
  const [snack, setSnack] = useState({ open: false, message: "", severity: "success" });
  const showSnack = (message, severity = "success") => setSnack({ open: true, message, severity });

  // Dialogs
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const emptyForm = {
    serviceName: "",
    category: "",
    country: "",
    price: "",
    gst: "18",
    duration: "",
    documents: "",
    description: "",
    status: "Active",
  };

  const [newItem, setNewItem] = useState(emptyForm);
const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("vjc_invoice_auth")}` } });
  // ✅ Fetch items from backend
  const fetchItems = async () => {
    setLoading(true);
    try {
const res = await axios.get(API_BASE, {
  params: { search: search || undefined, page, limit: 25 },
  ...authHeader()
});
      if (res.data.success) {
        setItems(res.data.items || []);
        setStats(res.data.stats || {});
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      showSnack("Failed to load services!", "error");
    } finally {
      setLoading(false);
    }
  };

  // Search change ayyappudu refetch
  useEffect(() => {
    const timer = setTimeout(() => fetchItems(), 300);
    return () => clearTimeout(timer);
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // ✅ Validation
  const validate = (item) => {
    const e = {};
    if (!item.serviceName?.trim()) e.serviceName = "Service name required";
    if (!item.category) e.category = "Category required";
    if (!item.country?.trim()) e.country = "Country required";
    if (!item.price || isNaN(item.price) || Number(item.price) <= 0)
      e.price = "Valid price required";
    return e;
  };

  // ✅ camelCase → snake_case convert for backend
  const toBackend = (item) => ({
  service_name: item.serviceName || item.service_name,
  category: item.category,
  country: item.country,
  price: item.price,
  gst: item.gst,
  documents: item.documents,
  description: item.description,
  status: item.status,
});

  // ✅ Add item → POST
  const handleAddItem = async () => {
    const e = validate(newItem);
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    try {
      const res = await axios.post(API_BASE, toBackend(newItem), authHeader());
      if (res.data.success) {
        showSnack("Service added successfully! ✅");
        setNewItem(emptyForm);
        setErrors({});
        setOpen(false);
        fetchItems();
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to add service!", "error");
    }
  };

  // ✅ Edit save → PUT
  const handleEditSave = async () => {
    const e = validate(editItem);
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    try {
    const res = await axios.put(`${API_BASE}/${editItem.id}`, toBackend(editItem), authHeader());
      if (res.data.success) {
        showSnack("Service updated successfully! ✅");
        setErrors({});
        setEditOpen(false);
        setEditItem(null);
        fetchItems();
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to update service!", "error");
    }
  };

  // ✅ Delete → DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;
    try {
const res = await axios.delete(`${API_BASE}/${id}`, authHeader());
      if (res.data.success) {
        showSnack("Service deleted successfully! 🗑️");
        fetchItems();
      }
    } catch (err) {
      showSnack("Failed to delete service!", "error");
    }
  };

  // ✅ Status toggle → PUT
  const handleStatusToggle = async (item) => {
    const newStatus = item.status === "Active" ? "Inactive" : "Active";
    try {
      await axios.put(`${API_BASE}/${item.id}`, toBackend({ ...item, status: newStatus }), authHeader());
      fetchItems();
    } catch (err) {
      showSnack("Failed to update status!", "error");
    }
  };

  // ✅ Reusable form fields
  const renderFormFields = (formData, setFormData) => (
    <>
      <TextField
        fullWidth margin="normal" label="Service Name *"
        value={formData.serviceName}
        error={!!errors.serviceName} helperText={errors.serviceName}
        onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
      />
      <TextField
        fullWidth margin="normal" label="Category *"
        placeholder="e.g. Canada PR Visa"
        value={formData.category}
        error={!!errors.category} helperText={errors.category}
        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
      />

      <TextField
        fullWidth margin="normal" label="Country *"
        value={formData.country}
        error={!!errors.country} helperText={errors.country}
        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
      />

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth margin="normal" label="Price (₹) *"
            value={formData.price}
            error={!!errors.price}
            helperText={errors.price || (formData.price ? `GST: ₹${calcGST(formData.price, formData.gst).toLocaleString("en-IN")}` : "")}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            select fullWidth margin="normal" label="GST %"
            value={formData.gst}
            onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
          >
            <MenuItem value="0">0% (Exempt)</MenuItem>
            <MenuItem value="5">5%</MenuItem>
            <MenuItem value="12">12%</MenuItem>
            <MenuItem value="18">18%</MenuItem>
            <MenuItem value="28">28%</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {formData.price && Number(formData.price) > 0 && (
        <Box sx={{ bgcolor: "#f0f7ff", p: 1.5, borderRadius: 1, mt: 0.5, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Base: {formatPrice(formData.price)} &nbsp;+&nbsp;
            GST ({formData.gst}%): ₹{calcGST(formData.price, formData.gst).toLocaleString("en-IN")} &nbsp;=&nbsp;
            <strong>Total: {formatPrice(Number(formData.price) + calcGST(formData.price, formData.gst))}</strong>
          </Typography>
        </Box>
      )}

      
      <TextField
        fullWidth multiline rows={2} margin="normal" label="Required Documents"
        value={formData.documents}
        onChange={(e) => setFormData({ ...formData, documents: e.target.value })}
      />
      <TextField
        fullWidth multiline rows={2} margin="normal" label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />
      <TextField
        select fullWidth margin="normal" label="Status"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
      >
        <MenuItem value="Active">Active</MenuItem>
        <MenuItem value="Inactive">Inactive</MenuItem>
      </TextField>
    </>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Services 
      </Typography>

      {/* ✅ Stats Cards — backend stats use chestundi */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderLeft: "4px solid #1976d2" }}>
            <CardContent>
              <Typography color="text.secondary">Total Services</Typography>
              <Typography variant="h5" fontWeight="bold">{stats.total_items || items.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderLeft: "4px solid #2e7d32" }}>
            <CardContent>
              <Typography color="text.secondary">Active Services</Typography>
              <Typography variant="h5" fontWeight="bold">{stats.active_items || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderLeft: "4px solid #ed6c02" }}>
            <CardContent>
              <Typography color="text.secondary">Most Sold</Typography>
              <Typography variant="h5" fontWeight="bold">
  {stats.most_sold || "-"}
</Typography>
            </CardContent>
          </Card>
        </Grid>
        
      </Grid>

      {/* ✅ Search + Add */}
      <Box sx={{ display: "flex", justifyContent: "space-between", my: 4 }}>
        <TextField
          label="Search Service"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: "300px" }}
        />
        <Button variant="contained" onClick={() => { setErrors({}); setOpen(true); }}>
          + Add Service
        </Button>
      </Box>

      {/* ✅ Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell><strong>Service</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell><strong>Country</strong></TableCell>
                <TableCell><strong>Price</strong></TableCell>
                <TableCell><strong>GST</strong></TableCell>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No services found. "+ Add Service" To create a new service!
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.service_name || item.serviceName}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.country}</TableCell>
                    <TableCell>{formatPrice(item.price)}</TableCell>
                    <TableCell>{item.gst || 18}%</TableCell>
                    <TableCell>
                      {formatPrice(Number(item.price) + calcGST(item.price, item.gst || 18))}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.status}
                        color={item.status === "Active" ? "success" : "default"}
                        size="small"
                        onClick={() => handleStatusToggle(item)}
                        sx={{ cursor: "pointer" }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => { setSelectedItem(item); setViewOpen(true); }}>
                        View
                      </Button>
                      <Button size="small" color="primary"
                        onClick={() => {
                          setEditItem({
                            ...item,
                            serviceName: item.service_name || item.serviceName,
                          });
                          setErrors({});
                          setEditOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => handleDelete(item.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
       </TableContainer>
      )}

      {!loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* ✅ ADD Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Service</DialogTitle>
        <DialogContent>{renderFormFields(newItem, setNewItem)}</DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); setErrors({}); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddItem}>Save Service</Button>
        </DialogActions>
      </Dialog>

      {/* ✅ EDIT Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Service</DialogTitle>
        <DialogContent>
          {editItem && renderFormFields(editItem, setEditItem)}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditOpen(false); setErrors({}); }}>Cancel</Button>
          <Button variant="contained" onClick={handleEditSave}>Update Service</Button>
        </DialogActions>
      </Dialog>

      {/* ✅ VIEW Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Service Details</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
              {[
  ["Base Price", formatPrice(selectedItem.price)],
  ["GST", `${selectedItem.gst || 18}%  (₹${calcGST(selectedItem.price, selectedItem.gst || 18).toLocaleString("en-IN")})`],
  ["Total (with GST)", formatPrice(Number(selectedItem.price) + calcGST(selectedItem.price, selectedItem.gst || 18))],
  ["Documents", selectedItem.documents || "—"],
  ["Description", selectedItem.description || "—"],
  ["Status", selectedItem.status],
].map(([label, value]) => (
                <Box key={label} sx={{ display: "flex", gap: 1 }}>
                  <Typography fontWeight="bold" sx={{ minWidth: 150 }}>{label}:</Typography>
                  <Typography>{value}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ✅ Snackbar notifications */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Items;