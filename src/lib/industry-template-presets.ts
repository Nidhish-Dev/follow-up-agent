export interface IndustryTemplateItem {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  sampleBrand: string;
  sampleName: string;
  sampleEmail: string;
  sampleHook: string;
  sampleCloser: string;
  sampleVerticalFocus: string;
}

export const INDUSTRY_LIST = [
  "D2C-Apparel",
  "Hospitality",
  "Travel",
  "Fitness",
  "Health",
  "Real Estate",
  "Marketing Agency",
  "D2C-Beauty",
  "D2C-Food&Beverage",
  "D2C-Wellness",
  "D2C-HomeGoods",
  "D2C-General",
] as const;

export type IndustryType = (typeof INDUSTRY_LIST)[number];

const CTA_BUTTON_SNIPPET = `<!-- CTA Buttons -->
<table border="0" cellpadding="0" cellspacing="0" style="margin: 18px 0 16px 0;">
  <tr>
    <td style="padding-right: 12px; padding-bottom: 8px;">
      <a href="{{call_url}}" style="display: inline-block; background-color: #581c87; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-weight: 700; font-size: 14px; line-height: 1.2; text-align: center;">Book a Free Call</a>
    </td>
    <td style="padding-bottom: 8px;">
      <a href="{{whatsapp_url}}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-weight: 700; font-size: 14px; line-height: 1.2; text-align: center;">Text me on WhatsApp</a>
    </td>
  </tr>
</table>`;

export const DEFAULT_INDUSTRY_TEMPLATES: Record<string, IndustryTemplateItem> = {
  "D2C-Apparel": {
    id: "D2C-Apparel",
    name: "D2C-Apparel",
    subject: "You were curious. So we got to work. Here's {{brand}}'s entire AI ops layer.",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  In apparel & fashion, scaling drops and collection turnarounds eats up margins unless the ops layer runs autonomously. <b>In 2026, that's exactly where vertical AI compounds revenue.</b> Most D2C tools are generic. What we build is tailored around how {{brand}} acquires lookbook traffic, solves sizing-fit hesitation, and recovers abandoned carts with tailored AI stylists. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a platform. Not generic automation. A system.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}} specifically—the apparel agents, how sizing data syncs, and inventory triggers. Worth 20 minutes to see what this would look like for {{brand}}? No pitch, no deck, just what we'd fix first. Book a slot or shoot a text if you have any questions.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "AllStar Athletics",
    sampleName: "Alex",
    sampleEmail: "alex@allstarathletics.com",
    sampleHook: "AllStar Athletics has built a cult-like community around its technical running gear that customers keep reordering every drop.",
    sampleCloser: "That's the hard part, and it's already done.",
    sampleVerticalFocus: "Direct-to-consumer apparel drops, size recommendation accuracy, and creator-led lookbook conversions.",
  },

  "Hospitality": {
    id: "Hospitality",
    name: "Hospitality",
    subject: "How {{brand}} can automate guest concierge & direct bookings with AI",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  In hospitality, OTA commissions and slow guest response times drain bottom-line margin. <b>In 2026, autonomous vertical AI turns guest inquiries into direct high-margin bookings.</b> What we build is designed specifically around {{brand}}'s guest journey: 24/7 intelligent reservation concierges, automated pre-arrival preferences, and AI room upsells that don't sound robotic. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a generic chatbot. Not bloated PMS software. An autonomous ops system.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}} specifically—the booking agents, guest check-in automation, and revenue recapture flows. Worth 20 minutes to see what this looks like for {{brand}}? No pitch, no deck, just what we'd fix first.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "The Grand Pavilion",
    sampleName: "Claire",
    sampleEmail: "claire@grandpavilion.com",
    sampleHook: "The Grand Pavilion delivers an exquisite boutique experience that earns stellar reviews across every stay.",
    sampleCloser: "Guest satisfaction is top-tier; now the ops engine drives direct bookings.",
    sampleVerticalFocus: "Direct booking recapture, VIP pre-arrival concierges, and automated guest preference profiling.",
  },

  "Travel": {
    id: "Travel",
    name: "Travel",
    subject: "Automating {{brand}}'s itinerary booking & traveler support with AI",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  Travel operators spend hundreds of manual hours quoting custom itineraries and responding to repetitive travel logistics. <b>In 2026, AI should handle custom quote generation and traveler ops in seconds.</b> What we build is vertical: an intelligent travel ops layer designed around {{brand}}'s unique destinations, packaging flights, excursions, and automated WhatsApp/email traveler dispatch. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a generic booking engine. A full AI ops architecture.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}}—how the travel agents connect, parse traveler inquiries, and sync booking inventory. Worth 20 minutes to see what this looks like for {{brand}}? Book a slot or text me directly.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Nomad Expeditions",
    sampleName: "Liam",
    sampleEmail: "liam@nomadexpe.com",
    sampleHook: "Nomad Expeditions curates unforgettable travel adventures that have built an enviable word-of-mouth traveler network.",
    sampleCloser: "You've nailed the curation; now autonomous systems can 5x quote velocity.",
    sampleVerticalFocus: "Instant dynamic itinerary builders, 24/7 on-trip assistance agents, and repeat group rebooking triggers.",
  },

  "Fitness": {
    id: "Fitness",
    name: "Fitness",
    subject: "Member retention & trial conversions for {{brand}} powered by AI ops",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  Fitness businesses bleed member LTV between trial drop-off and month 3 churn. <b>In 2026, predictive AI ops is how studios and brands keep members showing up and renewing.</b> We build a vertical system engineered around {{brand}}'s member experience: automated trial show-up incentives, churn-risk alerts, and personalized workout check-ins that feel personal. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not another fitness CRM. A real AI operations engine.</b><br><br>
  I've attached a visual map showing {{brand}}'s member lifecycle agents, booking triggers, and retention loops. Worth 20 minutes to see what this would look like for {{brand}}? No pitch, no deck, just what we'd fix first.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Apex Performance Labs",
    sampleName: "Jordan",
    sampleEmail: "jordan@apexperf.com",
    sampleHook: "Apex Performance Labs has engineered high-energy training regimes that members swear by.",
    sampleCloser: "Member loyalty in the facility is undeniable; ops automation scales that beyond the floor.",
    sampleVerticalFocus: "Intro trial show-rate boosters, member churn-risk early warning agents, and automated class pack renewals.",
  },

  "Health": {
    id: "Health",
    name: "Health",
    subject: "Streamlining patient intake & care ops for {{brand}} with secure AI",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  Healthcare providers and modern health brands lose countless clinical hours to manual intake, schedule juggling, and follow-up care compliance. <b>In 2026, autonomous vertical AI handles routine patient coordination seamlessly.</b> What we build is designed specifically around {{brand}}'s care flows: smart intake triage, post-appointment follow-up adherence, and appointment reminder sequences that eliminate no-shows. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not generic automation. A secure, vertical health operations system.</b><br><br>
  I've attached a visual blueprint of what that infrastructure looks like for {{brand}} specifically—how the intake and triage agents connect with clinical calendars. Worth 20 minutes to see what we'd build first? Book a slot or text me below.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Nova Health Clinic",
    sampleName: "Dr. Rachel",
    sampleEmail: "rachel@novahealth.com",
    sampleHook: "Nova Health Clinic has established outstanding patient trust through evidence-based, compassionate care.",
    sampleCloser: "Clinical excellence is proven; autonomous ops can now eliminate the admin overhead.",
    sampleVerticalFocus: "Pre-visit digital intake, automated lab review notifications, and treatment adherence reminders.",
  },

  "Real Estate": {
    id: "Real Estate",
    name: "Real Estate",
    subject: "Speed-to-lead & automated buyer qualification for {{brand}} with AI",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  In real estate, 78% of buyers work with the agent or firm that responds in under 5 minutes. <b>In 2026, autonomous AI qualifies inbound buyer/seller leads and schedules showings 24/7.</b> What we build is engineered for {{brand}}: instant lead qualification based on budget/timeline, automated MLS matching, and calendar booking directly with your top agents. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a generic chatbot. A full real estate lead-to-showing operations engine.</b><br><br>
  I've attached a visual diagram of what this ops layer looks like for {{brand}}—how the qualification agents route leads and sync showings. Worth 20 minutes to see what this would look like for {{brand}}? Book a slot or shoot a text below.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Vanguard Realty Group",
    sampleName: "Ethan",
    sampleEmail: "ethan@vanguardre.com",
    sampleHook: "Vanguard Realty Group consistently secures premier luxury listings and closes landmark transactions.",
    sampleCloser: "Your deal closing velocity is top tier; now AI guarantees zero inbound leads slip through.",
    sampleVerticalFocus: "Sub-minute lead intake, automated mortgage pre-qualification filters, and VIP showing coordinators.",
  },

  "Marketing Agency": {
    id: "Marketing Agency",
    name: "Marketing Agency",
    subject: "Scaling client deliverables & reporting for {{brand}} with AI Ops",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  Agency headcount and repetitive client reporting choke agency profitability as you scale past 20+ retainers. <b>In 2026, agencies shouldn't have account managers manually pulling spreadsheets.</b> What we build is a vertical agency ops layer designed for {{brand}}: automated multi-channel reporting summaries, proactive client health monitors, and creative briefing workflows. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a generic SaaS tool. An end-to-end AI operations backbone.</b><br><br>
  I've attached a visual architecture diagram of what that agency ops engine looks like for {{brand}}—how reporting and account agents connect. Worth 20 minutes to explore what we'd build for {{brand}}? Book a slot or text me below.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Apex Growth Agency",
    sampleName: "Daniel",
    sampleEmail: "daniel@apexgrowth.agency",
    sampleHook: "Apex Growth Agency has driven game-changing ROAS and acquisition metrics across its brand portfolio.",
    sampleCloser: "Your client wins speak for themselves; now backend AI ops preserves your retainer margins.",
    sampleVerticalFocus: "Automated executive client performance reporting, retainer churn-risk alerts, and creative asset workflow sync.",
  },

  "D2C-Beauty": {
    id: "D2C-Beauty",
    name: "D2C-Beauty",
    subject: "You were curious. So we got to work. Here's {{brand}}'s entire AI ops layer.",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  In clean beauty and skincare, customer LTV is decided by shade-matching confidence and automated replenishment cadence. <b>In 2026, vertical AI is how top beauty brands drive 40%+ repeat purchase rates.</b> What we build is engineered around {{brand}}'s formulations: automated skin routine personalization, predictive re-order triggers before bottles empty, and AI ingredient advisors. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a platform. Not generic automation. A system.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}} specifically—the beauty agents, replenishment triggers, and customer retention loops. Worth 20 minutes to see what this would look like for {{brand}}? Book a slot or text me if you have any questions.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Lumina Skincare",
    sampleName: "Sophia",
    sampleEmail: "sophia@luminaskin.co",
    sampleHook: "Lumina has achieved viral retention across its microbiome barrier serums with over 42% repeat purchase velocity.",
    sampleCloser: "Building true organic product love is the rare feat, and you've nailed it.",
    sampleVerticalFocus: "Routine personalization quiz flows, predictive auto-replenishment, and post-purchase ingredient onboarding.",
  },

  "D2C-Food&Beverage": {
    id: "D2C-Food&Beverage",
    name: "D2C-Food&Beverage",
    subject: "Here's {{brand}}'s subscription & reorder AI operations layer",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  In food & beverage, inventory expiry and subscription churn make or break unit economics. <b>In 2026, vertical AI should predict pantry restocks and handle subscription swaps seamlessly.</b> What we build is designed specifically around how customers consume {{brand}}: intelligent box customization, pre-shipment SMS replenishment, and localized fulfillment routing. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not generic automation. A vertical D2C food & bev engine.</b><br><br>
  I've attached a visual showing {{brand}}'s AI ops infrastructure—how the reorder agents and supply chains connect. Worth 20 minutes to see what this would look like for {{brand}}? No pitch, no deck, just what we'd fix first.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Peak Coffee Roasters",
    sampleName: "Marcus",
    sampleEmail: "marcus@peakcoffee.com",
    sampleHook: "Peak Coffee has carved out a fiercely loyal following among specialty single-origin subscription roasters.",
    sampleCloser: "Product excellence is proven; now the ops engine accelerates reorders.",
    sampleVerticalFocus: "Subscription flavor swaps, pantry restock cadence predictions, and roast-date dispatch tracking workflows.",
  },

  "D2C-Wellness": {
    id: "D2C-Wellness",
    name: "D2C-Wellness",
    subject: "How {{brand}} can 2x subscriber LTV with AI ops",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  Wellness and supplement brands thrive when customers actually build daily habits with the product. <b>In 2026, that habit loop should be powered by proactive vertical AI.</b> We build a specialized infrastructure around {{brand}}: AI habit coaching check-ins, automated dosage guidance, and timely replenishment cycles that keep subscribers active. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a generic platform. An autonomous wellness ops system.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}} specifically—the habit agents, subscription triggers, and retention loops. Worth 20 minutes to see what this would look like for {{brand}}? Book a slot or shoot a text below.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Aura Adaptogens",
    sampleName: "Maya",
    sampleEmail: "maya@auraadaptogens.com",
    sampleHook: "Aura Adaptogens has cultivated a dedicated wellness community that swears by its functional daily blends.",
    sampleCloser: "You've built genuine community trust; now AI ops protects customer LTV.",
    sampleVerticalFocus: "Daily habit reinforcement SMS flows, supplement replenishment timing, and personalized bundle upsells.",
  },

  "D2C-HomeGoods": {
    id: "D2C-HomeGoods",
    name: "D2C-HomeGoods",
    subject: "Scaling order ops & high-ticket conversions for {{brand}} with AI",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  In home decor, furniture, and kitchenware, high AOV leads to long buyer consideration cycles and heavy post-purchase delivery inquiries. <b>In 2026, vertical AI should assist high-ticket buyers and handle delivery logistics automatically.</b> What we build is designed for {{brand}}: room-style recommendation agents, automated delivery tracking updates, and warranty/care onboarding. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not generic automation. A tailored home goods AI system.</b><br><br>
  I've attached a diagram showing what this infrastructure looks like for {{brand}} specifically—how the buyer assistance and logistics agents sync. Worth 20 minutes to explore what we'd build for {{brand}}? Book a call or text below.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Haven Living",
    sampleName: "Oliver",
    sampleEmail: "oliver@havenliving.co",
    sampleHook: "Haven Living has mastered modern aesthetic craftsmanship that transforms homes across the country.",
    sampleCloser: "Design and craftsmanship speak for themselves; now AI ops accelerates high-ticket conversions.",
    sampleVerticalFocus: "High-AOV styling guidance, freight delivery status tracking agents, and product care onboarding.",
  },

  "D2C-General": {
    id: "D2C-General",
    name: "D2C-General",
    subject: "You were curious. So we got to work. Here's {{brand}}'s entire AI ops layer.",
    bodyHtml: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  The part that compounds that at this stage is the ops layer underneath, and <b>in 2026 that's exactly where AI should be doing the heavy lifting.</b> Most D2C tools are horizontal, built for every brand and optimised for none. What we build is vertical: an infrastructure designed specifically around how {{brand}} acquires, converts, and retains. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a platform. Not generic automation. A system.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}} specifically, the agents, how they connect, and what each one runs. Worth 20 minutes to see what this would look like for {{brand}}? No pitch, no deck, just what we'd fix first. Book a slot or shoot a text if you have any questions.<br><br>
  ${CTA_BUTTON_SNIPPET}
</div>`,
    sampleBrand: "Venture Goods",
    sampleName: "Sam",
    sampleEmail: "sam@venturegoods.co",
    sampleHook: "Venture Goods has built a remarkable direct-to-consumer footprint with an engaged audience.",
    sampleCloser: "That's the hard part, and it's already done.",
    sampleVerticalFocus: "Direct-to-consumer acquisition, community-driven repeat purchase, and vertical ops infrastructure.",
  },
};

/**
 * Normalizes any freeform industry name from Google Sheets or CRM
 * to one of the 12 predefined segments.
 */
export function matchIndustrySegment(rawIndustry?: string): IndustryType {
  const norm = String(rawIndustry || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  if (!norm) return "D2C-General";

  if (norm.includes("apparel") || norm.includes("fashion") || norm.includes("clothing") || norm.includes("wear")) {
    return "D2C-Apparel";
  }
  if (norm.includes("hospitality") || norm.includes("hotel") || norm.includes("resort") || norm.includes("lodge")) {
    return "Hospitality";
  }
  if (norm.includes("travel") || norm.includes("tour") || norm.includes("expedition") || norm.includes("trip")) {
    return "Travel";
  }
  if (norm.includes("fitness") || norm.includes("gym") || norm.includes("workout") || norm.includes("crossfit")) {
    return "Fitness";
  }
  if (norm.includes("health") || norm.includes("clinic") || norm.includes("medical") || norm.includes("doctor") || norm.includes("dental") || norm.includes("pharma")) {
    return "Health";
  }
  if (norm.includes("realestate") || norm.includes("realty") || norm.includes("property") || norm.includes("brokerage") || norm.includes("realtor")) {
    return "Real Estate";
  }
  if (norm.includes("agency") || norm.includes("marketing") || norm.includes("advertising") || norm.includes("media") || norm.includes("creative")) {
    return "Marketing Agency";
  }
  if (norm.includes("beauty") || norm.includes("cosmetic") || norm.includes("skincare") || norm.includes("makeup") || norm.includes("haircare")) {
    return "D2C-Beauty";
  }
  if (norm.includes("food") || norm.includes("beverage") || norm.includes("coffee") || norm.includes("tea") || norm.includes("drink") || norm.includes("snack") || norm.includes("bakery")) {
    return "D2C-Food&Beverage";
  }
  if (norm.includes("wellness") || norm.includes("supplement") || norm.includes("vitamin") || norm.includes("nutrition") || norm.includes("mental")) {
    return "D2C-Wellness";
  }
  if (norm.includes("home") || norm.includes("furniture") || norm.includes("decor") || norm.includes("kitchen") || norm.includes("bedding") || norm.includes("goods")) {
    return "D2C-HomeGoods";
  }
  if (norm.includes("d2c") || norm.includes("ecommerce") || norm.includes("retail")) {
    return "D2C-General";
  }

  return "D2C-General";
}
