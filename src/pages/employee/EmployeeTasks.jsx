import { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent, Chip, Grid, Button, LinearProgress, Tabs, Tab, Alert, CircularProgress, TextField, IconButton, Collapse, Slider, Avatar } from "@mui/material";
import { AccessTime, CheckCircle, Warning, HourglassEmpty, Description, ExpandMore, ExpandLess, Send, Person } from "@mui/icons-material";
import api from "../../services/api";
import { getStoredUser } from "../../utils/auth";

function EmployeeTasks() {
  const user = getStoredUser();
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [updateProgress, setUpdateProgress] = useState({});
  const [taskComments, setTaskComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});

  useEffect(() => {
    fetchTasks();
    fetchMetrics();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/tasks");
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError(error.response?.data?.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
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

  const updateTaskStatus = async (taskId, newStatus, delayReason = "") => {
    try {
      await api.put(`/tasks/${taskId}`, {
        status: newStatus,
        delay_reason: delayReason
      });
      fetchTasks();
      fetchMetrics();
    } catch (error) {
      console.error("Error updating task status:", error);
      alert("Failed to update task status");
    }
  };

  const updateTaskProgress = async (taskId, progress) => {
    try {
      await api.put(`/tasks/${taskId}`, { progress });
      fetchTasks();
    } catch (error) {
      console.error("Error updating task progress:", error);
      alert("Failed to update task progress");
    }
  };

  const fetchTaskComments = async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/comments`);
      setTaskComments(prev => ({ ...prev, [taskId]: response.data || [] }));
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const addComment = async (taskId) => {
    const comment = newComment[taskId];
    if (!comment || !comment.trim()) return;

    try {
      await api.post(`/tasks/${taskId}/comments`, { comment });
      setNewComment(prev => ({ ...prev, [taskId]: "" }));
      fetchTaskComments(taskId);
    } catch (error) {
      console.error("Error adding comment:", error);
      alert("Failed to add note");
    }
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    if (!expandedTasks[taskId]) {
      fetchTaskComments(taskId);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      not_started: "default",
      in_progress: "info",
      blocked: "error",
      pending_review: "warning",
      completed: "success",
      reopened: "secondary",
      overdue: "error"
    };
    return colors[status] || "default";
  };

  const getStatusLabel = (status) => {
    return status.replace(/_/g, " ").toUpperCase();
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "success",
      medium: "info",
      high: "warning",
      critical: "error"
    };
    return colors[priority] || "default";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getFilteredTasks = () => {
    switch (activeTab) {
      case 0: // All
        return tasks;
      case 1: // In Progress
        return tasks.filter(t => t.status === "in_progress");
      case 2: // Pending Review
        return tasks.filter(t => t.status === "pending_review");
      case 3: // Overdue
        return tasks.filter(t => t.status === "overdue" || getDaysUntilDeadline(t.committed_eta) < 0);
      default:
        return tasks;
    }
  };

  const renderTaskCard = (task) => {
    const daysUntil = getDaysUntilDeadline(task.committed_eta);
    const isOverdue = daysUntil !== null && daysUntil < 0;

    return (
      <Card key={task.id} sx={{ mb: 3, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", "&:hover": { boxShadow: "0 4px 6px rgba(0,0,0,0.1)" } }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2, pb: 2, borderBottom: "1px solid #f3f4f6" }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, color: "#1f2937" }}>
                {task.title}
              </Typography>
              {task.description && (
                <Typography variant="body2" color="#6b7280" sx={{ lineHeight: 1.5 }}>
                  {task.description}
                </Typography>
              )}
            </Box>
            <Chip
              label={task.priority.toUpperCase()}
              size="small"
              sx={{ bgcolor: getPriorityColor(task.priority) + "20", color: getPriorityColor(task.priority), fontWeight: "bold", ml: 2 }}
            />
          </Box>

          {/* Status and Deadline */}
          <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
            <Chip
              label={getStatusLabel(task.status)}
              color={getStatusColor(task.status)}
              size="small"
              sx={{ fontWeight: "bold" }}
            />
            {task.committed_eta && (
              <Chip
                icon={<AccessTime fontSize="small" />}
                label={`Due: ${formatDate(task.committed_eta)}`}
                color={isOverdue ? "error" : "default"}
                size="small"
                variant={isOverdue ? "filled" : "outlined"}
              />
            )}
          </Box>

          {/* Progress Section */}
          <Box sx={{ mb: 3, bgcolor: "#f9fafb", p: 2, borderRadius: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="body2" fontWeight="bold" color="#374151">
                Progress: {task.progress}%
              </Typography>
              <Typography variant="caption" color="#6b7280">
                {isOverdue ? "Overdue" : daysUntil !== null ? `${daysUntil} days left` : ""}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={task.progress}
              sx={{ height: 8, borderRadius: 4, bgcolor: "#e5e7eb", "& .MuiLinearProgress-bar": { borderRadius: 4 } }}
            />
          </Box>

          {/* Update Progress */}
          <Box sx={{ mb: 3, p: 2, bgcolor: "#f3f4f6", borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1.5, color: "#374151" }}>
              Update Progress
            </Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <Box sx={{ flex: 1 }}>
                <Slider
                  value={updateProgress[task.id] || task.progress}
                  onChange={(e) => setUpdateProgress({ ...updateProgress, [task.id]: e.target.value })}
                  sx={{ color: "#3b82f6" }}
                />
              </Box>
              <Typography variant="body2" fontWeight="bold" sx={{ minWidth: 45, color: "#3b82f6" }}>
                {updateProgress[task.id] || task.progress}%
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  updateTaskProgress(task.id, updateProgress[task.id] || task.progress);
                  setUpdateProgress({ ...updateProgress, [task.id]: undefined });
                }}
                sx={{ bgcolor: "#3b82f6", "&:hover": { bgcolor: "#2563eb" }, minWidth: 80 }}
              >
                Save
              </Button>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
            <Button
              size="small"
              variant={task.status === "in_progress" ? "contained" : "outlined"}
              onClick={() => updateTaskStatus(task.id, "in_progress")}
              sx={{ 
                bgcolor: task.status === "in_progress" ? "#3b82f6" : undefined,
                "&:hover": { bgcolor: task.status === "in_progress" ? "#2563eb" : undefined },
                color: task.status === "in_progress" ? "white" : undefined
              }}
            >
              Start
            </Button>
            <Button
              size="small"
              variant={task.status === "pending_review" ? "contained" : "outlined"}
              onClick={() => updateTaskStatus(task.id, "pending_review")}
              sx={{ 
                bgcolor: task.status === "pending_review" ? "#f59e0b" : undefined,
                "&:hover": { bgcolor: task.status === "pending_review" ? "#d97706" : undefined },
                color: task.status === "pending_review" ? "white" : undefined
              }}
            >
              Submit
            </Button>
            <Button
              size="small"
              variant={task.status === "completed" ? "contained" : "outlined"}
              onClick={() => updateTaskStatus(task.id, "completed")}
              sx={{ 
                bgcolor: task.status === "completed" ? "#10b981" : undefined,
                "&:hover": { bgcolor: task.status === "completed" ? "#059669" : undefined },
                color: task.status === "completed" ? "white" : undefined
              }}
            >
              Complete
            </Button>
          </Box>

          {task.delay_reason && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Delay Reason:</strong> {task.delay_reason}
              </Typography>
            </Alert>
          )}

          {/* Notes Section */}
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e5e7eb" }}>
            <Box
              sx={{ display: "flex", alignItems: "center", cursor: "pointer", mb: 2 }}
              onClick={() => toggleExpand(task.id)}
            >
              <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1, color: "#3b82f6", display: "flex", alignItems: "center", gap: 1 }}>
                <Description />
                Notes & Updates
              </Typography>
              <IconButton size="small">
                {expandedTasks[task.id] ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={expandedTasks[task.id]}>
              {/* Existing Comments */}
              {taskComments[task.id] && taskComments[task.id].length > 0 && (
                <Box sx={{ mb: 2, maxHeight: 250, overflowY: "auto", bgcolor: "#f9fafb", p: 2, borderRadius: 1 }}>
                  {taskComments[task.id].map((comment, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        mb: 1.5,
                        bgcolor: "#ffffff",
                        borderRadius: 1,
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: "#3b82f6", fontSize: "0.75rem" }}>
                          {(comment.full_name || comment.user_name || "U")[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold" color="#1f2937">
                            {comment.full_name || comment.user_name || "Unknown"}
                          </Typography>
                          <Typography variant="caption" color="#6b7280">
                            {new Date(comment.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ lineHeight: 1.6, color: "#374151", pl: 9 }}>
                        {comment.comment}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Add New Comment */}
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Add a note about progress, issues, or balance..."
                  value={newComment[task.id] || ""}
                  onChange={(e) => setNewComment(prev => ({ ...prev, [task.id]: e.target.value }))}
                  sx={{ flex: 1, bgcolor: "#ffffff" }}
                />
                <IconButton
                  color="primary"
                  onClick={() => addComment(task.id)}
                  disabled={!newComment[task.id] || !newComment[task.id].trim()}
                  sx={{ mt: 0.5, bgcolor: "#3b82f6", color: "white", "&:hover": { bgcolor: "#2563eb" }, "&:disabled": { bgcolor: "#e5e7eb", color: "#9ca3af" } }}
                >
                  <Send />
                </IconButton>
              </Box>
            </Collapse>
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchTasks} sx={{ mt: 2 }}>Retry</Button>
      </Box>
    );
  }

  const filteredTasks = getFilteredTasks();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
        My Tasks
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your daily tasks and track progress
      </Typography>

      {/* Metrics Cards */}
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: "#f5f5f5" }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total Tasks</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {parseInt(metrics.not_started || 0) + 
                   parseInt(metrics.in_progress || 0) + 
                   parseInt(metrics.blocked || 0) + 
                   parseInt(metrics.pending_review || 0) + 
                   parseInt(metrics.completed || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: "#e3f2fd" }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">In Progress</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {metrics.in_progress || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: "#e8f5e9" }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Completed</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {metrics.completed || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: "#ffebee" }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Overdue</Typography>
                <Typography variant="h4" fontWeight="bold" color="error">
                  {metrics.overdue || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={`All Tasks (${tasks.length})`} />
          <Tab label={`In Progress (${tasks.filter(t => t.status === "in_progress").length})`} />
          <Tab label={`Pending Review (${tasks.filter(t => t.status === "pending_review").length})`} />
          <Tab label={`Overdue (${tasks.filter(t => t.status === "overdue" || getDaysUntilDeadline(t.committed_eta) < 0).length})`} />
        </Tabs>
      </Box>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Description sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No tasks found
          </Typography>
        </Box>
      ) : (
        <Box>
          {filteredTasks.map(renderTaskCard)}
        </Box>
      )}
    </Box>
  );
}

export default EmployeeTasks;
