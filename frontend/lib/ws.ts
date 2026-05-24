const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

type JobProgressCallback = (data: {
  progress: number;
  current_step?: string;
  status?: string;
  error?: string;
}) => void;

export function connectJobWS(jobId: string, onMessage: JobProgressCallback): () => void {
  const ws = new WebSocket(`${WS_URL}/ws/jobs/${jobId}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      // ignore parse errors
    }
  };

  ws.onerror = () => {
    onMessage({ progress: 0, status: "failed", error: "WebSocket connection error" });
  };

  return () => {
    if (ws.readyState === WebSocket.OPEN) ws.close();
  };
}
