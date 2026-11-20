import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { parseJwt } from "../../utils/parseJwt";
import "../../styles/EmployeeLifecycleOnboarding.css";

function EmployeeLifecycleOnboarding() {
  const token = localStorage.getItem("token");
  const decoded = parseJwt(token) || {};
  const userId = decoded.id || 0;
  const role = decoded.role || "EMPLOYEE";

  const [onboardingCase, setOnboardingCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
    }
  }, [token]);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    setTimeout(() => {
      setToast({ msg: "", visible: false, type: "" });
    }, 3000);
  }, []);

  const fetchMyOnboarding = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/lifecycle/my-onboarding");
      setOnboardingCase(response.data || null);
    } catch (error) {
      console.error("Error fetching onboarding:", error);
      // 404 is expected if no onboarding case exists
      if (error.response?.status !== 404) {
        showToast("Error loading onboarding data", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const updateTaskStatus = async (taskId, action, remarks = "") => {
    try {
      await api.patch(`/lifecycle/tasks/${taskId}`, {
        action,
        remarks
      });
      showToast("Task updated successfully", "success");
      fetchMyOnboarding();
    } catch (error) {
      console.error("Error updating task:", error);
      showToast("Failed to update task: " + (error.response?.data?.message || error.message), "error");
    }
  };

  useEffect(() => {
    fetchMyOnboarding();
  }, [fetchMyOnboarding]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "DONE": return "#10B981";
      case "WAIVED": return "#F59E0B";
      case "PENDING": return "#64748B";
      default: return "#64748B";
    }
  };

  const getResponsibleColor = (assigneeRole) => {
    const colors = {
      HR: "#0066CC",
      EMPLOYEE: "#10B981",
      IT: "#8B5CF6",
      FINANCE: "#EF4444",
      MANAGER: "#FF9000"
    };
    return colors[assigneeRole] || "#64748B";
  };

  if (loading) {
    return (
      <div className="employee-lifecycle-onboarding-container">
        <div className="loading-state">Loading onboarding...</div>
      </div>
    );
  }

  // Employee is ACTIVE - show friendly empty state
  if (!onboardingCase) {
    return (
      <div className="employee-lifecycle-onboarding-container">
        <div className="empty-state completed">
          <div className="empty-icon">✅</div>
          <h3>You're All Set!</h3>
          <p>Your onboarding is complete. Welcome to the team!</p>
          <button
            className="goto-dashboard-btn"
            onClick={() => window.location.href = "/home"}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Employee has ONBOARDING case
  const employeeTasks = onboardingCase.tasks?.filter(t => t.assignee_role === role) || [];
  const completedTasks = employeeTasks.filter(t => t.status === "DONE").length;
  const totalTasks = employeeTasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="employee-lifecycle-onboarding-container">
      {toast.visible && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="onboarding-header">
        <h1>My Onboarding</h1>
        <p>Complete your onboarding tasks to get started</p>
      </div>

      {/* Progress Card */}
      <div className="progress-card">
        <div className="progress-header">
          <h2>Welcome, {onboardingCase.full_name}!</h2>
          <p className="progress-meta">
            Employee ID: {onboardingCase.employee_code} · {onboardingCase.designation}
          </p>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            {completedTasks} of {totalTasks} tasks completed ({progress}%)
          </div>
        </div>
        <div className="progress-meta-details">
          <div className="meta-item">
            <span className="meta-label">Joining Date:</span>
            <span className="meta-value">{formatDate(onboardingCase.anchor_date)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Department:</span>
            <span className="meta-value">{onboardingCase.department}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Branch:</span>
            <span className="meta-value">{onboardingCase.branch}</span>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="tasks-section">
        <h3>Your Tasks</h3>
        {employeeTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>No Tasks Assigned to You</h3>
            <p>HR and other teams are completing their tasks. Check back later!</p>
          </div>
        ) : (
          <div className="tasks-list">
            {employeeTasks.map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-header">
                  <div className="task-icon">
                    {task.status === "DONE" ? "✓" : "○"}
                  </div>
                  <div className="task-info">
                    <h4>{task.title}</h4>
                    {task.category && (
                      <span className="task-category">{task.category}</span>
                    )}
                  </div>
                  <div className="task-status">
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(task.status) }}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
                {task.description && (
                  <p className="task-description">{task.description}</p>
                )}
                <div className="task-footer">
                  {task.due_date && (
                    <span className="task-due">
                      Due: {formatDate(task.due_date)}
                    </span>
                  )}
                  {task.status === "PENDING" && (
                    <button
                      className="complete-btn"
                      onClick={() => updateTaskStatus(task.id, "done")}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Tasks (Read-only) */}
      <div className="all-tasks-section">
        <h3>All Onboarding Tasks</h3>
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Category</th>
              <th>Assignee</th>
              <th>Due Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {onboardingCase.tasks?.map((task) => (
              <tr key={task.id}>
                <td className="task-title">
                  {task.title}
                  {task.remarks && (
                    <div className="task-remarks">{task.remarks}</div>
                  )}
                </td>
                <td>{task.category || "—"}</td>
                <td>
                  <span
                    className="assignee-badge"
                    style={{ backgroundColor: getResponsibleColor(task.assignee_role) }}
                  >
                    {task.assignee_role}
                  </span>
                </td>
                <td>{task.due_date ? formatDate(task.due_date) : "—"}</td>
                <td>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {task.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmployeeLifecycleOnboarding;
