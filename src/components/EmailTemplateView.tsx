"use client";
import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import {
  Mail,
  Save,
  RotateCcw,
  Code2,
  Monitor,
  Smartphone,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  LoaderCircle,
  Info,
  CheckCircle,
  FileCode,
} from "lucide-react";
import {
  EmailTemplateConfig,
  DEFAULT_EMAIL_TEMPLATE,
  DEFAULT_EMAIL_BODY_HTML,
  DEFAULT_EMAIL_SIGNATURE_HTML,
} from "@/lib/email-template-types";

interface SampleLead {
  id: string;
  name: string;
  brand: string;
  industry: string;
  email: string;
  hook: string;
  closer: string;
  verticalFocus: string;
}

const SAMPLE_LEADS: SampleLead[] = [
  {
    id: "sample-1",
    name: "Alex",
    brand: "AllStar Athletics",
    industry: "D2C Technical Apparel",
    email: "alex@allstarathletics.com",
    hook: "AllStar Athletics has built a cult-like community around its technical running gear that customers keep reordering every drop.",
    closer: "That's the hard part, and it's already done.",
    verticalFocus: "Direct-to-consumer acquisition, community-driven repeat purchase, and creator-led trust cycles.",
  },
  {
    id: "sample-2",
    name: "Sophia",
    brand: "Lumina Skincare",
    industry: "Clean Beauty & Barrier Care",
    email: "sophia@luminaskin.co",
    hook: "Lumina has achieved viral retention across its microbiome barrier serums with over 42% repeat purchase velocity.",
    closer: "Building true organic product love is the rare feat, and you've nailed it.",
    verticalFocus: "Subscription auto-replenishment, routine personalization quiz flows, and post-purchase onboarding.",
  },
  {
    id: "sample-3",
    name: "Marcus",
    brand: "Peak Coffee Roasters",
    industry: "Artisan Coffee Subscription",
    email: "marcus@peakcoffee.com",
    hook: "Peak Coffee has carved out a fiercely loyal following among specialty single-origin subscription roasters.",
    closer: "Product excellence is proven, now the ops engine accelerates it.",
    verticalFocus: "Wholesale re-orders, tier loyalty perks, and roast-date dispatch tracking workflows.",
  },
];

const AVAILABLE_VARIABLES = [
  { tag: "{{first_name}}", label: "Recipient First Name", desc: "e.g. Alex" },
  { tag: "{{brand}}", label: "Brand Name", desc: "e.g. AllStar Athletics" },
  { tag: "{{achievement_hook}}", label: "AI Achievement Hook", desc: "Personalized brand praise" },
  { tag: "{{hook_closer}}", label: "Hook Closer (Bold)", desc: "e.g. That's the hard part..." },
  { tag: "{{vertical_focus}}", label: "Vertical Focus", desc: "Specific ops infrastructure focus" },
  { tag: "{{call_url}}", label: "Booking Link", desc: "Calendly tracking URL" },
  { tag: "{{whatsapp_url}}", label: "WhatsApp Link", desc: "WhatsApp direct chat URL" },
  { tag: "{{sender_name}}", label: "Sender Name", desc: "Kashika Gupta" },
];

export function EmailTemplateView({
  fbUser,
  setNotice,
}: {
  fbUser: User | null;
  setNotice: (n: any) => void;
}) {
  const [template, setTemplate] = useState<EmailTemplateConfig>(DEFAULT_EMAIL_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeLead, setActiveLead] = useState<SampleLead>(SAMPLE_LEADS[0]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"body" | "signature">("body");

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sigTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch saved template
  useEffect(() => {
    if (!fbUser) return;
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const token = await fbUser.getIdToken();
        const res = await fetch("/api/template", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.template) {
            setTemplate(data.template);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch email template:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [fbUser]);

  const saveTemplate = async () => {
    if (!fbUser) return;
    setSaving(true);
    try {
      const token = await fbUser.getIdToken();
      const res = await fetch("/api/template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(template),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save template");
      setTemplate(data.template);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("email-template-updated", { detail: data.template }));
      }
      setNotice({
        type: "success",
        text: "Email HTML template successfully saved! Outbound emails will use this template.",
      });
    } catch (err: any) {
      setNotice({
        type: "error",
        text: err?.message || "Failed to save email template.",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    if (confirm("Reset email template and signature back to default?")) {
      setTemplate(DEFAULT_EMAIL_TEMPLATE);
    }
  };

  const insertVariable = (tag: string) => {
    const targetRef = activeTab === "body" ? bodyTextareaRef : sigTextareaRef;
    const textarea = targetRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = activeTab === "body" ? template.bodyHtml : template.signatureHtml;
    const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end);

    if (activeTab === "body") {
      setTemplate((prev) => ({ ...prev, bodyHtml: newVal }));
    } else {
      setTemplate((prev) => ({ ...prev, signatureHtml: newVal }));
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Interpolate variables for preview
  const interpolate = (html: string, lead: SampleLead) => {
    return html
      .replace(/\{\{\s*first_name\s*\}\}/gi, lead.name)
      .replace(/\{\{\s*recipientName\s*\}\}/gi, lead.name)
      .replace(/\{\{\s*brand\s*\}\}/gi, lead.brand)
      .replace(/\{\{\s*achievement_hook\s*\}\}/gi, lead.hook)
      .replace(/\{\{\s*hook_closer\s*\}\}/gi, lead.closer)
      .replace(/\{\{\s*vertical_focus\s*\}\}/gi, lead.verticalFocus)
      .replace(/\{\{\s*call_url\s*\}\}/gi, template.callUrl || "https://calendly.com/team-grapelabs/30min")
      .replace(/\{\{\s*whatsapp_url\s*\}\}/gi, template.whatsappUrl || "https://wa.me/918388892390?text=Hi%20Kashika,%20saw%20your%20email")
      .replace(/\{\{\s*call_button_text\s*\}\}/gi, template.callButtonText || "Book a Free Call")
      .replace(/\{\{\s*whatsapp_text\s*\}\}/gi, template.whatsappText || "Text me on WhatsApp")
      .replace(/\{\{\s*sender_name\s*\}\}/gi, template.senderName || "Kashika Gupta");
  };

  const previewSubject = interpolate(template.subject, activeLead);
  const previewBody = interpolate(template.bodyHtml, activeLead);
  const previewSignature = interpolate(template.signatureHtml, activeLead);

  const copyFullHtml = () => {
    const combined = `${previewBody}\n\n<!-- Infrastructure Diagram -->\n<table border="0" cellpadding="0" cellspacing="0" style="margin: 18px 0 22px 0;"><tr><td><img src="https://lh3.googleusercontent.com/..." alt="${activeLead.brand} AI Ops Layer" width="600" style="width: 100%; max-width: 650px;" /></td></tr></table>\n\n${previewSignature}`;
    navigator.clipboard.writeText(combined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: "24px" }}>
      {/* Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          background: "#fff",
          padding: "16px 20px",
          borderRadius: "8px",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Mail size={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "16.5px", fontWeight: 700, color: "var(--ink)" }}>
              Outreach Email HTML Designer
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--muted)" }}>
              Customize the email copy, HTML markup, and signature sent to leads upon Telegram approval.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={resetToDefault}
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
            title="Reset HTML to default"
          >
            <RotateCcw size={13} />
            Reset to Default
          </button>

          <button
            type="button"
            onClick={copyFullHtml}
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
            title="Copy combined rendered HTML"
          >
            {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy Full HTML"}
          </button>

          <button
            type="button"
            className="save-button"
            style={{ background: "#2563eb", gap: "6px" }}
            onClick={saveTemplate}
            disabled={saving || loading}
          >
            {saving ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />}
            {saving ? "Saving Template..." : "Save Email HTML"}
          </button>
        </div>
      </div>

      {/* 2-Column Editor + Live Preview Grid */}
      <div className="email-editor-grid">
        {/* Left Column: Form & Code Editor */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* 1. Subject Line */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "18px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: "4px" }}>
              Email Subject Line
            </label>
            <span style={{ display: "block", fontSize: "11px", color: "var(--muted)", marginBottom: "8px" }}>
              Dynamic subject shown in the lead&apos;s inbox. Use <code>{"{{brand}}"}</code> to insert the brand.
            </span>
            <input
              type="text"
              value={template.subject}
              onChange={(e) => setTemplate((prev) => ({ ...prev, subject: e.target.value }))}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--ink)",
                background: "#fff",
              }}
            />
          </div>

          {/* 2. Sender & Call Booking Settings */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "18px" }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: "8px" }}>
              SENDER & BOOKING CALL DESTINATION
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Sender Name
                </label>
                <input
                  type="text"
                  value={template.senderName}
                  onChange={(e) => setTemplate((p) => ({ ...p, senderName: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Sender Email (Sending Address)
                </label>
                <input
                  type="email"
                  value={template.senderEmail}
                  onChange={(e) => setTemplate((p) => ({ ...p, senderEmail: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Calendly Link ({"{{call_url}}"})
                </label>
                <input
                  type="url"
                  value={template.callUrl}
                  onChange={(e) => setTemplate((p) => ({ ...p, callUrl: e.target.value }))}
                  placeholder="https://calendly.com/your-team/30min"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  Call Button Text (Purple CTA)
                </label>
                <input
                  type="text"
                  value={template.callButtonText || "Book a Free Call"}
                  onChange={(e) => setTemplate((p) => ({ ...p, callButtonText: e.target.value }))}
                  placeholder="Book a Free Call"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  WhatsApp Link / Chat URL ({"{{whatsapp_url}}"})
                </label>
                <input
                  type="text"
                  value={template.whatsappUrl || ""}
                  onChange={(e) => setTemplate((p) => ({ ...p, whatsappUrl: e.target.value }))}
                  placeholder="https://wa.me/918388892390?text=..."
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                  WhatsApp Button Text (Green CTA)
                </label>
                <input
                  type="text"
                  value={template.whatsappText || "Text me on WhatsApp"}
                  onChange={(e) => setTemplate((p) => ({ ...p, whatsappText: e.target.value }))}
                  placeholder="Text me on WhatsApp"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "12px",
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. HTML Markup Editor */}
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "8px", padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("body")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: activeTab === "body" ? "#2563eb" : "#cbd5e1",
                    background: activeTab === "body" ? "#eff6ff" : "#fff",
                    color: activeTab === "body" ? "#2563eb" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  Email Body HTML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("signature")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    border: "1px solid",
                    borderColor: activeTab === "signature" ? "#2563eb" : "#cbd5e1",
                    background: activeTab === "signature" ? "#eff6ff" : "#fff",
                    color: activeTab === "signature" ? "#2563eb" : "#475569",
                    cursor: "pointer",
                  }}
                >
                  Signature & Footer HTML
                </button>
              </div>

              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Click a variable below to insert:
              </span>
            </div>

            {/* Variable Insertion Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  className="variable-chip"
                  onClick={() => insertVariable(v.tag)}
                  title={`${v.label} (${v.desc})`}
                >
                  <span>{v.tag}</span>
                </button>
              ))}
            </div>

            {/* Body Editor */}
            {activeTab === "body" ? (
              <div>
                <textarea
                  ref={bodyTextareaRef}
                  value={template.bodyHtml}
                  onChange={(e) => setTemplate((p) => ({ ...p, bodyHtml: e.target.value }))}
                  rows={14}
                  style={{
                    width: "100%",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    padding: "12px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  spellCheck={false}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "var(--muted)" }}>
                  <span>Tip: Supports standard HTML tags: <code>&lt;b&gt;</code>, <code>&lt;a&gt;</code>, <code>&lt;br&gt;</code>, inline CSS styles.</span>
                  <button
                    type="button"
                    onClick={() => setTemplate((p) => ({ ...p, bodyHtml: DEFAULT_EMAIL_BODY_HTML }))}
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: "11px" }}
                  >
                    Restore default body
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <textarea
                  ref={sigTextareaRef}
                  value={template.signatureHtml}
                  onChange={(e) => setTemplate((p) => ({ ...p, signatureHtml: e.target.value }))}
                  rows={12}
                  style={{
                    width: "100%",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    padding: "12px",
                    background: "#0f172a",
                    color: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  spellCheck={false}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", fontSize: "11px", color: "var(--muted)" }}>
                  <span>Custom signature appended below the AI Architecture Diagram.</span>
                  <button
                    type="button"
                    onClick={() => setTemplate((p) => ({ ...p, signatureHtml: DEFAULT_EMAIL_SIGNATURE_HTML }))}
                    style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", textDecoration: "underline", fontSize: "11px" }}
                  >
                    Restore default signature
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Email Client Preview */}
        <div>
          <div className="email-preview-container">
            {/* Chrome Bar */}
            <div className="email-preview-chrome">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="chrome-dots">
                  <div className="chrome-dot red" />
                  <div className="chrome-dot yellow" />
                  <div className="chrome-dot green" />
                </div>
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--muted)" }}>
                  Gmail Preview
                </span>
              </div>

              {/* Persona Selector & Device Switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <select
                  value={activeLead.id}
                  onChange={(e) => {
                    const found = SAMPLE_LEADS.find((l) => l.id === e.target.value);
                    if (found) setActiveLead(found);
                  }}
                  style={{
                    padding: "3px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: "#fff",
                    color: "var(--ink)",
                  }}
                  title="Switch test brand data"
                >
                  {SAMPLE_LEADS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.brand} ({l.name})
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: "2px", background: "#f1f5f9", padding: "2px", borderRadius: "6px" }}>
                  <button
                    type="button"
                    className={`device-toggle-btn ${previewDevice === "desktop" ? "active" : ""}`}
                    onClick={() => setPreviewDevice("desktop")}
                    title="Desktop wide preview"
                  >
                    <Monitor size={12} />
                  </button>
                  <button
                    type="button"
                    className={`device-toggle-btn ${previewDevice === "mobile" ? "active" : ""}`}
                    onClick={() => setPreviewDevice("mobile")}
                    title="Mobile phone preview"
                  >
                    <Smartphone size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Email Client Content View */}
            <div style={{ background: "#f8fafc", padding: previewDevice === "desktop" ? "20px" : "10px" }}>
              <div
                className={previewDevice === "mobile" ? "phone-frame" : ""}
                style={{
                  background: "#fff",
                  borderRadius: previewDevice === "desktop" ? "8px" : "26px",
                  border: previewDevice === "desktop" ? "1px solid #e2e8f0" : "none",
                  boxShadow: previewDevice === "desktop" ? "0 2px 10px rgba(0,0,0,0.02)" : "none",
                  overflow: "hidden",
                }}
              >
                {previewDevice === "mobile" && <div className="phone-notch" />}

                {/* Email Subject Header */}
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: "15px", fontWeight: 700, color: "#0f172a", lineHeight: 1.4 }}>
                    {previewSubject}
                  </h3>

                  {/* Sender Meta */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "#e0e7ff",
                          color: "#4338ca",
                          fontWeight: 700,
                          fontSize: "12px",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {template.senderName[0] || "K"}
                      </div>
                      <div>
                        <div style={{ fontSize: "12.5px", fontWeight: 600, color: "#1e293b" }}>
                          {template.senderName}{" "}
                          <span style={{ fontSize: "11px", fontWeight: 400, color: "#64748b" }}>
                            &lt;{template.senderEmail}&gt;
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                          to {activeLead.name} &lt;{activeLead.email}&gt;
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>Today, 09:30 AM</span>
                  </div>
                </div>

                {/* Email Body Content */}
                <div style={{ padding: "20px 22px" }}>
                  {/* Live Rendered Body HTML */}
                  <div
                    dangerouslySetInnerHTML={{ __html: previewBody }}
                    style={{ fontSize: "14px", lineHeight: 1.5, color: "#111827" }}
                  />

                  {/* Visual Infrastructure Diagram Mockup */}
                  <div style={{ margin: "22px 0 20px 0" }}>
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "16px",
                        background: "#fafbfc",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {activeLead.brand.toUpperCase()} AI OPS LAYER
                        </span>
                        <span style={{ fontSize: "10px", background: "#dcfce7", color: "#15803d", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                          Auto-Attached PNG
                        </span>
                      </div>

                      {/* Schematic mini-nodes representing the diagram */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", margin: "10px 0" }}>
                        <div style={{ background: "#ffedd5", border: "1px solid #fdba74", borderRadius: "6px", padding: "6px 8px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "#9a3412", display: "block" }}>ATTRACT</span>
                          <span style={{ fontSize: "8.5px", color: "#c2410c" }}>Viral Traffic Ingestion</span>
                        </div>
                        <div style={{ background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: "6px", padding: "6px 8px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "#5b21b6", display: "block" }}>CONVERT</span>
                          <span style={{ fontSize: "8.5px", color: "#6d28d9" }}>Drop Page Dynamic Cart</span>
                        </div>
                        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "6px", padding: "6px 8px" }}>
                          <span style={{ fontSize: "9px", fontWeight: 700, color: "#166534", display: "block" }}>SCALE</span>
                          <span style={{ fontSize: "8.5px", color: "#15803d" }}>Inventory Forecasting</span>
                        </div>
                      </div>

                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                        (Clickable full diagram generated by Graphviz & uploaded to Drive)
                      </span>
                    </div>
                  </div>

                  {/* Rendered Signature HTML */}
                  <div
                    dangerouslySetInnerHTML={{ __html: previewSignature }}
                    style={{ fontSize: "13px", lineHeight: 1.45, color: "#374151" }}
                  />

                  {/* Tracking Pixel Indicator */}
                  <div
                    style={{
                      marginTop: "18px",
                      paddingTop: "12px",
                      borderTop: "1px dashed #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "10.5px",
                      color: "#94a3b8",
                    }}
                  >
                    <span>1x1 Open Tracking Pixel & Click Tracking Active</span>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>✓ Verified n8n Webhook</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
