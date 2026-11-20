import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { getStoredRole } from "../../utils/auth";
import "../../styles/LifecycleOnboarding.css";

function LifecycleOnboarding() {
  const role = getStoredRole();
  const navigate = useNavigate();
  
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // list, onboarding, offboarding
  const [loading, setLoading] = useState(true);
  const [checklistData, setChecklistData] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showFormalityModal, setShowFormalityModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [documentForm, setDocumentForm] = useState({ documentName: "", documentNumber: "", uploadDate: "" });
  const [accessForm, setAccessForm] = useState({ email: "", password: "" });
  const [departmentForm, setDepartmentForm] = useState({ department: "", reportingManager: "", team: "", responsibilities: "" });
  const [assetForm, setAssetForm] = useState({ assetName: "", assetType: "", tagNumber: "", imei: "", phoneNumber: "", condition: "", notes: "" });
  const [contactForm, setContactForm] = useState({ contactType: "", value: "" });
  const [formalityForm, setFormalityForm] = useState({ formalityName: "", notes: "" });
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });
  const [offboardingItems, setOffboardingItems] = useState({});
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesItem, setNotesItem] = useState(null);
  const [notesValue, setNotesValue] = useState("");
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitType, setExitType] = useState("EXIT");
  const [exitReason, setExitReason] = useState("");
  const [sectionCheckboxes, setSectionCheckboxes] = useState({});
  const [showOnboardingSuccess, setShowOnboardingSuccess] = useState(false);
  const [showOnboardingConfirmModal, setShowOnboardingConfirmModal] = useState(false);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get("/admin/employees");
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch checklist details for employee
  const fetchEmployeeDetails = useCallback(async (employeeId) => {
    try {
      const response = await api.get(`/lifecycle/employee/${employeeId}/details`);
      console.log('[DEBUG] Employee details response:', response.data);
      console.log('[DEBUG] Employee data from users table:', response.data.employee);
      setChecklistData(response.data);
    } catch (error) {
      console.log("No checklist data yet:", error);
      setChecklistData({
        employee: selectedEmployee,
        documents: [],
        system_access: [],
        department_setup: null,
        assets: [],
        joining_formalities: []
      });
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    setTimeout(() => setToast({ msg: "", visible: false, type: "" }), 3000);
  }, []);

  const handleCompleteOnboarding = async () => {
    setShowOnboardingConfirmModal(true);
  };

  const confirmOnboarding = async () => {
    try {
      await api.post("/lifecycle/complete-onboarding", {
        employee_id: selectedEmployee.id
      });
      setShowOnboardingConfirmModal(false);
      setShowOnboardingSuccess(true);
      showToast("Onboarding completed successfully! Employee is now ACTIVE.", "success");
      fetchEmployees();
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      console.error("Complete onboarding error:", error);
      showToast("Failed to complete onboarding: " + (error.response?.data?.message || error.message), "error");
    }
  };

  const handleExitEmployee = async () => {
    try {
      await api.post("/lifecycle/complete-offboarding", {
        employee_id: selectedEmployee.id,
        exit_type: exitType
      });
      showToast(`Offboarding completed successfully. Employee marked as ${exitType === 'TERMINATE' ? 'TERMINATED' : 'EXITED'}.`, "success");
      setShowExitModal(false);
      setExitReason("");
      fetchEmployees();
      handleBackToList();
    } catch (error) {
      console.error("Complete offboarding error:", error);
      showToast("Failed to complete offboarding: " + (error.response?.data?.message || error.message), "error");
    }
  };

  const handleReonboardEmployee = async (employee) => {
    try {
      await api.post("/lifecycle/reonboard-employee", {
        employee_id: employee.id
      });
      showToast(`${employee.full_name} reonboarded successfully!`, "success");
      fetchEmployees();
    } catch (error) {
      console.error("Reonboard employee error:", error);
      showToast("Failed to reonboard employee: " + (error.response?.data?.message || error.message), "error");
    }
  };

  const handleOnboardClick = (employee) => {
    setSelectedEmployee(employee);
    setViewMode("onboarding");
    setShowOnboardingSuccess(false);
    fetchEmployeeDetails(employee.id);
  };

  const handleOffboardClick = (employee) => {
    setSelectedEmployee(employee);
    setViewMode("offboarding");
    fetchEmployeeDetails(employee.id);
  };

  const handleBackToList = () => {
    setSelectedEmployee(null);
    setViewMode("list");
    setChecklistData(null);
  };

  // Onboarding checklist
  const onboardingChecklist = useMemo(() => [
    {
      id: 1,
      title: "Documents",
      owner: "Admin",
      items: (() => {
        const dbDocs = checklistData?.documents || [];
        // Deduplicate documents by document_type
        const uniqueDocs = [];
        const seen = new Set();
        for (const doc of dbDocs) {
          if (!seen.has(doc.document_type)) {
            seen.add(doc.document_type);
            uniqueDocs.push({
              id: doc.id,
              name: doc.document_type,
              status: doc.status === "verified" ? "verified" : "uploaded",
              document_number: doc.document_number,
              upload_date: doc.upload_date,
              notes: doc.notes
            });
          }
        }

        const docTypes = uniqueDocs.map(doc => doc.name.toLowerCase());
        const defaultItems = [];

        // Add Aadhaar from employee profile if not already in database
        if (!docTypes.includes("aadhaar") && !docTypes.includes("aadhaar card") && checklistData?.employee?.aadhar_number) {
          defaultItems.push({ id: 1, name: "Aadhaar card", status: "verified", document_number: checklistData?.employee?.aadhar_number, upload_date: "", notes: "From employee profile" });
        }

        return [...uniqueDocs, ...defaultItems];
      })()
    },
    {
      id: 2,
      title: "Work email and contacts",
      owner: "Admin",
      items: (() => {
        const items = [];
        // Work email from employee profile
        if (checklistData?.employee?.email) {
          items.push({ id: 1, name: "Work email", status: "assigned", email: checklistData?.employee?.email });
        }
        // Company phone from employee profile
        if (checklistData?.employee?.phone_number) {
          items.push({ id: 2, name: "Company phone", status: "assigned", phone_number: checklistData?.employee?.phone_number });
        }
        return items;
      })()
    },
    {
      id: 3,
      title: "Assets",
      owner: "Admin",
      items: (() => {
        const dbAssets = checklistData?.assets || [];
        // Deduplicate assets by asset_name + tag_number
        const uniqueAssets = [];
        const seen = new Set();
        for (const asset of dbAssets) {
          const key = `${asset.asset_name || asset.asset_type}-${asset.tag_number || ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueAssets.push(asset);
          }
        }
        // Only show manually added assets - no defaults
        return uniqueAssets.map((asset, idx) => ({
          id: asset.id,
          name: asset.asset_name || asset.asset_type,
          status: asset.status === "assigned" ? "assigned" : "not_assigned",
          tag_number: asset.tag_number,
          imei: asset.imei,
          phone_number: asset.phone_number,
          condition: asset.condition,
          notes: asset.notes
        }));
      })()
    },
    {
      id: 4,
      title: "Offer letter",
      owner: "Admin",
      items: (() => {
        const items = [];
        // Show offer letter ID if exists in employee profile
        if (checklistData?.employee?.offer_letter_id) {
          items.push({
            id: 1,
            name: "Offer letter",
            status: "verified",
            offer_letter_id: checklistData.employee.offer_letter_id,
            notes: "Offer letter created"
          });
        }
        return items;
      })()
    },
    {
      id: 5,
      title: "System access",
      owner: "Admin",
      items: (() => {
        const dbAccess = checklistData?.system_access || [];
        // Only show manually added system access - no defaults, no auto-detection
        // Invoice and OPS permissions should be granted at their respective admin pages
        const uniqueSystems = [];
        const seen = new Set();
        for (const access of dbAccess) {
          if (!seen.has(access.system_name)) {
            seen.add(access.system_name);
            uniqueSystems.push({
              id: access.id,
              name: access.system_name,
              status: access.status,
              role: access.role,
              email: access.email || checklistData?.employee?.email,
              password: access.password || '',
              notes: access.notes || ''
            });
          }
        }
        // Add HRMS, Invoice and OPS as special items ONLY if they don't already exist in database
        if (!seen.has("HRMS")) {
          uniqueSystems.push({
            id: 997,
            name: "HRMS",
            status: "granted",
            role: checklistData?.employee?.role || "Employee",
            email: checklistData?.employee?.email,
            password: '',
            notes: "Default HRMS access",
            is_special: true,
            grant_url: null
          });
        }
        if (!seen.has("Invoice app")) {
          uniqueSystems.push({
            id: 999,
            name: "Invoice app",
            status: checklistData?.employee?.invoice_access ? "granted" : "not_granted",
            role: "Executive",
            email: checklistData?.employee?.email,
            password: '',
            notes: checklistData?.employee?.invoice_access ? "Access granted via Invoice admin" : "Grant access via Invoice admin",
            is_special: true,
            grant_url: "/admin/invoice/employees"
          });
        }
        if (!seen.has("OPS portal")) {
          uniqueSystems.push({
            id: 998,
            name: "OPS portal",
            status: checklistData?.employee?.ops_access ? "granted" : "not_granted",
            role: "User",
            email: checklistData?.employee?.email,
            password: '',
            notes: checklistData?.employee?.ops_access ? "Access granted via OPS admin" : "Grant access via OPS admin",
            is_special: true,
            grant_url: "/admin/ops/employees/new"
          });
        }
        return uniqueSystems;
      })()
    },
    {
      id: 6,
      title: "Department setup",
      owner: "Manager",
      items: (() => {
        const deptSetup = checklistData?.department_setup;
        if (deptSetup) {
          return [{
            id: 6,
            name: "Assign manager, team and responsibilities",
            status: "assigned",
            department: deptSetup.department,
            reporting_manager: deptSetup.reporting_manager,
            team: deptSetup.team,
            responsibilities: deptSetup.responsibilities
          }];
        }
        return [{
          id: 6,
          name: "Assign manager, team and responsibilities",
          status: "pending",
          department: checklistData?.employee?.department,
          reporting_manager: "",
          team: "",
          responsibilities: ""
        }];
      })()
    },
    {
      id: 7,
      title: "Joining formalities",
      owner: "HR",
      items: checklistData?.joining_formalities?.map((formality, idx) => ({
        id: formality.id,
        name: formality.formality_name,
        status: formality.status === "done" ? "done" : "pending",
        notes: formality.notes || ''
      })) || [
        { id: 401, name: "Offer letter signed", status: "pending", notes: "" },
        { id: 402, name: "Appointment letter signed", status: "pending", notes: "" },
        { id: 403, name: "Code of conduct acknowledged", status: "pending", notes: "" },
        { id: 404, name: "Attendance and leave policy acknowledged", status: "pending", notes: "" },
        { id: 405, name: "Data confidentiality acknowledged", status: "pending", notes: "" }
      ]
    },
    {
      id: 8,
      title: "Onboarding completion",
      owner: "HR",
      items: [
        { id: 8, name: "Final verification and activation", status: "pending" }
      ]
    }
  ], [checklistData]);

  // Offboarding checklist
  const offboardingChecklist = useMemo(() => [
    {
      id: 1,
      title: "Exit initiation",
      owner: "Employee",
      items: (() => {
        const tasks = checklistData?.tasks || [];
        return [
          { id: 1, name: "Resignation letter", status: tasks.find(t => t.title === "Resignation letter")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Resignation letter")?.remarks || "" },
          { id: 2, name: "Exit interview scheduled", status: tasks.find(t => t.title === "Exit interview scheduled")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Exit interview scheduled")?.remarks || "" }
        ];
      })()
    },
    {
      id: 2,
      title: "Manager approval",
      owner: "Manager",
      items: (() => {
        const tasks = checklistData?.tasks || [];
        return [
          { id: 3, name: "Resignation accepted", status: tasks.find(t => t.title === "Resignation accepted")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Resignation accepted")?.remarks || "" },
          { id: 4, name: "Handover initiated", status: tasks.find(t => t.title === "Handover initiated")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Handover initiated")?.remarks || "" }
        ];
      })()
    },
    {
      id: 3,
      title: "Asset clearance",
      owner: "IT",
      items: checklistData?.assets?.map((asset, idx) => ({
        id: asset.id,
        name: asset.asset_name || asset.asset_type,
        status: asset.status === "returned" ? "returned" : (asset.status === "assigned" ? "pending" : "not_assigned"),
        asset_id: asset.id,
        tag_number: asset.tag_number,
        condition: asset.condition,
        notes: asset.notes || ""
      })) || []
    },
    {
      id: 4,
      title: "System access",
      owner: "IT",
      items: (() => {
        const dbAccess = checklistData?.system_access || [];
        // Only show manually added system access - no defaults, no auto-detection
        const uniqueSystems = [];
        const seen = new Set();
        for (const access of dbAccess) {
          if (!seen.has(access.system_name)) {
            seen.add(access.system_name);
            uniqueSystems.push({
              id: access.id,
              name: access.system_name,
              status: access.status === "revoked" ? "revoked" : (access.status === "granted" ? "granted" : "not_granted"),
              role: access.role,
              email: access.email || checklistData?.employee?.email,
              password: access.password || '',
              notes: access.notes || ''
            });
          }
        }
        // Add HRMS, Invoice and OPS as special items ONLY if they don't already exist in database
        if (!seen.has("HRMS")) {
          uniqueSystems.push({
            id: 997,
            name: "HRMS",
            status: "granted",
            role: checklistData?.employee?.role || "Employee",
            email: checklistData?.employee?.email,
            password: '',
            notes: "Default HRMS access",
            is_special: true,
            grant_url: null
          });
        }
        if (!seen.has("Invoice app")) {
          uniqueSystems.push({
            id: 999,
            name: "Invoice app",
            status: checklistData?.employee?.invoice_access ? "granted" : "not_granted",
            role: "Executive",
            email: checklistData?.employee?.email,
            password: '',
            notes: checklistData?.employee?.invoice_access ? "Access granted via Invoice admin" : "Grant access via Invoice admin",
            is_special: true,
            grant_url: "/admin/invoice/employees"
          });
        }
        if (!seen.has("OPS portal")) {
          uniqueSystems.push({
            id: 998,
            name: "OPS portal",
            status: checklistData?.employee?.ops_access ? "granted" : "not_granted",
            role: "User",
            email: checklistData?.employee?.email,
            password: '',
            notes: checklistData?.employee?.ops_access ? "Access granted via OPS admin" : "Grant access via OPS admin",
            is_special: true,
            grant_url: "/admin/ops/employees/new"
          });
        }
        return uniqueSystems;
      })()
    },
    {
      id: 5,
      title: "Knowledge transfer",
      owner: "Manager",
      items: (() => {
        const tasks = checklistData?.tasks || [];
        return [
          { id: 5, name: "Documentation completed", status: tasks.find(t => t.title === "Documentation completed")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Documentation completed")?.remarks || "" },
          { id: 6, name: "Team training done", status: tasks.find(t => t.title === "Team training done")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Team training done")?.remarks || "" }
        ];
      })()
    },
    {
      id: 6,
      title: "Financial clearance",
      owner: "Finance",
      items: (() => {
        const tasks = checklistData?.tasks || [];
        return [
          { id: 7, name: "Pending expenses cleared", status: tasks.find(t => t.title === "Pending expenses cleared")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Pending expenses cleared")?.remarks || "" },
          { id: 8, name: "Final settlement calculated", status: tasks.find(t => t.title === "Final settlement calculated")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Final settlement calculated")?.remarks || "" }
        ];
      })()
    },
    {
      id: 7,
      title: "Exit interview",
      owner: "HR",
      items: (() => {
        const tasks = checklistData?.tasks || [];
        return [
          { id: 9, name: "Exit interview completed", status: tasks.find(t => t.title === "Exit interview completed")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Exit interview completed")?.remarks || "" },
          { id: 10, name: "Feedback documented", status: tasks.find(t => t.title === "Feedback documented")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Feedback documented")?.remarks || "" }
        ];
      })(),
      action: (
        <button 
          className="btn-create-letter"
          onClick={() => window.location.href = "/admin/letters/experience"}
        >
          Create Relieving Letter
        </button>
      )
    },
    {
      id: 8,
      title: "Account deactivation",
      owner: "IT",
      items: (() => {
        const tasks = checklistData?.tasks || [];
        return [
          { id: 11, name: "All accounts deactivated", status: tasks.find(t => t.title === "All accounts deactivated")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "All accounts deactivated")?.remarks || "" },
          { id: 12, name: "Email forwarded", status: tasks.find(t => t.title === "Email forwarded")?.status === "DONE" ? "done" : "pending", notes: tasks.find(t => t.title === "Email forwarded")?.remarks || "" }
        ];
      })()
    }
  ], [checklistData, offboardingItems]);

  const completedCount = useMemo(() => {
    const checklist = viewMode === "onboarding" ? onboardingChecklist : offboardingChecklist;
    const completedStatuses = viewMode === "onboarding"
      ? ["verified", "assigned", "done", "granted"]
      : ["verified", "returned", "revoked", "done"];
    return checklist.reduce((count, section) => {
      // Exclude offer letter (section 4), onboarding completion (section 8), and HRMS (id 997) from count
      if (viewMode === "onboarding" && (section.id === 4 || section.id === 8)) {
        return count;
      }
      // Exclude HRMS (id 997) from count for both onboarding and offboarding
      return count + section.items.filter(item => completedStatuses.includes(item.status) && item.id !== 997).length;
    }, 0);
  }, [viewMode, onboardingChecklist, offboardingChecklist]);

  const totalCount = useMemo(() => {
    const checklist = viewMode === "onboarding" ? onboardingChecklist : offboardingChecklist;
    return checklist.reduce((count, section) => {
      // Exclude offer letter (section 4), onboarding completion (section 8), and HRMS (id 997) from count
      if (viewMode === "onboarding" && (section.id === 4 || section.id === 8)) {
        return count;
      }
      // Exclude HRMS (id 997) from count for both onboarding and offboarding
      return count + section.items.filter(item => item.id !== 997).length;
    }, 0);
  }, [viewMode, onboardingChecklist, offboardingChecklist]);

  const initials = (name = "") =>
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Save handlers
  const saveDocumentEntry = async () => {
    try {
      await api.post("/lifecycle/documents", {
        employee_id: selectedEmployee.id,
        document_type: selectedItem.name === 'New Document' ? documentForm.documentName : selectedItem.name,
        document_number: documentForm.documentNumber,
        upload_date: documentForm.uploadDate,
        notes: ""
      });
      setShowDocumentModal(false);
      setDocumentForm({ documentName: "", documentNumber: "", uploadDate: "" });
      showToast("Document saved successfully", "success");
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      showToast("Failed to save document", "error");
    }
  };

  const saveAccessEntry = async () => {
    try {
      await api.post("/lifecycle/system-access", {
        employee_id: selectedEmployee.id,
        system_name: selectedItem.name,
        email: accessForm.email,
        password: accessForm.password,
        role: selectedItem.role || "",
        status: accessForm.email ? "granted" : "pending",
        notes: ""
      });
      setShowAccessModal(false);
      setAccessForm({ email: "", password: "" });
      showToast("System access saved successfully", "success");
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      showToast("Failed to save system access", "error");
    }
  };

  const saveAssetEntry = async () => {
    try {
      await api.post("/lifecycle/assets", {
        employee_id: selectedEmployee.id,
        asset_name: assetForm.assetName,
        asset_type: assetForm.assetType,
        tag_number: assetForm.tagNumber,
        imei: assetForm.imei,
        phone_number: assetForm.phoneNumber,
        condition: assetForm.condition,
        notes: assetForm.notes
      });
      setShowAssetModal(false);
      setAssetForm({ assetName: "", assetType: "", tagNumber: "", imei: "", phoneNumber: "", condition: "", notes: "" });
      showToast("Asset assigned successfully", "success");
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      showToast("Failed to assign asset", "error");
    }
  };

  const saveDepartmentEntry = async () => {
    try {
      const reportingManagerId = departmentForm.reportingManager && !isNaN(parseInt(departmentForm.reportingManager)) 
        ? parseInt(departmentForm.reportingManager) 
        : null;
      
      await api.post("/lifecycle/department-setup", {
        employee_id: selectedEmployee.id,
        department: departmentForm.department,
        reporting_manager: reportingManagerId,
        team: departmentForm.team,
        responsibilities: departmentForm.responsibilities ? departmentForm.responsibilities.split(",").filter(r => r.trim()) : [],
        notes: ""
      });
      setShowDepartmentModal(false);
      showToast("Department setup saved successfully", "success");
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      showToast("Failed to save department setup", "error");
    }
  };

  const saveFormalityEntry = async () => {
    try {
      await api.post("/lifecycle/joining-formalities", {
        employee_id: selectedEmployee.id,
        formality_name: formalityForm.formalityName,
        formality_type: "onboarding",
        status: "acknowledged",
        notes: formalityForm.notes
      });
      setShowFormalityModal(false);
      setFormalityForm({ formalityName: "", notes: "" });
      showToast("Formality acknowledged successfully", "success");
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      showToast("Failed to acknowledge formality", "error");
    }
  };

  const handleAssetReturn = async () => {
    try {
      await api.post("/lifecycle/asset-return", {
        employee_id: selectedEmployee.id,
        asset_id: selectedItem.id,
        condition: assetForm.condition,
        notes: assetForm.notes,
        deduct_cost: assetForm.deductCost
      });
      setShowAssetModal(false);
      setAssetForm({ assetName: "", assetType: "", tagNumber: "", imei: "", phoneNumber: "", condition: "", notes: "", deductCost: false });
      showToast("Asset returned successfully", "success");
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      showToast("Failed to return asset", "error");
    }
  };

  const handleAccessRevoke = async () => {
    try {
      await api.post("/lifecycle/access-revoke", {
        employee_id: selectedEmployee.id,
        system_name: selectedItem.name,
        notes: accessForm.notes
      });
      setShowAccessModal(false);
      setAccessForm({ email: "", password: "", notes: "" });
      showToast("Access revoked successfully", "success");
      fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      showToast("Failed to revoke access", "error");
    }
  };

  const handleOffboardingItemDone = async (itemId) => {
    try {
      // Create or update offboarding task in lifecycle_tasks table
      const taskTitle = offboardingChecklist
        .flatMap(section => section.items)
        .find(item => item.id === itemId)?.name;

      if (!taskTitle) {
        showToast("Task not found", "error");
        return;
      }

      // Check if there's an existing offboarding case for this employee
      const casesResponse = await api.get(`/lifecycle/cases?employee_id=${selectedEmployee.id}&type=OFFBOARD`);
      let existingCase = casesResponse.data?.[0];

      // Create offboarding case if it doesn't exist
      if (!existingCase) {
        const caseResponse = await api.post("/lifecycle/cases", {
          employee_id: selectedEmployee.id,
          type: "OFFBOARD",
          anchor_date: new Date().toISOString().split('T')[0]
        });
        existingCase = caseResponse.data;
      }

      // Check if task already exists in the case
      const tasksResponse = await api.get(`/lifecycle/cases/${existingCase.id}/tasks`);
      const existingTask = tasksResponse.data?.find(t => t.title === taskTitle);

      if (existingTask) {
        // Update existing task
        await api.put(`/lifecycle/tasks/${existingTask.id}`, {
          status: "DONE",
          remarks: existingTask.remarks || "Marked as done"
        });
      } else {
        // Create new task
        await api.post(`/lifecycle/cases/${existingCase.id}/tasks`, {
          title: taskTitle,
          category: "Offboarding",
          assignee_role: "HR",
          status: "DONE",
          remarks: "Marked as done"
        });
      }

      showToast("Item marked as done", "success");
      // Refresh employee details to update checklist UI
      await fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      console.error("Mark as done error:", error);
      showToast("Failed to mark item as done: " + (error.response?.data?.message || error.message), "error");
    }
  };

  const handleOffboardingNotesEdit = (item) => {
    setNotesItem(item);
    setNotesValue(item.notes || "");
    setShowNotesModal(true);
  };

  const saveOffboardingNotes = async () => {
    try {
      const taskTitle = offboardingChecklist
        .flatMap(section => section.items)
        .find(item => item.id === notesItem.id)?.name;

      if (!taskTitle) {
        showToast("Task not found", "error");
        return;
      }

      // Check if there's an existing offboarding case for this employee
      const casesResponse = await api.get(`/lifecycle/cases?employee_id=${selectedEmployee.id}&type=OFFBOARD`);
      let existingCase = casesResponse.data?.[0];

      // Create offboarding case if it doesn't exist
      if (!existingCase) {
        const caseResponse = await api.post("/lifecycle/cases", {
          employee_id: selectedEmployee.id,
          type: "OFFBOARD",
          anchor_date: new Date().toISOString().split('T')[0]
        });
        existingCase = caseResponse.data;
      }

      // Check if task already exists in the case
      const tasksResponse = await api.get(`/lifecycle/cases/${existingCase.id}/tasks`);
      const existingTask = tasksResponse.data?.find(t => t.title === taskTitle);

      if (existingTask) {
        // Update existing task with notes
        await api.put(`/lifecycle/tasks/${existingTask.id}`, {
          remarks: notesValue
        });
      } else {
        // Create new task with notes
        await api.post(`/lifecycle/cases/${existingCase.id}/tasks`, {
          title: taskTitle,
          category: "Offboarding",
          assignee_role: "HR",
          status: "PENDING",
          remarks: notesValue
        });
      }

      setShowNotesModal(false);
      showToast("Notes saved successfully", "success");
      // Refresh employee details to update checklist UI
      await fetchEmployeeDetails(selectedEmployee.id);
    } catch (error) {
      console.error("Save notes error:", error);
      showToast("Failed to save notes: " + (error.response?.data?.message || error.message), "error");
    }
  };

  if (loading) {
    return (
      <div className="lifecycle-onboarding-container">
        <div className="loading-state">Loading...</div>
      </div>
    );
  }

  const currentChecklist = viewMode === "onboarding" ? onboardingChecklist : offboardingChecklist;

  // Calculate total pending items across all sections
  const totalPending = currentChecklist.reduce((sum, section) => {
    const completedStatuses = viewMode === "onboarding"
      ? ["verified", "assigned", "done", "granted"]
      : ["verified", "returned", "revoked", "done"];
    const sectionCompleted = section.items.filter(item => completedStatuses.includes(item.status)).length;
    const sectionTotal = section.items.length;
    return sum + (sectionTotal - sectionCompleted);
  }, 0);

  return (
    <div className={`lifecycle-onboarding-container ${viewMode}`}>
      {toast.visible && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* Employee List View */}
      {viewMode === "list" && (
        <>
          <div className="page-header">
            <h1>Employee Onboarding & Offboarding</h1>
            <p>Manage employee lifecycle - onboard new hires and offboard exiting employees</p>
          </div>

          <div className="filters-container">
            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search by name, code..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-group">
              <label>Department:</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="filter-select"
              >
                <option value="">All Departments</option>
                {[...new Set(employees.map(e => e.department).filter(Boolean))].map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Branch:</label>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="filter-select"
              >
                <option value="">All Branches</option>
                {[...new Set(employees.map(e => e.branch).filter(Boolean))].map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="all">All Employees</option>
              </select>
            </div>
          </div>

          <div className="employee-table-container">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Designation</th>
                  <th>Branch</th>
                  <th>Employment Status</th>
                  <th>Joining Date</th>
                  <th>Reporting Manager</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees
                  .filter(employee => {
                    const keyword = searchKeyword.toLowerCase();
                    const matchesKeyword = !keyword ||
                      employee.full_name?.toLowerCase().includes(keyword) ||
                      employee.employee_code?.toLowerCase().includes(keyword) ||
                      employee.designation?.toLowerCase().includes(keyword);
                    const matchesDepartment = !filterDepartment || employee.department === filterDepartment;
                    const matchesBranch = !filterBranch || employee.branch === filterBranch;
                    
                    // Handle different representations of active/inactive status
                    const hasTerminationDate = employee.termination_date && employee.termination_date !== null && employee.termination_date !== "";
                    const isActive = employee.is_active !== false && 
                                    employee.is_active !== 0 && 
                                    employee.is_active !== "0" &&
                                    employee.is_active !== "false" &&
                                    employee.status !== "inactive" &&
                                    employee.status !== "terminated" &&
                                    !hasTerminationDate;
                    
                    // Debug logging for inactive filter
                    if (filterStatus === "inactive" && !isActive) {
                      console.log("Inactive employee found:", employee.full_name, employee);
                    }
                    
                    const matchesStatus = filterStatus === "all" || 
                      (filterStatus === "active" && isActive) ||
                      (filterStatus === "inactive" && !isActive);
                    return matchesKeyword && matchesDepartment && matchesBranch && matchesStatus;
                  })
                  .map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar">{initials(employee.full_name)}</div>
                        <div className="employee-info">
                          <strong>{employee.full_name}</strong>
                        </div>
                      </div>
                    </td>
                    <td>{employee.designation || "N/A"}</td>
                    <td>{employee.branch || "N/A"}</td>
                    <td>
                      <span className={`status-badge ${employee.employment_status?.toLowerCase() || 'active'}`}>
                        {employee.employment_status || 'ACTIVE'}
                      </span>
                    </td>
                    <td>{formatDate(employee.joining_date)}</td>
                    <td>{employee.reporting_manager_id ? "Assigned" : "Not assigned"}</td>
                    <td>
                      <div className="action-buttons">
                        {employee.employment_status === 'EXITED' || employee.employment_status === 'TERMINATED' ? (
                          <button className="btn-reonboard" onClick={() => handleReonboardEmployee(employee)}>
                            Reonboard
                          </button>
                        ) : (
                          <>
                            <button className="btn-onboard" onClick={() => handleOnboardClick(employee)}>
                              Onboard
                            </button>
                            <button className="btn-offboard" onClick={() => handleOffboardClick(employee)}>
                              Offboard
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Onboarding/Offboarding Detail View */}
      {viewMode !== "list" && selectedEmployee && (
        <div className={`lifecycle-onboarding-container ${viewMode}`}>
          <div className="employee-onboarding-header">
            <div className="header-left">
              <button className="back-btn" onClick={handleBackToList}>
                ← Back to list
              </button>
              <div className="breadcrumb">
                {viewMode === "onboarding" ? "Onboarding" : "Offboarding"} / {selectedEmployee.full_name}
              </div>
            </div>
            <div className="header-right">
              <span className="header-role">{role}</span>
            </div>
          </div>

          <div className="progress-wrap">
            <div className="progress-bar">
              <div style={{ width: `${totalCount ? Math.round((completedCount / totalCount) * 100) : 0}%` }} />
            </div>
            <div className="progress-message">
              {completedCount} of {totalCount} items done. Required items must be finished before {viewMode === "onboarding" ? "activation" : "exit"}.
            </div>
          </div>

          {viewMode === "onboarding" && (
            <div className="action-buttons">
              <button className="complete-btn" onClick={handleCompleteOnboarding}>
                Complete Onboarding
              </button>
              <button className="verify-btn" onClick={async () => {
                try {
                  await api.post("/lifecycle/complete-onboarding", { employee_id: selectedEmployee.id });
                  setShowOnboardingSuccess(true);
                  showToast("Onboarding verified successfully", "success");
                  fetchEmployeeDetails(selectedEmployee.id);
                } catch (error) {
                  showToast("Failed to verify onboarding: " + (error.response?.data?.message || error.message), "error");
                }
              }}>
                Verify Onboarding
              </button>
            </div>
          )}

          {viewMode === "onboarding" && showOnboardingSuccess && (
            <div className="success-message" style={{
              background: "#10b981",
              color: "white",
              padding: "16px 24px",
              borderRadius: "8px",
              textAlign: "center",
              fontWeight: "600",
              fontSize: "16px",
              marginBottom: "20px"
            }}>
              🎉 Onboarding Successfully Completed!
            </div>
          )}

          {viewMode === "offboarding" && (
            <div className="action-buttons">
              <button className="exit-btn" onClick={() => { setExitType("EXIT"); setShowExitModal(true); }}>
                Exit Employee
              </button>
              <button className="terminate-btn" onClick={() => { setExitType("TERMINATE"); setShowExitModal(true); }}>
                Terminate Employee
              </button>
            </div>
          )}

          <div className="onboarding-grid">
            {currentChecklist.filter(section => {
              // Hide onboarding completion section (section 8) until all other sections are complete
              if (viewMode === "onboarding" && section.id === 8) {
                return totalPending === 0;
              }
              return true;
            }).map((section) => {
              const completedStatuses = viewMode === "onboarding"
                ? ["verified", "assigned", "done", "granted"]
                : ["verified", "returned", "revoked", "done"];
              const sectionCompleted = section.items.filter(item => completedStatuses.includes(item.status) && item.id !== 997).length;
              // Exclude offer letter (section 4), onboarding completion (section 8), and HRMS (id 997) from total count
              const sectionTotal = (section.id === 4 || section.id === 8) ? 0 : section.items.filter(item => item.id !== 997).length;
              const sectionPending = sectionTotal - sectionCompleted;

              const handleSectionCheckbox = async (sectionId) => {
                try {
                  // For sections with no items (assets, offer letter), just mark as complete in database
                  if (section.items.length === 0) {
                    await api.post("/lifecycle/section-complete", {
                      employee_id: selectedEmployee.id,
                      section_id: sectionId,
                      section_name: section.title
                    });
                    setSectionCheckboxes(prev => ({ ...prev, [sectionId]: true }));
                    showToast(`Section "${section.title}" marked as complete`, "success");
                    return;
                  }

                  // Mark all items in this section as completed
                  for (const item of section.items) {
                    if (item.status === "pending" || item.status === "not_assigned" || item.status === "not_granted") {
                      if (sectionId === 1) {
                        const existingDoc = checklistData?.documents?.find(d => d.document_type === item.name);
                        if (existingDoc) {
                          await api.put(`/lifecycle/documents/${existingDoc.id}`, {
                            document_number: item.document_number || existingDoc.document_number || "",
                            upload_date: new Date().toISOString().split('T')[0],
                            status: "verified",
                            notes: "Section verified"
                          });
                        } else {
                          await api.post("/lifecycle/documents", {
                            employee_id: selectedEmployee.id,
                            document_type: item.name,
                            document_number: item.document_number || "",
                            upload_date: new Date().toISOString().split('T')[0],
                            status: "verified",
                            notes: "Section verified"
                          });
                        }
                      } else if (sectionId === 3) {
                        // Assets - only verify existing manually added assets, don't create defaults
                        const existingAsset = checklistData?.assets?.find(a => a.asset_name === item.name || a.asset_type === item.name);
                        if (existingAsset) {
                          await api.put(`/lifecycle/assets/${existingAsset.id}`, {
                            asset_name: item.name,
                            asset_type: item.name,
                            tag_number: existingAsset.tag_number || "Verified",
                            imei: existingAsset.imei || "",
                            phone_number: existingAsset.phone_number || "",
                            condition: existingAsset.condition || "Good",
                            status: "assigned",
                            notes: "Section verified"
                          });
                        }
                        // If asset doesn't exist, skip it - admin must manually add it
                      } else if (sectionId === 5) {
                        // System access - only verify existing manually added access, don't create defaults
                        const existingAccess = checklistData?.system_access?.find(a => a.system_name === item.name);
                        if (existingAccess) {
                          await api.put(`/lifecycle/system-access/${existingAccess.id}`, {
                            email: selectedEmployee.email || existingAccess.email || "",
                            password: "",
                            role: item.role || existingAccess.role || "",
                            status: "granted",
                            notes: "Section verified"
                          });
                        }
                        // If system access doesn't exist, skip it - admin must manually add it
                      } else if (sectionId === 4) {
                        // Offer letter - just mark as verified locally (admin adds notes manually)
                        console.log("Offer letter verified");
                      } else if (sectionId === 6) {
                        await api.post("/lifecycle/department-setup", {
                          employee_id: selectedEmployee.id,
                          department: selectedEmployee.department || "",
                          reporting_manager: "",
                          team: "",
                          responsibilities: [],
                          status: "done",
                          notes: "Section verified"
                        });
                      } else if (sectionId === 7) {
                        const existingFormality = checklistData?.joining_formalities?.find(f => f.formality_name === item.name);
                        if (existingFormality) {
                          await api.put(`/lifecycle/joining-formalities/${existingFormality.id}`, {
                            status: "done",
                            notes: "Section verified"
                          });
                        } else {
                          await api.post("/lifecycle/joining-formalities", {
                            employee_id: selectedEmployee.id,
                            formality_name: item.name,
                            formality_type: "onboarding",
                            status: "done",
                            notes: "Section verified"
                          });
                        }
                      }
                    }
                  }
                  // Mark section as complete in database
                  await api.post("/lifecycle/section-complete", {
                    employee_id: selectedEmployee.id,
                    section_id: sectionId,
                    section_name: section.title
                  });
                  // Update checkbox state
                  setSectionCheckboxes(prev => ({ ...prev, [sectionId]: true }));
                  // Refresh data
                  await fetchEmployeeDetails(selectedEmployee.id);
                  showToast(`Section "${section.title}" marked as complete`, "success");
                } catch (error) {
                  console.error("Section checkbox error:", error);
                  showToast("Failed to mark section complete: " + (error.response?.data?.message || error.message), "error");
                }
              };

              const getSectionIcon = () => {
                switch(section.id) {
                  case 1: return "📄";
                  case 2: return "📧";
                  case 3: return "💻";
                  case 4: return "📝";
                  case 5: return "🔐";
                  case 6: return "🏢";
                  case 7: return "✅";
                  case 8: return "🎉";
                  default: return "📋";
                }
              };

              return (
                <div key={section.id} className="checklist-section">
                  <div className="section-header">
                    <div className="section-icon">{getSectionIcon()}</div>
                    <h2>{section.title}</h2>
                    <span className="item-count">{sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0}%</span>
                    {viewMode === "onboarding" && section.id === 4 && (
                      <button
                        className="action-link"
                        onClick={() => navigate("/admin/letters/offer")}
                        style={{ marginLeft: 'auto', marginRight: '10px' }}
                      >
                        + Create Offer Letter
                      </button>
                    )}
                    {viewMode === "offboarding" && section.id === 7 && (
                      <button
                        className="action-link"
                        onClick={() => navigate("/admin/letters/experience")}
                        style={{ marginLeft: 'auto', marginRight: '10px' }}
                      >
                        + Create Relieving Letter
                      </button>
                    )}
                    {(viewMode === "onboarding" || viewMode === "offboarding") && section.id !== 8 && (
                      <input
                        type="checkbox"
                        checked={sectionCheckboxes[section.id] || sectionCompleted === sectionTotal}
                        onChange={() => handleSectionCheckbox(section.id)}
                        style={{width: '20px', height: '20px', cursor: 'pointer'}}
                      />
                    )}
                  </div>
                  <div className="items-list">
                    {section.items.map((item) => (
                      <div key={item.id} className="item-card">
                        <div className="item-main">
                          <div className="item-icon-wrapper">
                            <span className="item-icon">{getSectionIcon()}</span>
                          </div>
                          <div className="item-content">
                            <h3>{item.name}</h3>
                            {item.document_number && <div className="item-detail">Document: {item.document_number}</div>}
                            {item.email && <div className="item-detail">Email: {item.email}</div>}
                            {item.phone_number && <div className="item-detail">Phone: {item.phone_number}</div>}
                            {item.role && <div className="item-detail">Role: {item.role}</div>}
                            {item.tag_number && <div className="item-detail">Tag: {item.tag_number}</div>}
                            {item.imei && <div className="item-detail">IMEI: {item.imei}</div>}
                            {item.condition && <div className="item-detail">Condition: {item.condition}</div>}
                            {item.department && <div className="item-detail">Department: {item.department}</div>}
                            {item.notes && <div className="item-detail">Notes: {item.notes}</div>}
                          </div>
                        </div>
                        <span className={`status-badge ${item.status === 'verified' || item.status === 'assigned' || item.status === 'done' || item.status === 'granted' || item.status === 'returned' || item.status === 'revoked' ? 'success' : item.status === 'uploaded' || item.status === 'in_progress' ? 'warning' : 'error'}`}>
                          {item.status ? item.status.replace(/_/g, " ").toUpperCase() : "PENDING"}
                        </span>
                        <div className="item-actions">
                      {viewMode === "onboarding" && (
                        <>
                          {section.id === 1 && item.status !== "verified" && (
                            <button className="action-link" onClick={async () => {
                              try {
                                // Check if document already exists in database
                                const existingDoc = checklistData?.documents?.find(d => d.document_type === item.name);
                                if (existingDoc && existingDoc.id > 0) {
                                  await api.put(`/lifecycle/documents/${existingDoc.id}`, {
                                    document_number: item.document_number || existingDoc.document_number || "",
                                    upload_date: new Date().toISOString().split('T')[0],
                                    status: "verified",
                                    notes: "Verified"
                                  });
                                } else {
                                  await api.post("/lifecycle/documents", {
                                    employee_id: selectedEmployee.id,
                                    document_type: item.name,
                                    document_number: item.document_number || "",
                                    upload_date: new Date().toISOString().split('T')[0],
                                    status: "verified",
                                    notes: "Verified"
                                  });
                                }
                                showToast("Document verified successfully", "success");
                                await fetchEmployeeDetails(selectedEmployee.id);
                              } catch (error) {
                                console.error("Verify error:", error);
                                showToast("Failed to verify: " + (error.response?.data?.message || error.message), "error");
                              }
                            }}>
                              {item.status === "uploaded" ? "Verify" : "Add"}
                            </button>
                          )}
                          {section.id === 1 && item.status === "verified" && (
                            <>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setDocumentForm({ documentName: "", documentNumber: item.document_number || "", uploadDate: new Date().toISOString().split('T')[0] });
                                setShowDocumentModal(true);
                              }}>
                                Edit
                              </button>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setDocumentForm({ documentName: "", documentNumber: item.document_number || "", uploadDate: new Date().toISOString().split('T')[0] });
                                setShowDocumentModal(true);
                              }}>
                                Replace
                              </button>
                              <button className="action-link" onClick={() => {
                                setViewItem(item);
                                setShowViewModal(true);
                              }}>
                                View
                              </button>
                              <button className="action-link danger" onClick={async () => {
                                if (item.id >= 100) {
                                  await api.delete(`/lifecycle/documents/${item.id}`);
                                  showToast("Document deleted", "success");
                                  fetchEmployeeDetails(selectedEmployee.id);
                                } else {
                                  showToast("Cannot delete default documents", "error");
                                }
                              }}>
                                Delete
                              </button>
                            </>
                          )}
                          {section.id === 2 && item.status === "pending" && (
                            <>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setContactForm({ contactType: item.name, value: "" });
                                setShowContactModal(true);
                              }}>
                                Verify
                              </button>
                              <button className="action-link" onClick={() => {
                                showToast("Marked as verified", "success");
                              }}>
                                Verified
                              </button>
                            </>
                          )}
                          {section.id === 2 && item.status === "assigned" && (
                            <>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setContactForm({ contactType: item.name, value: checklistData?.employee?.phone_number || "" });
                                setShowContactModal(true);
                              }}>
                                Edit
                              </button>
                              <button className="action-link" onClick={() => {
                                setViewItem(item);
                                setShowViewModal(true);
                              }}>
                                View
                              </button>
                              <button className="action-link danger" onClick={() => {
                                showToast("Cannot delete employee contact", "error");
                              }}>
                                Delete
                              </button>
                            </>
                          )}
                          {section.id === 3 && item.status === "not_assigned" && (
                            <button className="action-link" onClick={() => {
                              setSelectedItem(item);
                              setAssetForm({ assetName: item.name, assetType: item.name, tagNumber: "", imei: "", phoneNumber: "", condition: "Good", notes: "" });
                              setShowAssetModal(true);
                            }}>
                              Assign
                            </button>
                          )}
                          {section.id === 3 && item.status === "assigned" && (
                            <>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setAssetForm({ assetName: item.name, assetType: item.name, tag_number: item.tag_number || "", imei: item.imei || "", phoneNumber: item.phoneNumber || "", condition: item.condition || "Good", notes: item.notes || "" });
                                setShowAssetModal(true);
                              }}>
                                Edit
                              </button>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setAssetForm({ assetName: item.name, assetType: item.name, tag_number: item.tag_number || "", imei: item.imei || "", phoneNumber: item.phoneNumber || "", condition: item.condition || "Good", notes: item.notes || "" });
                                setShowAssetModal(true);
                              }}>
                                Verify
                              </button>
                              <button className="action-link" onClick={() => {
                                setViewItem(item);
                                setShowViewModal(true);
                              }}>
                                View
                              </button>
                              <button className="action-link danger" onClick={async () => {
                                if (item.id >= 200) {
                                  await api.delete(`/lifecycle/assets/${item.id - 200}`);
                                  showToast("Asset deleted", "success");
                                  fetchEmployeeDetails(selectedEmployee.id);
                                } else {
                                  showToast("Cannot delete default assets", "error");
                                }
                              }}>
                                Delete
                              </button>
                            </>
                          )}
                          {section.id === 4 && (
                            <>
                              <button className="action-link" onClick={() => {
                                navigate("/admin/letters/offer");
                              }}>
                                {item.offer_letter_id ? "View Offer Letter" : "Create Offer Letter"}
                              </button>
                              {item.offer_letter_id && (
                                <button className="action-link" onClick={() => {
                                  setViewItem(item);
                                  setShowViewModal(true);
                                }}>
                                  View Details
                                </button>
                              )}
                            </>
                          )}
                          {section.id === 5 && item.is_special && item.grant_url && (
                            <>
                              <button className="action-link" onClick={() => {
                                navigate(item.grant_url);
                              }}>
                                {item.status === "granted" ? "Manage Access" : "Grant Access"}
                              </button>
                            </>
                          )}
                          {section.id === 5 && item.is_special && !item.grant_url && (
                            <>
                              <button className="action-link" style={{ opacity: 0.5, cursor: 'default' }}>
                                Always Active
                              </button>
                            </>
                          )}
                          {section.id === 5 && !item.is_special && item.status === "not_granted" && (
                            <button className="action-link" onClick={() => {
                              setSelectedItem(item);
                              setAccessForm({ email: selectedEmployee.email || "", password: "" });
                              setShowAccessModal(true);
                            }}>
                              Grant
                            </button>
                          )}
                          {section.id === 5 && !item.is_special && item.status === "granted" && (
                            <>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setAccessForm({ email: selectedEmployee.email || "", password: "", notes: "Edit access" });
                                setShowAccessModal(true);
                              }}>
                                Edit
                              </button>
                              <button className="action-link" onClick={() => {
                                setViewItem(item);
                                setShowViewModal(true);
                              }}>
                                View
                              </button>
                              <button className="action-link" onClick={() => {
                                showToast("Marked as verified", "success");
                              }}>
                                Verified
                              </button>
                              <button className="action-link danger">Revoke</button>
                              <button className="action-link danger" onClick={async () => {
                                if (item.id > 0) {
                                  await api.delete(`/lifecycle/system-access/${item.id}`);
                                  showToast("System access deleted", "success");
                                  fetchEmployeeDetails(selectedEmployee.id);
                                } else {
                                  showToast("Cannot delete default system access", "error");
                                }
                              }}>
                                Delete
                              </button>
                            </>
                          )}
                          {section.id === 6 && (
                            <>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setDepartmentForm({ department: selectedEmployee.department || "", reportingManager: "", team: "", responsibilities: "" });
                                setShowDepartmentModal(true);
                              }}>
                                Edit
                              </button>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setDepartmentForm({ department: selectedEmployee.department || "", reportingManager: "", team: "", responsibilities: "" });
                                setShowDepartmentModal(true);
                              }}>
                                Verify
                              </button>
                              <button className="action-link" onClick={() => {
                                setViewItem(item);
                                setShowViewModal(true);
                              }}>
                                View
                              </button>
                            </>
                          )}
                          {section.id === 7 && item.status === "pending" && (
                            <>
                              <button className="action-link" onClick={async () => {
                                try {
                                  // Check if formality already exists in database
                                  const existingFormality = checklistData?.joining_formalities?.find(f => f.formality_name === item.name);
                                  if (existingFormality && existingFormality.id > 0) {
                                    await api.put(`/lifecycle/joining-formalities/${existingFormality.id}`, {
                                      status: "done",
                                      notes: "Verified"
                                    });
                                  } else {
                                    await api.post("/lifecycle/joining-formalities", {
                                      employee_id: selectedEmployee.id,
                                      formality_name: item.name,
                                      formality_type: "onboarding",
                                      status: "done",
                                      notes: "Verified"
                                    });
                                  }
                                  showToast("Formality verified successfully", "success");
                                  await fetchEmployeeDetails(selectedEmployee.id);
                                } catch (error) {
                                  console.error("Verify error:", error);
                                  showToast("Failed to verify: " + (error.response?.data?.message || error.message), "error");
                                }
                              }}>
                                Verify
                              </button>
                            </>
                          )}
                          {section.id === 7 && item.status === "done" && (
                            <>
                              <button className="action-link" onClick={() => {
                                setSelectedItem(item);
                                setFormalityForm({ formalityName: item.name, notes: "Edit formality" });
                                setShowFormalityModal(true);
                              }}>
                                Edit
                              </button>
                              <button className="action-link" onClick={() => {
                                setViewItem(item);
                                setShowViewModal(true);
                              }}>
                                View
                              </button>
                              <button className="action-link danger" onClick={async () => {
                                if (item.id >= 300) {
                                  await api.delete(`/lifecycle/joining-formalities/${item.id - 300}`);
                                  showToast("Formality deleted", "success");
                                  fetchEmployeeDetails(selectedEmployee.id);
                                } else {
                                  showToast("Cannot delete default formalities", "error");
                                }
                              }}>
                                Delete
                              </button>
                            </>
                          )}
                          {section.id === 8 && item.status === "pending" && (
                            <button className="action-link" onClick={() => {
                              showToast("Verification completed", "success");
                            }}>
                              Verify
                            </button>
                          )}
                        </>
                      )}
                      {viewMode === "offboarding" && (
                        <>
                          {section.id === 3 && item.status !== "returned" && (
                            <button className="action-link" onClick={async () => {
                              try {
                                await api.put(`/lifecycle/assets/${item.id}`, {
                                  status: "returned",
                                  notes: "Asset returned during offboarding"
                                });
                                showToast("Asset returned successfully", "success");
                                await fetchEmployeeDetails(selectedEmployee.id);
                              } catch (error) {
                                console.error("Asset return error:", error);
                                showToast("Failed to return asset: " + (error.response?.data?.message || error.message), "error");
                              }
                            }}>
                              Return
                            </button>
                          )}
                          {section.id === 3 && item.status === "returned" && (
                            <button className="action-link" style={{ opacity: 0.5, cursor: 'default' }}>
                              Returned
                            </button>
                          )}
                          {section.id === 4 && !item.is_special && item.status === "granted" && (
                            <button className="action-link" onClick={async () => {
                              await api.put(`/lifecycle/system-access/${item.id}`, {
                                status: "revoked",
                                notes: "Access revoked during offboarding"
                              });
                              showToast("Access revoked successfully", "success");
                              fetchEmployeeDetails(selectedEmployee.id);
                            }}>
                              Revoke
                            </button>
                          )}
                          {section.id === 4 && !item.is_special && item.status === "revoked" && (
                            <button className="action-link" style={{ opacity: 0.5, cursor: 'default' }}>
                              Revoked
                            </button>
                          )}
                          {item.status === "pending" && section.id !== 3 && section.id !== 4 && (
                            <button className="action-link" onClick={() => handleOffboardingItemDone(item.id)}>
                              Mark as done
                            </button>
                          )}
                          <button className="action-link" onClick={() => handleOffboardingNotesEdit(item)}>
                            Notes
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                  </div>
                  <button className="add-other-btn" onClick={() => {
                    if (section.id === 1) {
                      setSelectedItem({ name: "New Document" });
                      setDocumentForm({ documentName: "", documentNumber: "", uploadDate: "" });
                      setShowDocumentModal(true);
                    } else if (section.id === 2) {
                      setSelectedItem({ name: "New Contact" });
                      setContactForm({ contactType: "", value: "" });
                      setShowContactModal(true);
                    } else if (section.id === 3) {
                      setSelectedItem({ name: "New Asset" });
                      setAssetForm({ assetName: "", assetType: "", tagNumber: "", imei: "", phoneNumber: "", condition: "Good", notes: "" });
                      setShowAssetModal(true);
                    } else if (section.id === 5) {
                      setSelectedItem({ name: "New System" });
                      setAccessForm({ email: "", password: "" });
                      setShowAccessModal(true);
                    } else if (section.id === 7) {
                      setSelectedItem({ name: "New Formality" });
                      setFormalityForm({ formalityName: "", notes: "" });
                      setShowFormalityModal(true);
                    }
                  }}>
                    + Add other {section.title.toLowerCase()}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Modals */}
          {showDocumentModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Document Details</h3>
                {selectedItem?.name === 'New Document' && (
                  <div className="form-group">
                    <label>Document Name</label>
                    <input
                      type="text"
                      value={documentForm.documentName}
                      onChange={(e) => setDocumentForm({ ...documentForm, documentName: e.target.value })}
                      placeholder="Enter document name"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Document Number</label>
                  <input
                    type="text"
                    value={documentForm.documentNumber}
                    onChange={(e) => setDocumentForm({ ...documentForm, documentNumber: e.target.value })}
                    placeholder="Enter document number"
                  />
                </div>
                <div className="form-group">
                  <label>Upload Date</label>
                  <input
                    type="date"
                    value={documentForm.uploadDate}
                    onChange={(e) => setDocumentForm({ ...documentForm, uploadDate: e.target.value })}
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowDocumentModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={saveDocumentEntry}>Save</button>
                </div>
              </div>
            </div>
          )}

          {showAccessModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>{viewMode === "offboarding" ? "Revoke" : "Grant"} System Access</h3>
                <p>{selectedItem?.name}</p>
                {viewMode === "onboarding" && (
                  <>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={accessForm.email}
                        onChange={(e) => setAccessForm({ ...accessForm, email: e.target.value })}
                        placeholder="Enter email"
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        value={accessForm.password}
                        onChange={(e) => setAccessForm({ ...accessForm, password: e.target.value })}
                        placeholder="Enter password"
                      />
                    </div>
                  </>
                )}
                {viewMode === "offboarding" && (
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={accessForm.notes}
                      onChange={(e) => setAccessForm({ ...accessForm, notes: e.target.value })}
                      placeholder="Add notes..."
                    />
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowAccessModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={viewMode === "offboarding" ? handleAccessRevoke : saveAccessEntry}>
                    {viewMode === "offboarding" ? "Revoke" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAssetModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>{viewMode === "offboarding" ? "Return" : "Assign"} Asset</h3>
                <p>{selectedItem?.name}</p>
                {viewMode === "onboarding" && (
                  <>
                    <div className="form-group">
                      <label>Asset Type</label>
                      <input
                        type="text"
                        value={assetForm.assetType}
                        onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value })}
                        placeholder="Enter asset type"
                      />
                    </div>
                    <div className="form-group">
                      <label>Tag Number</label>
                      <input
                        type="text"
                        value={assetForm.tagNumber}
                        onChange={(e) => setAssetForm({ ...assetForm, tagNumber: e.target.value })}
                        placeholder="Enter tag number"
                      />
                    </div>
                    <div className="form-group">
                      <label>IMEI</label>
                      <input
                        type="text"
                        value={assetForm.imei}
                        onChange={(e) => setAssetForm({ ...assetForm, imei: e.target.value })}
                        placeholder="Enter IMEI"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        value={assetForm.phoneNumber}
                        onChange={(e) => setAssetForm({ ...assetForm, phoneNumber: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="form-group">
                      <label>Condition</label>
                      <select
                        value={assetForm.condition}
                        onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                      >
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        value={assetForm.notes}
                        onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                        placeholder="Add notes..."
                      />
                    </div>
                  </>
                )}
                {viewMode === "offboarding" && (
                  <>
                    <div className="form-group">
                      <label>Condition on return</label>
                      <select
                        value={assetForm.condition}
                        onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                      >
                        <option value="">Select condition</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                        <option value="Damaged">Damaged</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        value={assetForm.notes}
                        onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                        placeholder="Add notes about condition..."
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          checked={assetForm.deductCost}
                          onChange={(e) => setAssetForm({ ...assetForm, deductCost: e.target.checked })}
                          style={{ width: "auto", margin: 0 }}
                        />
                        Deduct cost from final settlement
                      </label>
                    </div>
                  </>
                )}
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowAssetModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={viewMode === "offboarding" ? handleAssetReturn : saveAssetEntry}>
                    {viewMode === "offboarding" ? "Save return" : "Assign"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDepartmentModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Department Setup</h3>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    value={departmentForm.department}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, department: e.target.value })}
                    placeholder="Enter department"
                  />
                </div>
                <div className="form-group">
                  <label>Reporting Manager</label>
                  <input
                    type="text"
                    value={departmentForm.reportingManager}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, reportingManager: e.target.value })}
                    placeholder="Enter reporting manager"
                  />
                </div>
                <div className="form-group">
                  <label>Team</label>
                  <input
                    type="text"
                    value={departmentForm.team}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, team: e.target.value })}
                    placeholder="Enter team"
                  />
                </div>
                <div className="form-group">
                  <label>Responsibilities (comma separated)</label>
                  <textarea
                    value={departmentForm.responsibilities}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, responsibilities: e.target.value })}
                    placeholder="Enter responsibilities"
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowDepartmentModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={saveDepartmentEntry}>Save</button>
                </div>
              </div>
            </div>
          )}

          {showContactModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Contact Details</h3>
                <p>{selectedItem?.name}</p>
                <div className="form-group">
                  <label>Contact Type</label>
                  <input
                    type="text"
                    value={contactForm.contactType}
                    onChange={(e) => setContactForm({ ...contactForm, contactType: e.target.value })}
                    placeholder="Enter contact type"
                  />
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <input
                    type="text"
                    value={contactForm.value}
                    onChange={(e) => setContactForm({ ...contactForm, value: e.target.value })}
                    placeholder="Enter contact value"
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowContactModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={async () => {
                    try {
                      // Send all required fields to satisfy backend validation
                      await api.put(`/admin/employees/${selectedEmployee.id}`, {
                        full_name: checklistData?.employee?.full_name || selectedEmployee.full_name,
                        email: checklistData?.employee?.email || selectedEmployee.email,
                        role: checklistData?.employee?.role || selectedEmployee.role || "EMPLOYEE",
                        department: checklistData?.employee?.department || selectedEmployee.department,
                        branch: checklistData?.employee?.branch || selectedEmployee.branch,
                        salary: checklistData?.employee?.salary || selectedEmployee.salary || 0,
                        phone_number: contactForm.value,
                        invoice_access: checklistData?.employee?.invoice_access || false,
                        invoice_permissions: checklistData?.employee?.invoice_permissions || {},
                        ops_access: checklistData?.employee?.ops_access || false,
                        ops_permissions: checklistData?.employee?.ops_permissions || {}
                      });
                      setShowContactModal(false);
                      setContactForm({ contactType: "", value: "" });
                      showToast("Contact saved successfully", "success");
                      fetchEmployeeDetails(selectedEmployee.id);
                    } catch (error) {
                      console.error("Contact save error:", error);
                      showToast("Failed to save contact: " + (error.response?.data?.message || error.message), "error");
                    }
                  }}>Save</button>
                </div>
              </div>
            </div>
          )}

          {showFormalityModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Formality Details</h3>
                <p>{selectedItem?.name}</p>
                <div className="form-group">
                  <label>Formality Name</label>
                  <input
                    type="text"
                    value={formalityForm.formalityName}
                    onChange={(e) => setFormalityForm({ ...formalityForm, formalityName: e.target.value })}
                    placeholder="Enter formality name"
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={formalityForm.notes}
                    onChange={(e) => setFormalityForm({ ...formalityForm, notes: e.target.value })}
                    placeholder="Add notes..."
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowFormalityModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={saveFormalityEntry}>Save</button>
                </div>
              </div>
            </div>
          )}

          {showViewModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Item Details</h3>
                <p><strong>{viewItem?.name}</strong></p>
                <div className="view-details">
                  {viewItem?.document_number && <div className="view-detail">Document Number: {viewItem.document_number}</div>}
                  {viewItem?.email && <div className="view-detail">Email: {viewItem.email}</div>}
                  {viewItem?.phone_number && <div className="view-detail">Phone: {viewItem.phone_number}</div>}
                  {viewItem?.role && <div className="view-detail">Role: {viewItem.role}</div>}
                  {viewItem?.tag_number && <div className="view-detail">Tag Number: {viewItem.tag_number}</div>}
                  {viewItem?.imei && <div className="view-detail">IMEI: {viewItem.imei}</div>}
                  {viewItem?.condition && <div className="view-detail">Condition: {viewItem.condition}</div>}
                  {viewItem?.notes && <div className="view-detail">Notes: {viewItem.notes}</div>}
                  {viewItem?.department && <div className="view-detail">Department: {viewItem.department}</div>}
                  {viewItem?.upload_date && <div className="view-detail">Upload Date: {viewItem.upload_date}</div>}
                  {viewItem?.system_name && <div className="view-detail">System: {viewItem.system_name}</div>}
                  {viewItem?.password && <div className="view-detail">Password: {viewItem.password}</div>}
                  {viewItem?.reporting_manager && <div className="view-detail">Reporting Manager: {viewItem.reporting_manager}</div>}
                  {viewItem?.team && <div className="view-detail">Team: {viewItem.team}</div>}
                  {viewItem?.responsibilities && <div className="view-detail">Responsibilities: {viewItem.responsibilities}</div>}
                  {viewItem?.formality_name && <div className="view-detail">Formality: {viewItem.formality_name}</div>}
                  {viewItem?.status && <div className="view-detail">Status: {viewItem.status}</div>}
                </div>
                <div className="modal-actions">
                  <button className="btn-confirm" onClick={() => setShowViewModal(false)}>Close</button>
                </div>
              </div>
            </div>
          )}

          {showExitModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Complete Offboarding</h3>
                <p>Are you sure you want to complete offboarding for {selectedEmployee?.full_name}?</p>
                <p style={{color: '#666', fontSize: '14px'}}>This will mark the employee as {exitType === 'TERMINATE' ? 'TERMINATED' : 'EXITED'} and close the offboarding case. You can still access their records from the inactive employee list.</p>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => { setShowExitModal(false); setExitReason(""); }}>Cancel</button>
                  <button className="btn-confirm danger" onClick={handleExitEmployee}>
                    {exitType === 'TERMINATE' ? 'Terminate' : 'Exit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showOnboardingConfirmModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Complete Onboarding</h3>
                <p>Are you sure you want to complete onboarding for {selectedEmployee?.full_name}?</p>
                <p style={{color: '#666', fontSize: '14px'}}>This will mark the employee as ACTIVE. You can still edit their details later if needed.</p>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowOnboardingConfirmModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={confirmOnboarding}>Yes, Complete Onboarding</button>
                </div>
              </div>
            </div>
          )}

          {showNotesModal && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Edit Notes</h3>
                <p><strong>{notesItem?.name}</strong></p>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add notes for future reference..."
                    rows={4}
                  />
                </div>
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setShowNotesModal(false)}>Cancel</button>
                  <button className="btn-confirm" onClick={saveOffboardingNotes}>Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LifecycleOnboarding;
