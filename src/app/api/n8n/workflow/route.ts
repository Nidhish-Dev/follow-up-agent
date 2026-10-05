import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getN8nConfig, detectNodeService } from "@/lib/n8n-client";

const FALLBACK_WORKFLOW = {
  id: "default-fallback",
  name: "FollowUp Agent Frontend",
  active: true,
  stages: [
    {
      id: "stage-1",
      title: "Create a draft",
      tone: "orange",
      nodes: [
        { id: "1", name: "Manual trigger / Webhook", type: "n8n-nodes-base.webhook", service: "webhook" },
        { id: "2", name: "Fetch leads from Tracking", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "3", name: "Fetch existing responses", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "4", name: "Fetch master leads", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "5", name: "Deduplicate & qualify leads", type: "n8n-nodes-base.code", service: "code" },
        { id: "6", name: "OpenAI: generate AI Ops draft", type: "@n8n/n8n-nodes-langchain.openAi", service: "openai" },
        { id: "7", name: "Build diagram & email copy", type: "n8n-nodes-base.code", service: "code" },
        { id: "8", name: "Render diagram PNG", type: "n8n-nodes-base.httpRequest", service: "http" },
        { id: "9", name: "Upload diagram to Drive", type: "n8n-nodes-base.googleDrive", service: "drive" },
        { id: "10", name: "Make diagram public", type: "n8n-nodes-base.googleDrive", service: "drive" },
        { id: "11", name: "Save draft to Sheets", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "12", name: "Send preview to Telegram", type: "n8n-nodes-base.telegram", service: "telegram" }
      ]
    },
    {
      id: "stage-2",
      title: "Approve or send",
      tone: "blue",
      nodes: [
        { id: "13", name: "Telegram trigger", type: "n8n-nodes-base.telegramTrigger", service: "telegram" },
        { id: "14", name: "Only callback queries", type: "n8n-nodes-base.filter", service: "logic" },
        { id: "15", name: "Parse callback payload", type: "n8n-nodes-base.code", service: "code" },
        { id: "16", name: "Read automation response", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "17", name: "Verify lead state", type: "n8n-nodes-base.code", service: "code" },
        { id: "18", name: "Route decision", type: "n8n-nodes-base.switch", service: "logic" },
        { id: "19", name: "Not found notification", type: "n8n-nodes-base.telegram", service: "telegram" },
        { id: "20", name: "Already sent notification", type: "n8n-nodes-base.telegram", service: "telegram" },
        { id: "21", name: "Mark Sending", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "22", name: "Gmail: send to lead", type: "n8n-nodes-base.gmail", service: "gmail" },
        { id: "23", name: "Mark sent / failed in Sheets", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "24", name: "Telegram send result", type: "n8n-nodes-base.telegram", service: "telegram" }
      ]
    },
    {
      id: "stage-3",
      title: "Revise the draft",
      tone: "violet",
      nodes: [
        { id: "25", name: "Mark awaiting edit", type: "n8n-nodes-base.telegram", service: "telegram" },
        { id: "26", name: "Ask for edit instructions", type: "n8n-nodes-base.telegram", service: "telegram" },
        { id: "27", name: "OpenAI: revise existing draft", type: "@n8n/n8n-nodes-langchain.openAi", service: "openai" },
        { id: "28", name: "Build revised diagram & copy", type: "n8n-nodes-base.code", service: "code" },
        { id: "29", name: "Render revised diagram", type: "n8n-nodes-base.httpRequest", service: "http" },
        { id: "30", name: "Upload revised diagram", type: "n8n-nodes-base.googleDrive", service: "drive" },
        { id: "31", name: "Make revised diagram public", type: "n8n-nodes-base.googleDrive", service: "drive" },
        { id: "32", name: "Save revised draft", type: "n8n-nodes-base.googleSheets", service: "sheets" },
        { id: "33", name: "Send revised preview to Telegram", type: "n8n-nodes-base.telegram", service: "telegram" }
      ]
    }
  ]
};

const STAGE_TONES = ["orange", "blue", "violet", "emerald", "amber", "rose"];

function determineStageTitle(nodes: any[], rootName: string, index: number): { title: string; tone: string } {
  const root = (rootName || "").toLowerCase();
  const allNames = nodes.map((n) => n.name.toLowerCase()).join(" ");

  if (root.includes("telegram") || root.includes("callback") || allNames.includes("callback") || allNames.includes("decision")) {
    if (allNames.includes("revise") || allNames.includes("edit") || allNames.includes("instruction")) {
      return { title: "Revise the draft", tone: "violet" };
    }
    return { title: "Approve or send", tone: "blue" };
  }

  if (root.includes("execute") || root.includes("webhook") || root.includes("click") || allNames.includes("tracking") || allNames.includes("deduplicate")) {
    return { title: "Create a draft", tone: "orange" };
  }

  if (allNames.includes("revise") || allNames.includes("edit") || allNames.includes("instruction")) {
    return { title: "Revise the draft", tone: "violet" };
  }

  return {
    title: rootName || `Stage ${index + 1}`,
    tone: STAGE_TONES[index % STAGE_TONES.length],
  };
}

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
        source: "fallback",
        workflow: FALLBACK_WORKFLOW,
        allWorkflows: [],
      });
    }

    const { searchParams } = new URL(req.url);
    const requestedWorkflowId = searchParams.get("workflowId");
    const TARGET_WORKFLOW_ID = requestedWorkflowId || "aCjx6rCJa5glRnBS";

    // Directly fetch the specific FollowUp Agent workflow
    let wfRes = await fetch(`${n8n.root}/workflows/${TARGET_WORKFLOW_ID}`, {
      headers: n8n.headers,
    });

    // If direct fetch failed (e.g. ID changed), fallback to searching workflows list
    let wfDetail: any = null;
    if (wfRes.ok) {
      wfDetail = await wfRes.json();
    } else {
      const listRes = await fetch(`${n8n.root}/workflows?limit=250`, {
        headers: n8n.headers,
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const workflows: Array<{ id: string; name: string; active: boolean }> = Array.isArray(listData)
          ? listData
          : listData.data || [];
        const match = workflows.find(
          (w) =>
            w.id === TARGET_WORKFLOW_ID ||
            w.name.toLowerCase().includes("followup") ||
            w.name.toLowerCase().includes("gemini")
        ) || workflows[0];
        if (match) {
          const fallbackRes = await fetch(`${n8n.root}/workflows/${match.id}`, { headers: n8n.headers });
          if (fallbackRes.ok) wfDetail = await fallbackRes.json();
        }
      }
    }

    if (!wfDetail) {
      return NextResponse.json({
        configured: true,
        source: "fallback_detail_error",
        workflow: FALLBACK_WORKFLOW,
        allWorkflows: [],
      });
    }

    const rawNodes: any[] = wfDetail.nodes || [];
    const connections: Record<string, any> = wfDetail.connections || {};

    // Filter out sticky notes or non-executable documentation nodes if necessary
    const executableNodes = rawNodes.filter((n) => !n.type?.includes("stickyNote"));

    // Find incoming edges
    const incomingCount: Record<string, number> = {};
    executableNodes.forEach((n) => {
      incomingCount[n.name] = 0;
    });

    for (const sourceNode in connections) {
      const outputs = connections[sourceNode];
      if (outputs && outputs.main) {
        for (const connGroup of outputs.main) {
          if (Array.isArray(connGroup)) {
            for (const conn of connGroup) {
              if (conn && conn.node && incomingCount[conn.node] !== undefined) {
                incomingCount[conn.node] = (incomingCount[conn.node] || 0) + 1;
              }
            }
          }
        }
      }
    }

    // Root nodes: triggers or 0 incoming connections
    let rootNodes = executableNodes.filter((n) => {
      const isTriggerType =
        n.type.toLowerCase().includes("trigger") ||
        n.type.toLowerCase().includes("webhook");
      return incomingCount[n.name] === 0 || isTriggerType;
    });

    // If still no roots, sort by X position
    if (rootNodes.length === 0 && executableNodes.length > 0) {
      executableNodes.sort((a, b) => ((a.position?.[0] || 0) - (b.position?.[0] || 0)));
      rootNodes = [executableNodes[0]];
    }

    // Traverse each root node to create stages
    const visitedNodes = new Set<string>();
    const stages: Array<{
      id: string;
      title: string;
      tone: string;
      rootNodeName: string;
      nodes: any[];
    }> = [];

    rootNodes.forEach((root, idx) => {
      if (visitedNodes.has(root.name)) return;

      const stageNodes: any[] = [];
      const queue: string[] = [root.name];
      visitedNodes.add(root.name);

      while (queue.length > 0) {
        const currName = queue.shift()!;
        const nodeObj = executableNodes.find((n) => n.name === currName);
        if (nodeObj) {
          stageNodes.push({
            id: nodeObj.id || nodeObj.name,
            name: nodeObj.name,
            type: nodeObj.type,
            service: detectNodeService(nodeObj.type),
            disabled: !!nodeObj.disabled,
            position: nodeObj.position,
            parameters: nodeObj.parameters || {},
          });
        }

        const outConns = connections[currName]?.main || [];
        for (const connGroup of outConns) {
          if (Array.isArray(connGroup)) {
            for (const c of connGroup) {
              if (c?.node && !visitedNodes.has(c.node)) {
                visitedNodes.add(c.node);
                queue.push(c.node);
              }
            }
          }
        }
      }

      if (stageNodes.length > 0) {
        const meta = determineStageTitle(stageNodes, root.name, idx);
        stages.push({
          id: `stage-${idx + 1}`,
          title: meta.title,
          tone: meta.tone,
          rootNodeName: root.name,
          nodes: stageNodes,
        });
      }
    });

    // Leftover nodes
    const leftoverNodes = executableNodes
      .filter((n) => !visitedNodes.has(n.name))
      .map((nodeObj) => ({
        id: nodeObj.id || nodeObj.name,
        name: nodeObj.name,
        type: nodeObj.type,
        service: detectNodeService(nodeObj.type),
        disabled: !!nodeObj.disabled,
        position: nodeObj.position,
        parameters: nodeObj.parameters || {},
      }));

    if (leftoverNodes.length > 0) {
      stages.push({
        id: `stage-${stages.length + 1}`,
        title: "Additional operations",
        tone: STAGE_TONES[stages.length % STAGE_TONES.length],
        rootNodeName: leftoverNodes[0]?.name || "Operations",
        nodes: leftoverNodes,
      });
    }

    return NextResponse.json({
      configured: true,
      source: "n8n_live",
      workflow: {
        id: wfDetail.id,
        name: wfDetail.name,
        active: wfDetail.active,
        updatedAt: wfDetail.updatedAt,
        stages: stages.length > 0 ? stages : FALLBACK_WORKFLOW.stages,
        totalNodes: executableNodes.length,
      },
      allWorkflows: [],
    });
  } catch (error) {
    console.error("Workflow route error:", error);
    return NextResponse.json({
      configured: false,
      source: "fallback_exception",
      error: error instanceof Error ? error.message : "Failed to load workflow",
      workflow: FALLBACK_WORKFLOW,
      allWorkflows: [],
    });
  }
}
