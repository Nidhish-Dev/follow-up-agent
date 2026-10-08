import { NextRequest, NextResponse } from "next/server";
import { syncN8nWorkflowMasterLeadsNode } from "@/lib/sync-n8n";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    let workflowId = "aCjx6rCJa5glRnBS";
    try {
      const body = await req.json();
      if (body?.workflowId) workflowId = body.workflowId;
    } catch {
      // empty body
    }

    const result = await syncN8nWorkflowMasterLeadsNode(workflowId);

    if (!result.ok) {
      console.warn("[sync-master] Notice:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to update workflow in n8n",
          message: result.error,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      nodeName: result.nodeName,
      workflowId: result.workflowId,
      workflowName: result.workflowName,
    });
  } catch (err: any) {
    console.error("POST /api/n8n/workflow/sync-master error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to update workflow node in n8n",
      },
      { status: 200 }
    );
  }
}
