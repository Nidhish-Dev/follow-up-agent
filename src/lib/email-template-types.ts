export interface EmailTemplateConfig {
  subject: string;
  bodyHtml: string;
  signatureHtml: string;
  callUrl: string;
  senderName: string;
  senderEmail: string;
}

export const DEFAULT_EMAIL_BODY_HTML = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #111827;">
  Hi {{first_name}},<br><br>
  {{achievement_hook}} <b>{{hook_closer}}</b><br><br>
  The part that compounds that at this stage is the ops layer underneath, and <b>in 2026 that's exactly where AI should be doing the heavy lifting.</b> Most D2C tools are horizontal, built for every brand and optimised for none. What we build is vertical: an infrastructure designed specifically around how {{brand}} acquires, converts, and retains. {{vertical_focus}} <b>The agents we'd build reflect that.</b><br><br>
  <b>Not a platform. Not generic automation. A system.</b><br><br>
  I've attached a visual of what that infrastructure looks like for {{brand}} specifically, the agents, how they connect, and what each one runs. If this resonates, reply here or book a call and we'll walk you through it- <a href="{{call_url}}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">Book a Free Call</a>
</div>`;

export const DEFAULT_EMAIL_SIGNATURE_HTML = `<div style="margin-top: 22px; line-height: 1.45; font-size: 13px; color: #374151;">
  <div style="margin-bottom: 4px;">Best,</div>
  <div style="margin-bottom: 14px; font-weight: 600; color: #111827;">Nidhish Rathore</div>
  <div style="border-left: 2px solid #7c3aed; padding-left: 10px; margin-bottom: 18px;">
    <div style="color: #6d28d9; font-weight: 600; font-size: 13px;">Co-Founder, GrapeLabs AI</div>
    <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">Green Park, New Delhi · 110016</div>
    <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">Phone: +91 83888 92390</div>
  </div>
  <div style="font-size: 12px; color: #6b7280; font-style: italic;">
    P.S. The irony isn't lost on us. We used our own infrastructure to find you, track your open, and send you this.
  </div>
</div>`;

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplateConfig = {
  subject: "You were curious. So we got to work. Here's {{brand}}'s entire AI ops layer.",
  bodyHtml: DEFAULT_EMAIL_BODY_HTML,
  signatureHtml: DEFAULT_EMAIL_SIGNATURE_HTML,
  callUrl: "https://calendly.com/team-grapelabs/30min",
  senderName: "Nidhish Rathore",
  senderEmail: "team@grapelabs.in",
};
