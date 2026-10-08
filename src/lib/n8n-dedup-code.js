export const UPDATED_DEDUPLICATE_CODE = `// 0. Dynamic Qualification Rules from Frontend / Webhook (with safe defaults)
let rules = {
  minOpens: 2,
  includeClicked: true,
  minClicks: 1,
  matchMode: 'or' // 'or' | 'and'
};

let triggerBody = null;
try {
  const wh = $('Webhook').first()?.json;
  triggerBody = wh?.body || wh;
} catch (e1) {
  try {
    const wh2 = $('Manual trigger / Webhook').first()?.json;
    triggerBody = wh2?.body || wh2;
  } catch (e2) {}
}
if (triggerBody?.body && typeof triggerBody.body === 'object') {
  triggerBody = triggerBody.body;
}

if (triggerBody?.qualification) {
  rules = {
    ...rules,
    ...triggerBody.qualification,
    minOpens: Number(triggerBody.qualification.minOpens ?? rules.minOpens),
    minClicks: Number(triggerBody.qualification.minClicks ?? rules.minClicks),
  };
}

// 1. Fetch & Index Master Leads from Fetch Master Leads1
let masterRows = [];
try {
  masterRows = $('Fetch Master Leads1').all();
} catch (e1) {
  try {
    masterRows = $('Fetch Master Leads').all();
  } catch (e2) {
    try {
      masterRows = $('Fetch master leads').all();
    } catch (e3) {}
  }
}

const masterLeadsList = [];
const masterNameMap = {};
const masterBrandMap = {};
const masterLeadMap = {};

for (const m of masterRows) {
  const row = m.json || {};

  // Extract email
  let emailVal = '';
  for (const [k, v] of Object.entries(row)) {
    const s = String(v || '').trim();
    if (s.includes('@') && s.includes('.')) {
      emailVal = s.toLowerCase();
      break;
    }
  }
  if (!emailVal && row.email) emailVal = String(row.email).trim().toLowerCase();
  if (!emailVal && row.Email) emailVal = String(row.Email).trim().toLowerCase();
  if (!emailVal) continue;

  // Extract full name
  let fullNameVal = '';
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const val = String(v || '').trim();
    if (!val) continue;
    if (['name', 'fullname', 'leadname', 'founder', 'contactname'].includes(key) && isNaN(val)) {
      fullNameVal = val;
      break;
    }
  }
  if (!fullNameVal && row['Full Name']) fullNameVal = String(row['Full Name']).trim();
  if (!fullNameVal && row['Contact Name']) fullNameVal = String(row['Contact Name']).trim();
  if (!fullNameVal && row['Name']) fullNameVal = String(row['Name']).trim();
  if (!fullNameVal && row['First Name']) fullNameVal = String(row['First Name']).trim();
  if (!fullNameVal) {
    const localPart = emailVal.split('@')[0] || '';
    fullNameVal = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }

  // Extract brand / company
  let brandVal = '';
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const val = String(v || '').trim();
    if (!val) continue;
    if (['brand', 'brandname', 'company', 'companyname', 'store', 'business', 'client', 'account'].includes(key)) {
      brandVal = val;
      break;
    }
  }
  if (!brandVal && row.Brand) brandVal = String(row.Brand).trim();
  if (!brandVal && row.Company) brandVal = String(row.Company).trim();
  if (!brandVal) {
    const domain = (emailVal.split('@')[1] || '').split('.')[0];
    if (domain && domain !== 'gmail' && domain !== 'yahoo' && domain !== 'hotmail' && domain !== 'outlook') {
      brandVal = domain.charAt(0).toUpperCase() + domain.slice(1);
    } else {
      brandVal = 'Your Brand';
    }
  }

  // Extract industry
  let industryVal = '';
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (['industry', 'vertical', 'niche', 'category'].includes(key)) {
      industryVal = String(v || '').trim();
      break;
    }
  }
  if (!industryVal) industryVal = row.Industry || row.industry || 'D2C';

  const hookVal = row.Achievement || row.achievement || row.Hook || row.hook || row.opener || '';
  const closerVal = row.Closer || row.closer || row.hook_closer || '';
  const websiteVal = row.Website || row.website || row.url || '';
  const firstName = fullNameVal.split(' ')[0] || fullNameVal || 'there';

  const normalizedLead = {
    ...row,
    Email: emailVal,
    email: emailVal,
    Brand: brandVal,
    brand: brandVal,
    Industry: industryVal,
    industry: industryVal,
    full_name: fullNameVal,
    first_name: firstName,
    First_Name: firstName,
    Name: fullNameVal,
    name: fullNameVal,
    Subject: \`You were curious. So we got to work. Here's \${brandVal}'s entire AI ops layer.\`,
    subject: \`You were curious. So we got to work. Here's \${brandVal}'s entire AI ops layer.\`,
    Hook: hookVal,
    hook: hookVal,
    Closer: closerVal,
    closer: closerVal,
    Website: websiteVal,
    website: websiteVal,
    Stage: 1,
    opens: 1,
    clicks: 0,
    trigger_reason: 'Picked from Master Leads',
  };

  masterNameMap[emailVal] = fullNameVal;
  masterBrandMap[emailVal] = brandVal;
  masterLeadMap[emailVal] = normalizedLead;
  masterLeadsList.push(normalizedLead);
}

// 2. Fetch Existing Responses to prevent duplicates in automated batches
const existingEmails = new Set();
try {
  let existingItems = [];
  try {
    existingItems = $('Fetch Existing Responses').all();
  } catch (e1) {
    try {
      existingItems = $('Fetch existing responses').all();
    } catch (e2) {}
  }
  for (const item of existingItems) {
    for (const v of Object.values(item.json || {})) {
      const s = String(v || '').trim();
      if (s.includes('@') && s.includes('.')) {
        existingEmails.add(s.toLowerCase());
        break;
      }
    }
  }
} catch (e) {}

// 3. Helper to extract real first name (never generic 'there')
function extractRealFirstName(rawName, email) {
  let cleanName = String(rawName || '').trim();
  if (!cleanName || ['there', 'valued lead', 'undefined', 'null', 'friend'].includes(cleanName.toLowerCase())) {
    const userPart = String(email || '').split('@')[0] || '';
    const alphaOnly = userPart.replace(/\d+/g, '').split(/[._-]+/).filter(Boolean);
    cleanName = alphaOnly.length > 0 ? alphaOnly[0] : 'Friend';
  } else {
    cleanName = cleanName.split(' ')[0].replace(/\d+/g, '');
  }
  if (!cleanName) cleanName = 'Friend';
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
}

// 4. PRIORITY A: Did webhook pass a specific lead from Dashboard / Master Leads?
const webhookLead = triggerBody?.lead || (triggerBody?.leadEmail ? {
  email: triggerBody.leadEmail,
  brand: triggerBody.brand,
  name: triggerBody.leadName,
  industry: triggerBody.industry
} : null);

if (webhookLead) {
  let targetEmail = '';
  for (const v of Object.values(webhookLead)) {
    const s = String(v || '').trim();
    if (s.includes('@') && s.includes('.')) {
      targetEmail = s.toLowerCase();
      break;
    }
  }
  if (!targetEmail && webhookLead.email) targetEmail = String(webhookLead.email).toLowerCase().trim();

  const matchedMaster = masterLeadMap[targetEmail] || {};
  const brandVal = String(webhookLead.Brand || webhookLead.brand || matchedMaster.Brand || masterBrandMap[targetEmail] || 'Your Brand').trim();
  const rawName = String(webhookLead.Name || webhookLead.name || webhookLead.firstName || matchedMaster.full_name || masterNameMap[targetEmail] || '').trim();
  const realFirstName = extractRealFirstName(rawName, targetEmail);
  const fullName = rawName && rawName.toLowerCase() !== 'there' ? rawName : realFirstName;
  const industryVal = webhookLead.Industry || webhookLead.industry || matchedMaster.Industry || 'D2C';
  const subjectVal = triggerBody?.email?.subject || \`You were curious. So we got to work. Here's \${brandVal}'s entire AI ops layer.\`;

  return [{
    json: {
      ...matchedMaster,
      ...webhookLead,
      Email: targetEmail || webhookLead.email,
      email: targetEmail || webhookLead.email,
      Brand: brandVal,
      brand: brandVal,
      Industry: industryVal,
      industry: industryVal,
      Subject: subjectVal,
      subject: subjectVal,
      full_name: fullName,
      first_name: realFirstName,
      First_Name: realFirstName,
      Name: fullName,
      name: fullName,
      Stage: 1,
      opens: 1,
      clicks: 0,
      trigger_reason: 'Selected from Master Leads',
      custom_html: triggerBody?.email?.html || ''
    }
  }];
}

// 4. PRIORITY B: Tracking events from Google Sheets Tracking tab
let trackingItems = [];
try {
  trackingItems = $('Fetch Leads From Tracking').all();
} catch (e1) {
  try {
    trackingItems = $('Fetch leads from Tracking').all();
  } catch (e2) {}
}

const aggregatedLeads = {};
for (const item of trackingItems) {
  const row = item.json || {};
  let rawEmail = '';
  for (const v of Object.values(row)) {
    const s = String(v || '').trim();
    if (s.includes('@') && s.includes('.')) { rawEmail = s; break; }
  }
  if (!rawEmail) continue;

  const email = rawEmail.toLowerCase();
  if (existingEmails.has(email)) continue;

  if (!aggregatedLeads[email]) {
    const resolvedName = masterNameMap[email] || row.Name || row['Full Name'] || 'there';
    const brandName = String(row.Brand || row.brand || masterBrandMap[email] || '').trim();
    aggregatedLeads[email] = {
      Email: rawEmail,
      email: rawEmail,
      Brand: brandName,
      brand: brandName,
      Industry: row.Industry || row.industry || 'D2C',
      industry: row.Industry || row.industry || 'D2C',
      Subject: row.Subject || \`You were curious. So we got to work. Here's \${brandName}'s entire AI ops layer.\`,
      subject: row.Subject || \`You were curious. So we got to work. Here's \${brandName}'s entire AI ops layer.\`,
      full_name: resolvedName,
      first_name: resolvedName.split(' ')[0] || resolvedName,
      First_Name: resolvedName.split(' ')[0] || resolvedName,
      Name: resolvedName,
      name: resolvedName,
      Stage: row.Stage || 1,
      opens: 0,
      clicks: 0,
      lastTimestamp: row.Timestamp || ''
    };
  }

  const event = String(row.Event || '').trim().toUpperCase();
  if (event === 'OPENED') aggregatedLeads[email].opens += 1;
  else if (event === 'CLICKED') aggregatedLeads[email].clicks += 1;
}

const qualified = [];
for (const email in aggregatedLeads) {
  const lead = aggregatedLeads[email];
  if (!lead.Brand) continue;

  const meetsOpens = lead.opens >= rules.minOpens;
  const meetsClicks = rules.includeClicked && (lead.clicks >= rules.minClicks);

  let isQualified = false;
  let triggerReason = '';

  if (rules.matchMode === 'and') {
    isQualified = meetsOpens && meetsClicks;
    if (isQualified) triggerReason = \`Clicked CTA (\${lead.clicks} clicks) & Opened \${lead.opens} times\`;
  } else {
    if (meetsClicks) {
      triggerReason = \`Clicked CTA (\${lead.clicks} clicks, \${lead.opens} opens)\`;
      isQualified = true;
    } else if (meetsOpens) {
      triggerReason = \`Opened \${lead.opens} times (min \${rules.minOpens})\`;
      isQualified = true;
    }
  }

  if (isQualified && triggerReason) {
    lead.trigger_reason = triggerReason;
    qualified.push({ json: lead });
  }
}

// 5. PRIORITY C: Pick directly from Master Leads if tracking leads don't qualify or run from Dashboard
if (qualified.length === 0 && masterLeadsList.length > 0) {
  const maxToPick = Number(triggerBody?.limit || 5);
  for (const m of masterLeadsList) {
    if (existingEmails.has(m.email)) continue;
    qualified.push({ json: m });
    if (qualified.length >= maxToPick) break;
  }

  // Fallback: if all master leads were in existing responses, take top available to allow test runs
  if (qualified.length === 0 && masterLeadsList.length > 0) {
    for (let i = 0; i < Math.min(maxToPick, masterLeadsList.length); i++) {
      qualified.push({ json: masterLeadsList[i] });
    }
  }
}

return qualified.slice(0, 15);
`;
