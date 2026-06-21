const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type JobProgressCallback = (data: {
  progress: number;
  current_step?: string;
  status?: string;
  error?: string;
}) => void;

export function connectJobWS(
  jobId: string,
  onMessage: JobProgressCallback,
  onReconnecting?: () => void
): () => void {
  let ws: WebSocket | null = null;
  let isCleanedUp = false;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 3;
  const backoffDelays = [1000, 2000, 4000];
  let pollingInterval: NodeJS.Timeout | null = null;

  function pollFallback() {
    if (isCleanedUp) return;
    
    pollingInterval = setInterval(async () => {
      try {
        const token = sessionStorage.getItem("codesage_token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}`, { headers });
        if (!res.ok) throw new Error("Polling failed");
        const data = await res.json();
        
        onMessage({
          progress: data.progress,
          current_step: data.current_step,
          status: data.status,
          error: data.error_message
        });

        if (data.status === "done" || data.status === "failed") {
          if (pollingInterval) clearInterval(pollingInterval);
        }
      } catch (err) {
        // We just skip this tick if fetch fails
      }
    }, 3000);
  }

  function connect() {
    if (isCleanedUp) return;
    
    ws = new WebSocket(`${WS_URL}/ws/jobs/${jobId}`);

    ws.onopen = () => {
      reconnectAttempts = 0; // reset on successful connection
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      // Don't fail immediately, wait for onclose to trigger reconnect
    };

    ws.onclose = () => {
      if (isCleanedUp) return;
      
      if (reconnectAttempts < maxReconnectAttempts) {
        if (onReconnecting) onReconnecting();
        const delay = backoffDelays[reconnectAttempts];
        reconnectAttempts++;
        setTimeout(connect, delay);
      } else {
        // Exhausted WS reconnects, fall back to polling
        if (onReconnecting) onReconnecting(); // indicate still trying/polling implicitly
        pollFallback();
      }
    };
  }

  connect();

  return () => {
    isCleanedUp = true;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };
}
