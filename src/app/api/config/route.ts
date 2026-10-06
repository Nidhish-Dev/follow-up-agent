import { NextResponse } from "next/server";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";
import { adminDb } from "@/lib/firebase-admin";
import { DEFAULT_QUALIFICATION_RULES } from "@/lib/qualification-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const integrationsRef = await getWorkspaceIntegrationsRef();
    const snapshot = await integrationsRef.get();
    const records: Record<string, Record<string, string>> = {};
    for (const doc of snapshot.docs) {
      records[doc.id] = (doc.data() as { values?: Record<string, string> }).values ?? {};
    }

    const qualDoc = await adminDb().collection("workspaces").doc("default").collection("config").doc("qualification").get();
    const qualification = qualDoc.exists ? { ...DEFAULT_QUALIFICATION_RULES, ...qualDoc.data() } : DEFAULT_QUALIFICATION_RULES;

    const tplDoc = await adminDb().collection("workspaces").doc("default").collection("config").doc("emailTemplate").get();
    const emailTemplate = tplDoc.exists
      ? tplDoc.data()
      : {
          subject: "You were curious. So we got to work. Here's {{brand}}'s entire AI ops layer.",
          callUrl: "https://calendly.com/team-grapelabs/30min",
          senderName: "Kashika Gupta",
          senderEmail: "team@grapelabs.in",
        };

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
      qualification,
      emailTemplate,
    };

    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load config." },
      { status: 500 }
    );
  }
}
