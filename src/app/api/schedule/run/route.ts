import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";
import { computeNextRun, isScheduleDueNow, ScheduleConfig } from "@/lib/schedule-helper";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    const cronSecret = req.headers.get("x-cron-secret");
    const configuredSecret = process.env.CRON_SECRET;

    let isAuthorized = false;
    let triggerUser = "scheduler";

    if (token) {
      try {
        const decoded = await adminAuth().verifyIdToken(token);
        isAuthorized = true;
        triggerUser = decoded.uid;
      } catch {
        // Not a valid token, check secret
      }
    }

    if (!isAuthorized && configuredSecret && cronSecret === configuredSecret) {
      isAuthorized = true;
      triggerUser = "automated_cron";
    }

    // Also allow if running in localhost/internal development
    if (!isAuthorized && !configuredSecret) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const forceRun = Boolean(body.force);

    const db = adminDb();
    const scheduleDocRef = db.collection("workspaces").doc("default").collection("schedule").doc("config");
    const scheduleSnap = await scheduleDocRef.get();

    if (!scheduleSnap.exists && !forceRun) {
      return NextResponse.json({ error: "No schedule configured." }, { status: 400 });
    }

    const schedule = (scheduleSnap.data() || {}) as ScheduleConfig;

    if (!forceRun) {
      if (!schedule.enabled) {
        return NextResponse.json({ message: "Schedule is currently paused." }, { status: 200 });
      }

      if (!isScheduleDueNow(schedule, new Date())) {
        return NextResponse.json({ message: "Schedule is not due yet." }, { status: 200 });
      }
    }

    // Retrieve n8n webhook URL
    const integrationsRef = await getWorkspaceIntegrationsRef();
    const n8nDoc = await integrationsRef.doc("n8n").get();
    const n8nData = (n8nDoc.data() as { values?: Record<string, string> })?.values;
    const webhookUrl = n8nData?.webhookUrl;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "No webhook URL configured in n8n integration." },
        { status: 400 }
      );
    }

    const qualDoc = await db.collection("workspaces").doc("default").collection("config").doc("qualification").get();
    const qualification = qualDoc.exists ? qualDoc.data() : { minOpens: 2, minClicks: 1, includeClicked: true, matchMode: "or" };

    const now = new Date();
    const payload = {
      source: forceRun ? "manual_schedule_test" : "automated_scheduler",
      scheduledTime: schedule.time,
      triggeredAt: now.toISOString(),
      user: triggerUser,
      qualification,
    };

    const n8nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const resText = await n8nRes.text();
    let resData: any = resText;
    try {
      resData = JSON.parse(resText);
    } catch {
      // plain text
    }

    if (!n8nRes.ok) {
      return NextResponse.json(
        { error: `n8n webhook returned status ${n8nRes.status}`, detail: resData },
        { status: n8nRes.status }
      );
    }

    const nextRun = computeNextRun(schedule, now);

    // Update lastRunAt and nextRunAt
    await scheduleDocRef.set(
      {
        lastRunAt: now.toISOString(),
        nextRunAt: nextRun ? nextRun.toISOString() : null,
        updatedAt: now.toISOString(),
      },
      { merge: true }
    );

    const executionId = resData?.executionId || resData?.execution_id || resData?.id || null;

    return NextResponse.json({
      success: true,
      executedAt: now.toISOString(),
      executionId,
      nextRunAt: nextRun ? nextRun.toISOString() : null,
      n8nResponse: resData,
    });
  } catch (error: any) {
    console.error("POST /api/schedule/run error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to trigger scheduled run." },
      { status: 500 }
    );
  }
}
