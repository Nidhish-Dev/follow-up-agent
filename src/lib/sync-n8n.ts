import { getN8nConfig } from "./n8n-client";
import { UPDATED_DEDUPLICATE_CODE } from "./n8n-dedup-code.js";
import { UPDATED_BUILD_DIAGRAM_CODE, UPDATED_BUILD_DIAGRAM_REVISE_CODE } from "./build-diagram-code.js";
import { UPDATED_VERIFY_LEAD_CODE } from "./verify-lead-code.js";

export async function syncN8nWorkflowMasterLeadsNode(workflowId = "aCjx6rCJa5glRnBS") {
  const n8n = await getN8nConfig();
  if (!n8n) {
    return {
      ok: false,
      error: "n8n API credentials not found. Please enter n8n Base URL and API Key in the Integrations tab to enable 1-click sync.",
    };
  }

  try {
    let targetId = workflowId;
    let res = await fetch(`${n8n.root}/workflows/${targetId}`, {
      headers: n8n.headers,
    });

    if (!res.ok) {
      const listRes = await fetch(`${n8n.root}/workflows?limit=250`, {
        headers: n8n.headers,
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const workflows: Array<{ id: string; name: string }> = Array.isArray(listData)
          ? listData
          : listData.data || [];
        const match = workflows.find(
          (w) =>
            w.id === targetId ||
            w.name.toLowerCase().includes("followup") ||
            w.name.toLowerCase().includes("gemini")
        );
        if (match) {
          targetId = match.id;
          res = await fetch(`${n8n.root}/workflows/${targetId}`, { headers: n8n.headers });
        }
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `Failed to fetch workflow from n8n (${res.status}): ${errText}` };
    }

    const wf = await res.json();
    let updatedNode = false;
    let nodeFoundName = "";

    // 1. Update pipeline nodes
    for (const node of wf.nodes || []) {
      const name = (node.name || "").toLowerCase();
      // Deduplicate & Qualify Leads
      if (name.includes("deduplicate") || name.includes("qualify")) {
        if (!node.parameters) node.parameters = {};
        node.parameters.jsCode = UPDATED_DEDUPLICATE_CODE;
        updatedNode = true;
        nodeFoundName = node.name;
      }
      // Build Diagram & Copy (Revise)
      else if (name.includes("revise") && (name.includes("build diagram") || name.includes("diagram") || name.includes("copy"))) {
        if (!node.parameters) node.parameters = {};
        node.parameters.jsCode = UPDATED_BUILD_DIAGRAM_REVISE_CODE;
        updatedNode = true;
      }
      // Build Diagram & Copy (Primary)
      else if (name.includes("build diagram") || (name.includes("diagram") && name.includes("copy"))) {
        if (!node.parameters) node.parameters = {};
        node.parameters.jsCode = UPDATED_BUILD_DIAGRAM_CODE;
        updatedNode = true;
      }
      // Verify Lead State in Response Tab
      else if (name.includes("verify lead state") || name.includes("response tab")) {
        if (!node.parameters) node.parameters = {};
        node.parameters.jsCode = UPDATED_VERIFY_LEAD_CODE;
        updatedNode = true;
      }
    }

    // 2. Preserve connections or ensure Webhook routes to Is Custom Mail? if unset
    if (!wf.connections) wf.connections = {};
    if (!wf.connections["Webhook"] || wf.connections["Webhook"].main?.length === 0) {
      wf.connections["Webhook"] = {
        main: [[{ node: "Is Custom Mail?", type: "main", index: 0 }]],
      };
    }

    // 3. If workflow is active, deactivate first to allow PUT update
    const wasActive = Boolean(wf.active);
    if (wasActive) {
      try {
        await fetch(`${n8n.root}/workflows/${targetId}/deactivate`, {
          method: "POST",
          headers: n8n.headers,
        });
      } catch (deactErr) {
        console.warn("Could not deactivate workflow before update:", deactErr);
      }
    }

    const cleanNodes = (wf.nodes || []).map((n: any) => {
      const { ...rest } = n;
      return rest;
    });

    const updatePayload: Record<string, any> = {
      name: wf.name || "FollowUp Agent Frontend",
      nodes: cleanNodes,
      connections: wf.connections || {},
    };
    const validSettings: Record<string, any> = {};
    if (wf.settings && typeof wf.settings === "object") {
      if (wf.settings.executionOrder) validSettings.executionOrder = wf.settings.executionOrder;
      if (wf.settings.timezone) validSettings.timezone = wf.settings.timezone;
      if (wf.settings.saveManualExecutions !== undefined) validSettings.saveManualExecutions = wf.settings.saveManualExecutions;
      if (wf.settings.saveDataErrorExecution !== undefined) validSettings.saveDataErrorExecution = wf.settings.saveDataErrorExecution;
      if (wf.settings.saveDataSuccessExecution !== undefined) validSettings.saveDataSuccessExecution = wf.settings.saveDataSuccessExecution;
    }
    updatePayload.settings = validSettings;

    const updateRes = await fetch(`${n8n.root}/workflows/${targetId}`, {
      method: "PUT",
      headers: n8n.headers,
      body: JSON.stringify(updatePayload),
    });

    // 4. Reactivate if it was active
    if (wasActive) {
      try {
        await fetch(`${n8n.root}/workflows/${targetId}/activate`, {
          method: "POST",
          headers: n8n.headers,
        });
      } catch (actErr) {
        console.warn("Could not reactivate workflow after update:", actErr);
      }
    }

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error("n8n PUT workflow failed:", updateRes.status, errText);
      return { ok: false, error: `Failed to update n8n workflow (${updateRes.status}): ${errText}` };
    }

    return {
      ok: true,
      message: `Successfully synchronized ${nodeFoundName || "workflow"} with Master Leads and Custom Mailing!`,
      nodeName: nodeFoundName,
      workflowId: targetId,
      workflowName: wf.name,
    };
  } catch (err: any) {
    console.error("syncN8nWorkflowMasterLeadsNode error:", err);
    return { ok: false, error: err?.message || "Sync failed" };
  }
}
