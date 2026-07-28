import { useEffect, useState } from "react";
import { downloadLetter, fetchLetterEmployees, generateLetter, getLetter, previewLetter, sendLetterEmail } from "../../services/lettersApi";
import LetterForm from "../../components/letters/LetterForm";
import LetterPreview from "../../components/letters/LetterPreview";
import EmailDialog from "../../components/letters/EmailDialog";
import "../../styles/letters.css";

const errorMessage = (error) => error.response?.data?.message || error.message || "Letter request failed";

export default function LetterPage({ type, title }) {
  const [form, setForm] = useState({}); const [employees, setEmployees] = useState([]); const [employeesLoading, setEmployeesLoading] = useState(type === "experience"); const [preview, setPreview] = useState(""); const [email, setEmail] = useState(false); const [loading, setLoading] = useState(false); const [notice, setNotice] = useState("");


const createEmptyOffer = () => ({
    candidate_name: "",
    candidate_email: "",
    candidate_address: "",
    reference_number: "",
    offer_date: "",
    joining_date: "",
    joining_time: "",
    job_title: "",
    designation: "",
    department: "",
    branch: "",
    office_location: "",
    location: "",
    reporting_manager: "",
    salary: "",
    salary_in_words: "",
    ctc: "",
    job_description: "",
    recipient_email: "",
});

useEffect(() => {

    if (type === "offer") {
        setForm(createEmptyOffer());
        return;
    }

    getLetter(type)
        .then((response) => {
            const request = {
                ...(response.data.request || {})
            };

            delete request.document_data;

            setForm(request);
        });

}, [type]);



  useEffect(() => { if (type !== "experience") return; fetchLetterEmployees().then((response) => setEmployees(response.data || [])).catch((error) => setNotice(errorMessage(error))).finally(() => setEmployeesLoading(false)); }, [type]);
  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const selectEmployee = (employeeId) => { const employee = employees.find((item) => String(item.id) === String(employeeId)); if (!employee) return updateForm("employee_id", employeeId); setForm((current) => ({ ...current, employee_id: Number(employee.id), employee_name: employee.full_name || "", full_name: employee.full_name || "", designation: employee.designation || employee.role || "", department: employee.department || "", branch: employee.branch || "", joining_date: employee.joining_date ? String(employee.joining_date).slice(0, 10) : "", recipient_email: employee.email || current.recipient_email || "" })); };
  const run = async (action) => { setLoading(true); setNotice(""); try { await action(); } catch (error) { setNotice(errorMessage(error)); } finally { setLoading(false); } };
 
  const download = () => run(async () => { const response = await downloadLetter(type,form);
    
    
       console.log(form);
    const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" })); const link = document.createElement("a"); link.href = url; link.download = `${type}-letter.pdf`; link.click(); URL.revokeObjectURL(url); });
 
  return <section className="letters-page"><h1>{title}</h1><p>Create, preview, generate, download, or email the current letter.</p>{notice && <p className="letter-notice">{notice}</p>}<LetterForm type={type} value={form} employees={employees} employeesLoading={employeesLoading} loading={loading} onChange={updateForm} onEmployeeSelect={selectEmployee} 
    onPreview={() =>
  run(async () => {
    console.log("FORM =", form);

    const response = await previewLetter(type, form);

    setPreview(response.data);
  })
}
  onGenerate={() => run(async () => { const response = await generateLetter(type, form); setForm(response.data.request); setNotice("Letter generated"); })} onDownload={download} onEmail={() => setEmail(true)} /><LetterPreview html={preview} onClose={() => setPreview("")} />{email && <EmailDialog defaultEmail={form.recipient_email} loading={loading} onClose={() => setEmail(false)} onSend={(data) => run(async () => { await sendLetterEmail(type, data); setEmail(false); setNotice("Email sent"); })} />}</section>;
}
