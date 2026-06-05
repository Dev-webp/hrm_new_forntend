export const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
export function loadSocketIoClient() {
  if (typeof window !== "undefined" && window.io) {
    return Promise.resolve(window.io);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-socket-io="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.io));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `${SOCKET_SERVER_URL}/socket.io/socket.io.js`;
    script.async = true;
    script.dataset.socketIo = "true";
    script.onload = () => {
      if (window.io) resolve(window.io);
      else reject(new Error("socket.io client unavailable"));
    };
    script.onerror = () =>
      reject(new Error("Failed to load socket.io client script"));
    document.head.appendChild(script);
  });
}


