import {
  IndustryTemplateItem,
  IndustryType,
  DEFAULT_INDUSTRY_TEMPLATES,
  INDUSTRY_LIST,
  matchIndustrySegment,
  getStarterIndustryTemplate,
} from "./industry-template-presets";

export {
  type IndustryTemplateItem,
  type IndustryType,
  DEFAULT_INDUSTRY_TEMPLATES,
  INDUSTRY_LIST,
  matchIndustrySegment,
  getStarterIndustryTemplate,
};

export interface EmailTemplateConfig {
  subject: string;
  bodyHtml: string;
  signatureHtml: string;
  callUrl: string;
  callButtonText?: string;
  whatsappUrl?: string;
  whatsappText?: string;
  senderName: string;
  senderEmail: string;
  selectedIndustry?: string;
  customIndustries?: string[];
  industryTemplates?: Record<string, { subject: string; bodyHtml: string }>;
}

export const DEFAULT_EMAIL_BODY_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.55; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  The part that compounds that at this stage is the ops layer underneath, and <b>in 2026 that's exactly where AI should be doing the heavy lifting.</b> Most D2C tools are horizontal, built for every brand and optimised for none. What we build is vertical: an infrastructure designed specifically around how {{brand}} acquires, converts, and retains. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a platform. Not generic automation. A system.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}} specifically, the agents, how they connect, and what each one runs. Worth 20 minutes to see what this would look like for {{brand}}? No pitch, no deck, just what we'd fix first. Book a slot or shoot a text if you have any questions.<br><br>
  <!-- CTA Buttons -->
  <table border="0" cellpadding="0" cellspacing="0" style="margin: 18px 0 16px 0;">
    <tr>
      <td style="padding-right: 12px; padding-bottom: 8px;">
        <a href="{{call_url}}" style="display: inline-block; background-color: #581c87; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-weight: 700; font-size: 14px; line-height: 1.2; text-align: center;">Book a Free Call</a>
      </td>
      <td style="padding-bottom: 8px;">
        <a href="{{whatsapp_url}}" style="display: inline-block; background-color: #25D366; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 6px; font-weight: 700; font-size: 14px; line-height: 1.2; text-align: center;">Text me on WhatsApp</a>
      </td>
    </tr>
  </table>
</div>`;

export const DEFAULT_EMAIL_SIGNATURE_HTML = `<div style="margin-top: 22px; line-height: 1.45; font-size: 13px; color: #374151;">
  <div style="margin-bottom: 4px;">Best,</div>
  <div style="margin-bottom: 14px; font-weight: 600; color: #111827;">Kashika Gupta</div>
  <div style="border-left: 2px solid #7c3aed; padding-left: 10px; margin-bottom: 18px;">
    <div style="color: #6d28d9; font-weight: 600; font-size: 13px;">Co-Founder, GrapeLabs AI</div>
    <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">Green Park, New Delhi · 110016</div>
    <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">Phone: +91 83888 92300</div>
  </div>
  <div style="font-size: 12px; color: #6b7280; font-style: italic;">
    P.S. The irony isn't lost on us. We used our own infrastructure to find you, track your open, and send you this.
  </div>
</div>`;

const defaultIndustryTemplatesMap: Record<string, { subject: string; bodyHtml: string }> = {};
for (const [key, val] of Object.entries(DEFAULT_INDUSTRY_TEMPLATES)) {
  defaultIndustryTemplatesMap[key] = {
    subject: val.subject,
    bodyHtml: val.bodyHtml,
  };
}

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplateConfig = {
  subject: "You were curious. So we got to work. Here's {{brand}}'s entire AI ops layer.",
  bodyHtml: DEFAULT_EMAIL_BODY_HTML,
  signatureHtml: DEFAULT_EMAIL_SIGNATURE_HTML,
  callUrl: "https://calendly.com/team-grapelabs/30min",
  callButtonText: "Book a Free Call",
  whatsappUrl: "https://wa.me/918388892300?text=Hi%20Kashika,%20saw%20your%20email%20about%20our%20AI%20ops%20layer",
  whatsappText: "Text me on WhatsApp",
  senderName: "Kashika Gupta",
  senderEmail: "team@grapelabs.in",
  selectedIndustry: "D2C-Apparel",
  customIndustries: [],
  industryTemplates: defaultIndustryTemplatesMap,
};
