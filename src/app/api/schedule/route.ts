import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { getN8nConfig } from "@/lib/n8n-client";
import { computeNextRun, formatScheduleSummary, ScheduleConfig, scheduleToCronExpression } from "@/lib/schedule-helper";

const DEFAULT_SCHEDULE: ScheduleConfig = {
  enabled: false,
  startDate: new Date().toISOString().split("T")[0],
  endDate: null,
  daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
  time: "09:00",
  timezone: "Asia/Kolkata",
  lastRunAt: null,
  nextRunAt: null,
};

async function getScheduleDocRef() {
  const db = adminDb();
  return db.collection("workspaces").doc("default").collection("schedule").doc("config");
}

async function syncScheduleToN8n(schedule: ScheduleConfig) {
  try {
    const n8n = await getN8nConfig();
    if (!n8n) return;

    const TARGET_WORKFLOW_ID = "aCjx6rCJa5glRnBS";
    const wfRes = await fetch(`${n8n.root}/workflows/${TARGET_WORKFLOW_ID}`, {
      headers: n8n.headers,
    });
    if (!wfRes.ok) return;

    const wf = await wfRes.json();
    const nodes: any[] = wf.nodes || [];
    const connections: Record<string, any> = wf.connections || {};

    const cronExpr = scheduleToCronExpression(schedule);
    let schedNode = nodes.find(
      (n: any) => n.name === "Schedule Trigger" || n.type === "n8n-nodes-base.scheduleTrigger"
    );

    if (schedule.enabled) {
      if (!schedNode) {
        schedNode = {
          parameters: {
            rule: {
              interval: [
                {
                  field: "cronExpression",
                  expression: cronExpr,
                },
              ],
            },
          },
          name: "Schedule Trigger",
          type: "n8n-nodes-base.scheduleTrigger",
          typeVersion: 1.2,
          position: [240, 200],
        };
        nodes.push(schedNode);
      } else {
        schedNode.parameters = {
          rule: {
            interval: [
              {
                field: "cronExpression",
                expression: cronExpr,
              },
            ],
          },
        };
        schedNode.disabled = false;
      }

      // Connect to "Fetch Leads From Tracking"
      const targetNodeName =
        nodes.find((n: any) => n.name.toLowerCase().includes("fetch leads"))?.name ||
        "Fetch Leads From Tracking";

      connections[schedNode.name] = {
        main: [[{ node: targetNodeName, type: "main", index: 0 }]],
      };
    } else {
      if (schedNode) {
        schedNode.disabled = true;
      }
    }

    const settings = {
      ...(wf.settings || {}),
      timezone: schedule.timezone || "Asia/Kolkata",
    };

    await fetch(`${n8n.root}/workflows/${TARGET_WORKFLOW_ID}`, {
      method: "PUT",
      headers: n8n.headers,
      body: JSON.stringify({
        name: wf.name,
        nodes,
        connections,
        settings,
      }),
    });
  } catch (err) {
    console.warn("Notice: Failed to sync schedule to n8n:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth().verifyIdToken(token);

    const docRef = await getScheduleDocRef();
    const snap = await docRef.get();

    let scheduleData: ScheduleConfig = DEFAULT_SCHEDULE;
    if (snap.exists) {
      scheduleData = {
        ...DEFAULT_SCHEDULE,
        ...(snap.data() as Partial<ScheduleConfig>),
      };
    }

    const nextRun = computeNextRun(scheduleData);
    const updatedSchedule: ScheduleConfig = {
      ...scheduleData,
      nextRunAt: nextRun ? nextRun.toISOString() : null,
    };

    return NextResponse.json({
      schedule: updatedSchedule,
      summary: formatScheduleSummary(updatedSchedule),
    });
  } catch (error: any) {
    console.error("GET /api/schedule error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch schedule" },
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
    const docRef = await getScheduleDocRef();
    const currentSnap = await docRef.get();
    const existing = currentSnap.exists ? currentSnap.data() : {};

    const updatedConfig: ScheduleConfig = {
      enabled: typeof body.enabled === "boolean" ? body.enabled : existing?.enabled ?? false,
      startDate: body.startDate || existing?.startDate || new Date().toISOString().split("T")[0],
      endDate: body.endDate !== undefined ? body.endDate : existing?.endDate ?? null,
      daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek : existing?.daysOfWeek ?? [1, 2, 3, 4, 5],
      time: body.time || existing?.time || "09:00",
      timezone: body.timezone || existing?.timezone || "Asia/Kolkata",
      lastRunAt: existing?.lastRunAt || null,
      updatedAt: new Date().toISOString(),
    };

    const nextRun = computeNextRun(updatedConfig);
    updatedConfig.nextRunAt = nextRun ? nextRun.toISOString() : null;

    await docRef.set(updatedConfig, { merge: true });

    // Sync to n8n native scheduler in background
    await syncScheduleToN8n(updatedConfig);

    return NextResponse.json({
      success: true,
      schedule: updatedConfig,
      summary: formatScheduleSummary(updatedConfig),
    });
  } catch (error: any) {
    console.error("POST /api/schedule error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update schedule" },
      { status: 500 }
    );
  }
}
