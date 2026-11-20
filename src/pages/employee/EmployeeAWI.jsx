import React, { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent,
  Tabs, Tab, Alert, CircularProgress, IconButton, Tooltip, Badge,
} from "@mui/material";
import { Warning as WarningIcon, Description as DescriptionIcon, Refresh as RefreshIcon } from "@mui/icons-material";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function EmployeeAWI() {
  const [tabValue, setTabValue] = useState(0);
  const [awiCases, setAwiCases] = useState([]);
  const [regularizationRequests, setRegularizationRequests] = useState([]);
  const [exceptionRequests, setExceptionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dialog states
  const [explainDialogOpen, setExplainDialogOpen] = useState(false);
  const [regularizeDialogOpen, setRegularizeDialogOpen] = useState(false);
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);
  
  // Form states
  const [selectedCase, setSelectedCase] = useState(null);
  const [explainForm, setExplainForm] = useState({ employee_explanation: "" });
  const [regularizeForm, setRegularizeForm] = useState({
    type: "missed_punch",
    requested_check_in_time: "",
    requested_check_out_time: "",
    reason: "",
  });
  const [exceptionForm, setExceptionForm] = useState({
    exception_type: "emergency",
    reason: "",
  });

  const userId = localStorage.getItem("vjc_hrms_user_id");

  const fetchAwiCases = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API}/awi/cases?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch AWI cases");
      const data = await response.json();
      setAwiCases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegularizationRequests = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API}/regularization?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch regularization requests");
      const data = await response.json();
      setRegularizationRequests(data);
    } catch (err) {
      console.error("Error fetching regularization requests:", err);
    }
  };

  const fetchExceptionRequests = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API}/exceptions?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch exception requests");
      const data = await response.json();
      setExceptionRequests(data);
    } catch (err) {
      console.error("Error fetching exception requests:", err);
    }
  };

  useEffect(() => {
    fetchAwiCases();
    fetchRegularizationRequests();
    fetchExceptionRequests();
  }, [userId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleExplain = async () => {
    try {
      const response = await fetch(`${API}/awi/cases/${selectedCase.id}/explain`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(explainForm),
      });
      if (!response.ok) throw new Error("Failed to submit explanation");
      
      setExplainDialogOpen(false);
      setExplainForm({ employee_explanation: "" });
      setSelectedCase(null);
      fetchAwiCases();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegularize = async () => {
    try {
      const response = await fetch(`${API}/regularization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...regularizeForm,
          user_id: userId,
          date: selectedCase?.date || new Date().toISOString().split('T')[0],
        }),
      });
      if (!response.ok) throw new Error("Failed to submit regularization request");
      
      setRegularizeDialogOpen(false);
      setRegularizeForm({
        type: "missed_punch",
        requested_check_in_time: "",
        requested_check_out_time: "",
        reason: "",
      });
      setSelectedCase(null);
      fetchRegularizationRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleException = async () => {
    try {
      const response = await fetch(`${API}/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...exceptionForm,
          user_id: userId,
          date: selectedCase?.date || new Date().toISOString().split('T')[0],
        }),
      });
      if (!response.ok) throw new Error("Failed to submit exception request");
      
      setExceptionDialogOpen(false);
      setExceptionForm({
        exception_type: "emergency",
        reason: "",
      });
      setSelectedCase(null);
      fetchExceptionRequests();
      fetchAwiCases();
    } catch (err) {
      setError(err.message);
    }
  };

  const openExplainDialog = (caseItem) => {
    setSelectedCase(caseItem);
    setExplainForm({ employee_explanation: caseItem.employee_explanation || "" });
    setExplainDialogOpen(true);
  };

  const openRegularizeDialog = (caseItem) => {
    setSelectedCase(caseItem);
    setRegularizeForm({
      type: "missed_punch",
      requested_check_in_time: "",
      requested_check_out_time: "",
      reason: "",
    });
    setRegularizeDialogOpen(true);
  };

  const openExceptionDialog = (caseItem) => {
    setSelectedCase(caseItem);
    setExceptionForm({
      exception_type: "emergency",
      reason: "",
    });
    setExceptionDialogOpen(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      absence_unverified: "warning",
      authorized_absence: "success",
      unauthorized_absence: "error",
      regularized: "info",
      REGULARIZATION_PENDING: "warning",
      REGULARIZED: "success",
      REJECTED: "error",
      LEAVE_EXTENSION_PENDING: "warning",
      APPROVED: "success",
      pending: "warning",
      approved: "success",
      rejected: "error",
    };
    return colors[status] || "default";
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My AWI & Attendance Requests
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="AWI Cases" />
          <Tab label="Regularization Requests" />
          <Tab label="Exception Requests" />
        </Tabs>
        <IconButton onClick={() => { fetchAwiCases(); fetchRegularizationRequests(); fetchExceptionRequests(); }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>My Explanation</TableCell>
                <TableCell>Manager Response</TableCell>
                <TableCell>Deduction Days</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {awiCases.map((caseItem) => (
                <TableRow key={caseItem.id}>
                  <TableCell>{new Date(caseItem.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={caseItem.final_status || caseItem.initial_status}
                      color={getStatusColor(caseItem.final_status || caseItem.initial_status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {caseItem.employee_explanation || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    <Typography variant="body2" noWrap>
                      {caseItem.manager_response || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>{caseItem.deduction_days || 0}</TableCell>
                  <TableCell>
                    {caseItem.final_status === "absence_unverified" && (
                      <>
                        <Button
                          size="small"
                          onClick={() => openExplainDialog(caseItem)}
                          sx={{ mr: 1 }}
                        >
                          Explain
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openExceptionDialog(caseItem)}
                        >
                          Request Exception
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {awiCases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    No AWI cases found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 1 && (
        <Box>
          <Button
            variant="contained"
            onClick={() => openRegularizeDialog(null)}
            sx={{ mb: 2 }}
          >
            + New Regularization Request
          </Button>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Manager Decision</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {regularizationRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                    <TableCell>{req.type}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap>
                        {req.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.status}
                        color={getStatusColor(req.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{req.manager_decision || "—"}</TableCell>
                  </TableRow>
                ))}
                {regularizationRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      No regularization requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <Button
            variant="contained"
            onClick={() => openExceptionDialog(null)}
            sx={{ mb: 2 }}
          >
            + New Exception Request
          </Button>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Manager Decision</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exceptionRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                    <TableCell>{req.exception_type}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap>
                        {req.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.status}
                        color={getStatusColor(req.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{req.manager_decision || "—"}</TableCell>
                  </TableRow>
                ))}
                {exceptionRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      No exception requests found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Explain Dialog */}
      <Dialog open={explainDialogOpen} onClose={() => setExplainDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Provide Explanation for Absence</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Explanation"
            value={explainForm.employee_explanation}
            onChange={(e) => setExplainForm({ ...explainForm, employee_explanation: e.target.value })}
            sx={{ mt: 2 }}
            helperText="Provide a detailed explanation for your absence. This will be reviewed by your manager."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExplainDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExplain} variant="contained">
            Submit Explanation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Regularize Dialog */}
      <Dialog open={regularizeDialogOpen} onClose={() => setRegularizeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Regularization</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={regularizeForm.type}
                  label="Type"
                  onChange={(e) => setRegularizeForm({ ...regularizeForm, type: e.target.value })}
                >
                  <MenuItem value="missed_punch">Missed Punch</MenuItem>
                  <MenuItem value="late_early">Late/Early Entry</MenuItem>
                  <MenuItem value="incorrect_hours">Incorrect Hours</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Requested Check-in Time"
                value={regularizeForm.requested_check_in_time}
                onChange={(e) => setRegularizeForm({ ...regularizeForm, requested_check_in_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="Requested Check-out Time"
                value={regularizeForm.requested_check_out_time}
                onChange={(e) => setRegularizeForm({ ...regularizeForm, requested_check_out_time: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason"
                value={regularizeForm.reason}
                onChange={(e) => setRegularizeForm({ ...regularizeForm, reason: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegularizeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRegularize} variant="contained">
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exception Dialog */}
      <Dialog open={exceptionDialogOpen} onClose={() => setExceptionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Exception</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Exception Type</InputLabel>
                <Select
                  value={exceptionForm.exception_type}
                  label="Exception Type"
                  onChange={(e) => setExceptionForm({ ...exceptionForm, exception_type: e.target.value })}
                >
                  <MenuItem value="hospitalization">Hospitalization</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                  <MenuItem value="connectivity_failure">Connectivity Failure</MenuItem>
                  <MenuItem value="approved_retroactive_leave">Approved Retroactive Leave</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason"
                value={exceptionForm.reason}
                onChange={(e) => setExceptionForm({ ...exceptionForm, reason: e.target.value })}
                helperText="Provide details about the emergency or situation. Attach supporting documents if required."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExceptionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleException} variant="contained">
            Submit Exception Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
