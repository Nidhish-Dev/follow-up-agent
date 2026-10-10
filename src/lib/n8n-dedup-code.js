export const UPDATED_DEDUPLICATE_CODE = `// 0. Dynamic Qualification Rules from Frontend / Webhook (with safe defaults)
// ===== Custom mail path (from dashboard) =====
const _in = $input.first()?.json || {};
const _b = _in.body || _in;
if (_b.source === 'manual_followup' || _b.action === 'send_email') {
  const lead = _b.lead || {};
  const emailData = _b.email || {};
  const email = String(emailData.to || lead.email || lead.Email || _b.leadEmail || '').trim();
  const name = String(lead.name || lead.full_name || lead.firstName || _b.leadName || 'there').trim();
  const brand = String(lead.brand || lead.Brand || _b.brand || '').trim();
  if (!email || !brand) {
    throw new Error('Custom mail needs a lead email and brand');
  }
  return [{
    json: {
      Email: email,
      Brand: brand,
      Industry: lead.industry || lead.Industry || 'D2C',
      Subject: emailData.subject || '',
      full_name: name,
      first_name: name,
      First_Name: name,
      Stage: 0,
      opens: 0,
      clicks: 0,
      trigger_reason: 'Manual follow-up from Dashboard',
      lastTimestamp: '',
      custom_html: emailData.html || ''
    }
  }];
}

let rules = {
  minOpens: 3,
  includeClicked: true,
  minClicks: 1,
  matchMode: 'or', // 'or' | 'and' (qualifies if clicked >= 1 time OR opened >= 3 times)
  excludeAlreadyContacted: true,
  deduplicateByEmail: true,
  filterByIndustry: false,
  industryFilterMode: 'include',
  selectedIndustries: [],
  filterByDate: false,
  dateFrom: '',
  dateTo: ''
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
  const q = triggerBody.qualification;
  rules = {
    ...rules,
    ...q,
    minOpens: Number(q.minOpens ?? rules.minOpens),
    minClicks: Number(q.minClicks ?? rules.minClicks),
    includeClicked: q.includeClicked !== false,
    matchMode: q.matchMode === 'and' ? 'and' : 'or',
    excludeAlreadyContacted: q.excludeAlreadyContacted !== false,
    deduplicateByEmail: q.deduplicateByEmail !== false,
    filterByIndustry: Boolean(q.filterByIndustry),
    industryFilterMode: q.industryFilterMode === 'exclude' ? 'exclude' : 'include',
    selectedIndustries: Array.isArray(q.selectedIndustries) ? q.selectedIndustries : [],
    filterByDate: Boolean(q.filterByDate),
    dateFrom: String(q.dateFrom || '').trim(),
    dateTo: String(q.dateTo || '').trim()
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
  };

  masterNameMap[emailVal] = fullNameVal;
  masterBrandMap[emailVal] = brandVal;
  masterLeadMap[emailVal] = normalizedLead;
}

// 2. Exclude ANY lead already present in Automation response (drafted, pending, or sent)
const existingResponseEmails = new Set();
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
    const row = item.json || {};
    let rowEmail = '';
    if (row.Email && String(row.Email).includes('@')) rowEmail = String(row.Email).trim().toLowerCase();
    else if (row.email && String(row.email).includes('@')) rowEmail = String(row.email).trim().toLowerCase();
    else if (row['Lead Email'] && String(row['Lead Email']).includes('@')) rowEmail = String(row['Lead Email']).trim().toLowerCase();
    
    if (!rowEmail) {
      for (const v of Object.values(row)) {
        const s = String(v || '').trim();
        if (s.includes('@') && s.includes('.')) {
          rowEmail = s.toLowerCase();
          break;
        }
      }
    }
    if (rowEmail) {
      existingResponseEmails.add(rowEmail);
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
    cleanName = cleanName.split(/[ ._-]/)[0].replace(/\d+/g, '');
  }
  if (!cleanName) cleanName = 'Friend';
  return cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
}

// Helper to parse dates from various formats (e.g. '22/9/2026, 04:10', ISO, etc.)
function parseTimestamp(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  const s = String(raw).trim();
  if (!s) return null;

  // D/M/YYYY or DD/MM/YYYY with optional time, e.g. "22/9/2026, 04:10" or "22/09/2026"
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const parsed = new Date(year, month, day, hour, minute, second);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;
  return null;
}

function isWithinDateRange(rawTs, fromStr, toStr) {
  if (!fromStr && !toStr) return true;
  const ts = parseTimestamp(rawTs);
  if (!ts) return false;

  if (fromStr) {
    const fParts = fromStr.split('-');
    if (fParts.length === 3) {
      const fromDate = new Date(parseInt(fParts[0], 10), parseInt(fParts[1], 10) - 1, parseInt(fParts[2], 10), 0, 0, 0, 0);
      if (ts < fromDate) return false;
    }
  }
  if (toStr) {
    const tParts = toStr.split('-');
    if (tParts.length === 3) {
      const toDate = new Date(parseInt(tParts[0], 10), parseInt(tParts[1], 10) - 1, parseInt(tParts[2], 10), 23, 59, 59, 999);
      if (ts > toDate) return false;
    }
  }
  return true;
}

function matchesIndustryFilter(rawIndustry, selectedIndustries, mode) {
  if (!selectedIndustries || selectedIndustries.length === 0) return true;
  const cleanLead = String(rawIndustry || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanLead) {
    const hasGeneral = selectedIndustries.some(i => {
      const c = i.toLowerCase().replace(/[^a-z0-9]/g, '');
      return c.includes('general') || c.includes('d2c');
    });
    return mode === 'exclude' ? !hasGeneral : hasGeneral;
  }

  const matched = selectedIndustries.some(ind => {
    const cleanFilter = ind.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanFilter === cleanLead || cleanLead.includes(cleanFilter) || cleanFilter.includes(cleanLead);
  });

  return mode === 'exclude' ? !matched : matched;
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

// 5. PRIORITY B: Tracking events from Google Sheets Tracking tab
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
  if (rules.excludeAlreadyContacted && existingResponseEmails.has(email)) continue;

  // DATE DURATION FILTER: Only count tracking events within specified date duration
  if (rules.filterByDate && (rules.dateFrom || rules.dateTo)) {
    const tsVal = row.Timestamp || row.timestamp || '';
    if (!isWithinDateRange(tsVal, rules.dateFrom, rules.dateTo)) {
      continue;
    }
  }

  if (!aggregatedLeads[email]) {
    const masterLead = masterLeadMap[email] || {};
    const rawResolvedName = masterNameMap[email] || row.Name || row['Full Name'] || '';
    const realFirstName = extractRealFirstName(rawResolvedName, rawEmail);
    const fullName = rawResolvedName && rawResolvedName.toLowerCase() !== 'there' ? rawResolvedName : realFirstName;

    let brandName = String(row.Brand || row.brand || masterBrandMap[email] || masterLead.Brand || '').trim();
    if (!brandName) {
      const domain = (rawEmail.split('@')[1] || '').split('.')[0];
      if (domain && !['gmail', 'yahoo', 'hotmail', 'outlook', 'icloud', 'protonmail'].includes(domain.toLowerCase())) {
        brandName = domain.charAt(0).toUpperCase() + domain.slice(1);
      } else {
        brandName = 'Your Brand';
      }
    }

    const industryVal = row.Industry || row.industry || masterLead.Industry || 'D2C';
    const defaultSubject = \`You were curious. So we got to work. Here's \${brandName}'s entire AI ops layer.\`;

    aggregatedLeads[email] = {
      ...masterLead,
      ...row,
      Email: rawEmail,
      email: rawEmail,
      Brand: brandName,
      brand: brandName,
      Industry: industryVal,
      industry: industryVal,
      Subject: row.Subject || defaultSubject,
      subject: row.Subject || defaultSubject,
      full_name: fullName,
      first_name: realFirstName,
      First_Name: realFirstName,
      Name: fullName,
      name: fullName,
      Stage: 1,
      opens: 0,
      clicks: 0,
      lastTimestamp: row.Timestamp || ''
    };
  }

  const event = String(row.Event || row.event || '').trim().toUpperCase();
  if (event.includes('CLICK')) {
    aggregatedLeads[email].clicks += 1;
  } else if (event.includes('OPEN')) {
    aggregatedLeads[email].opens += 1;
  }

  if (row.Timestamp) {
    aggregatedLeads[email].lastTimestamp = row.Timestamp;
  }
}

const qualified = [];
for (const email in aggregatedLeads) {
  const lead = aggregatedLeads[email];
  if (!lead.Brand) continue;

  // INDUSTRY FILTER: Check if lead's industry is included or excluded
  if (rules.filterByIndustry && rules.selectedIndustries && rules.selectedIndustries.length > 0) {
    const leadInd = lead.Industry || lead.industry || 'D2C-General';
    if (!matchesIndustryFilter(leadInd, rules.selectedIndustries, rules.industryFilterMode)) {
      continue;
    }
  }

  const meetsOpens = lead.opens >= rules.minOpens;
  const meetsClicks = rules.includeClicked && (lead.clicks >= rules.minClicks);

  let isQualified = false;
  let triggerReason = '';

  if (rules.matchMode === 'and') {
    isQualified = meetsOpens && meetsClicks;
    if (isQualified) triggerReason = \`Clicked CTA (\${lead.clicks} clicks) & Opened \${lead.opens} times\`;
  } else {
    // 'or' mode (qualifies if clicked >= minClicks OR opened >= minOpens)
    if (meetsClicks) {
      triggerReason = \`Clicked CTA (\${lead.clicks} clicks, \${lead.opens} opens)\`;
      isQualified = true;
    } else if (meetsOpens) {
      triggerReason = \`Opened \${lead.opens} times (min \${rules.minOpens})\`;
      isQualified = true;
    }
  }

  if (isQualified && triggerReason) {
    if (rules.filterByDate && (rules.dateFrom || rules.dateTo)) {
      triggerReason += \` [Date: \${rules.dateFrom || 'start'} to \${rules.dateTo || 'end'}]\`;
    }
    lead.trigger_reason = triggerReason;
    qualified.push({ json: lead });
  }
}

// CRITICAL: Prioritize ALL Clicked leads first!
// Then sort by opens descending, then recent timestamp descending
qualified.sort((a, b) => {
  const aClicks = Number(a.json.clicks || 0);
  const bClicks = Number(b.json.clicks || 0);
  if (bClicks !== aClicks) {
    return bClicks - aClicks; // Clicks first!
  }
  const aOpens = Number(a.json.opens || 0);
  const bOpens = Number(b.json.opens || 0);
  if (bOpens !== aOpens) {
    return bOpens - aOpens; // Higher opens next!
  }
  return String(b.json.lastTimestamp || '').localeCompare(String(a.json.lastTimestamp || ''));
});

// Return all qualified leads without dropping clicked ones (default limit 100)
const maxLimit = Number(triggerBody?.limit || 100);
return qualified.slice(0, maxLimit);
`;
