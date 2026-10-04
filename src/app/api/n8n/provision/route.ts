import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { getWorkspaceIntegrationsRef } from "@/lib/workspace-db";

type ProvisionResult = {
  service: string;
  status: "created" | "action_required" | "skipped" | "failed";
  detail: string;
};

async function userId(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) throw new Error("Sign in is required.");
  return (await adminAuth().verifyIdToken(token)).uid;
}

function apiRoot(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/api/v1") ? trimmed : `${trimmed}/api/v1`;
}

export async function POST(request: NextRequest) {
  try {
    await userId(request);
    const collection = await getWorkspaceIntegrationsRef();
    const snapshot = await collection.get();
    const records = Object.fromEntries(
      snapshot.docs.map((doc) => [doc.id, (doc.data() as { values: Record<string, string> }).values ?? {}])
    );

    const n8n = records.n8n;
    if (!n8n?.baseUrl || !n8n?.apiKey)
      return NextResponse.json(
        { error: "Save the n8n base URL and API key before syncing." },
        { status: 400 }
      );

    const root = apiRoot(n8n.baseUrl);
    const results: ProvisionResult[] = [];

    // Fetch existing credentials to update if they already exist
    let existingCredentials: Array<{ id: string; name: string; type: string }> = [];
    const n8nHeaders = {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": n8n.apiKey,
      "Authorization": `Bearer ${n8n.apiKey}`,
    };

    try {
      const listRes = await fetch(`${root}/credentials`, {
        headers: n8nHeaders,
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        existingCredentials = Array.isArray(listData) ? listData : listData.data || [];
      }
    } catch (e) {
      console.warn("Could not fetch existing n8n credentials:", e);
    }

    const provision = async (
      service: string,
      type: string,
      name: string,
      data: Record<string, string>
    ) => {
      try {
        const existing = existingCredentials.find((c) => c.name === name || (c.type === type && c.name.includes(service)));
        const method = existing ? "PATCH" : "POST";
        const url = existing ? `${root}/credentials/${existing.id}` : `${root}/credentials`;

        const response = await fetch(url, {
          method,
          headers: n8nHeaders,
          body: JSON.stringify({ name, type, data }),
        });
        if (!response.ok) {
          // If PATCH failed, try POST fallback
          if (method === "PATCH") {
            const fallback = await fetch(`${root}/credentials`, {
              method: "POST",
              headers: n8nHeaders,
              body: JSON.stringify({ name, type, data }),
            });
            if (!fallback.ok) {
              const text = await fallback.text();
              throw new Error(text || `n8n returned ${fallback.status}`);
            }
          } else {
            const text = await response.text();
            throw new Error(text || `n8n returned ${response.status}`);
          }
        }
        results.push({ service, status: "created", detail: `${existing ? "Updated" : "Created"} "${name}" in n8n.` });
      } catch (error) {
        results.push({
          service,
          status: "failed",
          detail:
            error instanceof Error
              ? error.message.slice(0, 220)
              : "n8n rejected this credential.",
        });
      }
    };

    // ── OpenAI ────────────────────────────────────────────────────────────────
    if (records.openai?.apiKey) {
      await provision("OpenAI", "openAiApi", "Frontend credential - OpenAI", {
        apiKey: records.openai.apiKey,
      });
    } else {
      results.push({ service: "OpenAI", status: "skipped", detail: "No OpenAI API key saved yet." });
    }

    // ── Helper to sync n8n Variables (e.g. Chat ID, Folder ID, etc.) ─────────
    const provisionVariable = async (key: string, value: string) => {
      try {
        // Try creating variable
        const createRes = await fetch(`${root}/variables`, {
          method: "POST",
          headers: n8nHeaders,
          body: JSON.stringify({ key, value }),
        });
        if (!createRes.ok) {
          // If already exists, fetch variables and update
          const listRes = await fetch(`${root}/variables`, { headers: n8nHeaders });
          if (listRes.ok) {
            const list = await listRes.json();
            const vars = Array.isArray(list) ? list : list.data || [];
            const existingVar = vars.find((v: { key: string; id: string }) => v.key === key);
            if (existingVar?.id) {
              await fetch(`${root}/variables/${existingVar.id}`, {
                method: "PUT",
                headers: n8nHeaders,
                body: JSON.stringify({ key, value }),
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Could not sync n8n variable ${key}:`, err);
      }
    };

    // ── Telegram ──────────────────────────────────────────────────────────────
    if (records.telegram?.botToken) {
      await provision("Telegram", "telegramApi", "Frontend credential - Telegram", {
        accessToken: records.telegram.botToken,
      });
      if (records.telegram?.chatId) {
        await provisionVariable("TELEGRAM_CHAT_ID", records.telegram.chatId);
      }
    } else {
      results.push({ service: "Telegram", status: "skipped", detail: "No Telegram bot token saved yet." });
    }

    if (records.sheets?.spreadsheetId) {
      await provisionVariable("SPREADSHEET_ID", records.sheets.spreadsheetId);
    }
    if (records.drive?.folderId) {
      await provisionVariable("DRIVE_FOLDER_ID", records.drive.folderId);
    }
    if (records.openai?.model) {
      await provisionVariable("OPENAI_MODEL", records.openai.model);
    }

    // ── Gmail (OAuth2) ────────────────────────────────────────────────────────
    if (records.gmail?.oauthClientId && records.gmail?.oauthClientSecret) {
      await provision("Gmail", "gmailOAuth2", "Frontend credential - Gmail", {
        clientId: records.gmail.oauthClientId,
        clientSecret: records.gmail.oauthClientSecret,
      });
      results.push({
        service: "Gmail (OAuth)",
        status: "action_required",
        detail:
          "Gmail credential created in n8n — open it in n8n and click \"Connect my account\" to finish Google authorization.",
      });
    } else {
      results.push({
        service: "Gmail",
        status: "skipped",
        detail: "No Gmail OAuth credentials saved yet.",
      });
    }

    // ── Google Sheets (service account) ──────────────────────────────────────
    if (records.sheets?.serviceAccountJson) {
      let sa: Record<string, string> = {};
      try {
        sa = JSON.parse(records.sheets.serviceAccountJson);
      } catch {
        results.push({
          service: "Google Sheets",
          status: "failed",
          detail: "Could not parse service account JSON.",
        });
        sa = {};
      }
      if (sa.client_email && sa.private_key) {
        await provision("Google Sheets", "googleApi", "Frontend credential - Sheets", {
          email: sa.client_email,
          privateKey: sa.private_key,
        });
      }
    } else {
      results.push({
        service: "Google Sheets",
        status: "skipped",
        detail: "No Sheets service account JSON saved yet.",
      });
    }

    // ── Google Drive (OAuth2) ─────────────────────────────────────────────────
    if (records.drive?.oauthClientId && records.drive?.oauthClientSecret) {
      await provision("Google Drive", "googleDriveOAuth2Api", "Frontend credential - Drive", {
        clientId: records.drive.oauthClientId,
        clientSecret: records.drive.oauthClientSecret,
      });
      results.push({
        service: "Google Drive (OAuth)",
        status: "action_required",
        detail:
          "Drive credential created in n8n — open it in n8n and click \"Connect my account\" to complete Google authorization.",
      });
    } else {
      results.push({
        service: "Google Drive",
        status: "skipped",
        detail: "No Drive OAuth credentials saved yet.",
      });
    }

    // ── QuickChart ────────────────────────────────────────────────────────────
    results.push({
      service: "QuickChart",
      status: "skipped",
      detail: "QuickChart uses a public endpoint — no n8n credential needed.",
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to provision n8n credentials.",
      },
      { status: 500 }
    );
  }
}
