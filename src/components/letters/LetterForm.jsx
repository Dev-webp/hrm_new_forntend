import { useMemo, useState } from "react";

const labels = {
  employee_id: "Employee",
  candidate_name: "Candidate Name",
  candidate_email: "Candidate Email",
  candidate_address: "Candidate Address",
  reference_number: "Reference Number",
  branch: "Branch",
  offer_date: "Offer Date",
  joining_date: "Joining Date",
  joining_time: "Joining Time",
  job_title: "Job Title",
  designation: "Designation",
  department: "Department",
  office_location: "Office Location",
  location: "Location",
  reporting_manager: "Reporting Manager",
  salary: "Monthly Salary",
  salary_in_words: "Salary in Words",
  ctc: "CTC",
  last_working_date: "Last Working Date",
  relieving_date: "Relieving Date",
  issue_date: "Issue Date",
  job_description: "Job Description",
  editable_content: "Additional Content",
  recipient_email: "Recipient Email",
};

const offerFields = [
  "candidate_name",
  "candidate_email",
  "candidate_address",
  "reference_number",
  "offer_date",
  "joining_date",
  "joining_time",
  "job_title",
  "designation",
  "department",
  "branch",
  "office_location",
  "location",
  "reporting_manager",
  "salary",
  "salary_in_words",
  "ctc",
  "job_description",
];

const experienceFields = [
  "employee_id",
  "employee_name",
  "designation",
  "department",
  "branch",
  "joining_date",
  "reference_number",
  "last_working_date",
  "relieving_date",
  "issue_date",
  "editable_content",
  "recipient_email",
];

const readOnlyFields = new Set([
  "employee_name",
]);

const inputTypes = {
  candidate_name: "text",
  candidate_email: "email",
  candidate_address: "text",
  recipient_email: "email",
  employee_id: "number",
  offer_date: "date",
  joining_date: "date",
  last_working_date: "date",
  relieving_date: "date",
  issue_date: "date",
  joining_time: "time",
};

export default function LetterForm({
  type,
  value,
  employees = [],
  employeesLoading,
  onChange,
  onEmployeeSelect,
  onPreview,
  onGenerate,
  onDownload,
  onEmail,
  onClose, // ✅ Added
  loading,
}) {
  const [employeeSearch, setEmployeeSearch] = useState("");

  const fields =
    type === "offer" ? offerFields : experienceFields;

  const required = new Set(
    type === "offer"
      ? ["candidate_name", "candidate_email", "job_description"]
      : ["employee_id", "issue_date"]
  );

  const visibleEmployees = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();

    if (!query) return employees;

    return employees.filter((employee) =>
      `${employee.full_name || ""} ${employee.employee_code || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [employeeSearch, employees]);

  const renderField = (key) => {
    if (key === "employee_id") {
      return (
        <div className="letter-employee-picker">
          <input
            type="search"
            placeholder="Search employee..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
          />

          <select
            required
            value={value.employee_id || ""}
            disabled={employeesLoading}
            onChange={(e) => onEmployeeSelect(e.target.value)}
          >
            <option value="">
              {employeesLoading
                ? "Loading employees..."
                : "Select Employee"}
            </option>

            {visibleEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} (
                {employee.employee_code || employee.id})
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (key === "branch") {
      return (
        <select
          value={value.branch || ""}
          onChange={(e) =>
            onChange("branch", e.target.value)
          }
        >
          <option value="">Select Branch</option>
          <option value="Hyderabad">Hyderabad</option>
          <option value="Bangalore">Bangalore</option>
        </select>
      );
    }

    if (readOnlyFields.has(key)) {
      return (
        <input
          readOnly
          type={inputTypes[key] || "text"}
          value={value[key] || ""}
        />
      );
    }

    if (
      key === "job_description" ||
      key === "editable_content"
    ) {
      return (
        <textarea
          required={required.has(key)}
          value={value[key] || ""}
          onChange={(e) =>
            onChange(key, e.target.value)
          }
        />
      );
    }

    return (
      <input
        required={required.has(key)}
        type={inputTypes[key] || "text"}
        value={value[key] || ""}
        onChange={(e) =>
          onChange(key, e.target.value)
        }
      />
    );
  };

  return (
    <form
      className="letter-form"
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate();
      }}
    >
      {fields.map((key) => (
        <label key={key}>
          {labels[key]}
          {renderField(key)}
        </label>
      ))}

      <div className="letter-actions">
        <button
          type="button"
          disabled={loading}
          onClick={onPreview}
        >
          Preview
        </button>

        <button disabled={loading}>
          {loading ? "Generating..." : "Generate"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onDownload}
        >
          Download PDF
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={onEmail}
        >
          Send Email
        </button>

        {/* ✅ New Close Button */}
        <button
          type="button"
          disabled={loading}
          onClick={onClose}
          className="letter-close-btn"
        >
          Close
        </button>
      </div>
    </form>
  );
}