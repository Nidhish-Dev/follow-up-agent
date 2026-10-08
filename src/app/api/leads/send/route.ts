import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";
import { updateLeadStatusInSheet } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth().verifyIdToken(token);

    const historySnap = await adminDb()
      .collection("workspaces")
      .doc("default")
      .collection("followupHistory")
      .orderBy("sentAt", "desc")
      .limit(20)
      .get();

    const history = historySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ history });
  } catch (err: any) {
    console.error("GET /api/leads/send history error:", err);
    return NextResponse.json({ error: err?.message || "Failed to load history" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth().verifyIdToken(token);
    const body = await request.json();

    const {
      leadEmail,
      leadName,
      brand,
      subject,
      bodyHtml,
      leadData,
      sheetName,
      rowIndex,
    } = body;

    if (!leadEmail || !subject || !bodyHtml) {
      return NextResponse.json(
        { error: "Recipient email, subject, and bodyHtml are required." },
        { status: 400 }
      );
    }

    const integrationsRef = await getWorkspaceIntegrationsRef();

    // 1. Check n8n Webhook
    const n8nDoc = await integrationsRef.doc("n8n").get();
    const n8nData = (n8nDoc.data() as { values?: Record<string, string> })?.values || {};
    const webhookUrl = n8nData.webhookUrl;

    let webhookDispatched = false;
    let executionId: string | null = null;
    let webhookFeedback: any = null;

    if (webhookUrl) {
      try {
        // Auto-sync n8n node to ensure it accepts master leads
        try {
          const { syncN8nWorkflowMasterLeadsNode } = await import("@/lib/sync-n8n");
          await syncN8nWorkflowMasterLeadsNode();
        } catch (syncErr) {
          console.warn("n8n node auto-sync warning:", syncErr);
        }

        let resolvedName = (
          leadName ||
          leadData?.name ||
          leadData?.fullName ||
          (leadData?.firstName ? `${leadData.firstName} ${leadData?.lastName || ""}`.trim() : "") ||
          ""
        ).trim();

        if (
          !resolvedName ||
          ["there", "valued lead", "friend", "undefined", "null"].includes(resolvedName.toLowerCase()) ||
          resolvedName.toLowerCase() === String(leadEmail || "").toLowerCase()
        ) {
          const userPart = String(leadEmail || "").split("@")[0] || "";
          const alphaOnly = userPart.replace(/\d+/g, "").split(/[._-]+/).filter(Boolean);
          resolvedName = alphaOnly.length > 0 ? (alphaOnly[0].charAt(0).toUpperCase() + alphaOnly[0].slice(1).toLowerCase()) : "Friend";
        } else {
          // If name has numbers or is just username
          resolvedName = resolvedName.replace(/\d+/g, "").trim() || "Friend";
        }

        const firstName = resolvedName.split(" ")[0] || resolvedName;
        const resolvedBrand = brand || leadData?.brand || leadData?.Brand || "Your Brand";
        const resolvedIndustry = leadData?.industry || leadData?.Industry || "D2C";

        const payload = {
          source: "manual_followup",
          action: "send_email",
          triggeredAt: new Date().toISOString(),
          user: decoded.uid,
          leadEmail,
          brand: resolvedBrand,
          leadName: resolvedName,
          lead: {
            email: leadEmail,
            Email: leadEmail,
            name: resolvedName,
            Name: resolvedName,
            full_name: resolvedName,
            first_name: firstName,
            First_Name: firstName,
            brand: resolvedBrand,
            Brand: resolvedBrand,
            industry: resolvedIndustry,
            Industry: resolvedIndustry,
            ...(leadData || {}),
          },
          email: {
            to: leadEmail,
            subject,
            html: bodyHtml,
          },
        };

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        try {
          webhookFeedback = JSON.parse(text);
        } catch {
          webhookFeedback = text;
        }

        if (res.ok) {
          webhookDispatched = true;
          executionId =
            webhookFeedback?.executionId ||
            webhookFeedback?.execution_id ||
            webhookFeedback?.id ||
            null;
        }
      } catch (err: any) {
        console.warn("n8n webhook dispatch warning:", err);
      }
    }

    // 2. Update Google Sheet status if available
    let sheetUpdated = false;
    if (sheetName && rowIndex) {
      try {
        const sheetsDoc = await integrationsRef.doc("sheets").get();
        const sheetsData = (sheetsDoc.data() as { values?: Record<string, string> })?.values || {};
        if (sheetsData.spreadsheetId && sheetsData.serviceAccountJson) {
          sheetUpdated = await updateLeadStatusInSheet(
            sheetsData.spreadsheetId,
            sheetsData.serviceAccountJson,
            sheetName,
            rowIndex,
            "Follow-up Sent"
          );
        }
      } catch (sheetErr) {
        console.warn("Could not update lead in Google Sheet:", sheetErr);
      }
    }

    // 3. Save to Firestore Audit Log
    const logEntry = {
      leadEmail,
      leadName: leadName || "",
      brand: brand || "",
      subject,
      bodyPreview: bodyHtml.replace(/<[^>]+>/g, "").slice(0, 140) + "...",
      sentAt: new Date().toISOString(),
      sentBy: decoded.uid,
      webhookDispatched,
      sheetUpdated,
      executionId,
      status: "sent",
    };

    const historyRef = adminDb()
      .collection("workspaces")
      .doc("default")
      .collection("followupHistory");

    await historyRef.add(logEntry);

    return NextResponse.json({
      success: true,
      message: `Follow-up email dispatched successfully to ${leadEmail}!`,
      log: logEntry,
      webhookDispatched,
      executionId,
      sheetUpdated,
    });
  } catch (err: any) {
    console.error("POST /api/leads/send error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to dispatch follow-up email" },
      { status: 500 }
    );
  }
}
