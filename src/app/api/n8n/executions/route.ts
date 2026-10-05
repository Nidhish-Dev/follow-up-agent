import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getN8nConfig } from "@/lib/n8n-client";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await adminAuth().verifyIdToken(token);

    const n8n = await getN8nConfig();
    if (!n8n) {
      return NextResponse.json({
        configured: false,
        error: "n8n connection not configured",
        execution: null,
        recentExecutions: [],
      });
    }

    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get("executionId");
    const workflowId = searchParams.get("workflowId") || "aCjx6rCJa5glRnBS";

    let targetExecutionId = executionId;
    let recentExecutions: any[] = [];

    if (!targetExecutionId) {
      // List recent executions
      const listUrl = workflowId
        ? `${n8n.root}/executions?workflowId=${workflowId}&limit=5`
        : `${n8n.root}/executions?limit=5`;

      const listRes = await fetch(listUrl, { headers: n8n.headers });
      if (listRes.ok) {
        const listData = await listRes.json();
        recentExecutions = Array.isArray(listData) ? listData : listData.data || [];
        if (recentExecutions.length > 0) {
          targetExecutionId = recentExecutions[0].id;
        }
      }
    }

    if (!targetExecutionId) {
      return NextResponse.json({
        configured: true,
        execution: null,
        recentExecutions: [],
      });
    }

    // Fetch detailed execution with node runData
    const execRes = await fetch(`${n8n.root}/executions/${targetExecutionId}?includeData=true`, {
      headers: n8n.headers,
    });

    if (!execRes.ok) {
      return NextResponse.json({
        configured: true,
        execution: null,
        error: `Could not fetch execution ${targetExecutionId} (status ${execRes.status})`,
        recentExecutions,
      });
    }

    const execData = await execRes.json();
    const resultData = execData.data?.resultData || {};
    const runData = resultData.runData || {};

    const nodeRuns: Record<
      string,
      {
        status: "running" | "success" | "error" | "waiting";
        executionTime?: number;
        startTime?: number;
        error?: string;
        itemCount?: number;
      }
    > = {};

    for (const nodeName in runData) {
      const runs = runData[nodeName];
      if (Array.isArray(runs) && runs.length > 0) {
        const lastRun = runs[runs.length - 1];
        const hasError = !!lastRun.error;
        const isComplete = lastRun.executionTime !== undefined;
        const status = hasError ? "error" : isComplete ? "success" : "running";

        let itemCount = 0;
        if (lastRun.data?.main) {
          for (const outGroup of lastRun.data.main) {
            if (Array.isArray(outGroup)) itemCount += outGroup.length;
          }
        }

        nodeRuns[nodeName] = {
          status,
          executionTime: lastRun.executionTime,
          startTime: lastRun.startTime,
          error: lastRun.error?.message || (hasError ? "Execution error" : undefined),
          itemCount,
        };
      }
    }

    // Determine currently running node if execution is unfinished
    let runningNode = "";
    if (!execData.finished) {
      if (resultData.lastNodeExecuted && nodeRuns[resultData.lastNodeExecuted]?.status === "running") {
        runningNode = resultData.lastNodeExecuted;
      }
    }

    const execution = {
      id: execData.id,
      workflowId: execData.workflowId,
      status: execData.status || (execData.finished ? "success" : "running"),
      finished: !!execData.finished,
      mode: execData.mode || "webhook",
      startedAt: execData.startedAt,
      stoppedAt: execData.stoppedAt,
      lastNodeExecuted: resultData.lastNodeExecuted || null,
      runningNode: runningNode || resultData.lastNodeExecuted || null,
      error: execData.data?.resultData?.error?.message || null,
      nodeRuns,
    };

    return NextResponse.json({
      configured: true,
      execution,
      recentExecutions: recentExecutions.map((e) => ({
        id: e.id,
        status: e.status,
        finished: e.finished,
        startedAt: e.startedAt,
        stoppedAt: e.stoppedAt,
      })),
    });
  } catch (error) {
    console.error("Executions route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load execution status" },
      { status: 500 }
    );
  }
}
