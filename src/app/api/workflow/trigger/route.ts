import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";
import { syncN8nWorkflowMasterLeadsNode } from "@/lib/sync-n8n";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
    }

    const uid = (await adminAuth().verifyIdToken(token)).uid;

    // Load n8n settings from the single workspace object
    const integrationsRef = await getWorkspaceIntegrationsRef();
    const n8nDoc = await integrationsRef.doc("n8n").get();
    const n8nData = (n8nDoc.data() as { values?: Record<string, string> })?.values;

    const body = await request.json().catch(() => ({}));
    const webhookUrl = body.webhookUrl || n8nData?.webhookUrl;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "No webhook URL configured. Please enter and save your n8n webhook URL under the n8n integration." },
        { status: 400 }
      );
    }

    // Ensure Deduplicate & Qualify Leads node is synchronized with Master Leads support
    try {
      await syncN8nWorkflowMasterLeadsNode();
    } catch (syncErr) {
      console.warn("n8n node auto-sync warning:", syncErr);
    }

    const qualDoc = await adminDb().collection("workspaces").doc("default").collection("config").doc("qualification").get();
    const qualification = qualDoc.exists ? qualDoc.data() : { minOpens: 3, minClicks: 1, includeClicked: true, matchMode: "or" };

    const tplDoc = await adminDb().collection("workspaces").doc("default").collection("config").doc("emailTemplate").get();
    const emailTemplate = tplDoc.exists ? tplDoc.data() : null;

    const payload = {
      source: "dashboard",
      triggeredAt: new Date().toISOString(),
      user: uid,
      qualification,
      emailTemplate,
      ...(body.payload || {}),
    };

    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await n8nResponse.text();
    let responseData: any = responseText;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // plain text response
    }

    if (!n8nResponse.ok) {
      return NextResponse.json(
        {
          error: `n8n webhook responded with status ${n8nResponse.status}`,
          detail: responseData,
        },
        { status: n8nResponse.status }
      );
    }

    const executionId = responseData?.executionId || responseData?.execution_id || responseData?.id || null;

    return NextResponse.json({
      success: true,
      status: n8nResponse.status,
      executionId,
      data: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to trigger workflow." },
      { status: 500 }
    );
  }
}
