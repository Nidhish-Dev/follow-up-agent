import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { syncServiceToN8n, deleteServiceFromN8n } from "@/lib/n8n-sync";

const allowed = new Set(["openai", "gmail", "sheets", "telegram", "n8n", "drive", "quickchart"]);

async function userId(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Sign in is required.");
  return (await adminAuth().verifyIdToken(token)).uid;
}

export async function GET(request: NextRequest) {
  try {
    const uid = await userId(request);
    const snapshot = await adminDb().collection("users").doc(uid).collection("integrations").get();
    const integrations = snapshot.docs.map((doc) => {
      const data = doc.data() as { values: Record<string, string>; updatedAt?: { toDate(): Date } };
      return { id: doc.id, configured: true, values: data.values ?? {}, updatedAt: data.updatedAt?.toDate().toISOString() };
    });
    return NextResponse.json({ integrations });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load integrations" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const uid = await userId(request);
    const { id, values } = await request.json();
    if (!allowed.has(id) || !values || typeof values !== "object")
      return NextResponse.json({ error: "Invalid integration payload." }, { status: 400 });

    const clean = Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => typeof value === "string" && (value as string).trim())
        .map(([name, value]) => [name, String(value).trim()])
    );

    await adminDb().collection("users").doc(uid).collection("integrations").doc(id).set({
      values: clean,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Auto-sync to n8n immediately
    let n8nSyncResult = null;
    try {
      if (id === "n8n") {
        n8nSyncResult = await syncServiceToN8n(uid);
      } else {
        n8nSyncResult = await syncServiceToN8n(uid, id);
      }
    } catch (e) {
      console.warn("Background n8n sync warning:", e);
    }

    return NextResponse.json({
      integration: { id, configured: true, values: clean },
      n8nSync: n8nSyncResult,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save integration" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await userId(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !allowed.has(id))
      return NextResponse.json({ error: "Invalid integration id." }, { status: 400 });

    // 1. Delete from Firestore
    await adminDb().collection("users").doc(uid).collection("integrations").doc(id).delete();

    // 2. Automatically delete corresponding credential from n8n
    let n8nDeleteResult = null;
    try {
      n8nDeleteResult = await deleteServiceFromN8n(uid, id);
    } catch (e) {
      console.warn("Background n8n delete warning:", e);
    }

    return NextResponse.json({ success: true, n8nDeleted: n8nDeleteResult });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete integration" }, { status: 500 });
  }
}
