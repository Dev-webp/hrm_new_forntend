export const BRANCH_OPTIONS = [
  { value: "all", label: "All Branches" },
  { value: "Hyderabad", label: "🏢 Hyderabad Branch" },
  { value: "Bangalore", label: "💻 Bangalore Tech Hub" },
];

export const ROLE_OPTIONS = [
  { value: "all", label: "All Roles" },
  { value: "Employee", label: "Employee" },
  { value: "Sub Admin", label: "Sub Admin" },
  { value: "Admin", label: "Admin (Manager)" },
  { value: "Operational Manager", label: "Operational Manager" },
  { value: "Super Admin", label: "Super Admin" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const FORM_BRANCH_OPTIONS = [
  { value: "Hyderabad", label: "🏢 Hyderabad Branch" },
  { value: "Bangalore", label: "💻 Bangalore Tech Hub" },
];

export const FORM_ROLE_OPTIONS = [
  { value: "Employee", label: "Employee" },
  { value: "Sub Admin", label: "Sub Admin" },
  { value: "Admin", label: "Admin (Manager)" },
  { value: "Operational Manager", label: "Operational Manager" },
  { value: "Super Admin", label: "Super Admin" },
];

export function mapRoleFromBackend(role) {
  if (role === "SUB_ADMIN") return "Sub Admin";
  if (role === "MANAGER") return "Admin";
  if (role === "OPERATIONAL_MANAGER") return "Operational Manager";
  if (role === "SUPER_ADMIN") return "Super Admin";
  return "Employee";
}

export function mapRoleToBackend(role) {
  if (role === "Sub Admin") return "SUB_ADMIN";
  if (role === "Admin") return "MANAGER";
  if (role === "Operational Manager") return "OPERATIONAL_MANAGER";
  if (role === "Super Admin") return "SUPER_ADMIN";
  return "EMPLOYEE";
}

export function mapApiEmployee(emp) {
  return {
    id: emp.id,
    empId: emp.employee_code,
    name: emp.full_name,
    initials: emp.profile_initials,
    designation: emp.designation || "",
    department: emp.department,
    departmentCode: emp.department_code || "",
    email: emp.email,
    branch: emp.branch,
    joined: emp.joining_date,
    status: emp.status,
    salary: Number(emp.salary),
    role: mapRoleFromBackend(emp.role),

    bankName: emp.bank_name || "",
    bankAccount: emp.bank_account || "",
    bankIfsc: emp.bank_ifsc || "",
    joiningDate: emp.joining_date || "",
    aadharNumber: emp.aadhar_number || "",
    visiblePassword: emp.visible_password || "",

    // 🔐 LOGIN ACCESS
    loginAccessType: emp.login_access_type || "OFFICE",
    allowedBranches: emp.allowed_branches || [],

    // 🧾 INVOICE / CRM ACCESS — permission detail itself lives in the
    // Invoice database, not here, so only the on/off flag round-trips.
    // See the note in buildEmployeePayload about re-checking permission
    // boxes on every edit.
    invoiceAccess: emp.invoice_access === true,
  };
}
export function formatAadhar(aadhar) {
  if (!aadhar || aadhar.length !== 12) return aadhar || "—";
  return aadhar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
}

export function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildAutoEmail(name) {
  if (!name.trim()) return "";
  return `${name.trim().toLowerCase().replace(/\s/g, ".")}@vjcoverseas.com`;
}

export const EMPTY_EMPLOYEE_FORM = {
  name: "",
  designation: "",
  department: "",
  branch: "Hyderabad",
  role: "Employee",
  employeeCode: "",
  salary: "",
  joiningDate: "",
  loginEmail: "",
  bankName: "",
  bankAccount: "",
  bankIfsc: "",
  departmentCode: "",
  aadharNumber: "",
  password: "",

  // 🔐 LOGIN ACCESS
  loginAccessType: "OFFICE",
  allowedBranches: [],

  // 🧾 INVOICE / CRM ACCESS
  invoiceAccess: false,
  invoicePermissions: {
    customers: false,
    invoices: false,
    quotes: false,
    payments: false,
    expenses: false,
    reports: false,
    services: false,
  },
};

export function validateEmployeeForm(form) {
  if (!form.name.trim() || !form.department || !form.salary.trim() || !form.loginEmail.trim()) {
    return "Please fill all required fields (Name, Department, Email, Salary)";
  }

  if (Number.isNaN(parseFloat(form.salary))) {
    return "Invalid salary amount";
  }

  if (form.aadharNumber && !/^\d{12}$/.test(form.aadharNumber)) {
    return "Aadhar number must be exactly 12 digits";
  }

  return null;
}

export function buildEmployeePayload(form) {
  return {
    full_name: form.name.trim(),
    designation: form.designation.trim(),
    email: form.loginEmail.trim(),
    role: mapRoleToBackend(form.role),
    department: form.department,
    department_code: form.departmentCode.trim() || undefined,
    branch: form.branch,
    employee_code: form.employeeCode.trim() || undefined,
    salary: parseFloat(form.salary),
    joiningDate: form.joiningDate || undefined,
    bank_name: form.bankName.trim(),
    bank_account: form.bankAccount.trim(),
    bank_ifsc: form.bankIfsc.trim(),
    aadhar_number: form.aadharNumber.trim(),
    password: form.password.trim() || undefined,

    // 🧾 INVOICE / CRM ACCESS
    // NOTE: since the Invoice database is the source of truth for the
    // actual permission set, editing an employee re-sends whatever is
    // currently checked in this form — including on a plain edit where
    // you didn't mean to touch CRM access. Always re-verify the CRM
    // checkboxes are correct before saving an existing employee, not
    // just when granting access for the first time.
    invoice_access: form.invoiceAccess === true,
    invoice_permissions: form.invoiceAccess ? form.invoicePermissions : undefined,
  };
}

export function employeeToForm(employee) {
  return {
    name: employee.name,
    designation: employee.designation || "",
    department: employee.department,
    departmentCode: employee.departmentCode || "",
    branch: employee.branch,
    role: employee.role,
    employeeCode: employee.empId || "",
    salary: String(employee.salary ?? ""),
    joiningDate: employee.joiningDate || employee.joining_date || "",
    loginEmail: employee.email,
    bankName: employee.bankName || "",
    bankAccount: employee.bankAccount || "",
    bankIfsc: employee.bankIfsc || "",
    aadharNumber: employee.aadharNumber || "",
    password: "",

    // 🔐 LOGIN ACCESS
    loginAccessType: employee.loginAccessType || "OFFICE",
    allowedBranches: employee.allowedBranches || [],

    // 🧾 INVOICE / CRM ACCESS — the on/off flag comes from HRMS, but the
    // actual permission checkboxes always start unchecked here, since
    // that detail lives in the Invoice database, not HRMS's. Re-check
    // whichever boxes this person should actually have before saving.
    invoiceAccess: employee.invoiceAccess === true,
    invoicePermissions: {
      customers: false,
      invoices: false,
      quotes: false,
      payments: false,
      expenses: false,
      reports: false,
      services: false,
    },
  };
}