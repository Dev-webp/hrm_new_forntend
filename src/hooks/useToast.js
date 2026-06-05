import { useCallback, useEffect, useRef, useState } from "react";

/** Auto-hiding toast with timer cleanup (no leaks on unmount). */
export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState({ message: "", visible: false });
  const timerRef = useRef(null);

  const showToast = useCallback(
    (message) => {
      setToast({ message, visible: true });
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, durationMs);
    },
    [durationMs]
  );

  useEffect(
    () => () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    },
    []
  );

  return { toast, showToast };
}
