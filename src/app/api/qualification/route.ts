import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

import {
  LeadQualificationRules,
  DEFAULT_QUALIFICATION_RULES,
} from "@/lib/qualification-types";

async function getDocRef() {
  const db = adminDb();
  return db.collection("workspaces").doc("default").collection("config").doc("qualification");
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth().verifyIdToken(token);

    const docRef = await getDocRef();
    const snap = await docRef.get();

    const rules: LeadQualificationRules = snap.exists
      ? { ...DEFAULT_QUALIFICATION_RULES, ...(snap.data() as Partial<LeadQualificationRules>) }
      : DEFAULT_QUALIFICATION_RULES;

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error("GET /api/qualification error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch qualification rules" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth().verifyIdToken(token);

    const body = await req.json();
    const docRef = await getDocRef();

    const rules: LeadQualificationRules = {
      minOpens: typeof body.minOpens === "number" ? Math.max(0, body.minOpens) : DEFAULT_QUALIFICATION_RULES.minOpens,
      includeClicked: typeof body.includeClicked === "boolean" ? body.includeClicked : DEFAULT_QUALIFICATION_RULES.includeClicked,
      minClicks: typeof body.minClicks === "number" ? Math.max(0, body.minClicks) : DEFAULT_QUALIFICATION_RULES.minClicks,
      matchMode: body.matchMode === "and" ? "and" : "or",
      excludeAlreadyContacted: typeof body.excludeAlreadyContacted === "boolean" ? body.excludeAlreadyContacted : true,
      deduplicateByEmail: typeof body.deduplicateByEmail === "boolean" ? body.deduplicateByEmail : true,
    };

    await docRef.set({ ...rules, updatedAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({ success: true, rules });
  } catch (error: any) {
    console.error("POST /api/qualification error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update qualification rules" },
      { status: 500 }
    );
  }
}
