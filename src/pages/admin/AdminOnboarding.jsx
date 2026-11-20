import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { parseJwt } from "../../utils/parseJwt";
import "../../styles/AdminOnboarding.css";

const navigate = (path) => {
  window.location.href = path;
};

const STATUS = {
  completed: { cls: "ok", label: "Done" },
  in_progress: { cls: "wa", label: "In progress" },
  on_hold: { cls: "er", label: "On hold" },
  not_started: { cls: "no", label: "Pending" },
};

const initials = (name = "") =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

export default function AdminOnboarding() {
  const token = localStorage.getItem("token");
  const decoded = parseJwt(token) || {};
  const userId = decoded.id || 0; // kept from your original; not used yet

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [checklists, setChecklists] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newChecklist, setNewChecklist] = useState({ template_id: 1, due_date: "", notes: "" });

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token]);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    setTimeout(() => setToast({ msg: "", visible: false, type: "" }), 3000);
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const response = await api.get("/admin/employees");
      setEmployees(response.data || []);
    } catch (error) {
      showToast(`Error loading employees: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadEmployeeChecklists = useCallback(
    async (employeeId) => {
      try {
        console.log("[ADMIN] Loading checklists for employeeId:", employeeId);
        console.log("[ADMIN] API endpoint:", `/checklists/employee/${employeeId}?type=onboarding`);
        const response = await api.get(`/checklists/employee/${employeeId}?type=onboarding`);
        console.log("[ADMIN] Checklists data received:", response.data);
        setChecklists(response.data || []);
      } catch (error) {
        console.error("[ADMIN] Error loading checklists:", error);
        showToast(`Error loading checklists: ${error.message}`, "error");
      }
    },
    [showToast]
  );

  const loadChecklistDetails = useCallback(
    async (checklistId) => {
      try {
        const response = await api.get(`/checklists/${checklistId}`);
        setSelectedChecklist(response.data);
      } catch (error) {
        showToast(`Error loading checklist details: ${error.message}`, "error");
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setSelectedChecklist(null);
    loadEmployeeChecklists(employee.id);
  };

  const handleBackToEmployees = () => {
    setSelectedEmployee(null);
    setSelectedChecklist(null);
    setChecklists([]);
  };

  const handleAssignChecklist = async () => {
    try {
      await api.post("/checklists/assign", {
        employee_id: selectedEmployee.id,
        template_id: newChecklist.template_id,
        type: "onboarding",
        due_date: newChecklist.due_date,
        notes: newChecklist.notes,
      });
      showToast("Checklist assigned successfully", "success");
      setShowAssignModal(false);
      setNewChecklist({ template_id: 1, due_date: "", notes: "" });
      loadEmployeeChecklists(selectedEmployee.id);
    } catch (error) {
      showToast(`Error assigning checklist: ${error.message}`, "error");
    }
  };

  const handleItemStatusChange = async (itemId, newStatus) => {
    try {
      await api.put(`/checklists/items/${itemId}/status`, { status: newStatus });
      showToast("Item status updated successfully", "success");
      if (selectedChecklist) loadChecklistDetails(selectedChecklist.checklist.id);
    } catch (error) {
      showToast(`Error updating item status: ${error.message}`, "error");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const badge = (status) => {
    const s = STATUS[status] || STATUS.not_started;
    return <span className={`ob-bd ${s.cls}`}>{s.label}</span>;
  };

  // Summary badge for a whole stage
  const stageBadge = (items) => {
    const done = items.filter((i) => i.status === "completed").length;
    if (done === items.length) return <span className="ob-bd ok">Done</span>;
    if (done === 0 && !items.some((i) => i.status === "in_progress"))
      return <span className="ob-bd no">Not started</span>;
    return <span className="ob-bd wa">{done} of {items.length} done</span>;
  };

  if (loading) {
    return (
      <div className="ob-page">
        <div className="ob-loading">Loading onboarding management...</div>
      </div>
    );
  }

  const empName = (e) => e?.full_name || e?.name || "Employee Name";

  return (
    <div className="ob-page">
      {toast.visible && <div className={`ob-toast ${toast.type}`}>{toast.msg}</div>}

      {/* ---------- 1. Employee list ---------- */}
      {!selectedEmployee && (
        <>
          <div className="ob-top"><span>Onboarding</span><span>Admin</span></div>
          <div className="ob-card">
            <div className="ob-title">Onboarding management</div>
            <div className="ob-sub">Manage employee onboarding workflows and verify completions</div>
          </div>
          <div className="ob-card">
            <h3 className="ob-h3">Select employee</h3>
            <div className="ob-emp-grid">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  className="ob-emp"
                  onClick={() => handleEmployeeSelect(employee)}
                >
                  <span className="ob-avatar sm">{initials(empName(employee))}</span>
                  <span className="ob-emp-info">
                    <strong>{empName(employee)}</strong>
                    <span className="ob-sub">
                      {employee.designation || "Designation"} · {employee.department || "Department"}
                    </span>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ---------- 2. Checklist list for one employee ---------- */}
      {selectedEmployee && !selectedChecklist && (
        <>
          <div className="ob-top">
            <span>Onboarding / {empName(selectedEmployee)}</span><span>Admin</span>
          </div>
          <div className="ob-card">
            <div className="ob-profile">
              <div className="ob-avatar">{initials(empName(selectedEmployee))}</div>
              <div className="ob-grow">
                <div className="ob-title">{empName(selectedEmployee)}</div>
                <div className="ob-sub">
                  {selectedEmployee.designation} · {selectedEmployee.department}
                </div>
              </div>
              <div className="ob-acts">
                <button className="ob-btn" type="button" onClick={handleBackToEmployees}>
                  ← Back to employees
                </button>
                <button className="ob-btn p" type="button" onClick={() => setShowAssignModal(true)}>
                  + Assign onboarding checklist
                </button>
              </div>
            </div>
          </div>

          {checklists.length === 0 ? (
            <div className="ob-card ob-empty">
              <h3 className="ob-h3">No onboarding checklists</h3>
              <div className="ob-sub">No onboarding checklists are assigned to this employee yet.</div>
            </div>
          ) : (
            checklists.map((checklist) => (
              <button
                key={checklist.id}
                type="button"
                className="ob-card ob-clist"
                onClick={() => loadChecklistDetails(checklist.id)}
              >
                <div className="ob-hd">
                  <h2>{checklist.template_name || "Onboarding checklist"}</h2>
                  {badge(checklist.status)}
                </div>
                <div className="ob-sub">{checklist.template_description || "Onboarding workflow"}</div>
                <div className="ob-sub" style={{ marginTop: 6 }}>
                  Assigned {formatDate(checklist.assigned_date)}
                  {checklist.due_date && ` · Joining date ${formatDate(checklist.due_date)}`}
                </div>
              </button>
            ))
          )}

          {showAssignModal && (
            <div className="ob-overlay">
              <div className="ob-modal" role="dialog" aria-modal="true" aria-labelledby="ob-modal-t">
                <h3 id="ob-modal-t" className="ob-h3">Assign onboarding checklist</h3>
                <div className="ob-fg">
                  <div>
                    <label htmlFor="ob-tpl">Template</label>
                    <select
                      id="ob-tpl"
                      value={newChecklist.template_id}
                      onChange={(e) =>
                        setNewChecklist({ ...newChecklist, template_id: parseInt(e.target.value) })
                      }
                    >
                      <option value={1}>Standard Onboarding Checklist</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ob-lwd">Joining date</label>
                    <input
                      id="ob-lwd"
                      type="date"
                      value={newChecklist.due_date}
                      onChange={(e) => setNewChecklist({ ...newChecklist, due_date: e.target.value })}
                    />
                  </div>
                </div>
                <label htmlFor="ob-notes">Notes</label>
                <textarea
                  id="ob-notes"
                  value={newChecklist.notes}
                  onChange={(e) => setNewChecklist({ ...newChecklist, notes: e.target.value })}
                  placeholder="Add any notes..."
                />
                <div className="ob-acts" style={{ marginTop: 16 }}>
                  <button className="ob-btn" type="button" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </button>
                  <button className="ob-btn p" type="button" onClick={handleAssignChecklist}>
                    Assign checklist
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------- 3. Workflow detail ---------- */}
      {selectedChecklist && (() => {
        const emp = selectedChecklist.employee;
        const { completed, total } = selectedChecklist.progress;
        const pct = total ? Math.round((completed / total) * 100) : 0;
        const stages = selectedChecklist.items_by_stage || [];
        const open = total - completed;

        return (
          <>
            <div className="ob-top">
              <span>Onboarding / {emp?.name || "Employee"}</span><span>Admin</span>
            </div>

            <div className="ob-card">
              <div className="ob-profile">
                <div className="ob-avatar">{initials(emp?.name)}</div>
                <div className="ob-grow">
                  <div className="ob-title">{emp?.name || "Employee Name"}</div>
                  <div className="ob-sub">
                    {emp?.designation || "Designation"} · {emp?.department || "Department"} · assigned{" "}
                    {formatDate(selectedChecklist.checklist?.assigned_date)} · joins{" "}
                    {formatDate(selectedChecklist.checklist?.due_date)} · reports to{" "}
                    {emp?.reporting_manager_name || "Manager"}
                  </div>
                </div>
                <div className="ob-acts">
                  <button className="ob-btn" type="button" onClick={() => setSelectedChecklist(null)}>
                    ← Back to checklists
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div className="ob-bar"><div style={{ width: `${pct}%` }} /></div>
                <div className="ob-sub" style={{ marginTop: 6 }}>
                  {completed} of {total} tasks done. Required items must be finished before activation.
                </div>
              </div>
            </div>

            <div className="ob-grid">
              <div>
                {stages.map((stageGroup) => {
                  const owners = [...new Set(stageGroup.items.map((i) => i.responsible_party))].join(", ");
                  return (
                    <section key={stageGroup.stage} className="ob-card" aria-label={stageGroup.stage_name}>
                      <div className="ob-hd">
                        <span className="ob-n">{stageGroup.stage}</span>
                        <h2>{stageGroup.stage_name}</h2>
                        <span className="ob-ow">Owner: {owners}</span>
                        {stageBadge(stageGroup.items)}
                      </div>
                      {stageGroup.items.map((item) => (
                        <div className="ob-row" key={item.id}>
                          <div className="ob-s">
                            {item.title}
                            {item.description && <div className="ob-sub">{item.description}</div>}
                            <div className="ob-sub">Responsible: {item.responsible_party}</div>
                          </div>
                          {badge(item.status)}
                          {item.status !== "completed" && (
                            <button
                              className="ob-btn"
                              type="button"
                              onClick={() => handleItemStatusChange(item.id, "completed")}
                            >
                              Verify &amp; complete
                            </button>
                          )}
                        </div>
                      ))}
                    </section>
                  );
                })}
              </div>

              <aside className="ob-card ob-rail" aria-label="Onboarding summary">
                <h3 className="ob-h3">Onboarding summary</h3>
                <div className="ob-rl">
                  <span>Overall</span>
                  <span className={`ob-bd ${open === 0 ? "ok" : "er"}`}>
                    {open === 0 ? "All done" : `${open} open`}
                  </span>
                </div>
                {stages.map((s) => (
                  <div className="ob-rl" key={s.stage}>
                    <span>{s.stage_name}</span>
                    {stageBadge(s.items)}
                  </div>
                ))}
              </aside>
            </div>
          </>
        );
      })()}
    </div>
  );
}