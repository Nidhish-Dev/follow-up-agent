import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  EmailTemplateConfig,
  DEFAULT_EMAIL_TEMPLATE,
} from "@/lib/email-template-types";

async function getDocRef() {
  const db = adminDb();
  return db.collection("workspaces").doc("default").collection("config").doc("emailTemplate");
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth().verifyIdToken(token);

    const docRef = await getDocRef();
    const snap = await docRef.get();

    const template: EmailTemplateConfig = snap.exists
      ? { ...DEFAULT_EMAIL_TEMPLATE, ...(snap.data() as Partial<EmailTemplateConfig>) }
      : DEFAULT_EMAIL_TEMPLATE;

    return NextResponse.json({ template });
  } catch (error: any) {
    console.error("GET /api/template error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch email template" },
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

    const template: EmailTemplateConfig = {
      subject: typeof body.subject === "string" ? body.subject : DEFAULT_EMAIL_TEMPLATE.subject,
      bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : DEFAULT_EMAIL_TEMPLATE.bodyHtml,
      signatureHtml: typeof body.signatureHtml === "string" ? body.signatureHtml : DEFAULT_EMAIL_TEMPLATE.signatureHtml,
      callUrl: typeof body.callUrl === "string" ? body.callUrl : DEFAULT_EMAIL_TEMPLATE.callUrl,
      callButtonText: typeof body.callButtonText === "string" ? body.callButtonText : DEFAULT_EMAIL_TEMPLATE.callButtonText,
      whatsappUrl: typeof body.whatsappUrl === "string" ? body.whatsappUrl : DEFAULT_EMAIL_TEMPLATE.whatsappUrl,
      whatsappText: typeof body.whatsappText === "string" ? body.whatsappText : DEFAULT_EMAIL_TEMPLATE.whatsappText,
      senderName: typeof body.senderName === "string" ? body.senderName : DEFAULT_EMAIL_TEMPLATE.senderName,
      senderEmail: typeof body.senderEmail === "string" ? body.senderEmail : DEFAULT_EMAIL_TEMPLATE.senderEmail,
      selectedIndustry: typeof body.selectedIndustry === "string" ? body.selectedIndustry : DEFAULT_EMAIL_TEMPLATE.selectedIndustry,
      customIndustries: Array.isArray(body.customIndustries) ? body.customIndustries : (DEFAULT_EMAIL_TEMPLATE.customIndustries || []),
      industryTemplates: body.industryTemplates && typeof body.industryTemplates === "object" ? body.industryTemplates : DEFAULT_EMAIL_TEMPLATE.industryTemplates,
    };

    await docRef.set({ ...template, updatedAt: new Date().toISOString() }, { merge: true });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("POST /api/template error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update email template" },
      { status: 500 }
    );
  }
}
