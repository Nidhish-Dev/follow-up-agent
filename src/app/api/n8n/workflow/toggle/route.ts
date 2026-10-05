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
    const targetWorkflowId = body.workflowId || "aCjx6rCJa5glRnBS";
    const shouldActivate = Boolean(body.active);

    const action = shouldActivate ? "activate" : "deactivate";

    // 1. Try standard activate/deactivate POST endpoint
    let res = await fetch(`${n8n.root}/workflows/${targetWorkflowId}/${action}`, {
      method: "POST",
      headers: n8n.headers,
    });

    // 2. If failed, try unpublish / publish endpoint
    if (!res.ok) {
      const altAction = shouldActivate ? "publish" : "unpublish";
      const altRes = await fetch(`${n8n.root}/workflows/${targetWorkflowId}/${altAction}`, {
        method: "POST",
        headers: n8n.headers,
      });
      if (altRes.ok) res = altRes;
    }

    // 3. If still not ok, try PATCH endpoint with { active: boolean }
    if (!res.ok) {
      const patchRes = await fetch(`${n8n.root}/workflows/${targetWorkflowId}`, {
        method: "PATCH",
        headers: n8n.headers,
        body: JSON.stringify({ active: shouldActivate }),
      });
      if (patchRes.ok) res = patchRes;
    }

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `n8n returned status ${res.status}: ${text || "Failed to update workflow state"}` },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      active: shouldActivate,
      workflowId: targetWorkflowId,
      workflowName: data.name || "FollowUp Agent",
      message: shouldActivate
        ? "Workflow published and activated successfully."
        : "Kill switch triggered: workflow deactivated and unpublished.",
    });
  } catch (error) {
    console.error("Workflow toggle error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to toggle workflow active status" },
      { status: 500 }
    );
  }
}
