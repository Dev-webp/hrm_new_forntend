export default function LetterPreview({ html, onClose }) { if (!html) return null; return <div className="letter-modal"><div className="letter-modal__box"><button onClick={onClose}>Close</button>


<iframe
    title="Letter preview"
    srcDoc={html}
    style={{
        width: "794px",
        height: "1123px",
        border: "none",
        zoom: 1,
    }}
/>


</div></div>; }
