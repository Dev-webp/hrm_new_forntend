import { useCallback, useEffect, useMemo, useState } from "react";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { parseJwt } from "../../utils/parseJwt";
import api from "../../services/api";
import { CheckCircle, Clock, AlertCircle, FileText, Shield, Package, User, Briefcase, LogOut } from "lucide-react";
import "../../styles/LifecycleOnboarding.css";

export default function EmployeeOffboarding() {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const decoded = parseJwt(token) || {};
  const [profileData, setProfileData] = useState(null);
  const [checklistData, setChecklistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });

  const userId = useMemo(() => {
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      storedUser = {};
    }
    const source = { ...decoded, ...storedUser, ...(profileData || {}) };
    return source.id || source.userId || source.employee_id || 0;
  }, [decoded, profileData]);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch("/employee/profile")
      .then((profile) => {
        if (cancelled || !profile) return;
        setProfileData(profile);
        let storedUser = {};
        try {
          storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
        } catch {
          storedUser = {};
        }
        const nextUser = { ...storedUser, ...profile };
        localStorage.setItem("user", JSON.stringify(nextUser));
        if (profile.employee_code) {
          localStorage.setItem("employee_code", profile.employee_code);
        }
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [apiFetch, token]);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    setTimeout(() => setToast({ msg: "", visible: false, type: "" }), 3000);
  }, []);

  const loadOffboardingData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/lifecycle/employee/${userId}/details`);
      setChecklistData(response.data);
    } catch (error) {
      console.error("Error loading offboarding details:", error);
      showToast(`Error loading offboarding details: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    loadOffboardingData();
  }, [loadOffboardingData]);

  const getStatusBadge = (status) => {
    const statusMap = {
      verified: { icon: CheckCircle, color: "success", label: "Verified" },
      returned: { icon: CheckCircle, color: "success", label: "Returned" },
      revoked: { icon: CheckCircle, color: "success", label: "Revoked" },
      completed: { icon: CheckCircle, color: "success", label: "Completed" },
      granted: { icon: Shield, color: "warning", label: "Active" },
      assigned: { icon: Clock, color: "warning", label: "Pending" },
      pending: { icon: Clock, color: "warning", label: "Pending" },
    };
    const defaultStatus = { icon: Clock, color: "warning", label: status || "Pending" };
    return statusMap[status?.toLowerCase()] || defaultStatus;
  };

  if (loading) {
    return (
      <div className="lifecycle-onboarding-container">
        <div className="loading-state">Loading offboarding...</div>
      </div>
    );
  }

  if (!checklistData) {
    return (
      <div className="lifecycle-onboarding-container">
        <div className="loading-state">
          <p>No offboarding data available</p>
          <p style={{ fontSize: "13px", marginTop: "8px" }}>Contact HR for assistance.</p>
        </div>
      </div>
    );
  }

  const docs = checklistData.documents || [];
  const access = checklistData.system_access || [];
  const assets = checklistData.assets || [];
  const formalities = checklistData.joining_formalities || [];
  const deptSetup = checklistData.department_setup;

  return (
    <div className="lifecycle-onboarding-container">
      {toast.visible && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
      
      <div className="page-header">
        <h1>Offboarding</h1>
        <p>View your offboarding checklist and clearance requirements</p>
      </div>

      <div className="onboarding-grid">
        {/* Documents to Return Section */}
        <div className="checklist-section">
          <div className="section-header">
            <FileText className="section-icon" />
            <h2>Documents to Return</h2>
            <span className="item-count">{docs.length} items</span>
          </div>
          <div className="items-list">
            {docs.length > 0 ? docs.map((doc, idx) => {
              const status = getStatusBadge(doc.verification_status);
              const StatusIcon = status.icon;
              return (
                <div key={idx} className="item-card">
                  <div className="item-main">
                    <div className="item-icon-wrapper">
                      <FileText className="item-icon" />
                    </div>
                    <div className="item-content">
                      <h3>{doc.document_type || `Document ${idx + 1}`}</h3>
                      {doc.document_number && <p className="item-detail">Document: {doc.document_number}</p>}
                      {doc.notes && <p className="item-detail">{doc.notes}</p>}
                    </div>
                  </div>
                  <div className={`status-badge ${status.color}`}>
                    <StatusIcon className="status-icon" />
                    {status.label}
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state">
                <FileText className="empty-icon" />
                <p>No documents to return</p>
              </div>
            )}
          </div>
        </div>

        {/* Assets to Return Section */}
        <div className="checklist-section">
          <div className="section-header">
            <Package className="section-icon" />
            <h2>Assets to Return</h2>
            <span className="item-count">{assets.length} items</span>
          </div>
          <div className="items-list">
            {assets.length > 0 ? assets.map((asset, idx) => {
              const status = getStatusBadge(asset.status);
              const StatusIcon = status.icon;
              return (
                <div key={idx} className="item-card">
                  <div className="item-main">
                    <div className="item-icon-wrapper">
                      <Package className="item-icon" />
                    </div>
                    <div className="item-content">
                      <h3>{asset.asset_name || asset.asset_type || `Asset ${idx + 1}`}</h3>
                      {asset.asset_type && <p className="item-detail">Type: {asset.asset_type}</p>}
                      {asset.tag_number && <p className="item-detail">Tag: {asset.tag_number}</p>}
                      {asset.imei && <p className="item-detail">IMEI: {asset.imei}</p>}
                      {asset.phone_number && <p className="item-detail">Phone: {asset.phone_number}</p>}
                      {asset.condition && <p className="item-detail">Condition: {asset.condition}</p>}
                      {asset.notes && <p className="item-detail">{asset.notes}</p>}
                    </div>
                  </div>
                  <div className={`status-badge ${status.color}`}>
                    <StatusIcon className="status-icon" />
                    {status.label}
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state">
                <Package className="empty-icon" />
                <p>No assets to return</p>
              </div>
            )}
          </div>
        </div>

        {/* System Access to Revoke Section */}
        <div className="checklist-section">
          <div className="section-header">
            <Shield className="section-icon" />
            <h2>System Access to Revoke</h2>
            <span className="item-count">{access.length} items</span>
          </div>
          <div className="items-list">
            {access.length > 0 ? access.map((acc, idx) => {
              const status = getStatusBadge(acc.status);
              const StatusIcon = status.icon;
              return (
                <div key={idx} className="item-card">
                  <div className="item-main">
                    <div className="item-icon-wrapper">
                      <Shield className="item-icon" />
                    </div>
                    <div className="item-content">
                      <h3>{acc.system_name}</h3>
                      {acc.email && <p className="item-detail">Email: {acc.email}</p>}
                      {acc.role && <p className="item-detail">Role: {acc.role}</p>}
                      {acc.notes && <p className="item-detail">{acc.notes}</p>}
                    </div>
                  </div>
                  <div className={`status-badge ${status.color}`}>
                    <StatusIcon className="status-icon" />
                    {status.label}
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state">
                <Shield className="empty-icon" />
                <p>No system access to revoke</p>
              </div>
            )}
          </div>
        </div>

        {/* Department Clearance Section */}
        {deptSetup && (
          <div className="checklist-section">
            <div className="section-header">
              <Briefcase className="section-icon" />
              <h2>Department Clearance</h2>
              <span className="item-count">1 item</span>
            </div>
            <div className="items-list">
              <div className="item-card">
                <div className="item-main">
                  <div className="item-icon-wrapper">
                    <Briefcase className="item-icon" />
                  </div>
                  <div className="item-content">
                    <h3>Department Setup</h3>
                    {deptSetup.department && <p className="item-detail">Department: {deptSetup.department}</p>}
                    {deptSetup.reporting_manager && <p className="item-detail">Reporting Manager: {deptSetup.reporting_manager}</p>}
                    {deptSetup.team && <p className="item-detail">Team: {deptSetup.team}</p>}
                    {deptSetup.responsibilities && <p className="item-detail">Responsibilities: {deptSetup.responsibilities}</p>}
                  </div>
                </div>
                <div className="status-badge success">
                  <CheckCircle className="status-icon" />
                  Done
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formalities Section */}
        {formalities.length > 0 && (
          <div className="checklist-section">
            <div className="section-header">
              <User className="section-icon" />
              <h2>Formalities</h2>
              <span className="item-count">{formalities.length} items</span>
            </div>
            <div className="items-list">
              {formalities.map((formality, idx) => (
                <div key={idx} className="item-card">
                  <div className="item-main">
                    <div className="item-icon-wrapper">
                      <User className="item-icon" />
                    </div>
                    <div className="item-content">
                      <h3>{formality.formality_name || `Formality ${idx + 1}`}</h3>
                      {formality.notes && <p className="item-detail">{formality.notes}</p>}
                    </div>
                  </div>
                  <div className="status-badge success">
                    <CheckCircle className="status-icon" />
                    Done
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
