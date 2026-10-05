import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";

export function apiRoot(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export async function getN8nConfig() {
  const ref = await getWorkspaceIntegrationsRef();
  const doc = await ref.doc("n8n").get();
  if (!doc.exists) return null;
  const values = (doc.data() as { values?: Record<string, string> })?.values;
  if (!values?.baseUrl || !values?.apiKey) return null;

  const root = apiRoot(values.baseUrl);
  return {
    baseUrl: values.baseUrl,
    webhookUrl: values.webhookUrl || "",
    root,
    apiKey: values.apiKey,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": values.apiKey,
      Authorization: `Bearer ${values.apiKey}`,
    },
  };
}

export function detectNodeService(nodeType: string): string {
  const t = (nodeType || "").toLowerCase();
  if (t.includes("webhook")) return "webhook";
  if (t.includes("openai") || t.includes("langchain") || t.includes("ai")) return "openai";
  if (t.includes("telegram")) return "telegram";
  if (t.includes("gmail") || t.includes("email") || t.includes("mail")) return "gmail";
  if (t.includes("googlesheet") || t.includes("sheet")) return "sheets";
  if (t.includes("googledrive") || t.includes("drive")) return "drive";
  if (t.includes("code") || t.includes("function") || t.includes("javascript")) return "code";
  if (t.includes("http") || t.includes("request")) return "http";
  if (t.includes("filter") || t.includes("if") || t.includes("switch")) return "logic";
  return "default";
}
