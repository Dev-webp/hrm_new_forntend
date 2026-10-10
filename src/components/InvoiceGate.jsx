import { useInvoiceAuth } from "../context/InvoiceAuthContext";

export default function InvoiceGate({ children }) {
  const { ready, error } = useInvoiceAuth();

  console.log(`[InvoiceGate] Render - ready: ${ready}, error: ${error}, timestamp: ${performance.now()}`);

  if (error) {
    return (
      <div style={{ padding: 24, color: "#d32f2f" }}>
        {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: 24, color: "#666" }}>
        Connecting to Invoice / CRM…
      </div>
    );
  }

  return children;
}
