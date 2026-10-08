import crypto from "crypto";

export interface MasterLead {
  id: string;
  rowIndex: number;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  brand: string;
  industry: string;
  website: string;
  status: string;
  phone: string;
  hook: string;
  closer: string;
  verticalFocus: string;
  raw: Record<string, string>;
}

export interface SheetSearchResponse {
  spreadsheetId: string;
  sheetName: string;
  availableSheets: string[];
  totalLeads: number;
  matchedLeads: number;
  leads: MasterLead[];
  isMock?: boolean;
  message?: string;
}

// Fallback sample leads if Google Sheets credentials are not configured yet
export const MOCK_MASTER_LEADS: MasterLead[] = [
  {
    id: "lead-1",
    rowIndex: 2,
    email: "alex@allstarathletics.com",
    firstName: "Alex",
    lastName: "Vance",
    name: "Alex Vance",
    brand: "AllStar Athletics",
    industry: "D2C Technical Apparel",
    website: "https://allstarathletics.com",
    status: "Lead Qualified",
    phone: "+1 415 890 2341",
    hook: "AllStar Athletics has built a cult-like community around its technical running gear that customers keep reordering every drop.",
    closer: "That's the hard part, and it's already done.",
    verticalFocus: "Direct-to-consumer acquisition, community-driven repeat purchase, and creator-led trust cycles.",
    raw: { Email: "alex@allstarathletics.com", "Contact Name": "Alex Vance", Brand: "AllStar Athletics" },
  },
  {
    id: "lead-2",
    rowIndex: 3,
    email: "sophia@luminaskin.co",
    firstName: "Sophia",
    lastName: "Chen",
    name: "Sophia Chen",
    brand: "Lumina Skincare",
    industry: "Clean Beauty & Barrier Care",
    website: "https://luminaskin.co",
    status: "Review Pending",
    phone: "+1 212 555 0192",
    hook: "Lumina has achieved viral retention across its microbiome barrier serums with over 42% repeat purchase velocity.",
    closer: "Building true organic product love is the rare feat, and you've nailed it.",
    verticalFocus: "Subscription auto-replenishment, routine personalization quiz flows, and post-purchase onboarding.",
    raw: { Email: "sophia@luminaskin.co", "Contact Name": "Sophia Chen", Brand: "Lumina Skincare" },
  },
  {
    id: "lead-3",
    rowIndex: 4,
    email: "marcus@peakcoffee.com",
    firstName: "Marcus",
    lastName: "Brody",
    name: "Marcus Brody",
    brand: "Peak Coffee Roasters",
    industry: "Artisan Coffee Subscription",
    website: "https://peakcoffee.com",
    status: "Follow-up Due",
    phone: "+44 20 7946 0912",
    hook: "Peak Coffee has carved out a fiercely loyal following among specialty single-origin subscription roasters.",
    closer: "Product excellence is proven, now the ops engine accelerates it.",
    verticalFocus: "Wholesale re-orders, tier loyalty perks, and roast-date dispatch tracking workflows.",
    raw: { Email: "marcus@peakcoffee.com", "Contact Name": "Marcus Brody", Brand: "Peak Coffee Roasters" },
  },
  {
    id: "lead-4",
    rowIndex: 5,
    email: "peyush@lenskart.com",
    firstName: "Peyush",
    lastName: "Bansal",
    name: "Peyush Bansal",
    brand: "Lenskart",
    industry: "Eyewear & Omnichannel Retail",
    website: "https://lenskart.com",
    status: "Target D2C Lead",
    phone: "+91 98111 22334",
    hook: "Lenskart has revolutionised accessible eyewear with incredible unit economics and end-to-end supply chain mastery.",
    closer: "Scale and brand trust are undisputed, now autonomous ops take conversion to the next tier.",
    verticalFocus: "Automated replenishment reminders, custom prescription verification, and localized fulfillment routing.",
    raw: { Email: "peyush@lenskart.com", "Contact Name": "Peyush Bansal", Brand: "Lenskart" },
  },
];

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Mint Google OAuth2 Bearer token from Service Account JSON without heavy SDKs
 */
export async function getGoogleServiceAccountToken(
  clientEmail: string,
  privateKey: string,
  scopes: string[] = ["https://www.googleapis.com/auth/spreadsheets"]
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: clientEmail,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(privateKey);
  const jwt = `${signatureInput}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth2 Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Fetch rows from Google Sheets Master Leads tab
 */
export async function fetchMasterLeadsFromSheet(
  spreadsheetId: string,
  serviceAccountJsonString: string,
  searchQuery: string = ""
): Promise<SheetSearchResponse> {
  let sa: { client_email?: string; private_key?: string } = {};
  try {
    sa = JSON.parse(serviceAccountJsonString);
  } catch {
    throw new Error("Invalid Google Sheets Service Account JSON format.");
  }

  if (!sa.client_email || !sa.private_key) {
    throw new Error("Service Account JSON must contain client_email and private_key.");
  }

  const token = await getGoogleServiceAccountToken(sa.client_email, sa.private_key);

  // 1. Get spreadsheet metadata to locate sheet tabs
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    throw new Error(`Failed to load Google Spreadsheet (${metaRes.status}): ${errText}`);
  }

  const metaData = await metaRes.json();
  const sheets: { properties: { title: string } }[] = metaData.sheets || [];
  const titles = sheets.map((s) => s.properties.title);

  // Match "Master Leads" / "Master" or fallback to first sheet
  let targetSheet = titles.find((t) => /master.?leads/i.test(t));
  if (!targetSheet) {
    targetSheet = titles.find((t) => /master/i.test(t));
  }
  if (!targetSheet) {
    targetSheet = titles.find((t) => /lead/i.test(t)) || titles[0] || "Sheet1";
  }

  // 2. Fetch sheet values
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(targetSheet)}!A1:Z2000?valueRenderOption=FORMATTED_VALUE`;

  const valRes = await fetch(valuesUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!valRes.ok) {
    const errText = await valRes.text();
    throw new Error(`Failed to read sheet data (${valRes.status}): ${errText}`);
  }

  const valData = await valRes.json();
  const rawRows: string[][] = valData.values || [];

  if (rawRows.length === 0) {
    return {
      spreadsheetId,
      sheetName: targetSheet,
      availableSheets: titles,
      totalLeads: 0,
      matchedLeads: 0,
      leads: [],
    };
  }

  const headers = (rawRows[0] || []).map((h) => String(h || "").trim());

  // Find header column indices
  const findCol = (regex: RegExp) => headers.findIndex((h) => regex.test(h));
  const emailCol = findCol(/email|e-mail|mail/i);
  const firstNameCol = findCol(/first.?name/i);
  const lastNameCol = findCol(/last.?name|surname/i);
  const fullNameCol = findCol(/^(contact|lead|person|full)?\s*name$/i);
  const brandCol = findCol(/brand|company|business|store|client|organization/i);
  const industryCol = findCol(/industry|vertical|category|niche/i);
  const websiteCol = findCol(/website|url|domain|site/i);
  const statusCol = findCol(/status|stage|state/i);
  const phoneCol = findCol(/phone|mobile|whatsapp|tel|contact.?no/i);
  const hookCol = findCol(/achievement|hook|opener/i);
  const closerCol = findCol(/closer|hook_closer/i);
  const verticalFocusCol = findCol(/vertical_focus|focus/i);

  const leads: MasterLead[] = [];
  const q = searchQuery.toLowerCase().trim();

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const email = (emailCol >= 0 ? row[emailCol] : "") || "";
    // If no email, check if row is empty
    if (!email && row.every((c) => !c || String(c).trim() === "")) continue;

    const fName = (firstNameCol >= 0 ? row[firstNameCol] : "") || "";
    const lName = (lastNameCol >= 0 ? row[lastNameCol] : "") || "";
    const fullName = (fullNameCol >= 0 ? row[fullNameCol] : "") || (fName ? `${fName} ${lName}`.trim() : "");
    const brand = (brandCol >= 0 ? row[brandCol] : "") || "";
    const industry = (industryCol >= 0 ? row[industryCol] : "") || "D2C Brand";
    const website = (websiteCol >= 0 ? row[websiteCol] : "") || "";
    const status = (statusCol >= 0 ? row[statusCol] : "") || "New";
    const phone = (phoneCol >= 0 ? row[phoneCol] : "") || "";
    const hook = (hookCol >= 0 ? row[hookCol] : "") || "";
    const closer = (closerCol >= 0 ? row[closerCol] : "") || "";
    const verticalFocus = (verticalFocusCol >= 0 ? row[verticalFocusCol] : "") || "";

    const rawObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) rawObj[h] = row[idx] || "";
    });

    // Resolve human-friendly first and full names
    let cleanFullName = fullName.trim();
    if (!cleanFullName || cleanFullName.toLowerCase() === "there" || cleanFullName.toLowerCase() === "valued lead") {
      const emailUser = email.split("@")[0] || "";
      const alphaParts = emailUser.replace(/\d+/g, "").split(/[._-]+/).filter(Boolean);
      cleanFullName = alphaParts.length > 0 ? (alphaParts[0].charAt(0).toUpperCase() + alphaParts[0].slice(1).toLowerCase()) : "Valued Lead";
    }

    let cleanFirstName = fName.trim() || cleanFullName.split(" ")[0] || "";
    cleanFirstName = cleanFirstName.replace(/\d+/g, "");
    if (!cleanFirstName || cleanFirstName.toLowerCase() === "there" || cleanFirstName.toLowerCase() === "valued lead") {
      cleanFirstName = "Friend";
    }
    cleanFirstName = cleanFirstName.charAt(0).toUpperCase() + cleanFirstName.slice(1);

    const lead: MasterLead = {
      id: `lead-row-${i + 1}`,
      rowIndex: i + 1,
      email: email.trim(),
      firstName: cleanFirstName,
      lastName: lName.trim() || cleanFullName.split(" ").slice(1).join(" "),
      name: cleanFullName,
      brand: brand.trim() || email.split("@")[1]?.split(".")[0] || "Your Brand",
      industry: industry.trim(),
      website: website.trim(),
      status: status.trim(),
      phone: phone.trim(),
      hook: hook.trim(),
      closer: closer.trim(),
      verticalFocus: verticalFocus.trim(),
      raw: rawObj,
    };

    // Filter by query if supplied
    if (q) {
      const match =
        lead.email.toLowerCase().includes(q) ||
        lead.name.toLowerCase().includes(q) ||
        lead.brand.toLowerCase().includes(q) ||
        lead.industry.toLowerCase().includes(q);
      if (!match) continue;
    }

    leads.push(lead);
  }

  return {
    spreadsheetId,
    sheetName: targetSheet,
    availableSheets: titles,
    totalLeads: rawRows.length - 1,
    matchedLeads: leads.length,
    leads,
  };
}

/**
 * Updates a lead's status cell in the Google Sheet
 */
export async function updateLeadStatusInSheet(
  spreadsheetId: string,
  serviceAccountJsonString: string,
  sheetName: string,
  rowIndex: number,
  newStatus: string
): Promise<boolean> {
  try {
    const sa = JSON.parse(serviceAccountJsonString);
    if (!sa.client_email || !sa.private_key) return false;
    const token = await getGoogleServiceAccountToken(sa.client_email, sa.private_key);

    // Fetch headers to find status column
    const headerRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(sheetName)}!A1:Z1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!headerRes.ok) return false;
    const headerData = await headerRes.json();
    const headers: string[] = headerData.values?.[0] || [];
    let statusIdx = headers.findIndex((h) => /status|stage/i.test(h));
    if (statusIdx < 0) {
      statusIdx = headers.length; // append to first empty column
    }

    const colLetter = String.fromCharCode(65 + statusIdx);
    const range = `${sheetName}!${colLetter}${rowIndex}`;

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[`${newStatus} (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`]],
        }),
      }
    );

    return updateRes.ok;
  } catch (err) {
    console.warn("Failed to update status in Google Sheet:", err);
    return false;
  }
}
