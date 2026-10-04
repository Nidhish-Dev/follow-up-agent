import { NextResponse } from "next/server";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const integrationsRef = await getWorkspaceIntegrationsRef();
    const snapshot = await integrationsRef.get();
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
