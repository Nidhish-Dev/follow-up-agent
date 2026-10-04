import { adminDb } from "@/lib/firebase-admin";

type ServiceMapping = {
  name: string;
  type: string;
  nodeTypes: string[];
  buildData: (values: Record<string, string>) => Record<string, any> | null;
};

const SERVICE_CONFIGS: Record<string, ServiceMapping> = {
  openai: {
    name: "Frontend credential - OpenAI",
    type: "openAiApi",
    nodeTypes: ["openAi", "@n8n/n8n-nodes-langchain.openAi", "@n8n/n8n-nodes-langchain.lmChatOpenAi"],
    buildData: (v) => (v.apiKey ? { apiKey: v.apiKey } : null),
  },
  telegram: {
    name: "Frontend credential - Telegram",
    type: "telegramApi",
    nodeTypes: ["telegram", "telegramTrigger"],
    buildData: (v) => (v.botToken ? { accessToken: v.botToken } : null),
  },
  gmail: {
    name: "Frontend credential - Gmail",
    type: "gmailOAuth2",
    nodeTypes: ["gmail"],
    buildData: (v) =>
      v.oauthClientId && v.oauthClientSecret
        ? { clientId: v.oauthClientId, clientSecret: v.oauthClientSecret }
        : null,
  },
  sheets: {
    name: "Frontend credential - Sheets",
    type: "googleApi",
    nodeTypes: ["googleSheets"],
    buildData: (v) => {
      if (!v.serviceAccountJson) return null;
      try {
        const sa = JSON.parse(v.serviceAccountJson);
        if (sa.client_email && sa.private_key) {
          return { email: sa.client_email, privateKey: sa.private_key };
        }
      } catch {
        return null;
      }
      return null;
    },
  },
  drive: {
    name: "Frontend credential - Drive",
    type: "googleDriveOAuth2Api",
    nodeTypes: ["googleDrive"],
    buildData: (v) =>
      v.oauthClientId && v.oauthClientSecret
        ? { clientId: v.oauthClientId, clientSecret: v.oauthClientSecret }
        : null,
  },
};

function apiRoot(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

async function getN8nConfig(uid: string) {
  const doc = await adminDb().collection("users").doc(uid).collection("integrations").doc("n8n").get();
  if (!doc.exists) return null;
  const values = (doc.data() as { values?: Record<string, string> }).values;
  if (!values?.baseUrl || !values?.apiKey) return null;
  return {
    root: apiRoot(values.baseUrl),
    apiKey: values.apiKey,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": values.apiKey,
      Authorization: `Bearer ${values.apiKey}`,
    },
  };
}

/**
 * Traverses all workflows in n8n and updates matching nodes to use the new credential.
 */
async function autoBindCredentialToWorkflows(
  n8n: NonNullable<Awaited<ReturnType<typeof getN8nConfig>>>,
  credType: string,
  credId: string,
  credName: string,
  nodeTypeKeywords: string[]
) {
  try {
    const listRes = await fetch(`${n8n.root}/workflows`, { headers: n8n.headers });
    if (!listRes.ok) return;
    const listData = await listRes.json();
    const workflows: Array<{ id: string; name: string }> = Array.isArray(listData)
      ? listData
      : listData.data || [];

    for (const wf of workflows) {
      const getRes = await fetch(`${n8n.root}/workflows/${wf.id}`, { headers: n8n.headers });
      if (!getRes.ok) continue;
      const wfDetail = await getRes.json();
      const nodes = wfDetail.nodes || [];
      let updated = false;

      for (const node of nodes) {
        const nodeType: string = (node.type || "").toLowerCase();
        const matches = nodeTypeKeywords.some((keyword) =>
          nodeType.includes(keyword.toLowerCase())
        );

        if (matches) {
          if (!node.credentials) node.credentials = {};
          // Check if credential changed
          const currentCred = node.credentials[credType];
          if (!currentCred || currentCred.id !== credId || currentCred.name !== credName) {
            // For sheets, remove old googleSheetsOAuth2Api if present, set authentication mode to serviceAccount, and attach googleApi
            if (credType === "googleApi") {
              if (!node.parameters) node.parameters = {};
              node.parameters.authentication = "serviceAccount";
              if (node.credentials.googleSheetsOAuth2Api) {
                delete node.credentials.googleSheetsOAuth2Api;
              }
            }
            // For drive, remove service account googleApi if present and enforce oAuth2
            if (credType === "googleDriveOAuth2Api") {
              if (!node.parameters) node.parameters = {};
              node.parameters.authentication = "oAuth2";
              if (node.credentials.googleApi) {
                delete node.credentials.googleApi;
              }
            }
            node.credentials[credType] = { id: credId, name: credName };
            updated = true;
          }
        }
      }

      if (updated) {
        await fetch(`${n8n.root}/workflows/${wf.id}`, {
          method: "PUT",
          headers: n8n.headers,
          body: JSON.stringify({
            name: wfDetail.name,
            nodes: wfDetail.nodes,
            connections: wfDetail.connections,
            settings: wfDetail.settings,
          }),
        });
      }
    }
  } catch (err) {
    console.warn("Could not auto-bind credential to workflows:", err);
  }
}

/**
 * Automatically syncs a single service (or all services) into n8n and binds them across all workflows.
 */
export async function syncServiceToN8n(uid: string, targetServiceId?: string) {
  const n8n = await getN8nConfig(uid);
  if (!n8n) return { synced: false, reason: "n8n not configured" };

  const servicesToSync = targetServiceId
    ? [targetServiceId]
    : Object.keys(SERVICE_CONFIGS);

  // Fetch all credentials stored in n8n currently
  let existingCredentials: Array<{ id: string; name: string; type: string }> = [];
  try {
    const listRes = await fetch(`${n8n.root}/credentials`, { headers: n8n.headers });
    if (listRes.ok) {
      const listData = await listRes.json();
      existingCredentials = Array.isArray(listData) ? listData : listData.data || [];
    }
  } catch (err) {
    console.warn("Could not list n8n credentials:", err);
  }

  const results: Array<{ service: string; status: string; detail: string }> = [];

  for (const sId of servicesToSync) {
    const config = SERVICE_CONFIGS[sId];
    if (!config) continue;

    // Load saved values from Firestore
    const doc = await adminDb().collection("users").doc(uid).collection("integrations").doc(sId).get();
    if (!doc.exists) continue;
    const values = (doc.data() as { values?: Record<string, string> })?.values || {};
    const payload = config.buildData(values);
    if (!payload) continue;

    try {
      const existing = existingCredentials.find(
        (c) => c.name === config.name || (c.type === config.type && c.name.includes(sId))
      );
      const method = existing ? "PATCH" : "POST";
      const url = existing ? `${n8n.root}/credentials/${existing.id}` : `${n8n.root}/credentials`;

      const response = await fetch(url, {
        method,
        headers: n8n.headers,
        body: JSON.stringify({ name: config.name, type: config.type, data: payload }),
      });

      let credId = existing?.id;

      if (response.ok) {
        const body = await response.json();
        if (body?.id) credId = body.id;
      } else if (method === "PATCH") {
        // Fallback to POST if patch failed
        const postRes = await fetch(`${n8n.root}/credentials`, {
          method: "POST",
          headers: n8n.headers,
          body: JSON.stringify({ name: config.name, type: config.type, data: payload }),
        });
        if (postRes.ok) {
          const body = await postRes.json();
          if (body?.id) credId = body.id;
        }
      }

      // If we have the credential ID, automatically bind it to all workflow nodes!
      if (credId) {
        await autoBindCredentialToWorkflows(
          n8n,
          config.type,
          credId,
          config.name,
          config.nodeTypes
        );
      }

      results.push({
        service: sId,
        status: "synced",
        detail: `Synced and bound ${config.name} in workflows`,
      });
    } catch (err) {
      console.warn(`Failed to sync ${sId} to n8n:`, err);
      results.push({
        service: sId,
        status: "failed",
        detail: err instanceof Error ? err.message : "Error syncing to n8n",
      });
    }
  }

  return { synced: true, results };
}

/**
 * Automatically deletes the corresponding credential from n8n when deleted from frontend.
 */
export async function deleteServiceFromN8n(uid: string, serviceId: string) {
  const n8n = await getN8nConfig(uid);
  if (!n8n) return { deleted: false, reason: "n8n not configured" };

  const config = SERVICE_CONFIGS[serviceId];
  if (!config) return { deleted: false, reason: "No n8n credential for this service" };

  try {
    const listRes = await fetch(`${n8n.root}/credentials`, { headers: n8n.headers });
    if (!listRes.ok) return { deleted: false, reason: "Could not fetch n8n credentials" };

    const listData = await listRes.json();
    const existingCredentials: Array<{ id: string; name: string; type: string }> =
      Array.isArray(listData) ? listData : listData.data || [];

    const matches = existingCredentials.filter(
      (c) => c.name === config.name
    );

    for (const match of matches) {
      await fetch(`${n8n.root}/credentials/${match.id}`, {
        method: "DELETE",
        headers: n8n.headers,
      });
    }

    return { deleted: true, count: matches.length };
  } catch (err) {
    console.warn(`Error deleting ${serviceId} from n8n:`, err);
    return { deleted: false, error: err instanceof Error ? err.message : "Error" };
  }
}
