import { useState, useEffect } from "react";
import api from "../../services/api";
import { getStoredUser } from "../../utils/auth";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Tab,
  Tabs,
  Divider,
  Checkbox,
  ListItemText,
} from "@mui/material";
import TaskIcon from "@mui/icons-material/Task";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import AlarmIcon from "@mui/icons-material/Alarm";
import WarningIcon from "@mui/icons-material/Warning";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import DescriptionIcon from "@mui/icons-material/Description";

function AdminTasks() {
  const user = getStoredUser();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignee_ids: [],
    department: "",
    priority: "medium",
    assigned_date: "",
    start_time: "",
    committed_eta: ""
  });
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTasks(),
        fetchEmployees(),
        fetchMetrics()
      ]);
      setLoading(false);
    };
    loadData();
  }, [filterAssignee, filterStatus, filterPriority]);
  
  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filterAssignee) params.append("assignee_id", filterAssignee);
      if (filterStatus) params.append("status", filterStatus);
      if (filterPriority) params.append("priority", filterPriority);
      
      const response = await api.get(`/tasks?${params.toString()}`);
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };
  
  const fetchEmployees = async () => {
    try {
      const response = await api.get("/admin/employees");
      // API returns array directly, not wrapped in data.employees
      setEmployees(Array.isArray(response.data) ? response.data : (response.data.employees || []));
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]);
    }
  };
  
  const fetchMetrics = async () => {
    try {
      const response = await api.get("/tasks/metrics");
      setMetrics(response.data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };
  
  const fetchAuditHistory = async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/audit`);
      setAuditHistory(response.data || []);
    } catch (error) {
      console.error("Error fetching audit history:", error);
    }
  };
  
  const fetchComments = async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      setComments(response.data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };
  
  const createTask = async () => {
    try {
      // Combine assigned_date and start_time into a proper timestamp
      const startTimestamp = newTask.assigned_date && newTask.start_time
        ? `${newTask.assigned_date}T${newTask.start_time}:00`
        : null;

      // Create separate task for each assignee
      const taskPromises = newTask.assignee_ids.map(assigneeId =>
        api.post("/tasks", {
          ...newTask,
          assignee_id: assigneeId,
          created_by: user.id,
          start_time: startTimestamp,
          assignee_ids: undefined // Don't send this to backend
        })
      );

      await Promise.all(taskPromises);

      setNewTask({
        title: "",
        description: "",
        assignee_ids: [],
        department: "",
        priority: "medium",
        assigned_date: "",
        start_time: "",
        committed_eta: ""
      });
      setShowCreateModal(false);
      fetchTasks();
      fetchMetrics();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };
  
  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
      fetchMetrics();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };
  
  const markOverdueTasks = async () => {
    try {
      await api.post("/tasks/mark-overdue");
      fetchTasks();
      fetchMetrics();
    } catch (error) {
      console.error("Error marking overdue tasks:", error);
    }
  };
  
  const getStatusColor = (status) => {
    const colors = {
      not_started: "#9ca3af",
      in_progress: "#3b82f6",
      blocked: "#ef4444",
      pending_review: "#f59e0b",
      completed: "#10b981",
      reopened: "#f97316",
      overdue: "#dc2626"
    };
    return colors[status] || "#9ca3af";
  };
  
  const getPriorityColor = (priority) => {
    const colors = {
      low: "#10b981",
      medium: "#f59e0b",
      high: "#f97316",
      critical: "#ef4444"
    };
    return colors[priority] || "#9ca3af";
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };
  
  const getDaysUntilDeadline = (committedEta) => {
    if (!committedEta) return null;
    const now = new Date();
    const deadline = new Date(committedEta);
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const tabLabels = ["All Tasks", "Pending Review", "Overdue", "Completed"];
  
  const displayTasks = activeTab === 0 ? tasks :
                      activeTab === 1 ? tasks.filter(t => t.status === "pending_review" || t.status === "in_progress") :
                      activeTab === 2 ? tasks.filter(t => t.status === "overdue" || getDaysUntilDeadline(t.committed_eta) < 0) :
                      tasks.filter(t => t.status === "completed");
  
  const kpiCards = [
    { title: "Total Tasks", value: metrics ? parseInt(metrics.not_started || 0) + parseInt(metrics.in_progress || 0) + parseInt(metrics.blocked || 0) + parseInt(metrics.pending_review || 0) + parseInt(metrics.completed || 0) : 0, icon: <TaskIcon />, color: "#3b82f6", bg: "#eff6ff" },
    { title: "In Progress", value: metrics?.in_progress || 0, icon: <PendingIcon />, color: "#f59e0b", bg: "#fef3c7" },
    { title: "Completed", value: metrics?.completed || 0, icon: <CheckCircleIcon />, color: "#10b981", bg: "#d1fae5" },
    { title: "On Time", value: metrics?.completed_on_time || 0, icon: <AlarmIcon />, color: "#059669", bg: "#ecfdf5" },
  ];
  
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ minWidth: 300 }}>
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
            Task Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Assign, track, and review employee tasks with ETA/TAT accountability
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            onClick={markOverdueTasks}
            startIcon={<WarningIcon />}
            size="small"
          >
            Mark Overdue
          </Button>
          <Button
            variant="contained"
            onClick={() => setShowCreateModal(true)}
            startIcon={<AddIcon />}
            sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
            size="small"
          >
            Create Task
          </Button>
        </Box>
      </Box>
      
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", height: "100%" }}>
              <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Box sx={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: 2, 
                    bgcolor: card.bg, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <Box sx={{ color: card.color, fontSize: 20 }}>{card.icon}</Box>
                  </Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ color: card.color, ml: 1 }}>
                    {card.value}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight="medium" sx={{ display: "block" }}>
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Filters */}
      <Card sx={{ mb: 3, border: "1px solid #e5e7eb" }}>
        <CardContent sx={{ "&:last-child": { pb: 2 } }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <Select
                  value={filterAssignee}
                  displayEmpty
                  onChange={(e) => setFilterAssignee(e.target.value)}
                >
                  <MenuItem value="">All Employees</MenuItem>
                  {employees.map(emp => (
                    <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <Select
                  value={filterStatus}
                  displayEmpty
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="not_started">Not Started</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="blocked">Blocked</MenuItem>
                  <MenuItem value="pending_review">Pending Review</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <Select
                  value={filterPriority}
                  displayEmpty
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                onClick={() => {
                  setFilterAssignee("");
                  setFilterStatus("");
                  setFilterPriority("");
                }}
                size="small"
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto">
          {tabLabels.map((label, index) => (
            <Tab key={index} label={`${label} (${activeTab === index ? displayTasks.length : tasks.filter((_, i) => {
              if (index === 1) return tasks[i].status === "pending_review" || tasks[i].status === "in_progress";
              if (index === 2) return tasks[i].status === "overdue" || getDaysUntilDeadline(tasks[i].committed_eta) < 0;
              if (index === 3) return tasks[i].status === "completed";
              return true;
            }).length})`} />
          ))}
        </Tabs>
      </Box>
      
      {/* Tasks Table */}
      <Card sx={{ border: "1px solid #e5e7eb" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead sx={{ bgcolor: "#f9fafb" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", py: 2, whiteSpace: "nowrap" }}>Title</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", py: 2, whiteSpace: "nowrap" }}>Assignee</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", py: 2, whiteSpace: "nowrap" }}>Priority</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", py: 2, whiteSpace: "nowrap" }}>Status</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", py: 2, whiteSpace: "nowrap" }}>Progress</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", py: 2, whiteSpace: "nowrap" }}>Deadline</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", textTransform: "uppercase", py: 2, whiteSpace: "nowrap" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">No tasks found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                displayTasks.map(task => {
                  const daysUntil = getDaysUntilDeadline(task.committed_eta);
                  return (
                    <TableRow key={task.id} hover>
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" fontWeight="medium" sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</Typography>
                        {task.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {task.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 2, whiteSpace: "nowrap" }}>
                        <Typography variant="body2">{task.assignee_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{task.department}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 2, whiteSpace: "nowrap" }}>
                        <Chip
                          label={task.priority.toUpperCase()}
                          size="small"
                          sx={{ bgcolor: getPriorityColor(task.priority) + "20", color: getPriorityColor(task.priority), fontWeight: "bold", fontSize: "0.7rem" }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2, whiteSpace: "nowrap" }}>
                        <Chip
                          label={task.status.replace(/_/g, " ").toUpperCase()}
                          size="small"
                          sx={{ bgcolor: getStatusColor(task.status) + "20", color: getStatusColor(task.status), fontWeight: "bold", fontSize: "0.7rem" }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 2, whiteSpace: "nowrap" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 50, height: 6, bgcolor: "#e5e7eb", borderRadius: 3, flexShrink: 0 }}>
                            <Box sx={{ width: `${task.progress}%`, height: "100%", bgcolor: "#3b82f6", borderRadius: 3 }} />
                          </Box>
                          <Typography variant="caption" fontWeight="medium">{task.progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2, whiteSpace: "nowrap" }}>
                        <Typography variant="body2">{formatDate(task.committed_eta)}</Typography>
                        {daysUntil !== null && (
                          <Typography variant="caption" sx={{ 
                            color: daysUntil < 0 ? "#dc2626" : daysUntil <= 2 ? "#f59e0b" : "#6b7280",
                            fontWeight: "medium",
                            display: "block"
                          }}>
                            {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d remaining`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 2, whiteSpace: "nowrap" }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedTask(task);
                            setShowEditModal(true);
                            fetchAuditHistory(task.id);
                            fetchComments(task.id);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => deleteTask(task.id)}
                          sx={{ color: "#ef4444" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      
      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ py: 2, borderBottom: "1px solid #e5e7eb" }}>
          Create New Task
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Task Title</Typography>
                <TextField
                  fullWidth
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  size="small"
                  error={!newTask.title}
                  helperText={!newTask.title ? "Required" : ""}
                />
              </Box>
              
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Priority</Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            
            <Box>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Description</Typography>
              <TextField
                fullWidth
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                multiline
                rows={3}
                size="small"
              />
            </Box>
            
            <Box>
              <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Assign to Employees</Typography>
              <FormControl fullWidth size="small" error={newTask.assignee_ids.length === 0}>
                <Select
                  multiple
                  value={newTask.assignee_ids}
                  onChange={(e) => setNewTask({ ...newTask, assignee_ids: e.target.value })}
                  renderValue={(selected) => {
                    if (selected.length === 0) return "Select employees";
                    return `${selected.length} employee(s) selected`;
                  }}
                  MenuProps={{
                    PaperProps: {
                      style: { maxHeight: 300, width: 250 }
                    }
                  }}
                >
                  {employees.map(emp => (
                    <MenuItem key={emp.id} value={emp.id}>
                      <Checkbox checked={newTask.assignee_ids.indexOf(emp.id) > -1} />
                      <ListItemText primary={emp.full_name} secondary={emp.department} />
                    </MenuItem>
                  ))}
                </Select>
                {newTask.assignee_ids.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    Required
                  </Typography>
                )}
              </FormControl>
            </Box>
            
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>
              Schedule
            </Typography>
            
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Assigned Date</Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={newTask.assigned_date}
                  onChange={(e) => setNewTask({ ...newTask, assigned_date: e.target.value })}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Start Time</Typography>
                <TextField
                  fullWidth
                  type="time"
                  value={newTask.start_time}
                  onChange={(e) => setNewTask({ ...newTask, start_time: e.target.value })}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Deadline</Typography>
                <TextField
                  fullWidth
                  type="datetime-local"
                  value={newTask.committed_eta}
                  onChange={(e) => setNewTask({ ...newTask, committed_eta: e.target.value })}
                  size="small"
                />
              </Box>
              
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>Department</Typography>
                <TextField
                  fullWidth
                  disabled
                  value={newTask.assignee_ids.length > 0 ? 
                    employees.find(e => e.id === newTask.assignee_ids[0])?.department || "" : ""}
                  size="small"
                  placeholder="Auto-filled from employee"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e5e7eb" }}>
          <Button onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button 
            onClick={createTask} 
            variant="contained"
            disabled={!newTask.title || newTask.assignee_ids.length === 0}
            sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}
          >
            Create Task {newTask.assignee_ids.length > 0 && `(${newTask.assignee_ids.length})`}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* View Task Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: "#f9fafb", borderBottom: "1px solid #e5e7eb", py: 2 }}>
          <Typography variant="h6" fontWeight="bold">Task Details</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedTask && (
            <Box>
              {/* Task Info Card */}
              <Card sx={{ mb: 3, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" sx={{ mb: 1, color: "#1f2937" }}>
                    {selectedTask.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                    {selectedTask.description || "No description provided"}
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ bgcolor: "#f3f4f6", p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 500 }}>
                          Assignee
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">{selectedTask.assignee_name}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ bgcolor: "#f3f4f6", p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 500 }}>
                          Department
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">{selectedTask.department}</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ bgcolor: "#f3f4f6", p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 500 }}>
                          Priority
                        </Typography>
                        <Chip
                          label={selectedTask.priority.toUpperCase()}
                          size="small"
                          sx={{ bgcolor: getPriorityColor(selectedTask.priority) + "20", color: getPriorityColor(selectedTask.priority), fontWeight: "bold" }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ bgcolor: "#f3f4f6", p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 500 }}>
                          Status
                        </Typography>
                        <Chip
                          label={selectedTask.status.replace(/_/g, " ").toUpperCase()}
                          size="small"
                          sx={{ bgcolor: getStatusColor(selectedTask.status) + "20", color: getStatusColor(selectedTask.status), fontWeight: "bold" }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ bgcolor: "#f3f4f6", p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 500 }}>
                          Progress
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, height: 6, bgcolor: "#e5e7eb", borderRadius: 3 }}>
                            <Box sx={{ width: `${selectedTask.progress}%`, height: "100%", bgcolor: "#3b82f6", borderRadius: 3 }} />
                          </Box>
                          <Typography variant="body2" fontWeight="bold">{selectedTask.progress}%</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ bgcolor: "#f3f4f6", p: 2, borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: 500 }}>
                          Deadline
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">{formatDate(selectedTask.committed_eta)}</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card sx={{ border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: "#3b82f6", display: "flex", alignItems: "center", gap: 1 }}>
                    <DescriptionIcon />
                    Employee Notes & Updates
                  </Typography>
                  {comments && comments.length > 0 ? (
                    <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
                      {comments.map((comment, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 3,
                            mb: 2,
                            bgcolor: "#ffffff",
                            borderRadius: 1,
                            border: "1px solid #e5e7eb",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            "&:hover": { boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }
                          }}
                        >
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, pb: 2, borderBottom: "1px solid #f3f4f6" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "0.875rem" }}>
                                {(comment.full_name || comment.user_name || "U")[0].toUpperCase()}
                              </Box>
                              <Typography variant="body1" fontWeight="bold" color="#1f2937">
                                {comment.full_name || comment.user_name || "Unknown User"}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="#6b7280" sx={{ bgcolor: "#f3f4f6", px: 2, py: 0.5, borderRadius: 1 }}>
                              {new Date(comment.created_at).toLocaleString()}
                            </Typography>
                          </Box>
                          <Typography variant="body1" sx={{ lineHeight: 1.7, color: "#374151", pl: 9 }}>
                            {comment.comment}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ p: 6, bgcolor: "#f9fafb", borderRadius: 1, textAlign: "center", border: "2px dashed #e5e7eb" }}>
                      <Typography variant="body1" color="#6b7280">
                        No notes added yet.
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e5e7eb", bgcolor: "#f9fafb" }}>
          <Button onClick={() => setShowEditModal(false)} variant="contained" sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdminTasks;
