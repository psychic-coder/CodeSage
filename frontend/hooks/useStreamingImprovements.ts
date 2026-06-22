import { useState, useEffect, useCallback } from "react";

export type StreamStatus = "idle" | "streaming" | "done" | "error";

interface StreamingProgress {
  batch: number;
  totalBatches: number;
}

export function useStreamingImprovements(projectId: string, category: string = "") {
  const [issues, setIssues] = useState<any[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [progress, setProgress] = useState<StreamingProgress>({ batch: 0, totalBatches: 0 });
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const startStream = useCallback(() => {
    // Prevent multiple streams
    if (status === "streaming") return;

    setIssues([]);
    setStatus("streaming");
    setError(null);
    setProgress({ batch: 0, totalBatches: 0 });

    let token = "";
    if (typeof window !== "undefined") {
      token = sessionStorage.getItem("codesage_token") || "";
    }
    
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
    let url = `${API_URL}/api/v1/analysis/improvements/${projectId}/stream`;
    
    // Pass auth via query param since EventSource doesn't support headers natively
    // Note: In production, consider a service worker or a custom fetch-based SSE parser if passing tokens in URL is a security concern.
    // For this prototype we will use standard EventSource assuming token can be passed if needed, or API relies on a cookie.
    // If the backend uses Bearer token, EventSource might fail. Let's use fetch with a custom reader instead for robust Auth headers.
    
    // Fetch-based SSE parser to support custom headers
    const controller = new AbortController();
    
    const fetchStream = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (category) queryParams.append("categories", category);
        
        const response = await fetch(`${url}?${queryParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);
                
                if (data.type === "batch") {
                  setProgress({ batch: data.batch, totalBatches: data.total_batches });
                  if (data.issues && data.issues.length > 0) {
                    setIssues((prev) => {
                      const newIssues = [...prev];
                      // Dedup just in case
                      const existingIds = new Set(newIssues.map(i => `${i.file}-${i.title}`));
                      for (const issue of data.issues) {
                        const key = `${issue.file}-${issue.title}`;
                        if (!existingIds.has(key)) {
                          newIssues.push(issue);
                          existingIds.add(key);
                        }
                      }
                      return newIssues;
                    });
                  }
                } else if (data.type === "error") {
                  throw new Error(data.message);
                } else if (data.type === "done") {
                  setStatus("done");
                  return; // exit while loop
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
        
        setStatus("done");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          setError(err.message || "Stream failed");
          setStatus("error");
        }
      }
    };

    fetchStream();

    return () => {
      controller.abort();
    };
  }, [projectId, category, status]);

  const reset = useCallback(() => {
    setIssues([]);
    setStatus("idle");
    setProgress({ batch: 0, totalBatches: 0 });
    setError(null);
  }, []);

  return { issues, status, progress, error, startStream, reset };
}
