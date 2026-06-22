import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:8000";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;
  const searchParams = req.nextUrl.searchParams;
  const categories = searchParams.get("categories") || "";

  // Forward the Authorization header from the browser request to the backend
  const authHeader = req.headers.get("authorization") || "";

  const backendUrl = `${BACKEND_URL}/api/v1/analysis/improvements/${projectId}/stream${categories ? `?categories=${encodeURIComponent(categories)}` : ""}`;

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      // @ts-expect-error - duplex is needed for streaming in Node
      duplex: "half",
    });

    if (!backendResponse.ok || !backendResponse.body) {
      return new Response(
        JSON.stringify({ error: `Backend returned ${backendResponse.status}` }),
        {
          status: backendResponse.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Stream the backend SSE response directly to the browser
    return new Response(backendResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Proxy failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
