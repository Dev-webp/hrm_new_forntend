import { Link } from "react-router-dom";
import "../../styles/letters.css";

export default function LettersHome() {
  return <section className="letters-page"><h1>Letters</h1><p>Select a template to create, preview, generate a PDF, or send the current letter by email.</p><div className="letter-type-grid"><Link to="/admin/letters/offer"><strong>Offer Letter</strong><span>Create an offer for a candidate before they join.</span></Link><Link to="/admin/letters/experience"><strong>Experience &amp; Relieving Letter</strong><span>Create a letter for an existing employee.</span></Link></div></section>;
}
