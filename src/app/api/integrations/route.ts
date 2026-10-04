import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth } from "@/lib/firebase-admin";
import { syncServiceToN8n, deleteServiceFromN8n } from "@/lib/n8n-sync";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";

const allowed = new Set(["openai", "gmail", "sheets", "telegram", "n8n", "drive"]);

async function verifyAuth(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Sign in is required.");
  return await adminAuth().verifyIdToken(token);
}

export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request);
    const integrationsRef = await getWorkspaceIntegrationsRef();
    const snapshot = await integrationsRef.get();

    const integrations = snapshot.docs
      .filter((doc) => allowed.has(doc.id))
      .map((doc) => {
        const data = doc.data() as { values: Record<string, string>; updatedAt?: { toDate(): Date } };
        const vals = data.values ?? {};
        const hasValues = Object.keys(vals).length > 0;
        return {
          id: doc.id,
          configured: hasValues,
          values: vals,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
        };
      })
      .filter((item) => item.configured);

    return NextResponse.json({ integrations });
  } catch (error) {
    console.error("GET /api/integrations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load integrations" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await verifyAuth(request);
    const { id, values } = await request.json();
    if (!allowed.has(id) || !values || typeof values !== "object")
      return NextResponse.json({ error: "Invalid integration payload." }, { status: 400 });

    const clean = Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => typeof value === "string" && (value as string).trim())
        .map(([name, value]) => [name, String(value).trim()])
    );

    const integrationsRef = await getWorkspaceIntegrationsRef();

    // Save to the single workspace object
    await integrationsRef.doc(id).set({
      values: clean,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Auto-sync to n8n immediately
    let n8nSyncResult = null;
    try {
      if (id === "n8n") {
        n8nSyncResult = await syncServiceToN8n();
      } else {
        n8nSyncResult = await syncServiceToN8n(id);
      }
    } catch (e) {
      console.warn("Background n8n sync warning:", e);
    }

    // Return all current integrations so client state updates immediately
    const allSnapshot = await integrationsRef.get();
    const allIntegrations = allSnapshot.docs
      .filter((doc) => allowed.has(doc.id))
      .map((doc) => {
        const data = doc.data() as { values: Record<string, string>; updatedAt?: { toDate(): Date } };
        const vals = data.values ?? {};
        return {
          id: doc.id,
          configured: Object.keys(vals).length > 0,
          values: vals,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
        };
      })
      .filter((item) => item.configured);

    return NextResponse.json({
      integration: { id, configured: true, values: clean },
      allIntegrations,
      n8nSync: n8nSyncResult,
    });
  } catch (error) {
    console.error("PUT /api/integrations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save integration" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !allowed.has(id))
      return NextResponse.json({ error: "Invalid integration id." }, { status: 400 });

    const integrationsRef = await getWorkspaceIntegrationsRef();

    // 1. Delete from workspace in Firestore
    await integrationsRef.doc(id).delete();

    // 2. Automatically delete corresponding credential from n8n
    let n8nDeleteResult = null;
    try {
      n8nDeleteResult = await deleteServiceFromN8n(id);
    } catch (e) {
      console.warn("Background n8n delete warning:", e);
    }

    return NextResponse.json({ success: true, n8nDeleted: n8nDeleteResult });
  } catch (error) {
    console.error("DELETE /api/integrations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete integration" },
      { status: 500 }
    );
  }
}
