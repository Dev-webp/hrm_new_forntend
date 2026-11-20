import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent,
  Tabs, Tab, Alert, CircularProgress, IconButton, Tooltip, Badge, Checkbox,
} from "@mui/material";
import { Warning as WarningIcon, CheckCircleOutlined, Cancel, Refresh as RefreshIcon, Check } from "@mui/icons-material";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AWIManagement() {
  const [tabValue, setTabValue] = useState(0);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [classifyDialogOpen, setClassifyDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [classifyForm, setClassifyForm] = useState({
    final_status: "",
    manager_response: "",
    hr_decision: "",
    verbally_informed: false,
    verbal_informed_by: "",
  });
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    branch: "",
    department: "",
    employeeId: "",
    month: new Date().toISOString().slice(0, 7), // Default to current month (YYYY-MM)
    date: new Date().toISOString().split('T')[0], // Default to today (YYYY-MM-DD)
  });
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeAWIMonthly, setEmployeeAWIMonthly] = useState(null);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'monthly' - default to daily

  const statusMap = [null, "absence_unverified", "authorized_absence", "unauthorized_absence", "regularized"];

  const fetchAllDepartmentsAndBranches = async () => {
    try {
      const response = await fetch(`${API}/awi/cases`);
      if (!response.ok) throw new Error("Failed to fetch AWI cases");
      const data = await response.json();

      // Extract unique departments and branches from all data
      const uniqueDepts = [...new Set(data.map(c => c.department).filter(Boolean))];
      const uniqueBranches = [...new Set(data.map(c => c.branch).filter(Boolean))];
      setDepartments(uniqueDepts);
      setBranches(uniqueBranches);
    } catch (err) {
      console.error("Error fetching departments and branches:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.branch) params.append("branch", filters.branch);
      if (filters.department) params.append("department", filters.department);

      console.log("Fetching employees with params:", params.toString());
      
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API}/admin/employees?${params}`, {
        headers,
      });
      console.log("Response status:", response.status);
      
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      console.log("Employees data:", data);
      
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setEmployees([]);
    }
  };

  const fetchEmployeeMonthlyAWI = async () => {
    console.log("fetchEmployeeMonthlyAWI called with:", { employeeId: filters.employeeId, month: filters.month });
    
    if (!filters.employeeId || !filters.month) {
      console.log("Skipping fetch - missing employeeId or month");
      setEmployeeAWIMonthly(null);
      return;
    }

    try {
      const url = `${API}/awi/employee-monthly?user_id=${filters.employeeId}&month=${filters.month}`;
      console.log("Fetching from:", url);
      
      const response = await fetch(url);
      console.log("Response status:", response.status);
      
      if (!response.ok) throw new Error("Failed to fetch employee monthly AWI");
      const data = await response.json();
      console.log("Employee Monthly AWI Data:", data);
      setEmployeeAWIMonthly(data);
    } catch (err) {
      console.error("Error fetching employee monthly AWI:", err);
      setEmployeeAWIMonthly(null);
    }
  };

  const fetchCases = async (status = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);

      if (filters.branch) params.append("branch", filters.branch);
      if (filters.department) params.append("department", filters.department);
      
      // If employee is selected, filter by employee
      if (filters.employeeId) params.append("user_id", filters.employeeId);
      
      // If month is selected (in monthly mode), filter by month
      if (filters.month && viewMode === 'monthly') {
        const [year, month] = filters.month.split('-');
        // Calculate last day of the month correctly
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      }
      
      // If date is selected (in daily mode), filter by that date
      if (filters.date && viewMode === 'daily') {
        params.append("start_date", filters.date);
        params.append("end_date", filters.date);
      }

      const response = await fetch(`${API}/awi/cases?${params}`);
      if (!response.ok) throw new Error("Failed to fetch AWI cases");
      const data = await response.json();

      // Sort by date descending (newest first)
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setCases(sortedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API}/awi/summary`);
      if (!response.ok) throw new Error("Failed to fetch AWI summary");
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  };

  useEffect(() => {
    // Fetch all departments and branches for dropdowns
    fetchAllDepartmentsAndBranches();
    // Fetch summary
    fetchSummary();
    // Fetch cases with initial filters
    fetchCases(statusMap[tabValue]);
    // Fetch employees
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch employees when branch or department changes
  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.branch, filters.department]);

  // Fetch employee monthly AWI when employee or month changes
  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchEmployeeMonthlyAWI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.employeeId, filters.month, viewMode]);

  // Fetch filtered cases when filters change
  useEffect(() => {
    // Only fetch filtered data if filters are applied
    if (filters.branch || filters.department || filters.employeeId || filters.month || filters.date) {
      fetchCases(statusMap[tabValue]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.branch, filters.department, filters.employeeId, filters.month, filters.date, viewMode]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    fetchCases(statusMap[newValue]);
  };

  const handleClassify = async () => {
    try {
      const response = await fetch(`${API}/awi/cases/${selectedCase.id}/classify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...classifyForm,
          resolved_by: localStorage.getItem("vjc_hrms_user") || "admin",
        }),
      });
      if (!response.ok) throw new Error("Failed to classify AWI case");
      
      setClassifyDialogOpen(false);
      setClassifyForm({ final_status: "", manager_response: "", hr_decision: "", verbally_informed: false, verbal_informed_by: "" });
      setSelectedCase(null);
      fetchCases();
      fetchSummary();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRunDetection = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/awi-detection/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] }),
      });
      if (!response.ok) throw new Error("Failed to run AWI detection");
      
      const data = await response.json();
      alert(`Detection completed!\n\nTotal absent: ${data.data.total_absent}\nCases created: ${data.data.cases_created}\nPending cases: ${data.data.pending_cases}`);
      
      fetchCases();
      fetchSummary();
    } catch (err) {
      setError(err.message);
      alert("Error running detection: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openClassifyDialog = (caseItem) => {
    setSelectedCase(caseItem);
    setClassifyForm({
      final_status: "",
      manager_response: "",
      hr_decision: "",
      verbally_informed: false,
      verbal_informed_by: "",
    });
    setClassifyDialogOpen(true);
  };

  const openViewDialog = (caseItem) => {
    setSelectedCase(caseItem);
    setViewDialogOpen(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      absence_unverified: "warning",
      authorized_absence: "success",
      unauthorized_absence: "error",
      regularized: "info",
    };
    return colors[status] || "default";
  };

  const getStatusLabel = (status) => {
    const labels = {
      absence_unverified: "Pending Verification",
      authorized_absence: "Authorized Absence",
      unauthorized_absence: "Unauthorized Absence",
      regularized: "Regularized",
    };
    return labels[status] || status;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AWI (Absence Without Intimation) Management
      </Typography>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary">
                  {summary.total_cases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Cases
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main">
                  {summary.pending_cases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main">
                  {summary.authorized_cases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Authorized
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main">
                  {summary.unauthorized_cases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Unauthorized
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main">
                  {summary.regularized_cases}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Regularized
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main">
                  {summary.total_deduction_days || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Deduction Days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="All Cases" />
          <Tab label="Pending Verification" />
          <Tab label="Authorized" />
          <Tab label="Unauthorized" />
          <Tab label="Regularized" />
        </Tabs>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleRunDetection}
            disabled={loading}
          >
            Run 3 PM Detection
          </Button>
          <IconButton onClick={() => { fetchCases(); fetchSummary(); }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Branch Selection</Typography>
            <FormControl fullWidth size="medium">
              <Select
                value={filters.branch}
                onChange={(e) => {
                  setFilters({ ...filters, branch: e.target.value, employeeId: "" });
                }}
                displayEmpty
                renderValue={(value) => value || "All Branches"}
              >
                <MenuItem value="">All Branches</MenuItem>
                {branches.length > 0 ? branches.map((branch) => (
                  <MenuItem key={branch} value={branch}>{branch}</MenuItem>
                )) : (
                  <MenuItem disabled>No branches available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Department Selection</Typography>
            <FormControl fullWidth size="medium">
              <Select
                value={filters.department}
                onChange={(e) => {
                  setFilters({ ...filters, department: e.target.value, employeeId: "" });
                }}
                displayEmpty
                renderValue={(value) => value || "All Departments"}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.length > 0 ? departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                )) : (
                  <MenuItem disabled>No departments available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Person Selection</Typography>
            <FormControl fullWidth size="medium">
              <Select
                value={filters.employeeId}
                onChange={(e) => {
                  setFilters({ ...filters, employeeId: e.target.value });
                }}
                displayEmpty
                renderValue={(value) => {
                  const emp = employees.find(e => e.id === value);
                  return emp ? emp.full_name : "Select Person";
                }}
              >
                <MenuItem value="">Select Person</MenuItem>
                {employees.length > 0 ? employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
                )) : (
                  <MenuItem disabled>No employees available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>View Mode</Typography>
            <FormControl fullWidth size="medium">
              <Select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Month</Typography>
            <TextField
              fullWidth
              size="medium"
              type="month"
              label="Month"
              InputLabelProps={{ shrink: true }}
              value={filters.month}
              onChange={(e) => {
                setFilters({ ...filters, month: e.target.value });
              }}
              sx={{ '& .MuiInputBase-input': { py: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Date</Typography>
            <TextField
              fullWidth
              size="medium"
              type="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={filters.date}
              onChange={(e) => {
                setFilters({ ...filters, date: e.target.value });
              }}
              sx={{ '& .MuiInputBase-input': { py: 1.5 } }}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Employee AWI Summary */}
      {filters.employeeId && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            <strong>{employeeAWIMonthly?.employee_name || 'Selected Employee'}</strong> - 
            AWI Summary for {filters.month}
          </Typography>
          {employeeAWIMonthly ? (
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">Authorized Days: <strong>{employeeAWIMonthly.authorized_count || 0}</strong></Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">Unauthorized Days: <strong>{employeeAWIMonthly.unauthorized_count || 0}</strong></Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">Total Deduction Days: <strong>{employeeAWIMonthly.total_deduction_days || 0}</strong></Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2">Total Cases: <strong>{employeeAWIMonthly.total_cases || 0}</strong></Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography variant="body2">
              Loading monthly summary...
            </Typography>
          )}
        </Alert>
      )}

      {/* Daily AWI Breakdown (Always shows when person selected) */}
      {filters.employeeId && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            AWI Data for {filters.date}
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Verbally Informed</TableCell>
                  <TableCell>Deduction Days</TableCell>
                  <TableCell>Explanation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                ) : cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No AWI cases for {filters.date}
                    </TableCell>
                  </TableRow>
                ) : cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(caseItem.final_status)}
                        color={getStatusColor(caseItem.final_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {caseItem.verbally_informed ? (
                        <Chip label="Yes" color="success" size="small" />
                      ) : (
                        <Chip label="No" color="default" size="small" />
                      )}
                    </TableCell>
                    <TableCell>{caseItem.deduction_days || 0}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {caseItem.employee_explanation || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Employee Explanation</TableCell>
                <TableCell>Verbally Informed</TableCell>
                <TableCell>Deduction Days</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell>{new Date(caseItem.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{caseItem.full_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {caseItem.email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{caseItem.branch || "—"}</TableCell>
                  <TableCell>{caseItem.department}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(caseItem.final_status)}
                      color={getStatusColor(caseItem.final_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" noWrap>
                      {caseItem.employee_explanation || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={caseItem.verbally_informed ? "Yes" : "No"}
                      color={caseItem.verbally_informed ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{caseItem.deduction_days || 0}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openViewDialog(caseItem)}
                      >
                        View
                      </Button>
                      {caseItem.final_status === "absence_unverified" && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => openClassifyDialog(caseItem)}
                        >
                          Classify
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {cases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    No AWI cases found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={classifyDialogOpen} onClose={() => setClassifyDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Classify AWI Case
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedCase && (
            <Box>
              {/* Employee Information Card */}
              <Card sx={{ mb: 3, bgcolor: 'grey.50', border: '1px solid #e0e0e0' }}>
                <CardContent sx={{ py: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Employee
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedCase.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedCase.email}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Date
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {new Date(selectedCase.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Employee Explanation
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        bgcolor: 'white', 
                        p: 2, 
                        borderRadius: 1,
                        border: '1px solid #e0e0e0',
                        fontStyle: selectedCase.employee_explanation ? 'normal' : 'italic',
                        color: selectedCase.employee_explanation ? 'text.primary' : 'text.secondary'
                      }}>
                        {selectedCase.employee_explanation || "No explanation provided"}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Classification Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Classification
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Final Status</InputLabel>
                  <Select
                    value={classifyForm.final_status}
                    label="Final Status"
                    onChange={(e) => setClassifyForm({ ...classifyForm, final_status: e.target.value })}
                    size="small"
                  >
                    <MenuItem value="authorized_absence">
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Authorized Absence</Typography>
                        <Typography variant="caption" color="text.secondary">1 day salary deduction</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="unauthorized_absence">
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Unauthorized Absence</Typography>
                        <Typography variant="caption" color="text.secondary">2 days salary deduction (1+1)</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="regularized">
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Regularized</Typography>
                        <Typography variant="caption" color="text.secondary">No salary deduction</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Verbal Informed Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Verbal Information
                </Typography>
                <Card sx={{ bgcolor: 'grey.50', border: '1px solid #e0e0e0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Checkbox
                        checked={classifyForm.verbally_informed}
                        onChange={(e) => setClassifyForm({ ...classifyForm, verbally_informed: e.target.checked })}
                        sx={{ color: 'primary.main' }}
                      />
                      <Typography variant="body1" sx={{ ml: 1 }}>
                        Was employee verbally informed to admin?
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                      Select "Yes" if the employee verbally informed you about the absence before or on the day.
                    </Typography>
                    {classifyForm.verbally_informed && (
                      <TextField
                        fullWidth
                        label="Who provided the verbal information?"
                        value={classifyForm.verbal_informed_by}
                        onChange={(e) => setClassifyForm({ ...classifyForm, verbal_informed_by: e.target.value })}
                        helperText="Enter the name of the person who provided the verbal information"
                        size="small"
                        sx={{ mt: 2 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Box>

              {/* Deduction Calculation Preview */}
              <Box sx={{ mb: 3 }}>
                <Alert 
                  severity={classifyForm.verbally_informed ? "info" : classifyForm.final_status === "unauthorized_absence" ? "error" : "success"}
                  sx={{ 
                    border: '1px solid',
                    '& .MuiAlert-message': { fontWeight: 500 }
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Deduction Calculation
                  </Typography>
                  <Typography variant="body2">
                    {classifyForm.verbally_informed ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleOutlined sx={{ color: 'info.main' }} />
                        <span>1 day salary deduction (employee was verbally informed)</span>
                      </Box>
                    ) : classifyForm.final_status === "unauthorized_absence" ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Cancel sx={{ color: 'error.main' }} />
                        <span>2 days salary deduction (1+1) - Employee was not informed</span>
                      </Box>
                    ) : classifyForm.final_status === "authorized_absence" ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Check sx={{ color: 'success.main' }} />
                      <span>1 day salary deduction - Authorized absence</span>
                    </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Check sx={{ color: 'success.main' }} />
                        <span>No deduction - Regularized</span>
                      </Box>
                    )}
                  </Typography>
                </Alert>
              </Box>

              {/* Manager Response */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Manager Response
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Add your response"
                  placeholder="Enter your decision and reasoning..."
                  value={classifyForm.manager_response}
                  onChange={(e) => setClassifyForm({ ...classifyForm, manager_response: e.target.value })}
                  size="small"
                />
              </Box>

              {/* HR Decision */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  HR Decision (Optional)
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Add HR decision"
                  placeholder="Enter HR decision if escalation is required..."
                  value={classifyForm.hr_decision}
                  onChange={(e) => setClassifyForm({ ...classifyForm, hr_decision: e.target.value })}
                  size="small"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
          <Button onClick={() => setClassifyDialogOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleClassify} 
            variant="contained" 
            sx={{ minWidth: 150 }}
          >
            Submit Classification
          </Button>
        </DialogActions>
      </Dialog>

      {/* View AWI Case Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            AWI Case Details
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedCase && (
            <Box>
              {/* Employee Information Card */}
              <Card sx={{ mb: 3, bgcolor: 'grey.50', border: '1px solid #e0e0e0' }}>
                <CardContent sx={{ py: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Employee
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedCase.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedCase.email}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Date
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {new Date(selectedCase.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Department
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedCase.department}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Branch
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedCase.branch}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Case Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Case Status
                </Typography>
                <Card sx={{ bgcolor: 'grey.50', border: '1px solid #e0e0e0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Status
                        </Typography>
                        <Chip
                          label={getStatusLabel(selectedCase.final_status)}
                          color={getStatusColor(selectedCase.final_status)}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Deduction Days
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {selectedCase.deduction_days || 0} days
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Verbally Informed
                        </Typography>
                        <Chip
                          label={selectedCase.verbally_informed ? "Yes" : "No"}
                          color={selectedCase.verbally_informed ? "success" : "default"}
                          size="small"
                        />
                      </Grid>
                      {selectedCase.verbal_informed_by && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Verbal Information Provided By
                          </Typography>
                          <Typography variant="body1" fontWeight={600}>
                            {selectedCase.verbal_informed_by}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>

              {/* Employee Explanation */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Employee Explanation
                </Typography>
                <Typography variant="body2" sx={{ 
                  bgcolor: 'white', 
                  p: 2, 
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                  fontStyle: selectedCase.employee_explanation ? 'normal' : 'italic',
                  color: selectedCase.employee_explanation ? 'text.primary' : 'text.secondary'
                }}>
                  {selectedCase.employee_explanation || "No explanation provided"}
                </Typography>
              </Box>

              {/* Manager Response */}
              {selectedCase.manager_response && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Manager Response
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    bgcolor: 'grey.50', 
                    p: 2, 
                    borderRadius: 1,
                    border: '1px solid #e0e0e0'
                  }}>
                    {selectedCase.manager_response}
                  </Typography>
                </Box>
              )}

              {/* HR Decision */}
              {selectedCase.hr_decision && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    HR Decision
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    bgcolor: 'grey.50', 
                    p: 2, 
                    borderRadius: 1,
                    border: '1px solid #e0e0e0'
                  }}>
                    {selectedCase.hr_decision}
                  </Typography>
                </Box>
              )}

              {/* Audit Information */}
              <Box>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Audit Information
                </Typography>
                <Card sx={{ bgcolor: 'grey.50', border: '1px solid #e0e0e0' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Created At
                        </Typography>
                        <Typography variant="body2">
                          {new Date(selectedCase.created_at).toLocaleString()}
                        </Typography>
                      </Grid>
                      {selectedCase.resolved_at && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Resolved At
                          </Typography>
                          <Typography variant="body2">
                            {new Date(selectedCase.resolved_at).toLocaleString()}
                          </Typography>
                        </Grid>
                      )}
                      {selectedCase.resolved_by && (
                        <Grid item xs={12} sm={6}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          Resolved By
                          </Typography>
                          <Typography variant="body2">
                            {selectedCase.resolved_by}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, bgcolor: 'grey.50' }}>
          <Button onClick={() => setViewDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
