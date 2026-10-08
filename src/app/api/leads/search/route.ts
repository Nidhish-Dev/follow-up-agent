import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";
import { fetchMasterLeadsFromSheet, MOCK_MASTER_LEADS, SheetSearchResponse } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await adminAuth().verifyIdToken(token);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    // 1. Fetch Google Sheets credentials from workspace
    const integrationsRef = await getWorkspaceIntegrationsRef();
    const sheetsDoc = await integrationsRef.doc("sheets").get();
    const sheetsData = (sheetsDoc.data() as { values?: Record<string, string> })?.values || {};

    const spreadsheetId = sheetsData.spreadsheetId;
    const serviceAccountJson = sheetsData.serviceAccountJson;

    if (!spreadsheetId || !serviceAccountJson) {
      // Return mock leads with notification to configure Google Sheets
      const q = query.toLowerCase().trim();
      const filtered = q
        ? MOCK_MASTER_LEADS.filter(
            (l) =>
              l.email.toLowerCase().includes(q) ||
              l.name.toLowerCase().includes(q) ||
              l.brand.toLowerCase().includes(q)
          )
        : MOCK_MASTER_LEADS;

      const mockResponse: SheetSearchResponse = {
        spreadsheetId: spreadsheetId || "Not configured",
        sheetName: "Master Leads (Sample)",
        availableSheets: ["Master Leads", "Tracking", "Responses"],
        totalLeads: MOCK_MASTER_LEADS.length,
        matchedLeads: filtered.length,
        leads: filtered,
        isMock: true,
        message:
          "Google Sheets integration is not fully configured yet. Showing sample leads so you can preview and test follow-ups.",
      };

      return NextResponse.json(mockResponse);
    }

    try {
      const liveData = await fetchMasterLeadsFromSheet(spreadsheetId, serviceAccountJson, query);
      return NextResponse.json(liveData);
    } catch (sheetError: any) {
      console.warn("Error fetching live Google Sheets, falling back to mock leads:", sheetError);

      const q = query.toLowerCase().trim();
      const filtered = q
        ? MOCK_MASTER_LEADS.filter(
            (l) =>
              l.email.toLowerCase().includes(q) ||
              l.name.toLowerCase().includes(q) ||
              l.brand.toLowerCase().includes(q)
          )
        : MOCK_MASTER_LEADS;

      return NextResponse.json({
        spreadsheetId,
        sheetName: "Master Leads",
        availableSheets: ["Master Leads"],
        totalLeads: MOCK_MASTER_LEADS.length,
        matchedLeads: filtered.length,
        leads: filtered,
        isMock: true,
        message: `Could not connect to live Google Sheet: ${sheetError.message}. Showing sample leads.`,
      });
    }
  } catch (err: any) {
    console.error("GET /api/leads/search error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to search master leads" },
      { status: 500 }
    );
  }
}
