import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedUid = searchParams.get("uid");

    let uid = requestedUid;

    // If no UID is specified, find the most recently active user in Firestore
    if (!uid) {
      const usersSnap = await adminDb().collection("users").limit(1).get();
      if (!usersSnap.empty) {
        uid = usersSnap.docs[0].id;
      }
    }

    if (!uid) {
      return NextResponse.json({ error: "No users configured yet." }, { status: 404 });
    }

    const snapshot = await adminDb().collection("users").doc(uid).collection("integrations").get();
    const records: Record<string, Record<string, string>> = {};
    for (const doc of snapshot.docs) {
      records[doc.id] = (doc.data() as { values?: Record<string, string> }).values ?? {};
    }

    const config = {
      telegram: {
        chatId: records.telegram?.chatId || "",
      },
      sheets: {
        spreadsheetId: records.sheets?.spreadsheetId || "",
      },
      drive: {
        folderId: records.drive?.folderId || "",
      },
      openai: {
        model: records.openai?.model || "gpt-4o-mini",
        systemPrompt: records.openai?.systemPrompt || "",
      },
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load config." },
      { status: 500 }
    );
  }
}
