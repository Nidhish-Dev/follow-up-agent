import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const db = adminDb();
    const n8nDoc = await db.collection("users").doc(uid).collection("integrations").doc("n8n").get();
    if (!n8nDoc.exists) return NextResponse.json({ count: 0 });

    const data = n8nDoc.data();
    const { baseUrl, apiKey } = data?.values ?? {};
    if (!baseUrl || !apiKey) return NextResponse.json({ count: 0 });

    const base = baseUrl.replace(/\/$/, "");
    const headers: Record<string, string> = {
      "X-N8N-API-KEY": apiKey,
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(`${base}/api/v1/workflows?active=true&limit=250`, { headers });
    if (!res.ok) return NextResponse.json({ count: 0 });

    const body = await res.json();
    // n8n returns { data: [...] } or { workflows: [...] }
    const list: any[] = body.data ?? body.workflows ?? [];
    const count = list.filter((w: any) => w.active === true).length;

    return NextResponse.json({ count });
  } catch (e) {
    console.error("live-count error", e);
    return NextResponse.json({ count: 0 });
  }
}

