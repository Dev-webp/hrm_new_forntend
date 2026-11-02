import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip, Alert
} from '@mui/material';
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

function ShiftManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [assignData, setAssignData] = useState({
    employee_id: '',
    shift_type: '', // 'day' or 'night'
    effective_date: new Date().toISOString().split('T')[0]
  });
  const [message, setMessage] = useState({ show: false, text: '', severity: 'success' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await API.get('/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setMessage({ show: true, text: 'Failed to fetch employees', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShift = async () => {
    try {
      // Update employee's shift_type field
      await API.put(`/employees/${assignData.employee_id}`, {
        shift_type: assignData.shift_type,
        shift_effective_date: assignData.effective_date
      });
      
      setMessage({ show: true, text: 'Shift assigned successfully!', severity: 'success' });
      setOpenAssignDialog(false);
      setAssignData({ employee_id: '', shift_type: '', effective_date: new Date().toISOString().split('T')[0] });
      fetchEmployees();
    } catch (error) {
      console.error('Error assigning shift:', error);
      setMessage({ show: true, text: 'Failed to assign shift', severity: 'error' });
    }
  };

  const getShiftColor = (shift) => {
    switch(shift) {
      case 'day': return 'success';
      case 'night': return 'primary';
      default: return 'default';
    }
  };

  const getShiftLabel = (shift) => {
    switch(shift) {
      case 'day': return 'Day Shift';
      case 'night': return 'Night Shift';
      default: return 'Not Assigned';
    }
  };

  const getShiftTime = (shift) => {
    switch(shift) {
      case 'day': return '9:00 AM - 6:00 PM';
      case 'night': return '6:00 PM - 9:00 AM';
      default: return '-';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Shift Management</Typography>

      {message.show && (
        <Alert 
          severity={message.severity} 
          sx={{ mb: 2 }}
          onClose={() => setMessage({ ...message, show: false })}
        >
          {message.text}
        </Alert>
      )}

      {/* Assign Shift to Employee */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Employee Shifts</Typography>
          <Button variant="contained" onClick={() => setOpenAssignDialog(true)}>
            + Assign Shift
          </Button>
        </Box>
        
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee Name</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Current Shift</TableCell>
                  <TableCell>Shift Time</TableCell>
                  <TableCell>Effective Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.name}</TableCell>
                    <TableCell>{emp.department || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getShiftLabel(emp.shift_type)} 
                        color={getShiftColor(emp.shift_type)} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{getShiftTime(emp.shift_type)}</TableCell>
                    <TableCell>{emp.shift_effective_date || '-'}</TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={() => {
                          setAssignData({
                            employee_id: emp.id,
                            shift_type: emp.shift_type || '',
                            effective_date: emp.shift_effective_date || new Date().toISOString().split('T')[0]
                          });
                          setOpenAssignDialog(true);
                        }}
                      >
                        Change Shift
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Assign Shift Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Shift to Employee</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            select
            label="Employee"
            value={assignData.employee_id}
            onChange={(e) => setAssignData({ ...assignData, employee_id: e.target.value })}
            sx={{ mb: 2 }}
          >
            {employees.map((emp) => (
              <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            select
            label="Shift Type"
            value={assignData.shift_type}
            onChange={(e) => setAssignData({ ...assignData, shift_type: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="day">Day Shift (9AM - 6PM)</MenuItem>
            <MenuItem value="night">Night Shift (6PM - 9AM)</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label="Effective Date"
            type="date"
            value={assignData.effective_date}
            onChange={(e) => setAssignData({ ...assignData, effective_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignShift}>Assign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ShiftManagement;
