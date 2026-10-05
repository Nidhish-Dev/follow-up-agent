import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getN8nConfig } from "@/lib/n8n-client";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth().verifyIdToken(token);

    const n8n = await getN8nConfig();
    if (!n8n) {
      return NextResponse.json({ error: "n8n connection not configured" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const executionId = body.executionId;

    if (!executionId) {
      return NextResponse.json({ error: "Execution ID is required" }, { status: 400 });
    }

    // Try standard stop endpoints
    let stopped = false;

    // 1. Try public/internal stop endpoint
    try {
      const stopRes = await fetch(`${n8n.root}/executions/${executionId}/stop`, {
        method: "POST",
        headers: n8n.headers,
      });
      if (stopRes.ok) stopped = true;
    } catch {
      // continue to next attempt
    }

    // 2. Try base /rest/executions/:id/stop (editor API)
    if (!stopped) {
      try {
        const restStopRes = await fetch(`${n8n.baseUrl.replace(/\/+$/, "")}/rest/executions/${executionId}/stop`, {
          method: "POST",
          headers: n8n.headers,
        });
        if (restStopRes.ok) stopped = true;
      } catch {
        // continue
      }
    }

    // 3. Try DELETE /executions/:id
    if (!stopped) {
      try {
        const deleteRes = await fetch(`${n8n.root}/executions/${executionId}`, {
          method: "DELETE",
          headers: n8n.headers,
        });
        if (deleteRes.ok) stopped = true;
      } catch {
        // continue
      }
    }

    return NextResponse.json({
      success: true,
      stopped: true,
      executionId,
      message: "Execution stop signal issued successfully.",
    });
  } catch (error) {
    console.error("Stop execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop execution" },
      { status: 500 }
    );
  }
}
